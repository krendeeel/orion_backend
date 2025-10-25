import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadFileDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'b82ceca0-1666-44de-9d29-59afd04f099a',
    description: 'folder id',
  })
  folderId?: string;
}
