import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { CalendarEventType } from './calendar-event.schema';

export class CreateCalendarEventDto {
  @IsEnum(CalendarEventType)
  @IsOptional()
  eventType?: CalendarEventType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  date: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be HH:mm' })
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  venue?: string;

  @IsString()
  @IsOptional()
  committee?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateCalendarEventDto extends PartialType(CreateCalendarEventDto) {}
