import { Controller, Body, Req, UseGuards, Patch } from '@nestjs/common';
import { Value } from '@prisma/client';
import { ValuesService } from './values.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { UpsertValueDto } from './dto/upsert-value.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('values')
@Controller('values')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class ValuesController {
  constructor(private readonly valuesService: ValuesService) {}

  @Patch()
  @ApiBody({ type: UpsertValueDto })
  @ApiOperation({ summary: 'Создать или обновить значение для поля в записи' })
  @ApiResponse({ status: 200, description: 'Значение обновлено' })
  @ApiResponse({ status: 201, description: 'Значение создано' })
  @ApiResponse({ status: 400, description: 'Неверное значение' })
  @ApiResponse({ status: 404, description: 'Запись или поле не найдены' })
  async upsert(
    @Body() upsertValueDto: UpsertValueDto,
    @Req() req: Request & { user: { userId: string } },
  ): Promise<Value> {
    return this.valuesService.upsert(upsertValueDto, req.user.userId);
  }
}
