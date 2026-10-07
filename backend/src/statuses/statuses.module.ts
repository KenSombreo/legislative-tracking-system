import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Status, StatusSchema } from './schemas/status.schema';
import { StatusesService } from './statuses.service';
import { StatusesController } from './statuses.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Status.name, schema: StatusSchema }])],
  controllers: [StatusesController],
  providers: [StatusesService],
})
export class StatusesModule {}
