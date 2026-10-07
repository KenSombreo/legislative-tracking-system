import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Classification extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ type: [String], default: [] })
  documentTypes: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const ClassificationSchema = SchemaFactory.createForClass(Classification);
