import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PositionsService } from './positions.service';
import { PositionsController } from './positions.controller';

@Module({
  imports: [PrismaModule],
  providers: [PositionsService],
  controllers: [PositionsController],
})
export class PositionsModule {}
