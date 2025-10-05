import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Delete,
  Get,
  Query,
} from '@nestjs/common';
import { Record } from '@prisma/client';
import { RecordsService } from './records.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CreateRecordDto } from './dto/create-record.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetRecordsDto } from './dto/get-records.dto';

@ApiTags('records')
@Controller('records')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Post()
  @ApiBody({ type: CreateRecordDto })
  @ApiOperation({ summary: 'Создать новую запись' })
  @ApiResponse({ status: 201, description: 'Запись создана' })
  async create(
    @Body() createRecordDto: CreateRecordDto,
    @Req() req: Request & { user: { userId: string } },
  ): Promise<Record> {
    return this.recordsService.create(createRecordDto, req.user.userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Получить записи по базе с фильтрами, сортировкой и пагинацией',
  })
  @ApiQuery({
    name: 'baseId',
    type: String,
    description: 'ID базы данных',
    required: true,
    example: 'uuid-string',
  })
  @ApiQuery({
    name: 'sort',
    type: String,
    description: 'Сортировка по createdAt (asc/desc)',
    required: false,
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    description: 'Номер страницы (пагинация)',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    description: 'Количество записей на странице',
    required: false,
    example: 10,
  })
  @ApiQuery({
    name: 'filter',
    type: String,
    description: 'Фильтр в формате JSON-строки, e.g. {"Name": "John"}',
    required: false,
    example: '{"Name": "John"}',
  })
  @ApiResponse({ status: 200, description: 'Список записей' })
  @ApiResponse({ status: 404, description: 'База не найдена' })
  findAll(
    @Query() query: GetRecordsDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.recordsService.findAll(query, req.user.userId);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', description: 'ID записи' })
  @ApiOperation({ summary: 'Удалить запись по ID' })
  @ApiResponse({ status: 200, description: 'Запись удалена' })
  @ApiResponse({ status: 404, description: 'Запись не найдена' })
  async deleteOne(@Param('id') id: string) {
    return this.recordsService.delete(id);
  }
}
