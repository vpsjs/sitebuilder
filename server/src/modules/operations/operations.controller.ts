import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { OperationsService } from './operations.service';

@Controller('pages')
export class PagesController {
  constructor(private readonly ops: OperationsService) {}

  @Get()
  list(@Query('siteId') siteId?: string) { return this.ops.listPages(siteId); }

  @Get(':id')
  get(@Param('id') id: string) { return this.ops.getPage(id); }

  @Post()
  create(@Body() body: { siteId: string; name: string; slug: string; schema?: Record<string, unknown> }) {
    return this.ops.createPage(body);
  }

  @Put(':id/draft')
  saveDraft(@Param('id') id: string, @Body() body: { schema: Record<string, unknown> }) {
    return this.ops.savePageDraft(id, body.schema);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @Body() body?: { note?: string }) {
    return this.ops.publishPage(id, body?.note);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.ops.deletePage(id); }
}

@Controller('domains')
export class DomainsController {
  constructor(private readonly ops: OperationsService) {}

  @Get() list() { return this.ops.listDomains(); }
  @Post() add(@Body() body: { siteId: string; domain: string }) { return this.ops.addDomain(body); }
  /** 检查 DNS TXT 记录是否已生效（只读，不签发） */
  @Get(':id/check') check(@Param('id') id: string) {
    return this.ops.checkDnsRecord(id);
  }
  @Post(':id/verify') verify(@Param('id') id: string) { return this.ops.verifyDomain(id); }
  /** 单独续期/签发 SSL 证书 */
  @Post(':id/ssl') issueSsl(@Param('id') id: string) { return this.ops.issueSsl(id); }
  @Delete(':id') remove(@Param('id') id: string) { return this.ops.deleteDomain(id); }
}

/** 公开域名解析：供公开站 middleware 按 Host 查站点 */
@Controller('public/domains')
export class PublicDomainsController {
  constructor(private readonly ops: OperationsService) {}

  @Public()
  @Get('resolve/:host')
  resolve(@Param('host') host: string) { return this.ops.resolveDomain(host); }
}

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly ops: OperationsService) {}

  @Get() list(@Query('status') status?: string) { return this.ops.listSubmissions(status); }

  @Public()
  @Post()
  create(@Body() body: { siteId?: string; pageId?: string; formId: string; data: Record<string, unknown>; sourceUrl?: string }) {
    return this.ops.createSubmission(body);
  }

  @Put(':id') mark(@Param('id') id: string, @Body() body: { status: string }) {
    return this.ops.markSubmission(id, body.status);
  }

  @Delete(':id') remove(@Param('id') id: string) { return this.ops.deleteSubmission(id); }
}

@Controller('audit')
export class AuditController {
  constructor(private readonly ops: OperationsService) {}
  @Get() list() { return this.ops.listAudit(); }
}

@Controller('stats')
export class StatsController {
  constructor(private readonly ops: OperationsService) {}
  @Get() get() { return this.ops.getStats(); }
}

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly ops: OperationsService) {}
  @Public()
  @Post('track')
  track(@Body() body: { type: string; data?: Record<string, unknown> }) {
    return this.ops.track(body.type, body.data ?? {});
  }
}

@Controller('plugins')
export class PluginsController {
  constructor(private readonly ops: OperationsService) {}
  @Get() list() { return this.ops.listPlugins(); }
  @Post('install') install(@Body() body: { pluginId: string; config?: Record<string, unknown> }) {
    return this.ops.installPlugin(body.pluginId, body.config);
  }
}
