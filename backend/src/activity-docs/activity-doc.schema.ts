import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ActivityCategory {
  SESSION = 'SESSION',
  COMMITTEE_HEARING = 'COMMITTEE_HEARING',
  PUBLIC_HEARING = 'PUBLIC_HEARING',
  OUTREACH = 'OUTREACH',
  TRAINING = 'TRAINING',
  OTHER = 'OTHER',
}

@Schema({ timestamps: false })
export class ActivityMedia {
  _id: Types.ObjectId;

  @Prop({ required: true })
  storagePath: string;

  @Prop({ required: true })
  originalFileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  fileSize: number;

  @Prop({ type: String, default: null })
  caption: string | null;
}

export const ActivityMediaSchema = SchemaFactory.createForClass(ActivityMedia);

/** Photo / video documentation of an SB activity, for the accomplishment report and (when released) the public portal. */
@Schema({ timestamps: true })
export class ActivityDoc extends Document {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Date, required: true, index: true })
  date: Date;

  @Prop({ type: String, enum: ActivityCategory, default: ActivityCategory.OTHER })
  category: ActivityCategory;

  @Prop({ type: String, default: null })
  venue: string | null;

  @Prop({ type: String, default: null })
  description: string | null;

  // Shown on the public portal's Photos & videos page.
  @Prop({ default: false, index: true })
  isPublic: boolean;

  @Prop({ type: [ActivityMediaSchema], default: [] })
  media: Types.DocumentArray<ActivityMedia & Types.Subdocument>;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId | null;
}

export const ActivityDocSchema = SchemaFactory.createForClass(ActivityDoc);
