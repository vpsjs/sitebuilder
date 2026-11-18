import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaAsset } from './media.entity';

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list(@Query('kind') kind?: string, @Query('q') q?: string) {
    return this.media.list({ kind, q });
  }

  @Get('stats')
  stats() { return this.media.stats(); }

  @Post()
  upload(@Body() body: { data: string; filename?: string }) {
    return this.media.upload(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.media.remove(id); }
}
