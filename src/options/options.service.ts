import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';

@Injectable()
export class OptionsService {
  constructor(private prisma: PrismaService) {}

  async create(createOptionDto: CreateOptionDto) {
    const field = await this.prisma.field.findUnique({
      where: { id: createOptionDto.fieldId },
    });

    if (!field) {
      throw new NotFoundException('Field not found');
    }

    const existingOption = await this.prisma.option.findFirst({
      where: { fieldId: createOptionDto.fieldId, name: createOptionDto.name },
    });
    if (existingOption) {
      throw new BadRequestException(
        'Option name must be unique within the field',
      );
    }

    return this.prisma.option.create({
      data: {
        fieldId: createOptionDto.fieldId,
        name: createOptionDto.name,
        color: createOptionDto.color,
      },
    });
  }

  async update(id: string, updateOptionDto: UpdateOptionDto) {
    const option = await this.prisma.option.findUnique({
      where: { id },
    });

    if (!option) {
      throw new NotFoundException('Option not found');
    }

    if (updateOptionDto.name) {
      const existingOption = await this.prisma.option.findFirst({
        where: {
          fieldId: option.fieldId,
          name: updateOptionDto.name,
          id: { not: id },
        },
      });

      if (existingOption) {
        throw new BadRequestException(
          'Option name must be unique within the field',
        );
      }
    }

    return this.prisma.option.update({
      where: { id },
      data: {
        name: updateOptionDto.name,
        color: updateOptionDto.color,
      },
    });
  }

  async delete(id: string) {
    const option = await this.prisma.option.findUnique({
      where: { id },
    });

    if (!option) {
      throw new NotFoundException('Option not found');
    }

    return this.prisma.option.delete({ where: { id } });
  }
}
