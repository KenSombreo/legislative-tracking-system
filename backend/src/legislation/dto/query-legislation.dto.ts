import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '../../common/config/legislation-fields.config';
import { ApprovalStatus } from '../schemas/legislative-document.schema';

export const PROGRESS_VALUES = ['IN_PROGRESS', 'ENACTED', 'ADOPTED', 'FAILED', 'WITHDRAWN'] as const;
export type Progress = (typeof PROGRESS_VALUES)[number];

export class QueryLegislationDto {
  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;

  @IsEnum(DocumentType)
  @IsOptional()
  documentType?: DocumentType;

  @IsOptional()
  year?: string;

  @IsString()
  @IsOptional()
  classification?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  sponsor?: string;

  @IsString()
  @IsOptional()
  dateFrom?: string;

  @IsString()
  @IsOptional()
  dateTo?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sort?: string;

  // Where the measure ended up; see LegislationService.progressFilter.
  @IsIn(PROGRESS_VALUES)
  @IsOptional()
  progress?: Progress;

  // ADMIN only; PENDING or REJECTED. Everyone else only sees approved records.
  @IsEnum(ApprovalStatus)
  @IsOptional()
  approvalStatus?: ApprovalStatus;
}
