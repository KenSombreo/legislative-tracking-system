import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MinutesStatus, SessionType } from './minutes.schema';

export class CreateMinutesDto {
  @IsEnum(SessionType)
  @IsOptional()
  sessionType?: SessionType;

  @IsString()
  @IsNotEmpty()
  sessionNumber: string;

  @IsDateString()
  sessionDate: string;

  @IsString()
  @IsOptional()
  venue?: string;

  @IsString()
  @IsOptional()
  presidingOfficer?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsEnum(MinutesStatus)
  @IsOptional()
  status?: MinutesStatus;

  @IsDateString()
  @IsOptional()
  dateApproved?: string;
}

export class UpdateMinutesDto extends PartialType(CreateMinutesDto) {}
