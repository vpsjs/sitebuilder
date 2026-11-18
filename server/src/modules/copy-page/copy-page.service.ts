import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { htmlToBlocks, type DslNode } from './html-to-dsl';
import { htmlToFidelityBlocks } from './html-to-blocks-fidelity';

export type CopyMode = 'fidelity' | 'modules' | 'snapshot';

export interface FetchResult {
  title: string;
  description: string;
  url: string;
  /** 清洗后的主体 HTML（相对资源已绝对化） */
  html: string;
  /** 收集到的 <style> CSS */
  css: string;
  /** 提取的图片地址 */
  images: string[];
  /** 结构化区块摘要（供预览） */
  blocks: { type: string; text: string }[];
  /** 生成的 PageSchema */
  schema: Record<string, unknown>;
  /** 是否为可逐块编辑的标准模块模式 */
  modular: boolean;
  /** 生成的模块数量 */
  blockCount: number;
  /** 实际采用的复制模式 */
  mode: CopyMode;
}

@Injectable()
export class CopyPageService {
  private readonly logger = new Logger(CopyPageService.name);

  async fetch(url: string, mode: CopyMode = 'fidelity'): Promise<FetchResult> {
    const target = this.validateUrl(url);
    const raw = await this.download(target);
    const base = new URL(target);

    const $ = cheerio.load(raw);
    const title = ($('title').first().text() || '复制的页面').trim();
    const description = ($('meta[name="description"]').attr('content') || '').trim();

    // 收集外部样式表链接（去重后抓取内容内联），再清理干扰元素
    const styleUrls: string[] = [];
    const seenStyle = new Set<string>();
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('data:')) {
        try {
          const u = new URL(href, base.origin).toString();
          if (!seenStyle.has(u)) { seenStyle.add(u); styleUrls.push(u); }
        } catch { /* ignore */ }
      }
    });
    $('script, noscript, iframe, object, embed, svg, link[rel="stylesheet"], meta, title, head').remove();
    // 不删除 nav/header/footer：保真复制需要完整页面结构。
    // 原站的隐藏菜单/占位元素由自身 CSS（hidden / visually-hidden / opacity-0 等）控制显隐，
    // 保留完整 CSS 后它们会自然隐藏；强行删除反而会造成导航/页脚缺失。

    // 收集内联样式 + 抓取外部样式表（并发，最多 12 个，每个 8 秒超时）
    const cssParts: string[] = [];
    $('style').each((_, el) => { cssParts.push($(el).html() || ''); });
    $('style').remove();
    const external = await Promise.all(styleUrls.slice(0, 12).map((u) => this.downloadCss(u).catch(() => '')));
    for (const sheet of external) {
      if (sheet) cssParts.push(this.absolutizeCssUrls(sheet, base));
    }
    // 不截断 CSS：现代站点（如 Tailwind）单个样式表就可能超过 400KB，
    // 一旦截断会丢失 hidden/flex/grid/断点 等关键规则，导致复制页"隐藏元素暴露、标题重叠、布局错位"。
    // bodyParser 已放宽到 15MB，这里保留完整样式。
    const css = cssParts.join('\n');

    // 资源绝对化：图片/背景图相对路径补全
    const images: string[] = [];
    $('img').each((_, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (src.startsWith('data:') || src.startsWith('//')) {
        if (src.startsWith('//')) { src = `${base.protocol}${src}`; $(el).attr('src', src); }
        return;
      }
      if (src) {
        try { src = new URL(src, base.origin).toString(); $(el).attr('src', src); } catch { /* ignore */ }
        images.push(src);
      }
      $(el).removeAttr('srcset').removeAttr('data-src').css({ maxWidth: '100%', height: 'auto' });
    });

    let bodyHtml = $('body').html() || $.html();
    // 若页面主体没有标题元素，补一个（避免复制后看起来只有纯文字）
    if (!$('h1, h2, h3').length && title) {
      bodyHtml = `<h1>${title.replace(/[<>]/g, '')}</h1>` + bodyHtml;
    }
    // 预览摘要（供前端展示）
    const blocks: { type: string; text: string }[] = [];
    $('h1, h2, h3').each((_, el) => { blocks.push({ type: 'heading', text: $(el).text().trim().slice(0, 80) }); });
    $('p').each((_, el) => {
      const t = $(el).text().trim();
      if (t.length > 20) blocks.push({ type: 'text', text: t.slice(0, 120) });
    });
    images.slice(0, 12).forEach((img) => { blocks.push({ type: 'image', text: img }); });

    // 组装 DSL：fidelity=区块保真 / modules=语义模块 / snapshot=整页 iframe
    let children: DslNode[] | Record<string, unknown>[];
    if (mode === 'fidelity') {
      children = htmlToFidelityBlocks(bodyHtml, css, title, base.origin);
    } else if (mode === 'modules') {
      children = htmlToBlocks(bodyHtml, css, title, base.origin);
    } else {
      const uid = `copy-${Date.now().toString(36)}`;
      children = [{
        id: uid, type: 'custom-html',
        props: {
          html: bodyHtml.slice(0, 2_000_000),
          css,
          iframe: true,
          height: 1200,
        },
        style: { padding: 0 },
      }];
    }
    const root: Record<string, unknown> = {
      id: 'root', type: 'container',
      props: { gap: 0, padding: 0, background: '#ffffff' },
      style: {},
      children,
    };
    const schema = {
      version: 1,
      meta: { title, description },
      theme: { primary: '#171717', accent: '#D4AF37', background: '#ffffff', text: '#171717', muted: '#475569', radius: 8 },
      root,
    };

    return {
      title, description, url: target, html: bodyHtml, css, images, blocks, schema,
      modular: mode !== 'snapshot', blockCount: children.length, mode,
    };
  }

  private validateUrl(input: string): string {
    let url: URL;
    try { url = new URL(input.trim()); } catch { throw new BadRequestException('网址格式不正确'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new BadRequestException('仅支持 http/https 网址');
    const host = url.hostname.toLowerCase();
    // 阻止内网 / 本地地址（SSRF 防护）
    if (
      host === 'localhost' || host === '127.0.0.1' || host === '::1' ||
      /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host.endsWith('.local') || host.endsWith('.internal')
    ) {
      throw new BadRequestException('不允许抓取内网或本地地址');
    }
    return url.toString();
  }

  private async downloadCss(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, {
        redirect: 'follow', signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36' },
      });
      if (!res.ok) return '';
      return (await res.text()).slice(0, 500_000);
    } finally { clearTimeout(timer); }
  }

  private absolutizeCssUrls(css: string, base: URL): string {
    return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, quote, rawUrl) => {
      if (/^(data:|https?:|#)/.test(rawUrl)) return m;
      try { return `url(${quote}${new URL(rawUrl, base.origin).toString()}${quote})`; } catch { return m; }
    });
  }

  private async download(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        },
      });
      if (!res.ok) throw new BadRequestException(`抓取失败：HTTP ${res.status}`);
      const text = await res.text();
      if (!text || text.length < 20) throw new BadRequestException('页面内容为空');
      return text.slice(0, 2_000_000);
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      this.logger.warn(`fetch failed ${url}: ${e instanceof Error ? e.message : e}`);
      throw new BadRequestException('无法抓取该网址，请检查链接是否可访问');
    } finally {
      clearTimeout(timer);
    }
  }
}
