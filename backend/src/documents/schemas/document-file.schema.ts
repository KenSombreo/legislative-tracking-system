import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum DocumentCategory {
  MAIN_DOCUMENT = 'MAIN_DOCUMENT',
  SUPPORTING_DOCUMENT = 'SUPPORTING_DOCUMENT',
  ATTACHMENT = 'ATTACHMENT',
}

export enum TextStatus {
  PENDING = 'PENDING',
  // The PDF already had a text layer.
  TEXT = 'TEXT',
  // Scanned PDF that was run through OCR; the stored file is now the searchable version.
  OCR = 'OCR',
  // Scanned PDF, but the server has no OCR tool installed.
  NO_TEXT = 'NO_TEXT',
  FAILED = 'FAILED',
  // Not a PDF.
  NOT_APPLICABLE = 'NOT_APPLICABLE',
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

  // Whether the public kiosk may show this file (when its record is released). Files uploaded
  // before this field existed count as public only if they are the main document.
  @Prop({ type: Boolean })
  isPublic?: boolean;

  // Words in the file, used by search. Not returned unless asked for.
  @Prop({ type: String, default: '', select: false })
  extractedText: string;

  @Prop({ type: String, enum: TextStatus, default: TextStatus.PENDING })
  textStatus: TextStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  uploadedBy: Types.ObjectId;
}

export const DocumentFileSchema = SchemaFactory.createForClass(DocumentFile);

DocumentFileSchema.index({ extractedText: 'text' });

// Mongo filter for files the public may open.
export const PUBLIC_FILE_FILTER = {
  $or: [{ isPublic: true }, { isPublic: { $exists: false }, documentCategory: DocumentCategory.MAIN_DOCUMENT }],
};
