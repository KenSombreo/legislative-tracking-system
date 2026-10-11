import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum RequestStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  RELEASED = 'RELEASED',
  DENIED = 'DENIED',
}

// A citizen's request for a copy of a legislative record, filed from the public portal.
@Schema({ timestamps: true })
export class DocumentRequest extends Document {
  // Given to the requester to check on the request without logging in.
  @Prop({ required: true, unique: true })
  referenceCode: string;

  @Prop({ required: true })
  requesterName: string;

  @Prop({ type: String, default: null })
  contactNumber: string | null;

  @Prop({ type: String, default: null })
  email: string | null;

  @Prop({ type: String, default: null })
  address: string | null;

  // What they want, in their words (e.g. "Ordinance No. 2023-05, Tricycle franchise").
  @Prop({ required: true })
  requestedDocuments: string;

  @Prop({ type: Types.ObjectId, ref: 'LegislativeDocument', default: null })
  legislativeDocumentId: Types.ObjectId | null;

  @Prop({ required: true })
  purpose: string;

  @Prop({ default: 1 })
  copies: number;

  @Prop({ default: false })
  certifiedTrueCopy: boolean;

  @Prop({ type: String, enum: RequestStatus, default: RequestStatus.PENDING, index: true })
  status: RequestStatus;

  // Shown to the requester when they look up their reference code.
  @Prop({ type: String, default: null })
  responseMessage: string | null;

  // Staff only.
  @Prop({ type: String, default: null })
  internalNotes: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  handledBy: Types.ObjectId | null;
}

export const DocumentRequestSchema = SchemaFactory.createForClass(DocumentRequest);
