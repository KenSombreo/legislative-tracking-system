import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommitteeReport } from './committee-report.schema';
import { AuditService } from '../audit-logs/audit.service';
import { BaseCrudService } from '../common/crud/base-crud.service';
import { STORAGE_PROVIDER, StorageProvider } from '../common/storage/storage-provider.interface';

@Injectable()
export class CommitteeReportsService extends BaseCrudService<CommitteeReport> {
  constructor(
    @InjectModel(CommitteeReport.name) model: Model<CommitteeReport>,
    auditService: AuditService,
    @Inject(STORAGE_PROVIDER) storageProvider: StorageProvider,
  ) {
    super(model, auditService, storageProvider, 'CommitteeReport', (r) => `committee report ${r.reportNumber}`);
  }

  list() {
    return this.findAll({}, { dateSubmitted: -1, createdAt: -1 });
  }
}
