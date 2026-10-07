import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LegislativeDocument } from '../legislation/schemas/legislative-document.schema';
import { DocumentType } from '../common/config/legislation-fields.config';

const PENDING_STATUSES = ['PENDING', 'FOR_REVIEW', 'DRAFT'];
const APPROVED_STATUSES = ['APPROVED', 'ENACTED', 'ADOPTED'];
const ARCHIVED_STATUSES = ['ARCHIVED'];
// Uploads still waiting for (or refused) admin approval are not part of the official record.
const APPROVED_ONLY = { approvalStatus: { $nin: ['PENDING', 'REJECTED'] } };

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(LegislativeDocument.name) private docModel: Model<LegislativeDocument>,
  ) {}

  async summary(year?: number) {
    const match: any = { ...APPROVED_ONLY };
    if (year) match.year = year;

    const [total, ordinances, resolutions, appropriations, statusBuckets] = await Promise.all([
      this.docModel.countDocuments(match).exec(),
      this.docModel.countDocuments({ ...match, documentType: DocumentType.ORDINANCE }).exec(),
      this.docModel.countDocuments({ ...match, documentType: DocumentType.RESOLUTION }).exec(),
      this.docModel.countDocuments({ ...match, documentType: DocumentType.APPROPRIATION_ORDINANCE }).exec(),
      this.docModel.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
    ]);

    let pending = 0, approved = 0, archived = 0;
    for (const bucket of statusBuckets) {
      const status = (bucket._id || '').toString().toUpperCase();
      if (PENDING_STATUSES.includes(status)) pending += bucket.count;
      else if (APPROVED_STATUSES.includes(status)) approved += bucket.count;
      else if (ARCHIVED_STATUSES.includes(status)) archived += bucket.count;
    }

    return {
      total,
      ordinances,
      resolutions,
      appropriationOrdinances: appropriations,
      pending,
      approved,
      archived,
    };
  }

  async byYear() {
    return this.docModel.aggregate([
      { $match: APPROVED_ONLY },
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]).exec();
  }

  async byStatus() {
    return this.docModel.aggregate([
      { $match: APPROVED_ONLY },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).exec();
  }

  async byClassification() {
    return this.docModel.aggregate([
      { $match: APPROVED_ONLY },
      { $group: { _id: '$classification', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).exec();
  }
}
