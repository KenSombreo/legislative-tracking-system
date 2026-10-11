import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApprovalStatus, LegislativeDocument } from './schemas/legislative-document.schema';
import { UserRole } from '../users/schemas/user.schema';
import { CreateLegislationDto } from './dto/create-legislation.dto';
import { UpdateLegislationDto } from './dto/update-legislation.dto';
import { QueryLegislationDto } from './dto/query-legislation.dto';
import { DocumentType, getRequiredFieldsForType } from '../common/config/legislation-fields.config';
import { AuditService } from '../audit-logs/audit.service';
import { DocumentFile } from '../documents/schemas/document-file.schema';
import { TrackingStage } from '../common/config/tracking-stages.config';
import { UpdateStageDto } from './dto/update-stage.dto';

// What the public kiosk / QR pages may see. Leaves out remarks (often internal notes), the
// people who encoded or reviewed the record, and the notes staff add to tracker steps.
export const PUBLIC_FIELDS = [
  'documentType',
  'documentNumber',
  'year',
  'title',
  'classification',
  'status',
  'dateEnacted',
  'dateAdopted',
  'dateApprovedByLCE',
  'dateEnactedApprovedBySP',
  'author',
  'sponsor',
  'spResolutionNumber',
  'sector',
  'onlineLink',
  'stage',
  'stageHistory.stage',
  'stageHistory.date',
  'updatedAt',
].join(' ');

// The record date each tracker step fills in when it is reached and the date is still empty.
const STAGE_DATE_FIELD: Partial<Record<TrackingStage, (type: DocumentType) => keyof LegislativeDocument | null>> = {
  [TrackingStage.THIRD_READING]: (type) => (type === DocumentType.RESOLUTION ? 'dateAdopted' : 'dateEnacted'),
  [TrackingStage.LCE_APPROVAL]: () => 'dateApprovedByLCE',
  [TrackingStage.EFFECTIVE]: (type) => (type === DocumentType.RESOLUTION ? null : 'dateEnactedApprovedBySP'),
};

@Injectable()
export class LegislationService {
  constructor(
    @InjectModel(LegislativeDocument.name) private docModel: Model<LegislativeDocument>,
    @InjectModel(DocumentFile.name) private fileModel: Model<DocumentFile>,
    private auditService: AuditService,
  ) {}

  validateRequiredFields(dto: Record<string, any>) {
    if (!dto.documentType) {
      throw new BadRequestException('documentType is required');
    }
    const required = getRequiredFieldsForType(dto.documentType as DocumentType);
    const missing = required.filter((field) => {
      const value = (dto as any)[field];
      return value === undefined || value === null || value === '';
    });
    if (missing.length > 0) {
      throw new BadRequestException(`Missing required fields for ${dto.documentType}: ${missing.join(', ')}`);
    }
  }

  async create(dto: CreateLegislationDto, userId: string, role?: string) {
    this.validateRequiredFields(dto);
    const isAdmin = role === UserRole.ADMIN;
    const doc = new this.docModel({
      ...dto,
      approvalStatus: isAdmin ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
      reviewedBy: isAdmin ? userId : null,
      reviewedAt: isAdmin ? new Date() : null,
      createdBy: userId,
      updatedBy: userId,
    });
    await doc.save();
    await this.auditService.log(
      userId,
      'CREATE',
      'LegislativeDocument',
      doc._id,
      `Created ${doc.documentType} ${doc.documentNumber}${isAdmin ? '' : ' (pending approval)'}`,
    );
    return doc;
  }

  async review(id: string, decision: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED, userId: string, reason?: string) {
    const doc = await this.findById(id);
    doc.approvalStatus = decision;
    doc.rejectionReason = decision === ApprovalStatus.REJECTED ? reason || null : null;
    doc.reviewedBy = userId as any;
    doc.reviewedAt = new Date();
    doc.updatedBy = userId as any;
    await doc.save();
    await this.auditService.log(
      userId,
      decision === ApprovalStatus.APPROVED ? 'APPROVE' : 'REJECT',
      'LegislativeDocument',
      doc._id,
      `${decision === ApprovalStatus.APPROVED ? 'Approved' : 'Rejected'} ${doc.documentType} ${doc.documentNumber}${reason ? `: ${reason}` : ''}`,
    );
    return doc;
  }

