import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import * as fs from 'fs';
import { ActivityDoc } from './activity-doc.schema';
import { AuditService } from '../audit-logs/audit.service';
import { BaseCrudService } from '../common/crud/base-crud.service';
import { STORAGE_PROVIDER, StorageProvider } from '../common/storage/storage-provider.interface';

export const ALLOWED_MEDIA_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

// What the public portal may see of an activity (not who encoded it).
export const PUBLIC_ACTIVITY_FIELDS = 'title date category venue description media';

@Injectable()
export class ActivityDocsService extends BaseCrudService<ActivityDoc> {
  constructor(
    @InjectModel(ActivityDoc.name) model: Model<ActivityDoc>,
    auditService: AuditService,
    @Inject(STORAGE_PROVIDER) storageProvider: StorageProvider,
  ) {
    super(model, auditService, storageProvider, 'ActivityDoc', (d) => `documentation "${d.title}"`);
  }

  list(filter: FilterQuery<ActivityDoc> = {}) {
    return this.findAll(filter, { date: -1, createdAt: -1 });
  }

  listPublic() {
    return this.model.find({ isPublic: true, 'media.0': { $exists: true } }).sort({ date: -1 }).limit(200).select(PUBLIC_ACTIVITY_FIELDS).lean().exec();
  }

  // Multer writes uploads to temp files so large videos are not held in memory all at once.
  async addMedia(id: string, files: Express.Multer.File[], userId: string) {
    try {
      if (!files?.length) throw new BadRequestException('No file provided');
      const bad = files.find((f) => !ALLOWED_MEDIA_TYPES.includes(f.mimetype));
      if (bad) throw new BadRequestException(`${bad.originalname}: only photos (JPG, PNG, WEBP, GIF) and videos (MP4, WEBM, MOV) are allowed`);

      const doc = await this.findById(id);
      for (const f of files) {
        const { storagePath } = await this.storageProvider!.upload(await fs.promises.readFile(f.path), f.originalname);
        doc.media.push({ storagePath, originalFileName: f.originalname, mimeType: f.mimetype, fileSize: f.size, caption: null });
      }
      doc.updatedBy = userId as any;
      await doc.save();
      await this.auditService.log(userId, 'UPDATE', this.entityType, doc._id, `Added ${files.length} photo/video file(s) to ${this.describe(doc)}`);
      return doc;
    } finally {
      await Promise.all((files || []).map((f) => fs.promises.unlink(f.path).catch(() => {})));
    }
  }

  async updateMedia(id: string, mediaId: string, caption: string | null | undefined, userId: string) {
    const doc = await this.findById(id);
    const item = this.mediaOf(doc, mediaId);
    item.caption = caption?.trim() || null;
    doc.updatedBy = userId as any;
    await doc.save();
    return doc;
  }

  async removeMedia(id: string, mediaId: string, userId: string) {
    const doc = await this.findById(id);
    const item = this.mediaOf(doc, mediaId);
    await this.storageProvider!.delete(item.storagePath);
    doc.media.pull(item._id);
    doc.updatedBy = userId as any;
    await doc.save();
    await this.auditService.log(userId, 'UPDATE', this.entityType, doc._id, `Removed ${item.originalFileName} from ${this.describe(doc)}`);
    return doc;
  }

  async remove(id: string, userId: string) {
    const doc = await this.findById(id);
    await Promise.all(doc.media.map((m) => this.storageProvider!.delete(m.storagePath)));
    await this.model.deleteOne({ _id: id }).exec();
    await this.auditService.log(userId, 'DELETE', this.entityType, id, `Deleted ${this.describe(doc)}`);
    return { success: true };
  }

  async getMedia(id: string, mediaId: string, publicOnly = false) {
    const doc = await this.findById(id);
    if (publicOnly && !doc.isPublic) throw new NotFoundException('File not found');
    return this.mediaOf(doc, mediaId);
  }

  readStream(storagePath: string, range?: { start: number; end: number }) {
    return this.storageProvider!.readStream(storagePath, range);
  }

  private mediaOf(doc: ActivityDoc, mediaId: string) {
    const item = Types.ObjectId.isValid(mediaId) ? doc.media.id(mediaId) : null;
    if (!item) throw new NotFoundException('File not found');
    return item;
  }
}
