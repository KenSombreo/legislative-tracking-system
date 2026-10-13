import { Request, Response } from 'express';
import * as os from 'os';
import { ActivityMedia } from './activity-doc.schema';
import { ActivityDocsService } from './activity-docs.service';

const MAX_MEDIA_SIZE = parseInt(process.env.MAX_MEDIA_SIZE || '209715200', 10); // 200 MB

// Up to 20 files per upload, spooled to the temp folder (see ActivityDocsService.addMedia).
export const MEDIA_UPLOAD_OPTIONS = { dest: os.tmpdir(), limits: { fileSize: MAX_MEDIA_SIZE, files: 20 } };

/** Sends a photo or video, honouring HTTP Range so videos can be seeked and played on phones (Safari needs it). */
export function streamMedia(service: ActivityDocsService, media: ActivityMedia, download: string | undefined, req: Request, res: Response) {
  const size = media.fileSize;
  res.setHeader('Content-Type', media.mimeType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(media.originalFileName)}`);

  let range: { start: number; end: number } | undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (match && (match[1] || match[2])) {
    // "bytes=500-" (from 500), "bytes=-500" (last 500), "bytes=0-99"
    const start = match[1] ? parseInt(match[1], 10) : Math.max(size - parseInt(match[2], 10), 0);
    const end = match[1] && match[2] ? Math.min(parseInt(match[2], 10), size - 1) : size - 1;
    if (start >= size || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${size}`);
      res.end();
      return;
    }
    range = { start, end };
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', String(end - start + 1));
  } else {
    res.setHeader('Content-Length', String(size));
  }

  service
    .readStream(media.storagePath, range)
    .on('error', () => {
      if (!res.headersSent) res.status(404).json({ message: 'File not found' });
      else res.end();
    })
    .pipe(res);
}
