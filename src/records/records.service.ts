import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { InputJsonValue, JsonValue } from '@prisma/client/runtime/library';
import { GetRecordsDto, SortOrder } from './dto/get-records.dto';
import { Field, FieldType, Prisma, Record, Value } from '@prisma/client';

@Injectable()
export class RecordsService {
  constructor(private prisma: PrismaService) {}

  async create(createRecordDto: CreateRecordDto, userId: string) {
    const createdRecord = await this.prisma.$transaction(async (tx) => {
      const base = await tx.base.findFirst({
        where: { id: createRecordDto.baseId },
        include: {
          fields: {
            where: {
              type: {
                in: [
                  FieldType.NAME,
                  FieldType.CREATED_AT,
                  FieldType.CREATED_BY,
                ],
              },
            },
          },
        },
      });

      if (!base) {
        throw new NotFoundException('Base not found');
      }

      const record = await tx.record.create({
        data: { baseId: createRecordDto.baseId },
      });

      const { nameField, createdByField, createdAtField } =
        this.findSystemFields(base.fields);

      await tx.value.createMany({
        data: [
          {
            value: userId,
            createdBy: userId,
            updatedBy: userId,
            recordId: record.id,
            fieldId: createdByField.id,
          },
          {
            createdBy: userId,
            updatedBy: userId,
            recordId: record.id,
            fieldId: nameField.id,
            value: createRecordDto.name,
          },
          {
            createdBy: userId,
            updatedBy: userId,
            recordId: record.id,
            value: record.createdAt,
            fieldId: createdAtField.id,
          },
        ],
      });

      return tx.record.findUnique({
        where: { id: record.id },
        include: {
          values: {
            include: { field: true },
          },
        },
      });
    });

    if (!createdRecord) {
      throw new NotFoundException('Create Record');
    }

    return this.formatRecord(createdRecord);
  }

