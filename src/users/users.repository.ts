import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Предполагаю, что PrismaService в отдельном модуле

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: { email: string; password: string }) {
    return this.prisma.user.create({ data });
  }
}