  // Ids of records whose number/title/author match, plus those whose uploaded files contain the
  // words (text pulled out of the PDFs, OCR'd when scanned).
  private async searchIds(term: string): Promise<Types.ObjectId[]> {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [byText, byField, byFile] = await Promise.all([
      this.docModel.find({ $text: { $search: term } }, { _id: 1 }).lean().exec(),
      this.docModel
        .find({ $or: [{ documentNumber: regex }, { title: regex }, { author: regex }, { sponsor: regex }, { classification: regex }] }, { _id: 1 })
        .lean()
        .exec(),
      // The files' text index is built in the background on first start; until then just skip file matches.
      this.fileModel
        .find({ $text: { $search: term } }, { legislativeDocumentId: 1 })
        .lean()
        .exec()
        .catch(() => []),
    ]);
    const ids = new Map<string, Types.ObjectId>();
    for (const d of [...byText, ...byField]) ids.set(String(d._id), d._id as Types.ObjectId);
    for (const f of byFile) ids.set(String(f.legislativeDocumentId), f.legislativeDocumentId as Types.ObjectId);
    return [...ids.values()];
  }

  async findAll(query: QueryLegislationDto, presetType?: DocumentType, role?: string, options: { publicOnly?: boolean } = {}) {
    const page = query.page ? Math.max(parseInt(query.page, 10) || 1, 1) : 1;
    const limit = query.limit ? Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100) : 20;
    const filter: any = {};

    if (options.publicOnly) {
      filter.approvalStatus = { $nin: [ApprovalStatus.PENDING, ApprovalStatus.REJECTED] };
      filter.isPublic = true;
    } else if (query.approvalStatus && query.approvalStatus !== ApprovalStatus.APPROVED && role === UserRole.ADMIN) {
      filter.approvalStatus = query.approvalStatus;
    } else {
      filter.approvalStatus = { $nin: [ApprovalStatus.PENDING, ApprovalStatus.REJECTED] };
    }

    const documentType = presetType || query.documentType;
    if (documentType) filter.documentType = documentType;
    if (query.year) filter.year = parseInt(query.year, 10);
    if (query.classification) filter.classification = query.classification;
    if (query.status) filter.status = query.status;
    if (query.author) filter.author = query.author;
    if (query.sponsor) filter.sponsor = query.sponsor;

    if (query.dateFrom || query.dateTo) {
      const range: any = {};
      if (query.dateFrom) range.$gte = new Date(query.dateFrom);
      if (query.dateTo) range.$lte = new Date(query.dateTo);
      filter.$or = [
        { dateEnacted: range },
        { dateAdopted: range },
      ];
    }

    const term = query.search?.trim();
    if (term) filter._id = { $in: await this.searchIds(term) };

    const mongoQuery = this.docModel.find(filter);
    // populate() would add createdBy back into a field selection, so the public query skips it.
    if (options.publicOnly) mongoQuery.select(PUBLIC_FIELDS);
    else mongoQuery.populate('createdBy', 'fullName username');

    const sort: any = query.sort ? this.parseSort(query.sort) : { createdAt: -1 };

