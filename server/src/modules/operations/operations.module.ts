import { Module } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { SslService } from './ssl.service';
import { RevalidateService } from '../publish/revalidate.service';
import {
  PagesController, DomainsController, SubmissionsController,
  AuditController, StatsController, AnalyticsController, PluginsController,
  PublicDomainsController,
} from './operations.controller';

@Module({
  controllers: [
    PagesController, DomainsController, SubmissionsController,
    AuditController, StatsController, AnalyticsController, PluginsController,
    PublicDomainsController,
  ],
  providers: [OperationsService, RevalidateService, SslService],
  exports: [OperationsService, SslService],
})
export class OperationsModule {}
