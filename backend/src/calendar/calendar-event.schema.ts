import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CalendarEventType {
  REGULAR_SESSION = 'REGULAR_SESSION',
  SPECIAL_SESSION = 'SPECIAL_SESSION',
  COMMITTEE_HEARING = 'COMMITTEE_HEARING',
  OTHER = 'OTHER',
}

@Schema({ timestamps: true })
export class CalendarEvent extends Document {
  @Prop({ type: String, enum: CalendarEventType, default: CalendarEventType.REGULAR_SESSION })
  eventType: CalendarEventType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Date, required: true, index: true })
  date: Date;

  // "HH:mm", kept separate from date so all-day items need no time.
  @Prop({ type: String, default: null })
  startTime: string | null;

  @Prop({ type: String, default: null })
  venue: string | null;

  @Prop({ type: String, default: null })
  committee: string | null;

  // e.g. agenda items or measures to be taken up
  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId | null;
}

export const CalendarEventSchema = SchemaFactory.createForClass(CalendarEvent);
