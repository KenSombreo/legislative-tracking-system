import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Attachment } from '../common/crud/base-crud.service';

export enum SessionType {
  REGULAR = 'REGULAR',
  SPECIAL = 'SPECIAL',
}

export enum MinutesStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
}

export enum TranscriptStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

@Schema({ timestamps: true })
export class SessionMinutes extends Document {
  @Prop({ type: String, enum: SessionType, default: SessionType.REGULAR })
  sessionType: SessionType;

  // e.g. "32nd"
  @Prop({ required: true, trim: true })
  sessionNumber: string;

  @Prop({ type: Date, required: true, index: true })
  sessionDate: Date;

  @Prop({ type: String, default: null })
  venue: string | null;

  @Prop({ type: String, default: null })
  presidingOfficer: string | null;

  @Prop({ type: String, default: null })
  summary: string | null;

  @Prop({ type: String, enum: MinutesStatus, default: MinutesStatus.DRAFT })
  status: MinutesStatus;

  @Prop({ type: Date, default: null })
  dateApproved: Date | null;

  @Prop({ type: Object, default: null })
  attachment: Attachment | null;

  // Audio recording of the session, turned into text by the Whisper service (see TranscriptionService).
  @Prop({ type: Object, default: null })
  recording: Attachment | null;

  @Prop({ type: String, enum: TranscriptStatus, default: null })
  transcriptStatus: TranscriptStatus | null;

  // Editable after transcription so the secretary can correct names and terms.
  @Prop({ type: String, default: null })
  transcript: string | null;

  @Prop({ type: String, default: null })
  transcriptError: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId | null;
}

export const SessionMinutesSchema = SchemaFactory.createForClass(SessionMinutes);
