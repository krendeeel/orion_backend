import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Delete,
  Patch,
} from '@nestjs/common';
import { Option } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { OptionsService } from './options.service';

@ApiTags('options')
@Controller('options')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @Post()
  @ApiBody({ type: CreateOptionDto })
  @ApiOperation({ summary: 'Создать новую опцию' })
  @ApiResponse({ status: 201, description: 'Опция создана' })
  async create(@Body() createFieldDto: CreateOptionDto): Promise<Option> {
    return this.optionsService.create(createFieldDto);
  }

  @Patch('id')
  @ApiBody({ type: UpdateOptionDto })
  @ApiParam({ name: 'id', description: 'ID опции' })
  @ApiOperation({ summary: 'Обновить новое поле' })
  @ApiResponse({ status: 201, description: 'Поле создано' })
  async update(
    @Param('id') id: string,
    @Body() updateOptionDto: UpdateOptionDto,
  ): Promise<Option> {
    return this.optionsService.update(id, updateOptionDto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'ID опции' })
  @ApiOperation({ summary: 'Удалить опцию по ID' })
  @ApiResponse({ status: 200, description: 'Опция удалена' })
  @ApiResponse({ status: 404, description: 'Опция не найдена' })
  async delete(@Param('id') id: string) {
    return this.optionsService.delete(id);
  }
}
