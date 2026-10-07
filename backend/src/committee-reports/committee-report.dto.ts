import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommitteeReportDto {
  @IsString()
  @IsNotEmpty()
  reportNumber: string;

  @IsString()
  @IsNotEmpty()
  committee: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  @IsOptional()
  dateSubmitted?: string;

  @IsString()
  @IsOptional()
  relatedMeasure?: string;

  @IsString()
  @IsOptional()
  recommendation?: string;

  @IsString()
  @IsOptional()
  summary?: string;
}

export class UpdateCommitteeReportDto extends PartialType(CreateCommitteeReportDto) {}