    const [data, total] = await Promise.all([
      mongoQuery.clone().sort(sort).skip((page - 1) * limit).limit(limit).exec(),
      this.docModel.countDocuments(mongoQuery.getFilter()).exec(),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private parseSort(sort: string) {
    const desc = sort.startsWith('-');
    const field = desc ? sort.substring(1) : sort;
    return { [field]: desc ? -1 : 1 };
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Legislation not found');
    const doc = await this.docModel
      .findById(id)
      .populate('documents')
      .populate('createdBy', 'fullName username')
      .populate('updatedBy', 'fullName username')
      .populate('reviewedBy', 'fullName username')
      .populate('stageHistory.changedBy', 'fullName username')
      .exec();
    if (!doc) throw new NotFoundException('Legislation not found');
    return doc;
  }

  async update(id: string, dto: UpdateLegislationDto, userId: string) {
    const doc = await this.findById(id);
    const before = doc.toObject();
    const merged = { ...before, ...dto };
    this.validateRequiredFields(merged as any);

    Object.assign(doc, dto);
    doc.updatedBy = userId as any;
    await doc.save();

    const changes = AuditService.diff(before, dto as any);
    await this.auditService.log(userId, 'UPDATE', 'LegislativeDocument', doc._id, `Updated ${doc.documentType} ${doc.documentNumber}`, changes);
    return doc;
  }

  async updateStage(id: string, dto: UpdateStageDto, userId: string) {
    const doc = await this.findById(id);
    const date = dto.date ? new Date(dto.date) : new Date();
    const previous = doc.stage;
    doc.stage = dto.stage;
    doc.stageHistory.push({ stage: dto.stage, date, note: dto.note?.trim() || null, changedBy: userId as any });

    const dateField = STAGE_DATE_FIELD[dto.stage]?.(doc.documentType);
    if (dateField && !doc[dateField]) (doc as any)[dateField] = date;

    doc.updatedBy = userId as any;
    await doc.save();
    await this.auditService.log(
      userId,
      'UPDATE',
      'LegislativeDocument',
      doc._id,
      `Moved ${doc.documentType} ${doc.documentNumber} to ${dto.stage}`,
      { stage: { old: previous, new: dto.stage } },
    );
    return this.findById(id);
  }

  async setVisibility(id: string, isPublic: boolean, userId: string) {
    const doc = await this.findById(id);
    if (isPublic && doc.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new BadRequestException('Approve the record before releasing it to the public.');
    }
    const previous = doc.isPublic;
    doc.isPublic = isPublic;
    doc.updatedBy = userId as any;
    await doc.save();
    await this.auditService.log(
      userId,
      isPublic ? 'PUBLISH' : 'UNPUBLISH',
      'LegislativeDocument',
      doc._id,
      `${isPublic ? 'Released' : 'Withdrew'} ${doc.documentType} ${doc.documentNumber} ${isPublic ? 'to' : 'from'} the public portal`,
      { isPublic: { old: previous, new: isPublic } },
    );
    return this.findById(id);
  }

  // A record as the public sees it, or 404 when it is not (or no longer) released.
  async findPublicById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Record not found');
    const doc = await this.docModel
      .findOne({ _id: id, isPublic: true, approvalStatus: { $nin: [ApprovalStatus.PENDING, ApprovalStatus.REJECTED] } })
      .select(PUBLIC_FIELDS)
      .lean()
      .exec();
    if (!doc) throw new NotFoundException('Record not found');
    return doc;
  }

  async remove(id: string, userId: string) {
    const doc = await this.findById(id);
    await this.docModel.deleteOne({ _id: id }).exec();
    await this.auditService.log(userId, 'DELETE', 'LegislativeDocument', id, `Deleted ${doc.documentType} ${doc.documentNumber}`);
    return { success: true };
  }

  async distinctYears(publicOnly = false) {
    const filter = publicOnly
      ? { isPublic: true, approvalStatus: { $nin: [ApprovalStatus.PENDING, ApprovalStatus.REJECTED] } }
      : {};
    const years = await this.docModel.distinct('year', filter).exec();
    return years.sort((a, b) => b - a);
  }

  async addDocumentRef(legislativeDocumentId: string, documentFileId: any) {
    await this.docModel.updateOne(
      { _id: legislativeDocumentId },
      { $addToSet: { documents: documentFileId } },
    ).exec();
  }

  async removeDocumentRef(legislativeDocumentId: string, documentFileId: any) {
    await this.docModel.updateOne(
      { _id: legislativeDocumentId },
      { $pull: { documents: documentFileId } },
    ).exec();
  }
}
