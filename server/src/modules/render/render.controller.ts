import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { RenderService } from './render.service';

@Controller('s')
export class RenderController {
  constructor(private readonly renderService: RenderService) {}

  /** 泛域名用：GET /s/resolve/:tenantSlug → 默认站点 slug */
  @Public()
  @Get('resolve/:tenantSlug')
  resolve(@Param('tenantSlug') tenantSlug: string) {
    return this.renderService.resolveDefaultSite(tenantSlug);
  }

  /** 公开子页面 DSL：GET /s/:tenantSlug/:siteSlug/p/:pageSlug */
  @Public()
  @Get(':tenantSlug/:siteSlug/p/:pageSlug')
  getPageSchema(
    @Param('tenantSlug') tenantSlug: string,
    @Param('siteSlug') siteSlug: string,
    @Param('pageSlug') pageSlug: string,
  ) {
    return this.renderService.getPublishedPage(tenantSlug, siteSlug, pageSlug);
  }

  /**
   * JSON 形式返回 DSL（供前端站点渲染器消费）
   * GET /s/:tenantSlug/:siteSlug
   */
  @Public()
  @Get(':tenantSlug/:siteSlug')
  async getSchema(
    @Param('tenantSlug') tenantSlug: string,
    @Param('siteSlug') siteSlug: string,
  ) {
    return this.renderService.getPublished(tenantSlug, siteSlug);
  }

  /**
   * 直接输出一个自包含 HTML 页面（演示"发布即可访问"）。
   * 真实场景应由 Next.js 渲染器接管，此处用最小实现说明流程。
   */
  @Public()
  @Get(':tenantSlug/:siteSlug/html')
  async getHtml(
    @Param('tenantSlug') tenantSlug: string,
    @Param('siteSlug') siteSlug: string,
    @Res() res: Response,
  ) {
    const data = await this.renderService.getPublished(tenantSlug, siteSlug);
    const nodes = flattenText(data.schema);
    res.type('html').send(`<!doctype html>
<html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(data.name)}</title>
<style>
 body{font-family:Inter,-apple-system,sans-serif;max-width:720px;margin:0 auto;padding:48px 24px;color:#171717}
 h1{font-size:2rem}h2{font-size:1.5rem}p{color:#475569;line-height:1.7}
 footer{margin-top:48px;padding-top:16px;border-top:1px solid #e5e7eb;color:#94a3b8;font-size:12px}
</style></head><body>
${nodes}
<footer>由 SiteBuilder Studio 构建 · ${escapeHtml(data.tenant)}</footer>
</body></html>`);
  }
}

/** 从 DSL 中提取标题与正文生成可读 HTML（演示用，真实由渲染器完成） */
function flattenText(schema: Record<string, unknown>): string {
  const out: string[] = [];
  const walk = (node: Record<string, unknown>) => {
    const props = (node.props ?? {}) as Record<string, unknown>;
    switch (node.type) {
      case 'heading': {
        const level = ['h1', 'h2', 'h3'].includes(String(props.level)) ? props.level : 'h2';
        out.push(`<${level}>${escapeHtml(String(props.text ?? ''))}</${level}>`);
        break;
      }
      case 'text':
        out.push(`<p>${escapeHtml(String(props.content ?? '')).replace(/\n/g, '<br>')}</p>`);
        break;
      case 'button':
        out.push(`<p><span style="display:inline-block;background:${sanitizeColor(props.bg)};color:${sanitizeColor(props.color)};padding:10px 24px;border-radius:8px;font-weight:600">${escapeHtml(String(props.label ?? ''))}</span></p>`);
        break;
      case 'divider':
        out.push('<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">');
        break;
    }
    const children = node.children as Record<string, unknown>[] | undefined;
    children?.forEach(walk);
  };
  if (schema.root) walk(schema.root as Record<string, unknown>);
  else walk(schema);
  return out.join('\n') || '<p>暂无内容</p>';
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

/** 简单白名单，防止 CSS 注入 */
function sanitizeColor(v: unknown): string {
  const s = String(v ?? '#171717');
  return /^#[0-9a-fA-F]{3,8}$/.test(s) || /^[a-z]+$/i.test(s) ? s : '#171717';
}
