import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ValuesService } from './values.service';
import { ValuesController } from './values.controller';

@Module({
  imports: [PrismaModule],
  providers: [ValuesService],
  controllers: [ValuesController],
})
export class ValuesModule {}
