import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RenameFileDto {
  @IsString()
  @Length(1, 255)
  @ApiProperty({
    example: 'my file 2',
    description: 'new file name',
  })
  name!: string;
}
