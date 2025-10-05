import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FieldsService } from './fields.service';
import { FieldsController } from './fields.controller';

@Module({
  imports: [PrismaModule],
  providers: [FieldsService],
  controllers: [FieldsController],
})
export class FieldsModule {}
