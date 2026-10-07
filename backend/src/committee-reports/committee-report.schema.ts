import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Attachment } from '../common/crud/base-crud.service';

@Schema({ timestamps: true })
export class CommitteeReport extends Document {
  @Prop({ required: true, trim: true })
  reportNumber: string;

  @Prop({ required: true, trim: true, index: true })
  committee: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Date, default: null, index: true })
  dateSubmitted: Date | null;

  // Measure this report is about, e.g. "Ord. No. 2026-07"
  @Prop({ type: String, default: null })
  relatedMeasure: string | null;

  // e.g. For approval, For approval with amendments, For further study
  @Prop({ type: String, default: null })
  recommendation: string | null;

  @Prop({ type: String, default: null })
  summary: string | null;

  @Prop({ type: Object, default: null })
  attachment: Attachment | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId | null;
}

export const CommitteeReportSchema = SchemaFactory.createForClass(CommitteeReport);
