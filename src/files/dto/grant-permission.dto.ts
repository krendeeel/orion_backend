import { IsBoolean, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GrantPermissionDto {
  @ApiProperty({
    example: 'b82ceca0-1666-44de-9d29-59afd04f099a',
    description: 'user id',
  })
  @IsString()
  userId!: string;

  @ApiProperty({ example: true, description: 'can read' })
  @IsBoolean()
  canRead!: boolean;

  @ApiProperty({ example: false, description: 'can write' })
  @IsBoolean()
  canWrite!: boolean;
}
