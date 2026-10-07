import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '../../common/config/legislation-fields.config';

export class CreateLegislationDto {
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @IsString()
  documentNumber: string;

  @IsInt()
  year: number;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  classification?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsDateString()
  @IsOptional()
  dateEnacted?: string;

  @IsDateString()
  @IsOptional()
  dateAdopted?: string;

  @IsDateString()
  @IsOptional()
  dateApprovedByLCE?: string;

  @IsDateString()
  @IsOptional()
  dateEnactedApprovedBySP?: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  sponsor?: string;

  @IsString()
  @IsOptional()
  spResolutionNumber?: string;

  @IsString()
  @IsOptional()
  sector?: string;

  @IsString()
  @IsOptional()
  onlineLink?: string;
}
