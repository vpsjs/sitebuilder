/**
 * 内容组件集合：图文卡片列表 / 文章资讯列表
 * ------------------------------------------------------------------
 * 用于企业官网的案例展示、客户墙、服务展示与新闻资讯板块。
 * 纯展示组件（无 hooks），装修器与公开站点共用，SSR 安全。
 */

import type { BlockDefinition } from '../core';
import { toCss } from '../core';

/**
 * 从注入数据生成 items 文本行
 * 公开站渲染前会把后台数据注入 node.props.__data（文章/产品数组），
 * block 优先用它生成 items，实现"后台管理内容、前端动态显示"。
 */
function injectedItems(kind: string, props: Record<string, unknown>): string | undefined {
  const data = props.__data as Record<string, unknown> | undefined;
  if (!data || data.kind !== kind || !Array.isArray(data.list)) return undefined;
  return (data.list as Record<string, unknown[] | string | undefined>[]).map((row) => {
    if (kind === 'articles') {
      return [row.date, row.category, row.title, row.summary]
        .map((v) => String(v ?? '')).join('|');
    }
    return [row.image, row.title, row.description ?? row.summary, row.href ?? '#']
      .map((v) => String(v ?? '')).join('|');
  }).join('\n');
}

/** 图文卡片列表：每行「图片地址|标题|描述|链接」，网格展示 */
export const cardListBlock: BlockDefinition = {
  type: 'card-list',
  name: '图文卡片列表',
  icon: 'GalleryVerticalEnd',
  category: '内容',
  defaultProps: {
    title: '业务案例',
    subtitle: '我们用专业赢得客户信赖',
    columns: 3,
    items:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600|品牌策划|为品牌量身定制战略与视觉方案|#\n' +
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600|创意设计|从概念到落地的全流程设计服务|#\n' +
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600|数字营销|品效合一的整合营销推广|#',
  },
  propertySchema: [
    { key: 'title', label: '区块标题', type: 'text' },
    { key: 'subtitle', label: '副标题', type: 'text' },
    {
      key: 'columns', label: '列数', type: 'select',
      options: [
        { label: '2 列', value: '2' }, { label: '3 列', value: '3' }, { label: '4 列', value: '4' },
      ],
    },
    { key: 'source', label: '数据来源（留空=手动；填 products=后台产品）', type: 'text' },
    {
      key: 'variant', label: '布局样式', type: 'select',
      options: [
        { label: '标准卡片', value: 'normal' }, { label: '科技卡片（深色+发光悬浮）', value: 'modern' },
      ],
    },
    { key: 'items', label: '条目（每行：图片|标题|描述|链接，source 有值时忽略）', type: 'textarea', rows: 6 },
  ],
  render: ({ node }) => {
    const p = node.props;
    const columns = Number(p.columns ?? 3);
    const items = String(injectedItems('products', p) ?? p.items ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [img, title, desc, href] = line.split('|');
        return { img: img ?? '', title: title ?? '', desc: desc ?? '', href: href?.trim() || '#' };
      });

    const modern = p.variant === 'modern';
    const card = (item: typeof items[number], i: number) => modern ? (
      <a key={i} href={item.href} className="sb-modern-card group block overflow-hidden" style={{
        borderRadius: 18, border: '1px solid rgba(148,163,184,.16)',
        background: 'linear-gradient(160deg,rgba(23,38,54,.85),rgba(11,19,30,.94))',
        textDecoration: 'none', transition: 'transform .35s,border-color .35s,box-shadow .35s',
      }}>
        <div style={{ position: 'relative', height: 220, overflow: 'hidden', background: '#0E2233' }}>
          {item.img ? <img src={item.img} alt={item.title} className="sb-card-img" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .5s' }} /> : null}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(7,12,20,.55),transparent 60%)' }} />
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#E6EDF3' }}>{item.title}</div>
          {item.desc && <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7, color: '#8FA3B8' }}>{item.desc}</div>}
          <div style={{ marginTop: 16, fontSize: 12, color: '#22D3EE', fontWeight: 600 }}>了解详情 →</div>
        </div>
      </a>
    ) : (
      <a
        key={i}
        href={item.href}
        className="group block overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
        style={{ borderColor: '#E5E7EB', background: 'var(--sb-bg)', textDecoration: 'none' }}
      >
        {item.img ? (
          <img src={item.img} alt={item.title} className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 w-full items-center justify-center" style={{ background: '#E2E8F0', color: '#94A3B8' }}>
            图片 {i + 1}
          </div>
        )}
        <div className="p-4">
          <div className="text-sm font-semibold" style={{ color: 'var(--sb-text)' }}>{item.title}</div>
          {item.desc && <div className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--sb-muted)' }}>{item.desc}</div>}
        </div>
      </a>
    );

    return (
      <div style={toCss(node.style)} className="w-full">
        {(String(p.title ?? '') || String(p.subtitle ?? '')) && (
          <div className="mb-6 text-center">
            {String(p.title ?? '') && (
              <h3 className="text-xl font-bold" style={{ color: 'var(--sb-text)' }}>{String(p.title)}</h3>
            )}
            {String(p.subtitle ?? '') && (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--sb-muted)' }}>{String(p.subtitle)}</p>
            )}
          </div>
        )}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
          {items.map(card)}
        </div>
        {modern && (
          <style>{`
            .sb-modern-card:hover{transform:translateY(-8px);border-color:rgba(34,211,238,.45)!important;box-shadow:0 28px 60px rgba(0,0,0,.4)}
            .sb-modern-card:hover .sb-card-img{transform:scale(1.06)}
          `}</style>
        )}
        {items.length === 0 && (
          <p className="text-center text-xs" style={{ color: 'var(--sb-muted)' }}>
            在右侧填写条目，每行格式：图片|标题|描述|链接
          </p>
        )}
      </div>
    );
  },
};

