import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SbMember } from './sb-member.schema';
import { AuditService } from '../audit-logs/audit.service';
import { BaseCrudService } from '../common/crud/base-crud.service';

@Injectable()
export class SbMembersService extends BaseCrudService<SbMember> {
  constructor(@InjectModel(SbMember.name) model: Model<SbMember>, auditService: AuditService) {
    super(model, auditService, null, 'SbMember', (m) => `SB member ${m.fullName}`);
  }

  list() {
    return this.findAll({}, { isActive: -1, sortOrder: 1, fullName: 1 });
  }
}
