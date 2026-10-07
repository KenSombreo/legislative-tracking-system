import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DocumentCategory } from './schemas/document-file.schema';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10);

@Controller('documents')
@UseGuards(RolesGuard)
export class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
    private configService: ConfigService,
  ) {}

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Post('upload')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SIZE } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('legislativeDocumentId') legislativeDocumentId: string,
    @Body('documentCategory') documentCategory: DocumentCategory,
    @CurrentUser() user: any,
  ) {
    if (!legislativeDocumentId) throw new BadRequestException('legislativeDocumentId is required');
    if (!documentCategory) throw new BadRequestException('documentCategory is required');
    return this.documentsService.upload(file, legislativeDocumentId, documentCategory, user._id);
  }

  @Get('file/:storagePath')
  async streamByStoragePath(@Param('storagePath') storagePath: string, @Res() res: Response) {
    const basePath = this.configService.get<string>('FILE_STORAGE_PATH') || './storage';
    const fullPath = path.join(basePath, storagePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    return res.sendFile(path.resolve(fullPath));
  }

  @Get(':id')
  async stream(@Param('id') id: string, @Query('download') download: string, @Res() res: Response) {
    const doc = await this.documentsService.findById(id);
    const disposition = download ? 'attachment' : 'inline';
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${doc.originalFileName}"`);
    const stream = this.documentsService.getStorageProvider().readStream(doc.storagePath);
    stream.pipe(res);
  }

  @Delete(':id')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.documentsService.remove(id, user._id);
  }
}
