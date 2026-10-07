import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema';

@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditLog.name) private auditModel: Model<AuditLog>) {}

  async log(
    userId: any,
    action: string,
    entityType: string,
    entityId: any,
    description: string,
    changes: Record<string, { old: any; new: any }> = {},
  ) {
    try {
      await this.auditModel.create({
        userId: userId || null,
        action,
        entityType,
        entityId: entityId || null,
        description,
        changes,
      });
    } catch (e) {
      // Never let audit logging break the main operation
    }
  }

  static diff(before: Record<string, any>, after: Record<string, any>): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};
    for (const key of Object.keys(after)) {
      const oldVal = before ? before[key] : undefined;
      const newVal = after[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = { old: oldVal ?? null, new: newVal ?? null };
      }
    }
    return changes;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    entityType?: string;
    userId?: string;
    action?: string;
  }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const filter: any = {};
    if (query.entityType) filter.entityType = query.entityType;
    if (query.userId) filter.userId = new Types.ObjectId(query.userId);
    if (query.action) filter.action = query.action;

    const [data, total] = await Promise.all([
      this.auditModel
        .find(filter)
        .populate('userId', 'fullName username')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.auditModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