  async findAll(dto: GetRecordsDto) {
    const {
      baseId,
      sort = SortOrder.DESC,
      page = 1,
      limit = 100,
      filter,
    } = dto;

    const base = await this.prisma.base.findFirst({
      where: { id: baseId },
    });
    if (!base) {
      throw new NotFoundException('Base not found');
    }

    // Построение where для фильтров
    let where: Prisma.RecordWhereInput = { baseId };
    if (filter && typeof filter === 'object') {
      const filterConditions: Prisma.ValueWhereInput[] = [];
      for (const [fieldName, value] of Object.entries(filter)) {
        const field = await this.prisma.field.findFirst({
          where: { baseId, name: fieldName },
        });
        if (!field)
          throw new BadRequestException(`Field "${fieldName}" not found`);

        filterConditions.push({
          fieldId: field.id,
          value: { equals: value as InputJsonValue },
        });
      }
      if (filterConditions.length > 0) {
        where = {
          ...where,
          values: { some: { AND: filterConditions } },
        };
      }
    }

    // Пагинация
    const skip = (page - 1) * limit;

    // Сортировка
    const orderBy: Prisma.RecordOrderByWithRelationInput = { createdAt: sort };

    const [total, records] = await Promise.all([
      this.prisma.record.count({ where }),
      this.prisma.record.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          values: {
            include: {
              field: true,
            },
          },
        },
      }),
    ]);

    // Обогащение записей (enrichment)
    const enrichedRecords = await Promise.all(
      records.map(async (record) => await this.enrichRecord(record)),
    );

    return {
      data: this.formatRecordValues(enrichedRecords),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async enrichRecord(
    record: Record & { values: Array<Value & { field: Field }> },
    depth: number = 0,
  ): Promise<Record & { values: Value[] }> {
    if (depth > 2) return record;

    const enrichedValues = await Promise.all(
      record.values.map(async (val: Value & { field: Field }) => {
        const type = val.field.type;
        let enrichedValue = val.value;

        // Для SINGLE_USER или AUTHOR/CREATED_BY (если они SINGLE_USER): Заменяем ID на объект User (с position)
        if (
          (type === FieldType.SINGLE_USER ||
            type === FieldType.AUTHOR ||
            type === FieldType.CREATED_BY) &&
          typeof enrichedValue === 'string'
        ) {
          const user = await this.prisma.user.findUnique({
            where: { id: enrichedValue },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              middleName: true,
              age: true,
              position: true, // Включаем объект Position
            }, // Без password
          });
          enrichedValue = user || null;
        }

        // Для MULTI_USER: Массив ID -> массив объектов User (с position)
        if (type === FieldType.MULTI_USER && Array.isArray(enrichedValue)) {
          enrichedValue = await Promise.all(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            enrichedValue.map(async (userId: string) => {
              const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  middleName: true,
                  age: true,
                  position: true,
                },
              });
              return user || null;
            }),
          );
        }

        // Для SINGLE_SELECT: string (name или id) -> объект Option (с name, color)
        if (
          type === FieldType.SINGLE_SELECT &&
          typeof enrichedValue === 'string'
        ) {
          const option = await this.prisma.option.findFirst({
            where: {
              fieldId: val.fieldId,
              OR: [{ id: enrichedValue }, { name: enrichedValue }],
            },
            select: { id: true, name: true, color: true },
          });
          enrichedValue = option || enrichedValue; // Если не найдено, оставляем как есть
        }

        // Для MULTI_SELECT: array<string> -> array<Option>
        if (type === FieldType.MULTI_SELECT && Array.isArray(enrichedValue)) {
          enrichedValue = await Promise.all(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            enrichedValue.map(async (optVal: string) => {
              const option = await this.prisma.option.findFirst({
                where: {
                  fieldId: val.fieldId,
                  OR: [{ id: optVal }, { name: optVal }],
                },
                select: { id: true, name: true, color: true },
              });
              return option || optVal;
            }),
          );
        }

        if (
          type === FieldType.SINGLE_LINK &&
          typeof enrichedValue === 'string'
        ) {
          const linkedRecord = await this.prisma.record.findUnique({
            where: { id: enrichedValue },
            include: { values: { include: { field: true } } },
          });
          enrichedValue = linkedRecord
            ? ((await this.enrichRecord(
                linkedRecord,
                depth + 1,
              )) as unknown as JsonValue)
            : null;
        }

        // Для MULTI_LINK: array<ID> -> array<Record> (обогащённые)
        if (type === FieldType.MULTI_LINK && Array.isArray(enrichedValue)) {
          enrichedValue = await Promise.all(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            enrichedValue.map(async (recId: string) => {
              const linkedRecord = await this.prisma.record.findUnique({
                where: { id: recId },
                include: { values: { include: { field: true } } },
              });
              return linkedRecord
                ? ((await this.enrichRecord(
                    linkedRecord,
                    depth + 1,
                  )) as unknown as JsonValue)
                : (null as JsonValue);
            }),
          );
        }

        return { ...val, value: enrichedValue };
      }),
    );

    return { ...record, values: enrichedValues as unknown as Value[] };
  }

  private formatRecordValues(records: Array<Record & { values: Value[] }>) {
    return records.map((record) => {
      const values: { [key: string]: Value['value'] } = {};

      for (const value of record.values) {
        values[value.fieldId] = value.value;
      }

      return {
        ...record,
        values,
      };
    });
  }

  async delete(id: string) {
    const record = await this.prisma.record.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    return this.prisma.record.delete({ where: { id } });
  }

  private formatRecord(
    record: Record & { values: Array<Value & { field: Field }> },
  ) {
    const values: {
      [key: string]: { fieldId: string; fieldType: FieldType; value: unknown };
    } = {};

    for (const value of record.values) {
      values[value.field.id] = {
        value: value.value,
        fieldId: value.field.id,
        fieldType: value.field.type,
      };
    }

    return {
      id: record.id,
      values,
    };
  }

  private findSystemFields(fields: Field[]) {
    let nameField: Field | null = null;
    let createdByField: Field | null = null;
    let createdAtField: Field | null = null;

    for (const field of fields) {
      if (field.type === FieldType.NAME) {
        nameField = field;

        continue;
      }

      if (field.type === FieldType.CREATED_BY) {
        createdByField = field;

        continue;
      }

      if (field.type === FieldType.CREATED_AT) {
        createdAtField = field;

        continue;
      }
    }

    if (!nameField) {
      throw new Error(`name field not found`);
    }

    if (!createdByField) {
      throw new Error(`created by field not found`);
    }

    if (!createdAtField) {
      throw new Error(`created at field not found`);
    }

    return {
      nameField,
      createdByField,
      createdAtField,
    };
  }
}
