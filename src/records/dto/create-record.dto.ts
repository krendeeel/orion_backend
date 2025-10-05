import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecordDto {
  @ApiProperty({ description: 'ID базы', example: 'uuid-string' })
  @IsString()
  baseId!: string;

  @ApiProperty({ description: 'Название записи', example: 'my record' })
  @IsString()
  name!: string;
}
