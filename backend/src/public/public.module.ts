import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { LegislationModule } from '../legislation/legislation.module';
import { DocumentsModule } from '../documents/documents.module';
import { DocumentRequestsModule } from '../document-requests/document-requests.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [LegislationModule, DocumentsModule, DocumentRequestsModule, AuditLogsModule],
  controllers: [PublicController],
})
export class PublicModule {}
