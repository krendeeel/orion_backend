import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOptionDto {
  @IsString()
  @IsUUID()
  @ApiProperty({
    description: 'ID поля',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  fieldId!: string;

  @ApiProperty({
    description: 'Название опции',
    example: 'В работе',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Цвет опции',
    example: '#00FF00',
    required: false,
  })
  color?: string;
}
