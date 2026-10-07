import { IsOptional, IsString } from 'class-validator';

export class ReviewLegislationDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
