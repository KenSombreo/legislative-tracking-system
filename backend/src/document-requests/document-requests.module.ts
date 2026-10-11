import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentRequest, DocumentRequestSchema } from './document-request.schema';
import { DocumentRequestsService } from './document-requests.service';
import { DocumentRequestsController } from './document-requests.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DocumentRequest.name, schema: DocumentRequestSchema }]),
    AuditLogsModule,
  ],
  controllers: [DocumentRequestsController],
  providers: [DocumentRequestsService],
  exports: [DocumentRequestsService],
})
export class DocumentRequestsModule {}
