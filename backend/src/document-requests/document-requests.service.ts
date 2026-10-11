import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomInt } from 'crypto';
import { DocumentRequest, RequestStatus } from './document-request.schema';
import { CreateDocumentRequestDto, QueryDocumentRequestDto, UpdateDocumentRequestDto } from './document-request.dto';
import { AuditService } from '../audit-logs/audit.service';

// No 0/O or 1/I, so codes read out over the counter are not misheard.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class DocumentRequestsService {
  constructor(
    @InjectModel(DocumentRequest.name) private model: Model<DocumentRequest>,
    private auditService: AuditService,
  ) {}

  private newCode() {
    let suffix = '';
    for (let i = 0; i < 6; i++) suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    return `DR-${new Date().getFullYear()}-${suffix}`;
  }

  async create(dto: CreateDocumentRequestDto) {
    if (!dto.contactNumber?.trim() && !dto.email?.trim()) {
      throw new BadRequestException('Please give a contact number or an email address so we can reach you.');
    }
    const { website: _honeypot, ...data } = dto;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const request = await this.model.create({ ...data, referenceCode: this.newCode() });
        await this.auditService.log(
          null,
          'CREATE',
          'DocumentRequest',
          request._id,
          `Public request ${request.referenceCode} for: ${request.requestedDocuments.slice(0, 120)}`,
        );
        return { referenceCode: request.referenceCode, status: request.status, createdAt: (request as any).createdAt };
      } catch (err: any) {
        if (err?.code !== 11000) throw err; // retry only on a duplicate reference code
      }
    }
    throw new BadRequestException('Could not file the request, please try again.');
  }

  // What the requester sees when looking up their code: no contact details.
  async findByCode(code: string) {
    const request = await this.model
      .findOne({ referenceCode: code.trim().toUpperCase() })
      .select('referenceCode requestedDocuments copies certifiedTrueCopy status responseMessage createdAt updatedAt')
      .lean()
      .exec();
    if (!request) throw new NotFoundException('No request found with that reference code');
    return request;
  }

  async findAll(query: QueryDocumentRequestDto) {
    const page = Math.max(parseInt(query.page || '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit || '20', 10) || 20, 1), 100);
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.search?.trim()) {
      const regex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ referenceCode: regex }, { requesterName: regex }, { requestedDocuments: regex }];
    }
    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('handledBy', 'fullName username')
        .populate('legislativeDocumentId', 'documentType documentNumber title')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  countOpen() {
    return this.model.countDocuments({ status: { $in: [RequestStatus.PENDING, RequestStatus.PROCESSING] } }).exec();
  }

  async update(id: string, dto: UpdateDocumentRequestDto, userId: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Request not found');
    const request = await this.model.findById(id).exec();
    if (!request) throw new NotFoundException('Request not found');
    const before = request.toObject();
    Object.assign(request, dto);
    request.handledBy = userId as any;
    await request.save();
    await this.auditService.log(
      userId,
      'UPDATE',
      'DocumentRequest',
      request._id,
      `Updated request ${request.referenceCode}${dto.status ? ` to ${dto.status}` : ''}`,
      AuditService.diff(before, dto as any),
    );
    return request;
  }
}
