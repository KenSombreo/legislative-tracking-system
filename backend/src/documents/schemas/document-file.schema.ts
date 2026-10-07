import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum DocumentCategory {
  MAIN_DOCUMENT = 'MAIN_DOCUMENT',
  SUPPORTING_DOCUMENT = 'SUPPORTING_DOCUMENT',
  ATTACHMENT = 'ATTACHMENT',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class DocumentFile extends Document {
  @Prop({ type: Types.ObjectId, ref: 'LegislativeDocument', index: true, required: true })
  legislativeDocumentId: Types.ObjectId;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  originalFileName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  fileSize: number;

  @Prop({ required: true })
  storagePath: string;

  @Prop({ required: true })
  fileUrl: string;

  @Prop({ type: String, enum: DocumentCategory, required: true })
  documentCategory: DocumentCategory;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  uploadedBy: Types.ObjectId;
}

export const DocumentFileSchema = SchemaFactory.createForClass(DocumentFile);
