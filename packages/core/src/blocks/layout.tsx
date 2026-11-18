/**
 * 布局组件集合：多栏栅格 / 图文混排 / 图标列表
 * ------------------------------------------------------------------
 * 均走注册表协议，装修器与公开站点同时生效，样式引用主题变量。
 */

import type { CSSProperties } from 'react';
import type { BlockDefinition } from '../core';
import { toCss } from '../core';

/** 多栏栅格：容器组件，拖入的子节点按 CSS Grid 自动分列 */
export const gridBlock: BlockDefinition = {
  type: 'grid',
  name: '多栏栅格',
  icon: 'LayoutGrid',
  category: '布局',
  container: true,
  defaultProps: { columns: 2, gap: 16, padding: 0 },
  propertySchema: [
    {
      key: 'columns', label: '列数', type: 'select',
      options: [
        { label: '2 列', value: '2' }, { label: '3 列', value: '3' }, { label: '4 列', value: '4' },
      ],
    },
    { key: 'gap', label: '间距', type: 'number', min: 0, max: 48, step: 4 },
    { key: 'padding', label: '内边距', type: 'number', min: 0, max: 64, step: 4 },
  ],
  render: ({ node, editing, renderChildren }) => {
    const p = node.props;
    const columns = Number(p.columns ?? 2);
    const style: CSSProperties = {
      ...toCss(node.style),
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap: Number(p.gap ?? 16),
      padding: Number(p.padding ?? 0),
      width: '100%',
    };
    const children = renderChildren?.();
    return (
      <div style={style} className="w-full rounded-md">
        {children}
        {editing && (!node.children || node.children.length === 0) && (
          <div className="col-span-full flex min-h-20 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
            拖入组件，将自动按 {columns} 列排列
          </div>
        )}
      </div>
    );
  },
};

