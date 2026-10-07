import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '../../common/config/legislation-fields.config';
import { ApprovalStatus } from '../schemas/legislative-document.schema';

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

  // ADMIN only; PENDING or REJECTED. Everyone else only sees approved records.
  @IsEnum(ApprovalStatus)
  @IsOptional()
  approvalStatus?: ApprovalStatus;
}
