import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMeetingDto {
  @ApiProperty({
    description: 'Название встречи',
    example: 'Еженедельный митинг по проекту',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({
    description: 'Описание встречи (опционально)',
    example: 'Обсуждение последних обновлений проекта',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Дата и время начала встречи в формате ISO 8601',
    example: '2024-01-15T10:00:00Z',
  })
  @IsDateString()
  startTime!: Date;

  @ApiProperty({
    description: 'Дата и время окончания встречи в формате ISO 8601',
    example: '2024-01-15T11:00:00Z',
  })
  @IsDateString()
  endTime!: Date;

  @ApiProperty({
    description: 'Массив идентификаторов участников',
    example: ['uuid1', 'uuid2', 'uuid3'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  participantIds!: string[];
}
