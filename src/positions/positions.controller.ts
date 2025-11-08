import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PositionsService } from './positions.service';
import {
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { CreatePositionDto } from './dto/create-position.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@ApiTags('positions')
@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все позиции' })
  @ApiResponse({ status: 200, description: 'Список позиций' })
  findAll() {
    return this.positionsService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить позицию по ID' })
  @ApiResponse({ status: 200, description: 'Позиция найдена' })
  @ApiResponse({ status: 404, description: 'Позиция не найдена' })
  findOne(@Param('id') id: string) {
    return this.positionsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Создать новую позицию' })
  @ApiResponse({ status: 201, description: 'Позиция создана' })
  @ApiResponse({ status: 400, description: 'Имя позиции не уникально' })
  create(@Body() createPositionDto: CreatePositionDto) {
    return this.positionsService.create(createPositionDto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Удалить позицию по ID' })
  @ApiResponse({ status: 200, description: 'Позиция удалена' })
  @ApiResponse({ status: 404, description: 'Позиция не найдена' })
  delete(@Param('id') id: string) {
    return this.positionsService.delete(id);
  }
}
