import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Field, FieldType } from '@prisma/client';
import { UpsertValueDto } from './dto/upsert-value.dto';
import { PrismaService } from '../prisma/prisma.service';
import { InputJsonValue } from '@prisma/client/runtime/library';

@Injectable()
export class ValuesService {
  constructor(private prisma: PrismaService) {}

  async upsert(upsertValueDto: UpsertValueDto, userId: string) {
    const record = await this.prisma.record.findUnique({
      where: { id: upsertValueDto.recordId },
      include: { base: true },
    });

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    const field = await this.prisma.field.findUnique({
      where: { id: upsertValueDto.fieldId },
    });

    if (!field) {
      throw new NotFoundException('Field not found');
    }

    if (field.baseId !== record.baseId) {
      throw new NotFoundException('Field not found or mismatch');
    }

    this.validateValue(upsertValueDto.value, field);

    const existingValue = await this.prisma.value.findUnique({
      where: {
        recordId_fieldId: {
          recordId: upsertValueDto.recordId,
          fieldId: upsertValueDto.fieldId,
        },
      },
    });

    if (existingValue) {
      return this.prisma.value.update({
        where: { id: existingValue.id },
        data: {
          value: upsertValueDto.value as InputJsonValue,
          updatedBy: userId,
        },
      });
    }

    return this.prisma.value.create({
      data: {
        recordId: upsertValueDto.recordId,
        fieldId: upsertValueDto.fieldId,
        value: upsertValueDto.value as InputJsonValue,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  private validateValue(value: unknown, field: Field) {
    if (value === null) {
      return;
    }

    switch (field.type) {
      case FieldType.NUMBER:
        if (typeof value !== 'number') {
          throw new BadRequestException('Value must be a number');
        }

        break;

      case FieldType.NAME:
      case FieldType.SINGLE_LINE_TEXT:
        if (typeof value !== 'string') {
          throw new BadRequestException('Value must be a string');
        }

        if (value.length > 255) {
          throw new BadRequestException(
            'Single line text must be <= 255 characters',
          );
        }

        break;

      case FieldType.LONG_TEXT:
        if (typeof value !== 'string') {
          throw new BadRequestException('Value must be a string');
        }

        break;

      case FieldType.CHECKBOX:
        if (typeof value !== 'boolean') {
          throw new BadRequestException('Value must be a boolean');
        }

        break;

      case FieldType.SINGLE_SELECT:
        if (typeof value !== 'string') {
          throw new BadRequestException(
            'Value must be a string (option ID or name)',
          );
        }

        break;

      case FieldType.MULTI_SELECT:
        if (
          !Array.isArray(value) ||
          value.some((v: unknown) => typeof v !== 'string')
        ) {
          throw new BadRequestException(
            'Value must be an array of strings (option IDs or names)',
          );
        }

        break;

      case FieldType.SINGLE_USER:
        if (typeof value !== 'string') {
          throw new BadRequestException('Value must be a string (user ID)');
        }

        break;

      case FieldType.MULTI_USER:
        if (
          !Array.isArray(value) ||
          value.some((v: any) => typeof v !== 'string')
        ) {
          throw new BadRequestException(
            'Value must be an array of strings (user IDs)',
          );
        }

        break;

      case FieldType.SINGLE_LINK:
        if (typeof value !== 'string') {
          throw new BadRequestException('Value must be a string (record ID)');
        }

        break;

      case FieldType.MULTI_LINK:
        if (
          !Array.isArray(value) ||
          value.some((value: unknown) => typeof value !== 'string')
        ) {
          throw new BadRequestException(
            'Value must be an array of strings (record IDs)',
          );
        }

        break;

      default:
        throw new BadRequestException('Unknown field type');
    }
  }
}
