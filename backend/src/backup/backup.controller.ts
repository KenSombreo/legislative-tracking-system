import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Response } from 'express';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditService } from '../audit-logs/audit.service';
import { dumpDatabase, serializeDump } from '../common/backup/database-dump';

@Controller('backup')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class BackupController {
  constructor(
    @InjectConnection() private connection: Connection,
    private auditService: AuditService,
  ) {}

  // Downloads the whole database as JSON; restore with `node dist/db-transfer.js import <file> --replace`.
  @Get('database')
  async database(@CurrentUser() user: any, @Res() res: Response) {
    const dump = await dumpDatabase(this.connection.db!);
    const counts = Object.entries(dump.collections)
      .map(([name, docs]) => `${name}: ${docs.length}`)
      .join(', ');
    await this.auditService.log(user._id, 'BACKUP', 'Database', null, `Downloaded database backup (${counts})`);
    const stamp = dump.exportedAt.slice(0, 19).replace(/[:T]/g, '-');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="legislative-tracking-backup-${stamp}.json"`);
    res.send(serializeDump(dump));
  }
}
