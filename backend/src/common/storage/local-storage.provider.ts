import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageProvider, UploadResult } from './storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly basePath: string;

  constructor(private configService: ConfigService) {
    this.basePath = this.configService.get<string>('FILE_STORAGE_PATH') || './storage';
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  async upload(buffer: Buffer, fileName: string): Promise<UploadResult> {
    const uniqueName = `${uuidv4()}-${fileName}`;
    const fullPath = path.join(this.basePath, uniqueName);
    fs.writeFileSync(fullPath, buffer);
    return {
      storagePath: uniqueName,
      fileUrl: `/api/documents/file/${uniqueName}`,
    };
  }

  getUrl(storagePath: string): string {
    return `/api/documents/file/${storagePath}`;
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, storagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  readStream(storagePath: string): NodeJS.ReadableStream {
    const fullPath = path.join(this.basePath, storagePath);
    return fs.createReadStream(fullPath);
  }
}
