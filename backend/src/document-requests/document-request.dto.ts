import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RequestStatus } from './document-request.schema';

export class CreateDocumentRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  requesterName: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  contactNumber?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(150)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  requestedDocuments: string;

  @IsMongoId()
  @IsOptional()
  legislativeDocumentId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  purpose: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  copies?: number;

  @IsBoolean()
  @IsOptional()
  certifiedTrueCopy?: boolean;

  // Hidden form field that people never fill in; bots usually do.
  @IsString()
  @IsOptional()
  website?: string;
}

export class UpdateDocumentRequestDto {
  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  responseMessage?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  internalNotes?: string;
}

export class QueryDocumentRequestDto {
  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;

  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  @IsString()
  @IsOptional()
  search?: string;
}
