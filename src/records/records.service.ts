import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { InputJsonValue } from '@prisma/client/runtime/library';
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

        // Фильтр по value (exact match; для JSON используем Prisma.JsonFilter)
        filterConditions.push({
          fieldId: field.id,
          value: { equals: value as InputJsonValue }, // Для сложных типов (array, object) это сработает, если exact
        });
      }
      if (filterConditions.length > 0) {
        where = {
          ...where,
          values: { some: { AND: filterConditions } }, // AND по всем фильтрам
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
        include: { values: { include: { field: true } } },
      }),
    ]);

    return {
      data: records.map((record) => this.formatRecord(record)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
