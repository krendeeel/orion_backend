import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePositionDto } from './dto/create-position.dto';

@Injectable()
export class PositionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.position.findMany();
  }

  async findOne(id: string) {
    const position = await this.prisma.position.findUnique({ where: { id } });
    if (!position) {
      throw new NotFoundException('Position not found');
    }
    return position;
  }

  async create(createPositionDto: CreatePositionDto) {
    // Проверяем уникальность имени
    const existingPosition = await this.prisma.position.findFirst({
      where: { name: createPositionDto.name },
    });
    if (existingPosition) {
      throw new BadRequestException('Position name must be unique');
    }

    return this.prisma.position.create({
      data: { name: createPositionDto.name },
    });
  }

  async delete(id: string) {
    await this.findOne(id); // Проверяем существование

    // Prisma по умолчанию запретит delete, если есть связанные users (Restrict)
    // Если нужно разрешить: onDelete: SetNull в схеме для User.positionId
    return this.prisma.position.delete({ where: { id } });
  }
}
