import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FieldType } from '@prisma/client';

export class CreateFieldDto {
  @ApiProperty({ description: 'ID базы', example: 'uuid-string' })
  @IsString()
  baseId!: string;

  @ApiProperty({ description: 'Название поля', example: 'Name' })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Тип поля',
    enum: FieldType,
    example: FieldType.SINGLE_LINE_TEXT,
  })
  @IsEnum(FieldType)
  type!: FieldType;

  @ApiProperty({
    description: 'Конфигурация поля (JSON)',
    required: false,
    example: { decimals: 2 },
  })
  @IsOptional()
  config?: any;
}
