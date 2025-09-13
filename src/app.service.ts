import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  public constructor(private readonly prismaService: PrismaService) {}
  async getHello(): Promise<any> {
    return this.prismaService.user.findMany();
  }
}
