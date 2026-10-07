import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DocumentType } from '../../common/config/legislation-fields.config';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({ timestamps: true })
export class LegislativeDocument extends Document {
  @Prop({ type: String, enum: DocumentType, required: true, index: true })
  documentType: DocumentType;

  @Prop({ required: true })
  documentNumber: string;

  @Prop({ required: true })
  year: number;

  @Prop({ type: String, default: null })
  title: string | null;

  @Prop({ type: String, default: null, index: true })
  classification: string | null;

  @Prop({ type: String, default: null, index: true })
  status: string | null;

  @Prop({ type: String, default: null })
  remarks: string | null;

  @Prop({ type: Date, default: null, index: true })
  dateEnacted: Date | null;

  @Prop({ type: Date, default: null, index: true })
  dateAdopted: Date | null;

  @Prop({ type: Date, default: null, index: true })
  dateApprovedByLCE: Date | null;

  @Prop({ type: Date, default: null })
  dateEnactedApprovedBySP: Date | null;

  @Prop({ type: String, default: null, index: true })
  author: string | null;

  @Prop({ type: String, default: null, index: true })
  sponsor: string | null;

  @Prop({ type: String, default: null })
  spResolutionNumber: string | null;

  @Prop({ type: String, default: null })
  sector: string | null;

  @Prop({ type: String, default: null })
  onlineLink: string | null;

  @Prop({ type: [Types.ObjectId], ref: 'DocumentFile', default: [] })
  documents: Types.ObjectId[];

  // Records created by STAFF wait for an ADMIN to approve them before showing in the public lists.
  // Records without this field (created before approvals existed) count as approved.
  @Prop({ type: String, enum: ApprovalStatus, default: ApprovalStatus.APPROVED, index: true })
  approvalStatus: ApprovalStatus;

  @Prop({ type: String, default: null })
  rejectionReason: string | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  reviewedBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId | null;
}

export const LegislativeDocumentSchema = SchemaFactory.createForClass(LegislativeDocument);

LegislativeDocumentSchema.index({ documentType: 1, year: -1 });
LegislativeDocumentSchema.index({ documentNumber: 1, documentType: 1 });
LegislativeDocumentSchema.index({ title: 'text', remarks: 'text', documentNumber: 'text' });
