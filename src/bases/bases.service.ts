import { FieldType } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BasesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBaseDto: { name: string }, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const base = await tx.base.create({
        data: {
          name: createBaseDto.name,
          createdBy: userId,
        },
      });

      await tx.field.createMany({
        data: [
          {
            baseId: base.id,
            name: 'Название',
            type: FieldType.NAME,
          },
          {
            baseId: base.id,
            name: 'Автор',
            type: FieldType.CREATED_BY,
            config: {
              readonly: true,
            },
          },
          {
            baseId: base.id,
            name: 'Дата создания',
            type: FieldType.CREATED_AT,
            config: {
              readonly: true,
            },
          },
        ],
      });

      return base;
    });
  }

  async findAll() {
    return this.prisma.base.findMany();
  }

  async findOne(id: string) {
    return this.prisma.base.findFirst({
      where: { id },
      include: { fields: true },
    });
  }

  async delete(id: string) {
    return this.prisma.base.delete({ where: { id } });
  }
}
