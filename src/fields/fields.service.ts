import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFieldDto } from './dto/create-field.dto';

@Injectable()
export class FieldsService {
  constructor(private prisma: PrismaService) {}

  async create(createFieldDto: CreateFieldDto, userId: string) {
    const base = await this.prisma.base.findFirst({
      where: { id: createFieldDto.baseId, createdBy: userId },
    });

    if (!base) {
      throw new NotFoundException('Base not found or access denied');
    }

    return this.prisma.field.create({
      data: {
        baseId: createFieldDto.baseId,
        name: createFieldDto.name,
        type: createFieldDto.type,
      },
    });
  }

  async delete(id: string) {
    const field = await this.prisma.field.findUnique({
      where: { id },
    });

    if (!field) {
      throw new NotFoundException('Field not found');
    }

    return this.prisma.field.delete({ where: { id } });
  }
}
