import { IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFolderDto {
  @IsString()
  @ApiProperty({ example: 'my folder', description: 'folder name' })
  @Length(1, 255)
  name!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'b82ceca0-1666-44de-9d29-59afd04f099a',
    description: 'folder id',
  })
  parentId?: string;
}
