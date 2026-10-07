import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  action: string;

  @Prop({ required: true, index: true })
  entityType: string;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  entityId: Types.ObjectId | null;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: Object, default: {} })
  changes: Record<string, { old: any; new: any }>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
