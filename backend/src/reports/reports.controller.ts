import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('summary')
  summary(@Query('year') year?: string) {
    return this.service.summary(year ? parseInt(year, 10) : undefined);
  }

  @Get('by-year')
  byYear() {
    return this.service.byYear();
  }

  @Get('by-status')
  byStatus() {
    return this.service.byStatus();
  }

  @Get('by-classification')
  byClassification() {
    return this.service.byClassification();
  }
}
