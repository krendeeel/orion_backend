import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { GetRecordsDto, SortOrder } from './dto/get-records.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RecordsService {
  constructor(private prisma: PrismaService) {}

  async create(createRecordDto: CreateRecordDto, userId: string) {
    const base = await this.prisma.base.findFirst({
      where: { id: createRecordDto.baseId },
    });

    if (!base) {
      throw new NotFoundException('Base not found');
    }

    return this.prisma.record.create({
      data: { baseId: createRecordDto.baseId },
    });
  }

  async findAll(dto: GetRecordsDto, userId: string) {
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
          value: { equals: value }, // Для сложных типов (array, object) это сработает, если exact
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
        include: { values: { include: { field: true } } }, // Включаем значения и поля для полноты
      }),
    ]);

    return {
      data: records,
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
}
