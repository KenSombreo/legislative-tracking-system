import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommitteeReport, CommitteeReportSchema } from './committee-report.schema';
import { CommitteeReportsService } from './committee-reports.service';
import { CommitteeReportsController } from './committee-reports.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CommitteeReport.name, schema: CommitteeReportSchema }]),
    AuditLogsModule,
    StorageModule,
  ],
  controllers: [CommitteeReportsController],
  providers: [CommitteeReportsService],
})
export class CommitteeReportsModule {}
