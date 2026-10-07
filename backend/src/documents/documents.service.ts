import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentFile, DocumentCategory } from './schemas/document-file.schema';
import { STORAGE_PROVIDER, StorageProvider } from '../common/storage/storage-provider.interface';
import { LegislationService } from '../legislation/legislation.service';
import { AuditService } from '../audit-logs/audit.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentFile.name) private docFileModel: Model<DocumentFile>,
    @Inject(STORAGE_PROVIDER) private storageProvider: StorageProvider,
    private legislationService: LegislationService,
    private auditService: AuditService,
  ) {}

  async upload(
    file: Express.Multer.File,
    legislativeDocumentId: string,
    documentCategory: DocumentCategory,
    userId: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('File type not allowed');
    }
    const { storagePath, fileUrl } = await this.storageProvider.upload(file.buffer, file.originalname);

    const docFile = new this.docFileModel({
      legislativeDocumentId,
      fileName: storagePath,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      storagePath,
      fileUrl,
      documentCategory,
      uploadedBy: userId,
    });
    await docFile.save();
    await this.legislationService.addDocumentRef(legislativeDocumentId, docFile._id);
    await this.auditService.log(userId, 'CREATE', 'DocumentFile', docFile._id, `Uploaded ${file.originalname}`);
    return docFile;
  }

  async findById(id: string) {
    const doc = await this.docFileModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async findAll() {
    return this.docFileModel.find().sort({ createdAt: -1 }).exec();
  }

  getStorageProvider() {
    return this.storageProvider;
  }

  async remove(id: string, userId: string) {
    const doc = await this.findById(id);
    await this.storageProvider.delete(doc.storagePath);
    await this.legislationService.removeDocumentRef(doc.legislativeDocumentId.toString(), doc._id);
    await this.docFileModel.deleteOne({ _id: id }).exec();
    await this.auditService.log(userId, 'DELETE', 'DocumentFile', id, `Deleted ${doc.originalFileName}`);
    return { success: true };
  }
}
