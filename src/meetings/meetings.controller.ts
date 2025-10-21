import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@ApiTags('meetings')
@Controller('meetings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @ApiBody({ type: CreateMeetingDto })
  @ApiOperation({ summary: 'Создать новую встречу' })
  @ApiResponse({ status: 201, description: 'Встреча создана' })
  create(
    @Body() createMeetingDto: CreateMeetingDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.meetingsService.createMeeting(
      createMeetingDto,
      req.user.userId,
    );
  }

  @Post(':id/join')
  @ApiParam({ name: 'id', description: 'ID встречи' })
  @ApiOperation({ summary: 'Подключиться к встрече по ID' })
  @ApiResponse({ status: 200, description: 'Поключение выполнено' })
  @ApiResponse({ status: 404, description: 'Встреча не найдена' })
  join(
    @Param('id') meetingId: string,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.meetingsService.joinMeeting(meetingId, req.user.userId);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'ID встречи' })
  @ApiOperation({ summary: 'Получить встречу по ID' })
  @ApiResponse({ status: 200, description: 'Встреча найдена' })
  @ApiResponse({ status: 404, description: 'Встреча не найдена' })
  findOne(@Param('id') id: string) {
    return this.meetingsService.getMeeting(id);
  }
}
