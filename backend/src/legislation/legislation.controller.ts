import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { LegislationService } from './legislation.service';
import { CreateLegislationDto } from './dto/create-legislation.dto';
import { UpdateLegislationDto } from './dto/update-legislation.dto';
import { QueryLegislationDto } from './dto/query-legislation.dto';
import { ReviewLegislationDto } from './dto/review-legislation.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DocumentType } from '../common/config/legislation-fields.config';
import { ApprovalStatus } from './schemas/legislative-document.schema';

@Controller('legislation')
@UseGuards(RolesGuard)
export class LegislationController {
  constructor(private legislationService: LegislationService) {}

  @Get('years')
  years() {
    return this.legislationService.distinctYears();
  }

  @Get('ordinances')
  ordinances(@Query() query: QueryLegislationDto, @CurrentUser() user: any) {
    return this.legislationService.findAll(query, DocumentType.ORDINANCE, user?.role);
  }

  @Get('resolutions')
  resolutions(@Query() query: QueryLegislationDto, @CurrentUser() user: any) {
    return this.legislationService.findAll(query, DocumentType.RESOLUTION, user?.role);
  }

  @Get('appropriation-ordinances')
  appropriationOrdinances(@Query() query: QueryLegislationDto, @CurrentUser() user: any) {
    return this.legislationService.findAll(query, DocumentType.APPROPRIATION_ORDINANCE, user?.role);
  }

  @Get()
  findAll(@Query() query: QueryLegislationDto, @CurrentUser() user: any) {
    return this.legislationService.findAll(query, undefined, user?.role);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.legislationService.findById(id);
  }

  @Post()
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  create(@Body() dto: CreateLegislationDto, @CurrentUser() user: any) {
    return this.legislationService.create(dto, user._id, user.role);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.legislationService.review(id, ApprovalStatus.APPROVED, user._id);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN)
  reject(@Param('id') id: string, @Body() dto: ReviewLegislationDto, @CurrentUser() user: any) {
    return this.legislationService.review(id, ApprovalStatus.REJECTED, user._id, dto.reason);
  }

  @Patch(':id')
  @Roles(UserRole.STAFF, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateLegislationDto, @CurrentUser() user: any) {
    return this.legislationService.update(id, dto, user._id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.legislationService.remove(id, user._id);
  }
}
