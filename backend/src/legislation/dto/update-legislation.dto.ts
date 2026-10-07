import { PartialType } from '@nestjs/mapped-types';
import { CreateLegislationDto } from './create-legislation.dto';

export class UpdateLegislationDto extends PartialType(CreateLegislationDto) {}
