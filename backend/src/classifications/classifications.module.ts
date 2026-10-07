import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Classification, ClassificationSchema } from './schemas/classification.schema';
import { ClassificationsService } from './classifications.service';
import { ClassificationsController } from './classifications.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Classification.name, schema: ClassificationSchema }])],
  controllers: [ClassificationsController],
  providers: [ClassificationsService],
})
export class ClassificationsModule {}
