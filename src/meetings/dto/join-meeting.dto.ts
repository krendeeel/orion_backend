import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinMeetingDto {
  @ApiProperty({
    description: 'UUID идентификатор встречи',
    example: '123e4567-e89b-12d3-a456-426614174000',
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  meetingId!: string;
}
