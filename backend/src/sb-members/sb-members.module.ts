import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SbMember, SbMemberSchema } from './sb-member.schema';
import { SbMembersService } from './sb-members.service';
import { SbMembersController } from './sb-members.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: SbMember.name, schema: SbMemberSchema }]), AuditLogsModule],
  controllers: [SbMembersController],
  providers: [SbMembersService],
})
export class SbMembersModule {}
