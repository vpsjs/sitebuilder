import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAsset } from './media.entity';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { UploadController } from './upload.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MediaAsset])],
  controllers: [MediaController, UploadController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
