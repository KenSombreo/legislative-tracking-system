import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Query, Req, Res } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request, Response } from 'express';
import { SbMember } from '../sb-members/sb-member.schema';
import { CalendarEvent, CalendarEventType } from '../calendar/calendar-event.schema';
import { ActivityDocsService } from '../activity-docs/activity-docs.service';
import { streamMedia } from '../activity-docs/stream-media';
import { Public } from '../common/decorators/public.decorator';
import { LegislationService } from '../legislation/legislation.service';
import { QueryLegislationDto } from '../legislation/dto/query-legislation.dto';
import { DocumentsService } from '../documents/documents.service';
import { DocumentRequestsService } from '../document-requests/document-requests.service';
import { CreateDocumentRequestDto } from '../document-requests/document-request.dto';
import { AuditService } from '../audit-logs/audit.service';

const REQUEST_LIMIT = 5;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;

const SESSION_TYPES = [CalendarEventType.REGULAR_SESSION, CalendarEventType.SPECIAL_SESSION];
const EVENT_FIELDS = 'eventType title date startTime venue committee description';

// Midnight today in the Philippines (UTC+8, no DST), as a UTC instant.
function startOfTodayPh() {
  const ph = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return new Date(Date.UTC(ph.getUTCFullYear(), ph.getUTCMonth(), ph.getUTCDate()) - 8 * 60 * 60 * 1000);
}

/**
 * Read-only endpoints for the public kiosk and the pages opened from QR codes. Only records an
 * ADMIN has released (approved + public) and their released files are reachable here.
 */
@Public()
@Controller('public')
export class PublicController {
  // Per-IP count of request-form submissions, to keep the form from being flooded.
  private submissions = new Map<string, number[]>();

  constructor(
    private legislationService: LegislationService,
    private documentsService: DocumentsService,
    private requestsService: DocumentRequestsService,
    private auditService: AuditService,
    @InjectModel(SbMember.name) private memberModel: Model<SbMember>,
    @InjectModel(CalendarEvent.name) private eventModel: Model<CalendarEvent>,
    private activityDocs: ActivityDocsService,
  ) {}

  @Get('legislation')
  list(@Query() query: QueryLegislationDto) {
    return this.legislationService.findAll(query, undefined, undefined, { publicOnly: true });
  }

  @Get('legislation/years')
  years() {
    return this.legislationService.distinctYears(true);
  }

  @Get('summary')
  async summary() {
    const [counts, nextSession] = await Promise.all([
      this.legislationService.publicSummary(),
      this.eventModel
        .findOne({ eventType: { $in: SESSION_TYPES }, date: { $gte: startOfTodayPh() } })
        .sort({ date: 1, startTime: 1 })
        .select(EVENT_FIELDS)
        .lean()
        .exec(),
    ]);
    return { ...counts, nextSession };
  }

  // Photos and videos of activities the office has marked public.
  @Get('activities')
  activities() {
    return this.activityDocs.listPublic();
  }

  @Get('activities/:id/media/:mediaId')
  async activityMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @Query('download') download: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    streamMedia(this.activityDocs, await this.activityDocs.getMedia(id, mediaId, true), download, req, res);
  }

  // Sitting members only; contact numbers and e-mail stay internal.
  @Get('members')
  members() {
    return this.memberModel
      .find({ isActive: true })
      .sort({ sortOrder: 1, fullName: 1 })
      .select('fullName position committees termStart termEnd')
      .lean()
      .exec();
  }

  // Upcoming sessions and hearings, and those of the last 90 days.
  @Get('sessions')
  async sessions() {
    const today = startOfTodayPh();
    const since = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
    const [upcoming, past] = await Promise.all([
      this.eventModel.find({ eventType: { $ne: CalendarEventType.OTHER }, date: { $gte: today } }).sort({ date: 1, startTime: 1 }).limit(50).select(EVENT_FIELDS).lean().exec(),
      this.eventModel.find({ eventType: { $ne: CalendarEventType.OTHER }, date: { $gte: since, $lt: today } }).sort({ date: -1, startTime: -1 }).limit(50).select(EVENT_FIELDS).lean().exec(),
    ]);
    return { upcoming, past };
  }

  @Get('legislation/:id')
  async findOne(@Param('id') id: string) {
    const record = await this.legislationService.findPublicById(id);
    const files = await this.documentsService.findPublicForRecord(id);
    return { ...record, documents: files };
  }

  @Get('documents/:id')
  async stream(@Param('id') id: string, @Query('download') download: string, @Res() res: Response) {
    const doc = await this.documentsService.findPublicById(id);
    if (download) {
      await this.auditService.log(null, 'PUBLIC_DOWNLOAD', 'DocumentFile', doc._id, `Public download of ${doc.originalFileName}`);
    }
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(doc.originalFileName)}`,
    );
    this.documentsService
      .getStorageProvider()
      .readStream(doc.storagePath)
      .on('error', () => {
        if (!res.headersSent) res.status(404).json({ message: 'File not found' });
        else res.end();
      })
      .pipe(res);
  }

  @Post('document-requests')
  createRequest(@Body() dto: CreateDocumentRequestDto, @Req() req: Request) {
    this.throttle(req);
    // Bots fill the hidden field; pretend it worked so they do not retry.
    if (dto.website) return { referenceCode: null, status: 'PENDING' };
    return this.requestsService.create(dto);
  }

  @Get('document-requests/:code')
  findRequest(@Param('code') code: string) {
    return this.requestsService.findByCode(code);
  }

  private throttle(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() || req.ip || 'unknown';
    const now = Date.now();
    const recent = (this.submissions.get(ip) || []).filter((t) => now - t < REQUEST_WINDOW_MS);
    if (recent.length >= REQUEST_LIMIT) {
      throw new HttpException('Too many requests from this device. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    this.submissions.set(ip, recent);
    if (this.submissions.size > 10000) {
      for (const [key, times] of this.submissions) {
        if (times.every((t) => now - t >= REQUEST_WINDOW_MS)) this.submissions.delete(key);
      }
    }
  }
}
