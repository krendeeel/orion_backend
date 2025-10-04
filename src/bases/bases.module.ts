import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BasesService } from './bases.service';
import { BasesController } from './bases.controller';

@Module({
  imports: [PrismaModule],
  providers: [BasesService],
  controllers: [BasesController],
})
export class BasesModule {}
