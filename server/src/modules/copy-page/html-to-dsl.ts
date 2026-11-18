import * as cheerio from 'cheerio';

export type DslNode = {
  id: string; type: string; props: Record<string, unknown>;
  style?: Record<string, unknown>; children?: DslNode[];
};

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const STYLE_KEYS = /^(color|background|backgroundColor|fontSize|fontWeight|textAlign|padding|paddingTop|paddingBottom|paddingLeft|paddingRight|margin|maxWidth|lineHeight|opacity|borderRadius|display|gap|width|height|letterSpacing)$/;

function parseStyle(s: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const decl of (s || '').split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const k = decl.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const v = decl.slice(i + 1).trim();
    if (k && v && STYLE_KEYS.test(k)) out[k] = v;
  }
  return out;
}

function classRules(css: string): Record<string, Record<string, string>> {
  const rules: Record<string, Record<string, string>> = {};
  const re = /([.#]?[\w-]+)\s*\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const sel = m[1];
    if (!/^[.#]/.test(sel)) continue;
    const obj: Record<string, string> = {};
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      const k = d.slice(0, i).trim();
      const v = d.slice(i + 1).trim();
      if (/^(color|background|background-color|font-size|font-weight|text-align|padding|max-width|display|gap)$/.test(k)) obj[k] = v;
    }
    if (Object.keys(obj).length) rules[sel] = { ...(rules[sel] || {}), ...obj };
  }
  return rules;
}

function elStyle($: cheerio.CheerioAPI, el: any, rules: Record<string, Record<string, string>>): Record<string, unknown> {
  const classes = String($(el).attr('class') || '').split(/\s+/).filter(Boolean).map((c) => `.${c}`);
  const id = $(el).attr('id');
  const merged: Record<string, string> = {};
  for (const cls of classes) Object.assign(merged, rules[cls] || {});
  if (id && rules[`#${id}`]) Object.assign(merged, rules[`#${id}`]);
  return {
    ...parseStyle(Object.entries(merged).map(([k, v]) => `${k}:${v}`).join(';')),
    ...parseStyle($(el).attr('style') || ''),
  };
}

const isNav = ($: cheerio.CheerioAPI, el: any) => {
  const tag = (el as any).tagName?.toLowerCase();
  return tag === 'nav' || /\b(nav|menu|header|navbar)\b/i.test(String($(el).attr('class') || ''));
};

/** HTML → 可逐块编辑的标准模块 DSL，带布局容器与样式还原 */
export function htmlToBlocks(bodyHtml: string, css: string, title: string, origin: string): DslNode[] {
  const $ = cheerio.load(`<html><body>${bodyHtml}</body></html>`);
  const rules = classRules(css);
  const blocks: DslNode[] = [];

  const absUrl = (u: string): string => {
    if (!u || /^(javascript:|mailto:|tel:)/i.test(u)) return '#';
    if (/^(data:|#|https?:)/i.test(u)) return u;
    if (u.startsWith('//')) return `https:${u}`;
    try { return new URL(u, origin).toString(); } catch { return u; }
  };
  const textOf = (el: any) => $(el).text().replace(/\s+/g, ' ').trim();
  const visible = (el: any) => {
    const st = $(el).attr('style') || '';
    return !/display\s*:\s*none|visibility\s*:\s*hidden/.test(st)
      && !['script', 'style', 'noscript', 'svg', 'iframe', 'head', 'meta', 'link'].includes((el as any).tagName?.toLowerCase() || '');
  };

  // 容器：按 section/div 生成 container，内部递归
  const parseContainer = ($el: cheerio.Cheerio<any>, depth: number): DslNode[] => {
    const result: DslNode[] = [];
    $el.children().each((_, child) => {
      if (result.length >= 50 || depth > 5) return;
      if (!visible(child)) return;
      const node = $(child);
      const tag = (child as any).tagName?.toLowerCase() || '';
      const txt = textOf(child);
      const style = elStyle($, child, rules);

      // 导航：合并成 navbar（菜单项 文字|锚点）
      if (isNav($, child)) {
        const menus = node.find('a').map((_, a) => `${textOf(a).slice(0, 20)}|${absUrl($(a).attr('href') || '#')}`).get().filter((m) => !m.startsWith('|')).slice(0, 12);
        if (menus.length) {
          result.push({
            id: uid('nav'), type: 'navbar',
            props: { logo: title.slice(0, 20), menus: menus.join('\n'), variant: 'solid' },
            style: { background: String(style.background || '#ffffff'), padding: 12 },
          });
          return;
        }
      }

      if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
        result.push({
          id: uid('heading'), type: 'heading',
          props: { text: txt.slice(0, 200), level: ['h1', 'h2', 'h3'].includes(tag) ? tag : 'h3', color: String(style.color || '#171717'), align: String(style.textAlign || 'left'), variant: 'normal' },
          style: { padding: 10, ...style },
        });
        return;
      }

      if (tag === 'img') {
        const src = absUrl(node.attr('src') || node.attr('data-src') || '');
        if (src === '#') return;
        result.push({
          id: uid('image'), type: 'image',
          props: { src, alt: node.attr('alt') || '', height: 300, radius: 8, objectFit: 'cover' },
          style: { padding: 8 },
        });
        return;
      }

      if (tag === 'p' || tag === 'blockquote' || tag === 'figcaption') {
        if (txt.length < 4) return;
        const fs = Number(String(style.fontSize || '').replace(/[^\d.]/g, '')) || 16;
        result.push({
          id: uid('text'), type: 'text',
          props: { content: txt.slice(0, 2000), size: Math.min(32, Math.max(12, fs)), color: String(style.color || '#475569'), align: String(style.textAlign || 'left') },
          style: { padding: 8, ...style },
        });
        return;
      }

      if (tag === 'button' || (tag === 'a' && (/\bbtn|button/i.test(String(node.attr('class') || '')) || txt.length < 12))) {
        if (txt.length > 0 && txt.length < 30) {
          result.push({
            id: uid('button'), type: 'button',
            props: { label: txt, href: tag === 'a' ? absUrl(node.attr('href') || '') : '#', variant: 'glow', align: 'left' },
            style: { padding: 6 },
          });
          return;
        }
      }

      if (tag === 'ul' || tag === 'ol') {
        const items = node.find('li').map((_, li) => textOf(li)).get().filter((t) => t.length > 1).slice(0, 20);
        if (items.length) {
          result.push({
            id: uid('feature'), type: 'feature-list',
            props: { title: '', columns: items.length > 6 ? 3 : 2, variant: 'normal', items: items.map((t) => `${t.slice(0, 30)}|${t.slice(0, 120)}`).join('\n') },
            style: { padding: 16 },
          });
        }
        return;
      }

      // 布局容器：section/div/main/article/figure 且含子元素 → container
      if (['section', 'div', 'main', 'article', 'figure', 'header', 'footer'].includes(tag)) {
        const childCount = node.children().filter((_, c) => visible(c)).length;
        if (childCount > 0) {
          // 判断分栏：子元素里有明确的 flex/grid 或大量并列图片/卡片
          const display = String(style.display || (/flex|grid|row|col/i.test(String(node.attr('class') || '')) ? 'flex' : ''));
          const columns = /grid|flex|row|col/i.test(String(node.attr('class') || '') + display) && childCount >= 2 ? Math.min(4, childCount) : 1;
          const inner = parseContainer(node, depth + 1);
          if (inner.length) {
            result.push({
              id: uid('section'), type: 'container',
              props: {
                background: String(style.background || 'transparent'),
                padding: Number(String(style.padding || '').replace(/[^\d.]/g, '')) || 24,
                gap: Number(String(style.gap || '').replace(/[^\d.]/g, '')) || 16,
                columns, variant: 'normal',
              },
              style: { ...style },
              children: inner,
            });
          }
          return;
        }
        if (txt.length > 10) {
          result.push({ id: uid('text'), type: 'text', props: { content: txt.slice(0, 2000), size: 16, color: '#475569', align: 'left' }, style: { padding: 8 } });
        }
        return;
      }

      if (txt.length > 10) {
        result.push({ id: uid('text'), type: 'text', props: { content: txt.slice(0, 2000), size: 16, color: '#475569', align: 'left' }, style: { padding: 8 } });
      }
    });
    return result;
  };

  blocks.push(...parseContainer($('body'), 0));
  const hasHeading = blocks.some((b) => b.type === 'heading');
  if (!hasHeading && blocks.length) {
    blocks.unshift({ id: uid('heading'), type: 'heading', props: { text: title.slice(0, 200), level: 'h1', color: '#171717', align: 'left', variant: 'normal' }, style: { padding: 16 } });
  }
  return blocks;
}
