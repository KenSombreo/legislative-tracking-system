import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Status } from './schemas/status.schema';

@Injectable()
export class StatusesService {
  constructor(@InjectModel(Status.name) private model: Model<Status>) {}

  findAll() {
    return this.model.find().sort({ sortOrder: 1, name: 1 }).exec();
  }

  async create(data: Partial<Status>) {
    return new this.model(data).save();
  }

  async update(id: string, data: Partial<Status>) {
    const item = await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!item) throw new NotFoundException('Status not found');
    return item;
  }

  async remove(id: string) {
    const item = await this.model.findByIdAndDelete(id).exec();
    if (!item) throw new NotFoundException('Status not found');
    return { success: true };
  }
}
