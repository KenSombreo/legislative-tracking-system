import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentFile, DocumentFileSchema } from './schemas/document-file.schema';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { TextExtractionService } from './text-extraction.service';
import { StorageModule } from '../common/storage/storage.module';
import { LegislationModule } from '../legislation/legislation.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DocumentFile.name, schema: DocumentFileSchema }]),
    StorageModule,
    LegislationModule,
    AuditLogsModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, TextExtractionService],
  exports: [DocumentsService, StorageModule],
})
export class DocumentsModule {}
