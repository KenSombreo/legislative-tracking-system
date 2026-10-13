import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ActivityCategory } from './activity-doc.schema';

export class CreateActivityDocDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  date: string;

  @IsEnum(ActivityCategory)
  @IsOptional()
  category?: ActivityCategory;

  @IsString()
  @IsOptional()
  venue?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class UpdateActivityDocDto extends PartialType(CreateActivityDocDto) {}

export class UpdateMediaDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  caption?: string | null;
}
