import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { MinutesService } from './minutes.service';
import { CreateMinutesDto, UpdateMinutesDto } from './minutes.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { ATTACHMENT_UPLOAD_OPTIONS, streamAttachment } from '../common/crud/attachment.controller-helpers';

@Controller('minutes')
@UseGuards(RolesGuard)
export class MinutesController {
  constructor(private service: MinutesService) {}

  @Get()
  findAll() {
    return this.service.list();
  }

  @Get(':id/file')
  file(@Param('id') id: string, @Query('download') download: string, @Res() res: Response) {
    return streamAttachment(this.service, id, download, res);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateMinutesDto, @CurrentUser() user: any) {
    return this.service.create(dto, user._id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateMinutesDto, @CurrentUser() user: any) {
    return this.service.update(id, dto, user._id);
  }

  @Post(':id/file')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', ATTACHMENT_UPLOAD_OPTIONS))
  attach(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    return this.service.attachFile(id, file, user._id);
  }

  @Delete(':id/file')
  @Roles(UserRole.ADMIN)
  detach(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.removeFile(id, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user._id);
  }
}
