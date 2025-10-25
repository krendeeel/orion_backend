import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BasesModule } from './bases/bases.module';
import { FieldsModule } from './fields/fields.module';
import { RecordsModule } from './records/records.module';
import { ValuesModule } from './values/values.module';
import { MeetingsModule } from './meetings/meetings.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    BasesModule,
    FieldsModule,
    RecordsModule,
    ValuesModule,
    MeetingsModule,
    FilesModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
