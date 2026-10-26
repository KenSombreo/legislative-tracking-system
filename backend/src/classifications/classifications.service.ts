import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Classification } from './schemas/classification.schema';

// Categories that must always be offered; added on startup if missing.
const DEFAULT_CLASSIFICATIONS = ['Human Development'];

@Injectable()
export class ClassificationsService implements OnModuleInit {
  constructor(@InjectModel(Classification.name) private model: Model<Classification>) {}

  async onModuleInit() {
    for (const name of DEFAULT_CLASSIFICATIONS) {
      await this.model.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true }).exec();
    }
  }

  findAll() {
    return this.model.find().sort({ name: 1 }).exec();
  }

  async create(data: Partial<Classification>) {
    return new this.model(data).save();
  }

  async update(id: string, data: Partial<Classification>) {
    const item = await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!item) throw new NotFoundException('Classification not found');
    return item;
  }

  async remove(id: string) {
    const item = await this.model.findByIdAndDelete(id).exec();
    if (!item) throw new NotFoundException('Classification not found');
    return { success: true };
  }
}