/** 文章资讯列表：每行「日期|分类|标题|摘要」，列表展示 */
export const articleListBlock: BlockDefinition = {
  type: 'article-list',
  name: '文章资讯列表',
  icon: 'Newspaper',
  category: '内容',
  defaultProps: {
    title: '设计资讯',
    moreText: 'MORE',
    items:
      '2023-07-12|策划观点|什么是包装设计的灵魂？|一个优秀的包装设计不止外观美观，更要承载产品的内涵与价值。\n' +
      '2023-07-10|设计动态|茶叶包装设计的基本设计要求|简洁明了地体现商品属性，是茶包装文字设计的关键。\n' +
      '2023-07-08|设计分享|懂美学，更懂生意|从美学出发，让设计为商业增长赋能。',
  },
  propertySchema: [
    { key: 'title', label: '区块标题', type: 'text' },
    { key: 'moreText', label: '更多按钮文字', type: 'text' },
    { key: 'source', label: '数据来源（留空=手动；填 articles=后台文章）', type: 'text' },
    {
      key: 'variant', label: '布局样式', type: 'select',
      options: [
        { label: '列表', value: 'normal' }, { label: '卡片网格（科技风）', value: 'cards' },
      ],
    },
    { key: 'items', label: '文章（每行：日期|分类|标题|摘要，source 有值时忽略）', type: 'textarea', rows: 6 },
  ],
  render: ({ node }) => {
    const p = node.props;
    const fallback = String(p.items ?? '')
      .split('\n').map((line) => line.trim()).filter(Boolean)
      .map((line) => {
        const [date, category, title, summary] = line.split('|');
        return { date: date ?? '', category: category ?? '', title: title ?? '', summary: summary ?? '' };
      });
    let items = fallback;
    const injected = injectedItems('articles', p);
    if (injected) {
      const dyn = injected.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
        const [date, category, title, summary] = line.split('|');
        return { date: date ?? '', category: category ?? '', title: title ?? '', summary: summary ?? '' };
      }).filter((x) => x.title);
      const seen = new Set(dyn.map((x) => x.title));
      items = [...dyn, ...fallback.filter((x) => !seen.has(x.title))].slice(0, 3);
    }

    if (p.variant === 'cards') {
      return (
        <div style={toCss(node.style)} className="w-full">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 20 }} className="sb-news-grid">
            {items.map((item, i) => (
              <article key={i} className="sb-news-card" style={{
                padding: 26, borderRadius: 16, border: '1px solid rgba(148,163,184,.14)',
                background: 'linear-gradient(160deg,rgba(23,38,54,.7),rgba(11,19,30,.85))',
                transition: 'transform .3s,border-color .3s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                  <span style={{ color: '#7C90A6' }}>{item.date}</span>
                  {item.category && <span style={{ padding: '3px 10px', borderRadius: 999, color: '#22D3EE', background: 'rgba(34,211,238,.1)', border: '1px solid rgba(34,211,238,.2)' }}>{item.category}</span>}
                </div>
                <h3 style={{ margin: '16px 0 10px', fontSize: 17, lineHeight: 1.5, fontWeight: 700, color: '#E6EDF3' }}>{item.title}</h3>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: '#8FA3B8' }}>{item.summary}</p>
                <div style={{ marginTop: 18, fontSize: 12, color: '#22D3EE', fontWeight: 600 }}>阅读全文 →</div>
              </article>
            ))}
          </div>
          <style>{`
            @container(max-width:900px){.sb-news-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
            @container(max-width:600px){.sb-news-grid{grid-template-columns:1fr!important}}
            .sb-news-card:hover{transform:translateY(-6px);border-color:rgba(34,211,238,.4)!important}
          `}</style>
        </div>
      );
    }

    return (
      <div style={toCss(node.style)} className="w-full">
        {String(p.title ?? '') && (
          <div className="mb-5 flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--sb-accent)' }}>
            <h3 className="text-xl font-bold" style={{ color: 'var(--sb-text)' }}>{String(p.title)}</h3>
            {String(p.moreText ?? '') && (
              <span className="text-xs font-medium" style={{ color: 'var(--sb-accent)' }}>{String(p.moreText)} →</span>
            )}
          </div>
        )}
        <div className="divide-y" style={{ borderColor: '#E5E7EB' }}>
          {items.map((item, i) => (
            <div key={i} className="py-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                <span style={{ color: 'var(--sb-muted)' }}>{item.date}</span>
                {item.category && (
                  <span className="rounded px-2 py-0.5" style={{ background: 'var(--sb-accent)', color: 'var(--sb-primary)' }}>
                    {item.category}
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold" style={{ color: 'var(--sb-text)' }}>{item.title}</div>
              {item.summary && (
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--sb-muted)' }}>{item.summary}</p>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-4 text-center text-xs" style={{ color: 'var(--sb-muted)' }}>
              在右侧填写文章，每行格式：日期|分类|标题|摘要
            </p>
          )}
        </div>
      </div>
    );
  },
};
