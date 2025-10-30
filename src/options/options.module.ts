import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OptionsService } from './options.service';
import { OptionsController } from './options.controller';

@Module({
  imports: [PrismaModule],
  providers: [OptionsService],
  controllers: [OptionsController],
})
export class OptionsModule {}
