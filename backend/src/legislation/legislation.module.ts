import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LegislativeDocument, LegislativeDocumentSchema } from './schemas/legislative-document.schema';
import { LegislationService } from './legislation.service';
import { LegislationController } from './legislation.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LegislativeDocument.name, schema: LegislativeDocumentSchema }]),
    AuditLogsModule,
  ],
  controllers: [LegislationController],
  providers: [LegislationService],
  exports: [LegislationService],
})
export class LegislationModule {}
