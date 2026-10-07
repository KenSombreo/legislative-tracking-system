import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SbMember extends Document {
  @Prop({ required: true, trim: true })
  fullName: string;

  // e.g. Vice Mayor / Presiding Officer, SB Member, Liga ng mga Barangay President, SK Federation President
  @Prop({ required: true, trim: true })
  position: string;

  @Prop({ type: [String], default: [] })
  committees: string[];

  @Prop({ type: String, default: null })
  contactNumber: string | null;

  @Prop({ type: String, default: null })
  email: string | null;

  @Prop({ type: Date, default: null })
  termStart: Date | null;

  @Prop({ type: Date, default: null })
  termEnd: Date | null;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId | null;
}

export const SbMemberSchema = SchemaFactory.createForClass(SbMember);
