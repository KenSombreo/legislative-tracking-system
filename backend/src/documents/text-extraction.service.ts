import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DocumentFile, TextStatus } from './schemas/document-file.schema';
import { STORAGE_PROVIDER, StorageProvider } from '../common/storage/storage-provider.interface';

// The package's index.js runs a self-test when required directly; the lib entry does not.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (data: Buffer) => Promise<{ text: string }> = require('pdf-parse/lib/pdf-parse.js');

const run = promisify(execFile);

// Fewer non-space characters than this and the PDF is treated as a scan with no text layer.
const MIN_TEXT_CHARS = 40;
const OCR_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Makes uploaded PDFs searchable: pulls out their text for the search index, and runs scanned
 * PDFs through OCR (ocrmypdf, when installed) so the stored copy gets a selectable text layer.
 * Work runs one file at a time in the background so uploads are not slowed down.
 */
@Injectable()
export class TextExtractionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TextExtractionService.name);
  private queue: Promise<void> = Promise.resolve();
  private ocrAvailable: Promise<boolean> | null = null;

  constructor(
    @InjectModel(DocumentFile.name) private fileModel: Model<DocumentFile>,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
  ) {}

  // Picks up files uploaded before this existed, or left half-done by a restart.
  async onApplicationBootstrap() {
    const pending = await this.fileModel
      .find({ $or: [{ textStatus: { $exists: false } }, { textStatus: TextStatus.PENDING }] }, { _id: 1 })
      .lean()
      .exec()
      .catch(() => []);
    if (pending.length) this.logger.log(`Indexing text of ${pending.length} document file(s) in the background`);
    for (const f of pending) this.enqueue(String(f._id));
  }

  enqueue(fileId: string) {
    this.queue = this.queue.then(() => this.process(fileId)).catch(() => undefined);
  }

  private async process(fileId: string) {
    const file = await this.fileModel.findById(fileId).exec();
    if (!file) return;
    if (file.mimeType !== 'application/pdf') {
      await this.save(fileId, TextStatus.NOT_APPLICABLE, '');
      return;
    }

    try {
      const original = await this.storage.read(file.storagePath);
      let text = await this.extract(original);
      if (this.hasText(text)) {
        await this.save(fileId, TextStatus.TEXT, text);
        return;
      }
      if (!(await this.canOcr())) {
        await this.save(fileId, TextStatus.NO_TEXT, text);
        return;
      }
      const searchable = await this.ocr(original);
      text = await this.extract(searchable);
      // OCR takes a while; skip writing the file back if it was deleted meanwhile.
      if (!(await this.fileModel.exists({ _id: fileId }))) return;
      await this.storage.replace(file.storagePath, searchable);
      await this.save(fileId, TextStatus.OCR, text, searchable.length);
      this.logger.log(`OCR done for ${file.originalFileName}`);
    } catch (err) {
      this.logger.warn(`Could not read text from ${file.originalFileName}: ${err instanceof Error ? err.message : err}`);
      await this.save(fileId, TextStatus.FAILED, '');
    }
  }

  private async save(fileId: string, textStatus: TextStatus, text: string, fileSize?: number) {
    const update: Record<string, any> = { textStatus, extractedText: text.replace(/\s+/g, ' ').trim() };
    if (fileSize) update.fileSize = fileSize;
    await this.fileModel.updateOne({ _id: fileId }, { $set: update }).exec();
  }

  private hasText(text: string) {
    return text.replace(/\s/g, '').length >= MIN_TEXT_CHARS;
  }

  private async extract(buffer: Buffer) {
    return (await pdfParse(buffer)).text || '';
  }

  private canOcr() {
    if (!this.ocrAvailable) {
      this.ocrAvailable = run('ocrmypdf', ['--version'])
        .then(() => true)
        .catch(() => {
          this.logger.warn('ocrmypdf is not installed; scanned PDFs will not be made searchable');
          return false;
        });
    }
    return this.ocrAvailable;
  }

  private async ocr(buffer: Buffer): Promise<Buffer> {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'ocr-'));
    const input = path.join(dir, 'in.pdf');
    const output = path.join(dir, 'out.pdf');
    try {
      await fs.promises.writeFile(input, buffer);
      const languages = process.env.OCR_LANGUAGES || 'eng';
      await run('ocrmypdf', ['--skip-text', '--rotate-pages', '--deskew', '-l', languages, input, output], {
        timeout: OCR_TIMEOUT_MS,
      });
      return await fs.promises.readFile(output);
    } finally {
      await fs.promises.rm(dir, { recursive: true, force: true });
    }
  }
}
