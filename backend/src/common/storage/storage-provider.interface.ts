export interface UploadResult {
  storagePath: string;
  fileUrl: string;
}

export interface StorageProvider {
  upload(buffer: Buffer, fileName: string): Promise<UploadResult>;
  getUrl(storagePath: string): string;
  delete(storagePath: string): Promise<void>;
  readStream(storagePath: string): NodeJS.ReadableStream;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
