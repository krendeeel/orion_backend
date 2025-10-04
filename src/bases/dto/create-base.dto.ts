import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBaseDto {
  @ApiProperty({ description: 'Название базы данных', example: 'My Base' })
  @IsString()
  name!: string;
}
