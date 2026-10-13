import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LegislativeDocument } from '../legislation/schemas/legislative-document.schema';
import { SessionMinutes } from '../minutes/minutes.schema';
import { CommitteeReport } from '../committee-reports/committee-report.schema';
import { DocumentRequest } from '../document-requests/document-request.schema';
import { ActivityDoc } from '../activity-docs/activity-doc.schema';

const APPROVED_ONLY = { approvalStatus: { $nin: ['PENDING', 'REJECTED'] } };

// Dates are entered in Philippine time, so period boundaries are PH midnights.
function phDate(year: number, month: number) {
  return new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+08:00`);
}

function countBy<T>(items: T[], key: (item: T) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item) || 'Unspecified';
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

/**
 * Quarterly / annual report: what the Sanggunian enacted, adopted and did in a period. A measure
 * belongs to the period of its date enacted (ordinances) or date adopted (resolutions).
 */
@Injectable()
export class PeriodReportService {
  constructor(
    @InjectModel(LegislativeDocument.name) private docModel: Model<LegislativeDocument>,
    @InjectModel(SessionMinutes.name) private minutesModel: Model<SessionMinutes>,
    @InjectModel(CommitteeReport.name) private committeeModel: Model<CommitteeReport>,
    @InjectModel(DocumentRequest.name) private requestModel: Model<DocumentRequest>,
    @InjectModel(ActivityDoc.name) private activityModel: Model<ActivityDoc>,
  ) {}

  async build(year: number, quarter?: number) {
    if (!Number.isInteger(year) || year < 1900 || year > 3000) throw new BadRequestException('Invalid year');
    if (quarter !== undefined && ![1, 2, 3, 4].includes(quarter)) throw new BadRequestException('Quarter must be 1-4');

    const from = phDate(year, quarter ? (quarter - 1) * 3 + 1 : 1);
    const to = quarter && quarter < 4 ? phDate(year, quarter * 3 + 1) : phDate(year + 1, 1);
    const range = { $gte: from, $lt: to };

    const [measures, approvedByLce, sessions, committeeReports, requests, inProcess, documentation] = await Promise.all([
      this.docModel
        .find({ ...APPROVED_ONLY, $or: [{ dateEnacted: range }, { dateAdopted: range }] })
        .select('documentType documentNumber year title classification author sponsor status dateEnacted dateAdopted dateApprovedByLCE stage')
        .lean()
        .exec(),
      this.docModel.countDocuments({ ...APPROVED_ONLY, dateApprovedByLCE: range }).exec(),
      this.minutesModel
        .find({ sessionDate: range })
        .select('sessionType sessionNumber sessionDate presidingOfficer status')
        .sort({ sessionDate: 1 })
        .lean()
        .exec(),
      this.committeeModel
        .find({ dateSubmitted: range })
        .select('reportNumber committee title dateSubmitted relatedMeasure recommendation')
        .sort({ dateSubmitted: 1 })
        .lean()
        .exec(),
      this.requestModel.find({ createdAt: range }).select('status certifiedTrueCopy copies').lean().exec(),
      // Filed but not yet enacted/adopted. Current state, not as of the period end.
      this.docModel
        .find({ ...APPROVED_ONLY, dateEnacted: null, dateAdopted: null, createdAt: { $lt: to } })
        .select('documentType documentNumber year title author sponsor status stage stageHistory createdAt')
        .sort({ createdAt: 1 })
        .lean()
        .exec(),
      // Photo / video documentation of activities in the period; only those with files.
      this.activityModel
        .find({ date: range, 'media.0': { $exists: true } })
        .select('title date category venue description media')
        .sort({ date: 1 })
        .lean()
        .exec(),
    ]);

    const enactedDate = (m: (typeof measures)[number]) => (m.dateEnacted || m.dateAdopted) as Date;
    measures.sort((a, b) => +enactedDate(a) - +enactedDate(b));

    const quarters = quarter
      ? null
      : [1, 2, 3, 4].map((q) => {
          const qFrom = phDate(year, (q - 1) * 3 + 1);
          const qTo = q < 4 ? phDate(year, q * 3 + 1) : phDate(year + 1, 1);
          const within = (d: Date | null | undefined) => !!d && d >= qFrom && d < qTo;
          return {
            quarter: q,
            ordinances: measures.filter((m) => m.documentType !== 'RESOLUTION' && within(enactedDate(m))).length,
            resolutions: measures.filter((m) => m.documentType === 'RESOLUTION' && within(enactedDate(m))).length,
            sessions: sessions.filter((s) => within(s.sessionDate)).length,
            committeeReports: committeeReports.filter((c) => within(c.dateSubmitted)).length,
          };
        });

    return {
      period: { year, quarter: quarter ?? null, from, to: new Date(+to - 1), generatedAt: new Date() },
      totals: {
        ordinances: measures.filter((m) => m.documentType === 'ORDINANCE').length,
        appropriationOrdinances: measures.filter((m) => m.documentType === 'APPROPRIATION_ORDINANCE').length,
        resolutions: measures.filter((m) => m.documentType === 'RESOLUTION').length,
        approvedByLce,
        regularSessions: sessions.filter((s) => s.sessionType === 'REGULAR').length,
        specialSessions: sessions.filter((s) => s.sessionType === 'SPECIAL').length,
        committeeReports: committeeReports.length,
        documentRequests: requests.length,
        documentRequestsReleased: requests.filter((r) => r.status === 'RELEASED' || r.status === 'READY').length,
        inProcess: inProcess.length,
        activitiesDocumented: documentation.length,
      },
      byClassification: countBy(measures, (m) => m.classification),
      byAuthor: countBy(measures, (m) => m.author || m.sponsor),
      byCommittee: countBy(committeeReports, (c) => c.committee),
      quarters,
      measures,
      sessions,
      committeeReports,
      inProcess,
      documentation,
    };
  }
}
