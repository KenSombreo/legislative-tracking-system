import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityDoc, ActivityDocSchema } from './activity-doc.schema';
import { ActivityDocsService } from './activity-docs.service';
import { ActivityDocsController } from './activity-docs.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: ActivityDoc.name, schema: ActivityDocSchema }]), AuditLogsModule, StorageModule],
  controllers: [ActivityDocsController],
  providers: [ActivityDocsService],
  exports: [ActivityDocsService],
})
export class ActivityDocsModule {}
