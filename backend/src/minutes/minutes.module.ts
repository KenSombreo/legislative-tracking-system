import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionMinutes, SessionMinutesSchema } from './minutes.schema';
import { MinutesService } from './minutes.service';
import { MinutesController } from './minutes.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SessionMinutes.name, schema: SessionMinutesSchema }]),
    AuditLogsModule,
    StorageModule,
  ],
  controllers: [MinutesController],
  providers: [MinutesService],
})
export class MinutesModule {}
