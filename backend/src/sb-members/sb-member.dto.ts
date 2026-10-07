import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSbMemberDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  position: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  committees?: string[];

  @IsString()
  @IsOptional()
  contactNumber?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsDateString()
  @IsOptional()
  termStart?: string;

  @IsDateString()
  @IsOptional()
  termEnd?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateSbMemberDto extends PartialType(CreateSbMemberDto) {}
