import { Module } from '@nestjs/common';
import { CopyPageController } from './copy-page.controller';
import { CopyPageService } from './copy-page.service';

@Module({
  controllers: [CopyPageController],
  providers: [CopyPageService],
  exports: [CopyPageService],
})
export class CopyPageModule {}
