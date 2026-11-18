import { Controller, Post, Body } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaAsset } from './media.entity';

/**
 * 图片上传端点（装修器兼容入口）
 * ------------------------------------------------------------------
 * 与 /api/media 共用 MediaService：base64 上传后写入对象存储与媒体库，
 * 这样装修器里上传的图片会自动出现在后台媒体库中。
 */
@Controller('upload')
export class UploadController {
  constructor(private readonly media: MediaService) {}

  @Post()
  async upload(@Body() body: { data: string; filename?: string }): Promise<{ url: string; filename: string; id: string }> {
    const asset: MediaAsset = await this.media.upload(body);
    return { url: asset.url, filename: asset.originalName, id: asset.id };
  }
}
