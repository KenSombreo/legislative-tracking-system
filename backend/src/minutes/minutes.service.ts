import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SessionMinutes } from './minutes.schema';
import { AuditService } from '../audit-logs/audit.service';
import { BaseCrudService } from '../common/crud/base-crud.service';
import { STORAGE_PROVIDER, StorageProvider } from '../common/storage/storage-provider.interface';

@Injectable()
export class MinutesService extends BaseCrudService<SessionMinutes> {
  constructor(
    @InjectModel(SessionMinutes.name) model: Model<SessionMinutes>,
    auditService: AuditService,
    @Inject(STORAGE_PROVIDER) storageProvider: StorageProvider,
  ) {
    super(model, auditService, storageProvider, 'SessionMinutes', (m) => `minutes of ${m.sessionNumber} session`);
  }

  list() {
    return this.findAll({}, { sessionDate: -1 });
  }
}
