import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LegislativeDocument, LegislativeDocumentSchema } from '../legislation/schemas/legislative-document.schema';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: LegislativeDocument.name, schema: LegislativeDocumentSchema }])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
