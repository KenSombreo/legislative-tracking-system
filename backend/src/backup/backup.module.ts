import { Module } from '@nestjs/common';
import { BackupController } from './backup.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [BackupController],
})
export class BackupModule {}
