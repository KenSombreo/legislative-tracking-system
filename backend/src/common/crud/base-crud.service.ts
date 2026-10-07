import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Document, FilterQuery, Model, SortOrder, Types } from 'mongoose';
import { AuditService } from '../../audit-logs/audit.service';
import { StorageProvider } from '../storage/storage-provider.interface';

export const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

export interface Attachment {
  storagePath: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

// Shared create/read/update/delete + single-file attachment logic for simple record types
// (SB members, minutes, committee reports, calendar events).
export abstract class BaseCrudService<T extends Document> {
  protected constructor(
    protected model: Model<T>,
    protected auditService: AuditService,
    protected storageProvider: StorageProvider | null,
    protected entityType: string,
    protected describe: (doc: any) => string,
  ) {}

  findAll(filter: FilterQuery<T> = {}, sort: Record<string, SortOrder> = { createdAt: -1 }) {
    return this.model.find(filter).sort(sort).exec();
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException(`${this.entityType} not found`);
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(`${this.entityType} not found`);
    return doc;
  }

  async create(data: Record<string, any>, userId: string) {
    const doc = await new this.model({ ...data, createdBy: userId, updatedBy: userId }).save();
    await this.auditService.log(userId, 'CREATE', this.entityType, doc._id, `Created ${this.describe(doc)}`);
    return doc;
  }

  async update(id: string, data: Record<string, any>, userId: string) {
    const doc = await this.findById(id);
    const before = doc.toObject();
    Object.assign(doc, data, { updatedBy: userId });
    await doc.save();
    await this.auditService.log(
      userId,
      'UPDATE',
      this.entityType,
      doc._id,
      `Updated ${this.describe(doc)}`,
      AuditService.diff(before, data),
    );
    return doc;
  }

  async remove(id: string, userId: string) {
    const doc: any = await this.findById(id);
    if (doc.attachment?.storagePath && this.storageProvider) {
      await this.storageProvider.delete(doc.attachment.storagePath);
    }
    await this.model.deleteOne({ _id: id } as any).exec();
    await this.auditService.log(userId, 'DELETE', this.entityType, id, `Deleted ${this.describe(doc)}`);
    return { success: true };
  }

  async attachFile(id: string, file: Express.Multer.File, userId: string) {
    if (!this.storageProvider) throw new BadRequestException('Attachments are not supported');
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.mimetype)) throw new BadRequestException('File type not allowed');

    const doc: any = await this.findById(id);
    if (doc.attachment?.storagePath) await this.storageProvider.delete(doc.attachment.storagePath);

    const { storagePath } = await this.storageProvider.upload(file.buffer, file.originalname);
    doc.attachment = {
      storagePath,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    } as Attachment;
    doc.updatedBy = userId;
    await doc.save();
    await this.auditService.log(userId, 'UPDATE', this.entityType, doc._id, `Attached ${file.originalname} to ${this.describe(doc)}`);
    return doc;
  }

  async removeFile(id: string, userId: string) {
    const doc: any = await this.findById(id);
    if (doc.attachment?.storagePath && this.storageProvider) {
      await this.storageProvider.delete(doc.attachment.storagePath);
    }
    doc.attachment = null;
    doc.updatedBy = userId;
    await doc.save();
    await this.auditService.log(userId, 'UPDATE', this.entityType, doc._id, `Removed file from ${this.describe(doc)}`);
    return doc;
  }

  async getAttachment(id: string) {
    const doc: any = await this.findById(id);
    if (!doc.attachment?.storagePath || !this.storageProvider) throw new NotFoundException('No file attached');
    return {
      attachment: doc.attachment as Attachment,
      stream: this.storageProvider.readStream(doc.attachment.storagePath),
    };
  }
}
