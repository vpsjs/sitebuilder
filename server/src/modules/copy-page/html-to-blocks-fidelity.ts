import * as cheerio from 'cheerio';

export type DslNode = {
  id: string; type: string; props: Record<string, unknown>;
  style?: Record<string, unknown>; children?: DslNode[];
};

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/**
 * 区块级保真：把页面按视觉区块切分，每块用 custom-html 承载原始 HTML+CSS。
 * 视觉 1:1 还原，且每个区块是独立可选中/排序/删除的模块（比整页 iframe 更可编辑）。
 */
export function htmlToFidelityBlocks(bodyHtml: string, css: string, title: string, origin: string): DslNode[] {
  const $ = cheerio.load(`<html><body>${bodyHtml}</body></html>`);
  const results: DslNode[] = [];

  const absUrl = (u: string): string => {
    if (!u || /^(javascript:|mailto:|tel:|data:|#)/i.test(u)) return u || '#';
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('//')) return `https:${u}`;
    try { return new URL(u, origin).toString(); } catch { return u; }
  };

  // 资源绝对化：图片/链接
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (src) $(el).attr('src', absUrl(src));
    $(el).removeAttr('srcset').removeAttr('data-src');
  });
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href && !/^(#|javascript:|mailto:|tel:)/i.test(href)) $(el).attr('href', absUrl(href));
  });

  // CSS 里的相对 url() 绝对化。不截断：Tailwind 等原子化样式单文件常超 400KB，
  // 截断会丢失 hidden/flex/grid/断点规则，导致"隐藏元素暴露、标题重叠、布局错位"。
  const safeCss = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => {
    if (/^(data:|https?:|#)/i.test(u)) return m;
    return `url(${q}${absUrl(u)}${q})`;
  });

  // 顶层区块：section/div/main/article/header/footer 中，取"有实际内容"的作为独立区块
  const $body = $('body');
  const topChildren = $body.children().toArray().filter((el: any) => {
    const tag = el.tagName?.toLowerCase();
    const txt = $(el).text().replace(/\s+/g, ' ').trim();
    return txt.length > 3 || $(el).find('img').length > 0;
  });

  const blockOf = (el: any) => ({
    id: uid('block'), type: 'custom-html',
    props: {
      html: $.html(el).slice(0, 2_000_000),
      css: safeCss,
      rawCss: true,
      iframe: false,
    },
    style: { padding: 0 },
  });

  if (topChildren.length >= 2) {
    topChildren.forEach((el: any) => results.push(blockOf(el)));
  } else {
    // 页面结构太简单：整页作为一个区块
    results.push(blockOf($body));
  }

  // 若页面完全没有标题文本，补一个
  const hasText = results.some((r) => String((r.props.html as string) || '').match(/<h[1-3]/i));
  if (!hasText && title) {
    results.unshift({
      id: uid('heading'), type: 'heading',
      props: { text: title.slice(0, 200), level: 'h1', color: '#171717', align: 'left', variant: 'normal' },
      style: { padding: 16 },
    });
  }
  return results;
}
