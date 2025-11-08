import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePositionDto {
  @ApiProperty({ description: 'Название позиции', example: 'Администратор' })
  @IsString()
  name!: string;
}
