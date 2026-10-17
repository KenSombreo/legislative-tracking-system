import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import { SessionMinutes, TranscriptStatus } from './minutes.schema';
import { TranscriptionService } from './transcription.service';
import { AuditService } from '../audit-logs/audit.service';
import { BaseCrudService } from '../common/crud/base-crud.service';
import { STORAGE_PROVIDER, StorageProvider } from '../common/storage/storage-provider.interface';

// Phones and recorders save audio under many types (m4a shows up as audio/x-m4a, audio/mp4, ...);
// Whisper decodes them all with FFmpeg, so take any audio, plus video in case the session was filmed.
// Some browsers send no type for less common formats (.amr, .wma), so fall back to the file extension.
const isRecording = (file: Express.Multer.File) =>
  /^(audio|video)\//.test(file.mimetype) || /\.(mp3|m4a|wav|aac|ogg|oga|opus|amr|flac|wma|webm|mp4|3gp)$/i.test(file.originalname);

@Injectable()
export class MinutesService extends BaseCrudService<SessionMinutes> {
  constructor(
    @InjectModel(SessionMinutes.name) model: Model<SessionMinutes>,
    auditService: AuditService,
    @Inject(STORAGE_PROVIDER) storageProvider: StorageProvider,
    private transcription: TranscriptionService,
  ) {
    super(model, auditService, storageProvider, 'SessionMinutes', (m) => `minutes of ${m.sessionNumber} session`);
  }

  list() {
    return this.findAll({}, { sessionDate: -1 });
  }

  async remove(id: string, userId: string) {
    const doc = await this.findById(id);
    if (doc.recording?.storagePath) await this.storageProvider!.delete(doc.recording.storagePath);
    return super.remove(id, userId);
  }

  // Multer writes the upload to a temp file so a long recording is not held in memory twice.
  async attachRecording(id: string, file: Express.Multer.File, userId: string) {
    try {
      if (!file) throw new BadRequestException('No file provided');
      if (!isRecording(file)) throw new BadRequestException('Only audio recordings (MP3, M4A, WAV, ...) are allowed');

      const doc = await this.findById(id);
      if (doc.recording?.storagePath) await this.storageProvider!.delete(doc.recording.storagePath);
      const { storagePath } = await this.storageProvider!.upload(await fs.promises.readFile(file.path), file.originalname);
      doc.recording = { storagePath, originalFileName: file.originalname, mimeType: file.mimetype, fileSize: file.size };
      this.resetTranscript(doc);
      doc.updatedBy = userId as any;
      await doc.save();
      await this.auditService.log(userId, 'UPDATE', this.entityType, doc._id, `Attached recording ${file.originalname} to ${this.describe(doc)}`);
      if (this.transcription.enabled) this.transcription.enqueue(String(doc._id));
      return doc;
    } finally {
      if (file?.path) await fs.promises.unlink(file.path).catch(() => {});
    }
  }

  async removeRecording(id: string, userId: string) {
    const doc = await this.findById(id);
    if (doc.recording?.storagePath) await this.storageProvider!.delete(doc.recording.storagePath);
    doc.recording = null;
    // Keep a finished transcript (it may have been corrected by hand); drop one that never finished.
    if (doc.transcriptStatus !== TranscriptStatus.DONE) doc.transcriptStatus = null;
    doc.transcriptError = null;
    doc.updatedBy = userId as any;
    await doc.save();
    await this.auditService.log(userId, 'UPDATE', this.entityType, doc._id, `Removed recording from ${this.describe(doc)}`);
    return doc;
  }

  // Runs the recording through Whisper again, replacing the current transcript.
  async retranscribe(id: string, userId: string) {
    const doc = await this.findById(id);
    if (!doc.recording) throw new BadRequestException('There is no recording to transcribe');
    if (!this.transcription.enabled) throw new BadRequestException('Transcription is not set up on this server');
    if (doc.transcriptStatus === TranscriptStatus.PENDING || doc.transcriptStatus === TranscriptStatus.PROCESSING) {
      throw new BadRequestException('This recording is already being transcribed');
    }
    this.resetTranscript(doc);
    doc.updatedBy = userId as any;
    await doc.save();
    await this.auditService.log(userId, 'UPDATE', this.entityType, doc._id, `Re-transcribed recording of ${this.describe(doc)}`);
    this.transcription.enqueue(String(doc._id));
    return doc;
  }

  async getRecording(id: string) {
    const doc = await this.findById(id);
    if (!doc.recording) throw new NotFoundException('No recording attached');
    return doc.recording;
  }

  readStream(storagePath: string, range?: { start: number; end: number }) {
    return this.storageProvider!.readStream(storagePath, range);
  }

  private resetTranscript(doc: SessionMinutes) {
    doc.transcript = null;
    doc.transcriptError = null;
    doc.transcriptStatus = this.transcription.enabled ? TranscriptStatus.PENDING : null;
  }
}
