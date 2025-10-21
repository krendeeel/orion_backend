import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';

@Injectable()
export class MeetingsService {
  constructor(private prisma: PrismaService) {}

  async createMeeting(createMeetingDto: CreateMeetingDto, userId: string) {
    const { participantIds, ...meetingData } = createMeetingDto;

    return this.prisma.meeting.create({
      data: {
        ...meetingData,
        createdBy: userId,
        participants: {
          create: [...participantIds, userId].map((userId) => ({ userId })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
      },
    });
  }

  async joinMeeting(meetingId: string, userId: string) {
    return this.prisma.meetingParticipant.upsert({
      where: {
        meetingId_userId: {
          meetingId,
          userId,
        },
      },
      update: {
        joinedAt: new Date(),
        leftAt: null,
      },
      create: {
        meetingId,
        userId,
        joinedAt: new Date(),
      },
      include: {
        meeting: true,
        user: {
          select: { id: true, email: true },
        },
      },
    });
  }

  async getMeeting(meetingId: string) {
    return this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
      },
    });
  }
}
