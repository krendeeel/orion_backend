import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'strongpassword', description: 'User password' })
  @IsString()
  @MinLength(6)
  password!: string;
}
