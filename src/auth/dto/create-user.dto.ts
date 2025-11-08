import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'strongpassword', description: 'User password' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  lastName!: string;

  @ApiProperty({
    example: 'Middle',
    description: 'Middle name (patronymic)',
    required: false,
  })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ example: 30, description: 'Age', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @ApiProperty({ example: 'uuid-of-position', description: 'Position ID' })
  @IsUUID()
  positionId!: string;
}
