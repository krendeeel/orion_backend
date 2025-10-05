import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BasesService {
  constructor(private prisma: PrismaService) {}

  async create(createBaseDto: { name: string }, userId: string) {
    return this.prisma.base.create({
      data: {
        name: createBaseDto.name,
        createdBy: userId,
      },
    });
  }

  async findAll() {
    return this.prisma.base.findMany();
  }

  async findOne(id: string) {
    return this.prisma.base.findFirst({
      where: { id },
      include: { fields: true },
    });
  }

  async delete(id: string) {
    return this.prisma.base.delete({ where: { id } });
  }
}
