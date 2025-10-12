import { IsDefined, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertValueDto {
  @ApiProperty({ description: 'ID записи', example: 'uuid-string' })
  @IsString()
  recordId!: string;

  @ApiProperty({ description: 'ID поля', example: 'uuid-string' })
  @IsString()
  fieldId!: string;

  @IsDefined()
  @ApiProperty({
    description: 'Значение (JSON)',
    example: 'text or 42 or true',
  })
  value!: unknown;
}
