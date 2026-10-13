import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PublicController } from './public.controller';
import { ActivityDocsModule } from '../activity-docs/activity-docs.module';
import { SbMember, SbMemberSchema } from '../sb-members/sb-member.schema';
import { CalendarEvent, CalendarEventSchema } from '../calendar/calendar-event.schema';
import { LegislationModule } from '../legislation/legislation.module';
import { DocumentsModule } from '../documents/documents.module';
import { DocumentRequestsModule } from '../document-requests/document-requests.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    LegislationModule,
    DocumentsModule,
    DocumentRequestsModule,
    AuditLogsModule,
    ActivityDocsModule,
    // Read-only views of the council roster and the session calendar.
    MongooseModule.forFeature([
      { name: SbMember.name, schema: SbMemberSchema },
      { name: CalendarEvent.name, schema: CalendarEventSchema },
    ]),
  ],
  controllers: [PublicController],
})
export class PublicModule {}
