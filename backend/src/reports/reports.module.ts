import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LegislativeDocument, LegislativeDocumentSchema } from '../legislation/schemas/legislative-document.schema';
import { SessionMinutes, SessionMinutesSchema } from '../minutes/minutes.schema';
import { CommitteeReport, CommitteeReportSchema } from '../committee-reports/committee-report.schema';
import { DocumentRequest, DocumentRequestSchema } from '../document-requests/document-request.schema';
import { ReportsService } from './reports.service';
import { PeriodReportService } from './period-report.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LegislativeDocument.name, schema: LegislativeDocumentSchema },
      { name: SessionMinutes.name, schema: SessionMinutesSchema },
      { name: CommitteeReport.name, schema: CommitteeReportSchema },
      { name: DocumentRequest.name, schema: DocumentRequestSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, PeriodReportService],
})
export class ReportsModule {}