/** 图文混排：图片 + 标题 + 正文，可切换图片左右位置 */
export const imageTextBlock: BlockDefinition = {
  type: 'image-text',
  name: '图文混排',
  icon: 'Columns2',
  category: '布局',
  defaultProps: {
    src: '', title: '关于我们',
    content: '在这里介绍您的企业、产品或服务，用图文结合的方式传递信息。',
    imageSide: 'left', radius: 12, variant: 'normal',
  },
  propertySchema: [
    { key: 'src', label: '图片地址', type: 'image', placeholder: 'https://...' },
    { key: 'title', label: '标题', type: 'text' },
    { key: 'content', label: '正文', type: 'textarea', rows: 4 },
    {
      key: 'imageSide', label: '图片位置', type: 'select',
      options: [
        { label: '左', value: 'left' }, { label: '右', value: 'right' },
      ],
    },
    {
      key: 'variant', label: '布局样式', type: 'select',
      options: [
        { label: '常规图文', value: 'normal' }, { label: '科技分屏（深色渐变）', value: 'split' },
      ],
    },
    { key: 'radius', label: '图片圆角', type: 'number', min: 0, max: 24, step: 2 },
  ],
  render: ({ node, editing }) => {
    const p = node.props;
    const src = String(p.src ?? '');
    const image = src ? (
      <img
        src={src}
        alt={String(p.title ?? '')}
        className="w-full object-cover"
        style={{ minHeight: 200, borderRadius: Number(p.radius ?? 12) }}
      />
    ) : (
      <div
        className="flex w-full items-center justify-center border border-dashed text-xs"
        style={{ minHeight: 200, borderRadius: Number(p.radius ?? 12), borderColor: '#CBD5E1', color: '#94A3B8' }}
      >
        {editing ? '请在右侧填入图片地址' : '图片'}
      </div>
    );
    const text = (
      <div className="flex flex-col justify-center">
        <h3 className="text-xl font-bold" style={{ color: 'var(--sb-text)' }}>{String(p.title ?? '')}</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--sb-muted)' }}>
          {String(p.content ?? '')}
        </p>
      </div>
    );
    const reverse = String(p.imageSide ?? 'left') === 'right';
    if (p.variant === 'split') {
      return (
        <div style={toCss(node.style)} className="w-full">
          <div className={reverse ? 'sb-split sb-split-reverse' : 'sb-split'} style={{
            display: 'flex', borderRadius: 20, overflow: 'hidden',
            border: '1px solid rgba(148,163,184,.16)',
            background: 'linear-gradient(120deg,rgba(12,24,38,.97),rgba(8,15,25,.97))',
          }}>
            <div style={{ flex: '1 1 50%', minHeight: 360, overflow: 'hidden', background: '#0E2233' }}>
              {src
                ? <img src={src} alt={String(p.title ?? '')} style={{ width: '100%', height: '100%', minHeight: 360, objectFit: 'cover', display: 'block' }} />
                : <div style={{ height: '100%', minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5B7186', fontSize: 13 }}>{editing ? '请在右侧填入图片地址' : '图片'}</div>}
            </div>
            <div style={{ flex: '1 1 50%', padding: 'clamp(28px,5vw,64px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ display: 'inline-block', alignSelf: 'flex-start', padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(34,211,238,.35)', background: 'rgba(34,211,238,.08)', color: '#67E8F9', fontSize: 11, letterSpacing: 3, fontWeight: 700 }}>ABOUT US</span>
              <h3 style={{ margin: '20px 0 16px', fontSize: 'clamp(26px,3.2vw,42px)', lineHeight: 1.15, fontWeight: 800, letterSpacing: -1, background: 'linear-gradient(100deg,#E6EDF3,#22D3EE)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{String(p.title ?? '')}</h3>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 2, color: '#8FA3B8', whiteSpace: 'pre-wrap' }}>{String(p.content ?? '')}</p>
            </div>
          </div>
          <style>{`.sb-split-reverse{flex-direction:row-reverse}@container(max-width:768px){.sb-split{flex-direction:column!important}.sb-split>div:first-child{min-height:240px!important}}`}</style>
        </div>
      );
    }
    return (
      <div
        style={toCss(node.style)}
        className={`flex w-full flex-col gap-5 md:gap-8 ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'}`}
      >
        <div className="md:w-1/2">{image}</div>
        <div className="md:w-1/2">{text}</div>
      </div>
    );
  },
};

/** 图标条目：icon 可为图片地址(http/data)或 Emoji/符号，title 标题，desc 描述 */
export type IconItem = { icon?: string; title: string; desc: string };

/**
 * 解析图标列表条目，兼容两种格式：
 *  - 新：JSON 数组字符串 `[{"icon":"...","title":"...","desc":"..."}]`
 *  - 旧：每行「标题|描述」纯文本
 */
export function parseIconItems(raw: unknown): IconItem[] {
  const text = String(raw ?? '').trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => ({
          icon: String(x?.icon ?? ''),
          title: String(x?.title ?? ''),
          desc: String(x?.desc ?? ''),
        }));
      }
    } catch { /* 非法 JSON 时回退到文本解析 */ }
  }
  return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [title, ...rest] = line.split('|');
    return { icon: '', title: title ?? '', desc: rest.join('|').trim() };
  });
}

/** 判断图标值是否为图片地址（可渲染 <img>），否则当作 Emoji/符号文本 */
export function isImageIcon(icon?: string): boolean {
  const v = String(icon ?? '').trim();
  return /^(https?:\/\/|\/|data:image\/)/i.test(v);
}

