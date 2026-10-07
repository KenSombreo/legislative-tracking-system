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

@Injectable()
export class LegislationService {
  constructor(
    @InjectModel(LegislativeDocument.name) private docModel: Model<LegislativeDocument>,
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

  async findAll(query: QueryLegislationDto, presetType?: DocumentType, role?: string) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const filter: any = {};

    if (query.approvalStatus && query.approvalStatus !== ApprovalStatus.APPROVED && role === UserRole.ADMIN) {
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

    let textSearchUsed = false;
    if (query.search) {
      const term = query.search.trim();
      if (term) {
        filter.$text = { $search: term };
        textSearchUsed = true;
      }
    }

    let mongoQuery = this.docModel.find(filter);
    if (!textSearchUsed && query.search) {
      const regex = new RegExp(query.search, 'i');
      mongoQuery = this.docModel.find({
        ...filter,
        $or: [
          { documentNumber: regex },
          { title: regex },
          { classification: regex },
          { author: regex },
          { sponsor: regex },
          { status: regex },
          { remarks: regex },
        ],
      });
    }

    const sort: any = query.sort ? this.parseSort(query.sort) : { createdAt: -1 };

    const [data, total] = await Promise.all([
      mongoQuery.clone().sort(sort).skip((page - 1) * limit).limit(limit).populate('createdBy', 'fullName username').exec(),
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

  async remove(id: string, userId: string) {
    const doc = await this.findById(id);
    await this.docModel.deleteOne({ _id: id }).exec();
    await this.auditService.log(userId, 'DELETE', 'LegislativeDocument', id, `Deleted ${doc.documentType} ${doc.documentNumber}`);
    return { success: true };
  }

  async distinctYears() {
    const years = await this.docModel.distinct('year').exec();
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
