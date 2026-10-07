import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CalendarEvent } from './calendar-event.schema';
import { AuditService } from '../audit-logs/audit.service';
import { BaseCrudService } from '../common/crud/base-crud.service';

@Injectable()
export class CalendarService extends BaseCrudService<CalendarEvent> {
  constructor(@InjectModel(CalendarEvent.name) model: Model<CalendarEvent>, auditService: AuditService) {
    super(model, auditService, null, 'CalendarEvent', (e) => `calendar event "${e.title}"`);
  }

  list(query: { from?: string; to?: string; upcoming?: string; limit?: string }) {
    const filter: any = {};
    if (query.upcoming === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filter.date = { $gte: today };
    }
    if (query.from || query.to) {
      filter.date = { ...(filter.date || {}) };
      if (query.from) filter.date.$gte = new Date(query.from);
      if (query.to) filter.date.$lte = new Date(query.to);
    }
    let q = this.model.find(filter).sort({ date: 1, startTime: 1 });
    const limit = query.limit ? parseInt(query.limit, 10) : 0;
    if (limit > 0) q = q.limit(limit);
    return q.exec();
  }
}
