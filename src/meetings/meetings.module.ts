import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { MeetingsGateway } from './meetings.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingsController } from './meetings.controller';

@Module({
  providers: [MeetingsService, MeetingsGateway, PrismaService],
  controllers: [MeetingsController],
})
export class MeetingsModule {}
