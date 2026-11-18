import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PublishService } from './publish.service';
import { PublishDto } from './dto/publish.dto';

@Controller('sites/:siteId/publish')
export class PublishController {
  constructor(private readonly publishService: PublishService) {}

  @Post()
  publish(@Param('siteId') siteId: string, @Body() dto: PublishDto) {
    return this.publishService.publish(siteId, dto.note);
  }

  @Get('history')
  history(@Param('siteId') siteId: string) {
    return this.publishService.history(siteId);
  }

  /** 回滚到指定历史版本：把该版本 schema 恢复为当前已发布快照 */
  @Post('rollback/:version')
  rollback(@Param('siteId') siteId: string, @Param('version') version: number) {
    return this.publishService.rollback(siteId, Number(version));
  }

  /** 草稿预览：返回当前草稿 DSL（仅登录用户，供发布前验收） */
  @Get('preview')
  preview(@Param('siteId') siteId: string) {
    return this.publishService.getDraftPreview(siteId);
  }
}
