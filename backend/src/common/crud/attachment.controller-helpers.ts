import { Response } from 'express';
import { BaseCrudService } from './base-crud.service';

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE || '26214400', 10);

export const ATTACHMENT_UPLOAD_OPTIONS = { limits: { fileSize: MAX_SIZE } };

export async function streamAttachment(
  service: BaseCrudService<any>,
  id: string,
  download: string | undefined,
  res: Response,
) {
  const { attachment, stream } = await service.getAttachment(id);
  res.setHeader('Content-Type', attachment.mimeType);
  res.setHeader(
    'Content-Disposition',
    `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(attachment.originalFileName)}"`,
  );
  stream.pipe(res);
}
