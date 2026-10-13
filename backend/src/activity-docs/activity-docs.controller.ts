import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { ActivityDocsService } from './activity-docs.service';
import { CreateActivityDocDto, UpdateActivityDocDto, UpdateMediaDto } from './activity-doc.dto';
import { MEDIA_UPLOAD_OPTIONS, streamMedia } from './stream-media';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/schemas/user.schema';

// Staff encode activities and upload the photos; deleting a whole activity is for the admin.
@Controller('activity-docs')
@UseGuards(RolesGuard)
export class ActivityDocsController {
  constructor(private service: ActivityDocsService) {}

  @Get()
  findAll() {
    return this.service.list();
  }

  @Get(':id/media/:mediaId')
  async media(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @Query('download') download: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    streamMedia(this.service, await this.service.getMedia(id, mediaId), download, req, res);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() dto: CreateActivityDocDto, @CurrentUser() user: any) {
    return this.service.create(dto, user._id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateActivityDocDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user._id);
  }

  @Post(':id/media')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @UseInterceptors(FilesInterceptor('files', 20, MEDIA_UPLOAD_OPTIONS))
  addMedia(@Param('id') id: string, @UploadedFiles() files: Express.Multer.File[], @CurrentUser() user: any) {
    return this.service.addMedia(id, files, user._id);
  }

  @Patch(':id/media/:mediaId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  updateMedia(@Param('id') id: string, @Param('mediaId') mediaId: string, @Body() dto: UpdateMediaDto, @CurrentUser() user: any) {
    return this.service.updateMedia(id, mediaId, dto.caption, user._id);
  }

  @Delete(':id/media/:mediaId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  removeMedia(@Param('id') id: string, @Param('mediaId') mediaId: string, @CurrentUser() user: any) {
    return this.service.removeMedia(id, mediaId, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user._id);
  }
}
