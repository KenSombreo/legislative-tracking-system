import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Status extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: [String], default: [] })
  documentTypes: string[];

  @Prop({ default: '#64748b' })
  color: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const StatusSchema = SchemaFactory.createForClass(Status);
