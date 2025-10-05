import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { Field } from '@prisma/client';
import { FieldsService } from './fields.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CreateFieldDto } from './dto/create-field.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('fields')
@Controller('fields')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Post()
  @ApiBody({ type: CreateFieldDto })
  @ApiOperation({ summary: 'Создать новое поле' })
  @ApiResponse({ status: 201, description: 'Поле создано' })
  async create(
    @Body() createFieldDto: CreateFieldDto,
    @Req() req: Request & { user: { userId: string } },
  ): Promise<Field> {
    return this.fieldsService.create(createFieldDto, req.user.userId);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'ID поля' })
  @ApiOperation({ summary: 'Удалить поле по ID' })
  @ApiResponse({ status: 200, description: 'Поле  удалено' })
  @ApiResponse({ status: 404, description: 'Поле не найдено' })
  async deleteOne(@Param('id') id: string) {
    return this.fieldsService.delete(id);
  }
}
