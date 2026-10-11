import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TrackingStage } from '../../common/config/tracking-stages.config';

export class UpdateStageDto {
  @IsEnum(TrackingStage)
  stage: TrackingStage;

  // Defaults to now; lets staff back-date a step (e.g. the actual session date).
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}

export class UpdateVisibilityDto {
  @IsBoolean()
  isPublic: boolean;
}
