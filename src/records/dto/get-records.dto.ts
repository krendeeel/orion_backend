import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetRecordsDto {
  @ApiProperty({ description: 'ID базы данных', example: 'uuid-string' })
  @IsString()
  baseId!: string;

  @ApiProperty({
    description: 'Сортировка по createdAt (asc/desc)',
    enum: SortOrder,
    required: false,
    example: 'desc',
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sort?: SortOrder = SortOrder.DESC;

  @ApiProperty({
    description: 'Номер страницы (пагинация)',
    required: false,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiProperty({
    description: 'Количество записей на странице',
    required: false,
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;

  @ApiProperty({
    description: 'Фильтр в формате JSON-строки, e.g. {"Name": "John"}',
    required: false,
    example: '{"Name": "John"}',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  })
  filter?: Record<string, any>; // { [fieldName: string]: any }
}
