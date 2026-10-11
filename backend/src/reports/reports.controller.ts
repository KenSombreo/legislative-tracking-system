import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PeriodReportService } from './period-report.service';

@Controller('reports')
export class ReportsController {
  constructor(
    private service: ReportsService,
    private periodReport: PeriodReportService,
  ) {}

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

  // Quarterly (quarter=1-4) or annual (no quarter) report.
  @Get('period')
  period(@Query('year') year: string, @Query('quarter') quarter?: string) {
    return this.periodReport.build(parseInt(year, 10), quarter ? parseInt(quarter, 10) : undefined);
  }
}
