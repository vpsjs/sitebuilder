import { Module } from '@nestjs/common';
import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';
import { RevalidateService } from './revalidate.service';
import { StaticExportService } from './static-export.service';
import { OperationsModule } from '../operations/operations.module';

@Module({
  imports: [OperationsModule],
  controllers: [PublishController],
  providers: [PublishService, RevalidateService, StaticExportService],
  exports: [PublishService],
})
export class PublishModule {}
