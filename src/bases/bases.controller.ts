import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Base } from '@prisma/client';
import { BasesService } from './bases.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CreateBaseDto } from './dto/create-base.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('bases')
@Controller('bases')
@UseGuards(JwtAuthGuard)
export class BasesController {
  constructor(private readonly basesService: BasesService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: CreateBaseDto })
  @ApiOperation({ summary: 'Создать новую базу' })
  @ApiResponse({ status: 201, description: 'База создана' })
  async create(
    @Body() createBaseDto: CreateBaseDto,
    @Req() req: Request & { user: { userId: string } },
  ): Promise<Base> {
    return this.basesService.create(createBaseDto, req.user.userId);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Получить все базы' })
  @ApiResponse({ status: 200, description: 'Список баз' })
  async findAll(): Promise<Base[]> {
    return this.basesService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'ID базы' })
  @ApiOperation({ summary: 'Получить базу по ID' })
  @ApiResponse({ status: 200, description: 'База найдена' })
  @ApiResponse({ status: 404, description: 'База не найдена' })
  async findOne(@Param('id') id: string): Promise<Base> {
    const base = await this.basesService.findOne(id);

    if (!base) {
      throw new NotFoundException('Not Found');
    }

    return base;
  }
}
