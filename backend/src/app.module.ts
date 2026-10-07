import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LegislationModule } from './legislation/legislation.module';
import { DocumentsModule } from './documents/documents.module';
import { ClassificationsModule } from './classifications/classifications.module';
import { StatusesModule } from './statuses/statuses.module';
import { ReportsModule } from './reports/reports.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SbMembersModule } from './sb-members/sb-members.module';
import { MinutesModule } from './minutes/minutes.module';
import { CommitteeReportsModule } from './committee-reports/committee-reports.module';
import { CalendarModule } from './calendar/calendar.module';
import { HealthController } from './health/health.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('DATABASE_URL') || 'mongodb://localhost:27017/legislative_tracking',
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            // eslint-disable-next-line no-console
            console.log('[Mongo] connected');
          });
          connection.on('error', (err: any) => {
            // eslint-disable-next-line no-console
            console.error('[Mongo] connection error:', err?.message || err);
          });
          return connection;
        },
      }),
    }),
    AuthModule,
    UsersModule,
    LegislationModule,
    DocumentsModule,
    ClassificationsModule,
    StatusesModule,
    ReportsModule,
    AuditLogsModule,
    SbMembersModule,
    MinutesModule,
    CommitteeReportsModule,
    CalendarModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
