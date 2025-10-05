import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';

@Module({
  imports: [PrismaModule],
  providers: [RecordsService],
  controllers: [RecordsController],
})
export class RecordsModule {}
