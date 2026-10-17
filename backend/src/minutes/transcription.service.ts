import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as http from 'http';
import * as https from 'https';
import { randomUUID } from 'crypto';
import { SessionMinutes, TranscriptStatus } from './minutes.schema';
import { Attachment } from '../common/crud/base-crud.service';
import { STORAGE_PROVIDER, StorageProvider } from '../common/storage/storage-provider.interface';

// A long session on a CPU-only server can take longer to transcribe than it ran.
const TRANSCRIBE_TIMEOUT_MS = 6 * 60 * 60 * 1000;

/**
 * Turns session recordings into text using a self-hosted Whisper server
 * (github.com/ahmetoner/whisper-asr-webservice, set by WHISPER_URL). Nothing leaves the server.
 * Recordings are done one at a time in the background, since each one keeps the CPU busy.
 */
@Injectable()
export class TranscriptionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TranscriptionService.name);
  private queue: Promise<void> = Promise.resolve();

  constructor(
    @InjectModel(SessionMinutes.name) private model: Model<SessionMinutes>,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
  ) {}

  get enabled() {
    return !!process.env.WHISPER_URL;
  }

  // Picks up recordings left waiting or half-done by a restart.
  async onApplicationBootstrap() {
    if (!this.enabled) return;
    const pending = await this.model
      .find({ transcriptStatus: { $in: [TranscriptStatus.PENDING, TranscriptStatus.PROCESSING] } }, { _id: 1 })
      .lean()
      .exec()
      .catch(() => []);
    if (pending.length) this.logger.log(`Transcribing ${pending.length} session recording(s) in the background`);
    for (const m of pending) this.enqueue(String(m._id));
  }

  enqueue(minutesId: string) {
    this.queue = this.queue.then(() => this.process(minutesId)).catch(() => undefined);
  }

  private async process(minutesId: string) {
    const doc = await this.model.findById(minutesId).exec();
    const recording = doc?.recording;
    if (!doc || !recording) return;

    await this.save(minutesId, recording, { transcriptStatus: TranscriptStatus.PROCESSING, transcriptError: null });
    const started = Date.now();
    try {
      const text = await this.transcribe(recording);
      await this.save(minutesId, recording, { transcriptStatus: TranscriptStatus.DONE, transcript: tidy(text) });
      this.logger.log(`Transcribed ${recording.originalFileName} in ${Math.round((Date.now() - started) / 60000)} min`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not transcribe ${recording.originalFileName}: ${message}`);
      await this.save(minutesId, recording, { transcriptStatus: TranscriptStatus.FAILED, transcriptError: message });
    }
  }

  // Skips the write if the recording was removed or replaced while this one was being worked on.
  private save(minutesId: string, recording: Attachment, update: Partial<SessionMinutes>) {
    return this.model.updateOne({ _id: minutesId, 'recording.storagePath': recording.storagePath }, { $set: update }).exec();
  }

  // Streams the file to Whisper as multipart/form-data. Done with http.request rather than fetch,
  // whose default 5-minute wait for a response is far too short for a long recording.
  private transcribe(recording: Attachment): Promise<string> {
    const url = new URL('/asr', process.env.WHISPER_URL);
    url.searchParams.set('task', 'transcribe');
    url.searchParams.set('output', 'text');
    url.searchParams.set('encode', 'true');
    // Skips long silences (recesses, breaks), which also stops Whisper repeating itself over them.
    url.searchParams.set('vad_filter', 'true');
    if (process.env.WHISPER_LANGUAGE) url.searchParams.set('language', process.env.WHISPER_LANGUAGE);

    const boundary = `----minutes${randomUUID()}`;
    const fileName = recording.originalFileName.replace(/["\r\n]/g, '_');
    const head = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="audio_file"; filename="${fileName}"\r\n` +
        `Content-Type: ${recording.mimeType}\r\n\r\n`,
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);

    return new Promise((resolve, reject) => {
      const req = (url.protocol === 'https:' ? https : http).request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': head.length + recording.fileSize + tail.length,
          },
          timeout: TRANSCRIBE_TIMEOUT_MS,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('error', reject);
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve(body);
            else reject(new Error(`Whisper server answered ${res.statusCode}: ${body.slice(0, 300)}`));
          });
        },
      );
      req.on('timeout', () => req.destroy(new Error('Transcription took too long')));
      req.on('error', (err) =>
        reject(new Error(`Cannot reach the transcription service at ${process.env.WHISPER_URL} (${err.message})`)),
      );

      req.write(head);
      const file = this.storage.readStream(recording.storagePath);
      file.on('error', (err) => req.destroy(err));
      file.on('end', () => req.end(tail));
      file.pipe(req, { end: false });
    });
  }
}

// Whisper returns one line per speech segment, which often breaks mid-sentence; put one sentence per line instead.
function tidy(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/([.?!])\s+(?=\S)/g, '$1\n')
    .trim();
}
