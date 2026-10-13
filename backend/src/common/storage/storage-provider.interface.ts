export interface UploadResult {
  storagePath: string;
  fileUrl: string;
}

export interface StorageProvider {
  upload(buffer: Buffer, fileName: string): Promise<UploadResult>;
  getUrl(storagePath: string): string;
  delete(storagePath: string): Promise<void>;
  // With a byte range (inclusive), streams only that part, for video seeking.
  readStream(storagePath: string, range?: { start: number; end: number }): NodeJS.ReadableStream;
  read(storagePath: string): Promise<Buffer>;
  // Swaps a stored file's contents in place (e.g. for its OCR'd version), keeping its path.
  replace(storagePath: string, buffer: Buffer): Promise<void>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
