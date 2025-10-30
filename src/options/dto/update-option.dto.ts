import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOptionDto {
  @ApiProperty({
    description: 'Новое название опции',
    required: false,
    example: 'Updated Option',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Новый цвет опции (hex)',
    required: false,
    example: '#00FF00',
  })
  @IsOptional()
  @IsString()
  color?: string;
}
