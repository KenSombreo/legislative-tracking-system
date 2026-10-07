import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CalendarEvent, CalendarEventSchema } from './calendar-event.schema';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: CalendarEvent.name, schema: CalendarEventSchema }]), AuditLogsModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