/** 图标列表：服务项目/核心优势，每条可上传图片或填符号 */
export const featureListBlock: BlockDefinition = {
  type: 'feature-list',
  name: '图标列表',
  icon: 'ListChecks',
  category: '布局',
  defaultProps: {
    title: '我们的优势',
    columns: 3,
    items: '专业团队|多年行业经验，服务有保障\n品质优先|用心打磨每一个细节\n客户至上|贴心服务，快速响应',
  },
  propertySchema: [
    { key: 'title', label: '标题', type: 'text' },
    {
      key: 'columns', label: '列数', type: 'select',
      options: [
        { label: '2 列', value: '2' }, { label: '3 列', value: '3' }, { label: '4 列', value: '4' },
      ],
    },
    {
      key: 'variant', label: '布局样式', type: 'select',
      options: [
        { label: '常规网格', value: 'normal' }, { label: '宾格卡片（科技风，首项大卡）', value: 'bento' },
      ],
    },
    { key: 'items', label: '图标条目（可上传图片/填符号）', type: 'icon-list', rows: 5 },
  ],
  render: ({ node }) => {
    const p = node.props;
    const columns = Number(p.columns ?? 3);
    const items = parseIconItems(p.items);
    if (p.variant === 'bento') {
      return (
        <div style={toCss(node.style)} className="w-full">
          {String(p.title ?? '') && (
            <h3 style={{ margin: '0 0 24px', fontSize: 13, letterSpacing: 4, fontWeight: 700, color: '#22D3EE' }}>{String(p.title)}</h3>
          )}
          <div className="sb-bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 16, gridAutoRows: 'minmax(150px,auto)' }}>
            {items.map((item, i) => (
              <div key={i} className={`sb-bento-cell ${i === 0 ? 'sb-bento-feature' : ''}`} style={{
                padding: 26, borderRadius: 16, border: '1px solid rgba(148,163,184,.16)',
                background: 'linear-gradient(160deg,rgba(23,38,54,.8),rgba(11,19,30,.92))',
                transition: 'transform .3s,border-color .3s', overflow: 'hidden',
              }}>
                {item.icon
                  ? isImageIcon(item.icon)
                    ? <img src={item.icon} alt={item.title} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(34,211,238,.45)' }} />
                    : <div style={{ fontSize: 32, lineHeight: 1.1 }}>{item.icon}</div>
                  : <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: 'rgba(34,211,238,.85)' }}>{String(i + 1).padStart(2, '0')}</div>}
                <div style={{ marginTop: 14, fontSize: 18, fontWeight: 700, color: '#E6EDF3' }}>{item.title}</div>
                {item.desc && <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.8, color: '#8FA3B8' }}>{item.desc}</div>}
              </div>
            ))}
          </div>
          <style>{`
            .sb-bento-feature{grid-column:span 2;grid-row:span 2}
            .sb-bento-cell:hover{transform:translateY(-6px);border-color:rgba(34,211,238,.45)!important}
            @container(max-width:800px){.sb-bento{grid-template-columns:repeat(2,minmax(0,1fr))!important}.sb-bento-feature{grid-column:span 2;grid-row:span 1}}
            @container(max-width:520px){.sb-bento{grid-template-columns:1fr!important}.sb-bento-feature{grid-column:span 1}}
          `}</style>
        </div>
      );
    }
    return (
      <div style={toCss(node.style)} className="w-full">
        {String(p.title ?? '') && (
          <h3 className="mb-5 text-center text-xl font-bold" style={{ color: 'var(--sb-text)' }}>
            {String(p.title)}
          </h3>
        )}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
          {items.map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-center rounded-lg border p-5 text-center"
              style={{ borderColor: '#E5E7EB', background: 'var(--sb-bg)' }}
            >
              {item.icon
                ? isImageIcon(item.icon)
                  ? <img src={item.icon} alt={item.title} className="mb-3 h-12 w-12 rounded-full object-cover" style={{ border: '2px solid var(--sb-accent)' }} />
                  : <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-2xl" style={{ background: 'var(--sb-accent)' }}>{item.icon}</div>
                : (
                  <div
                    className="mb-3 flex h-11 w-11 items-center justify-center rounded-full text-base font-bold"
                    style={{ background: 'var(--sb-accent)', color: 'var(--sb-primary)' }}
                  >
                    {i + 1}
                  </div>
                )}
              <div className="text-sm font-semibold" style={{ color: 'var(--sb-text)' }}>{item.title}</div>
              {item.desc && <div className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--sb-muted)' }}>{item.desc}</div>}
            </div>
          ))}
          {items.length === 0 && (
            <p className="col-span-full text-center text-xs" style={{ color: 'var(--sb-muted)' }}>
              在右侧「图标条目」中上传图片或填写符号，添加标题与描述
            </p>
          )}
        </div>
      </div>
    );
  },
};
