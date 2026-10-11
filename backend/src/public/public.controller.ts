import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { LegislationService } from '../legislation/legislation.service';
import { QueryLegislationDto } from '../legislation/dto/query-legislation.dto';
import { DocumentsService } from '../documents/documents.service';
import { DocumentRequestsService } from '../document-requests/document-requests.service';
import { CreateDocumentRequestDto } from '../document-requests/document-request.dto';
import { AuditService } from '../audit-logs/audit.service';

const REQUEST_LIMIT = 5;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;

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
  ) {}

  @Get('legislation')
  list(@Query() query: QueryLegislationDto) {
    return this.legislationService.findAll(query, undefined, undefined, { publicOnly: true });
  }

  @Get('legislation/years')
  years() {
    return this.legislationService.distinctYears(true);
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
