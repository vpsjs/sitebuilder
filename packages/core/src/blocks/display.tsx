/**
 * 展示组件集合：轮播图 / 导航栏 / 页脚
 * ------------------------------------------------------------------
 * 全部为展示组件，装修器画布与公开站点共用同一渲染，
 * 服务端渲染（Next.js App Router）与客户端装修器都能安全使用。
 * 轮播采用纯 CSS 关键帧自动播放，样式引用主题变量保持一致换肤。
 */

import type { MouseEvent } from 'react';
import type { BlockDefinition, DslNode } from '../core';
import { toCss } from '../core';

interface Slide { src: string; caption: string }

function parseSlides(raw: unknown): Slide[] {
  return String(raw ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [src, ...rest] = line.split('|');
      return { src: src ?? '', caption: rest.join('|').trim() };
    });
}

/** 轮播图：每行「图片地址|标题」，纯 CSS 关键帧自动轮播 */
export const carouselBlock: BlockDefinition = {
  type: 'carousel',
  name: '轮播图',
  icon: 'Images',
  category: '布局',
  defaultProps: {
    slides: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200|专业的企业服务\nhttps://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200|打造理想办公空间',
    height: 320,
    interval: 4000,
  },
  propertySchema: [
    { key: 'slides', label: '图片（每行：图片地址|标题）', type: 'textarea', rows: 5 },
    { key: 'height', label: '高度', type: 'number', min: 160, max: 640, step: 20 },
    { key: 'interval', label: '切换间隔（毫秒）', type: 'number', min: 1000, max: 10000, step: 500 },
  ],
  render: ({ node, editing }) => {
    const p = node.props;
    const slides = parseSlides(p.slides);
    const height = Number(p.height ?? 320);

    if (slides.length === 0) {
      return (
        <div
          className="flex w-full items-center justify-center rounded-lg border border-dashed text-xs"
          style={{ ...toCss(node.style), height, borderColor: '#CBD5E1', color: 'var(--sb-muted)' }}
        >
          {editing ? '请在右侧填入图片地址，每行一张（可写：图片地址|标题）' : '轮播图'}
        </div>
      );
    }

    const name = `sb-carousel-${String(node.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const perMs = Math.max(1000, Number(p.interval ?? 4000));
    const total = (perMs * slides.length) / 1000;
    const litPct = 100 / slides.length;
    const fadePct = Math.min(litPct * 0.12, 3);
    const keyframes = `@keyframes ${name}{0%{opacity:0}${fadePct.toFixed(3)}%{opacity:1}${(litPct - fadePct).toFixed(3)}%{opacity:1}${litPct.toFixed(3)}%{opacity:0}100%{opacity:0}}`;

    return (
      <div style={toCss(node.style)} className="w-full overflow-hidden rounded-lg">
        <style>{keyframes}</style>
        <div className="relative" style={{ height }}>
          {slides.map((s, i) => (
            <div
              key={i}
              className="absolute inset-0"
              style={{
                opacity: i === 0 ? 1 : 0,
                animation: slides.length > 1 ? `${name} ${total}s linear infinite` : undefined,
                animationDelay: slides.length > 1 ? `${(-i * perMs) / 1000}s` : undefined,
              }}
            >
              {s.src ? (
                <img src={s.src} alt={s.caption} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center" style={{ background: '#E2E8F0', color: '#94A3B8' }}>
                  图片 {i + 1}
                </div>
              )}
              {s.caption && (
                <div
                  className="absolute inset-x-0 bottom-0 px-5 py-3 text-sm font-medium text-white"
                  style={{ background: 'linear-gradient(transparent, rgba(0,0,0,.6))' }}
                >
                  {s.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  },
};

/** 导航栏：Logo + 菜单，菜单每行「文字|锚点」 */
export const navbarBlock: BlockDefinition = {
  type: 'navbar',
  name: '导航栏',
  icon: 'PanelTop',
  category: '布局',
  defaultProps: {
    logo: '我的网站',
    menus: '首页|#home\n关于我们|#about\n产品服务|#products\n联系我们|#contact',
    variant: 'solid',
  },
  propertySchema: [
    { key: 'logo', label: 'Logo 文字', type: 'text' },
    { key: 'menus', label: '菜单（每行：文字|锚点）', type: 'textarea', rows: 5 },
    {
      key: 'variant', label: '样式', type: 'select',
      options: [
        { label: '实色', value: 'solid' }, { label: '透明', value: 'ghost' },
      ],
    },
  ],
  render: ({ node, editing }) => <NavbarView node={node} editing={editing} />,
};

function NavbarView({ node, editing }: { node: DslNode; editing: boolean }) {
  const p = node.props;
  const solid = String(p.variant ?? 'solid') === 'solid';
  const uid = `sb-nav-${String(node.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const fg = solid ? '#ffffff' : 'var(--sb-text)';
  const menus = String(p.menus ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split('|');
      return { label: label ?? '', href: rest.join('|').trim() || '#' };
    });

  return (
    <div
      className={`sb-navbar ${uid} relative w-full rounded-md`}
      style={{
        ...toCss(node.style),
        background: solid ? 'var(--sb-primary)' : 'transparent',
        ['--sb-nav-fg' as string]: fg,
        ['--sb-nav-accent' as string]: 'var(--sb-accent)',
        ['--sb-nav-panel' as string]: solid ? 'var(--sb-primary)' : 'var(--sb-bg)',
      }}
    >
      <style>{`
        .${uid}{-webkit-user-select:none;user-select:none}
        .${uid} .sb-nav-inner{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 20px;width:100%}
        .${uid} .sb-nav-desktop{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
        .${uid} .sb-nav-link{font-size:14px;text-decoration:none;opacity:.95;color:var(--sb-nav-fg)}
        .${uid} .sb-nav-link:hover{opacity:.65}
        .${uid} .sb-nav-checkbox{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}
        .${uid} .sb-nav-toggle{display:none;align-items:center;justify-content:center;width:36px;height:32px;border-radius:6px;border:1px solid currentColor;color:var(--sb-nav-fg);cursor:pointer;background:transparent}
        .${uid} .sb-nav-bars{position:relative;display:block;width:18px;height:12px}
        .${uid} .sb-nav-bars::before,.${uid} .sb-nav-bars::after,.${uid} .sb-nav-bars span{content:"";position:absolute;left:0;width:18px;height:2px;border-radius:2px;background:var(--sb-nav-fg)}
        .${uid} .sb-nav-bars::before{top:0}
        .${uid} .sb-nav-bars span{top:5px}
        .${uid} .sb-nav-bars::after{top:10px}
        .${uid} .sb-nav-mobile{display:none;position:absolute;left:0;right:0;top:100%;z-index:60;flex-direction:column;padding:8px 20px 14px;background:var(--sb-nav-panel);border-top:1px solid rgba(127,127,127,.24);box-shadow:0 18px 36px rgba(0,0,0,.18)}
        .${uid} .sb-nav-checkbox:checked ~ .sb-nav-mobile{display:flex}
        .${uid} .sb-nav-mobile .sb-nav-link{display:block;padding:10px 2px;border-bottom:1px solid rgba(127,127,127,.18)}
        @media (max-width:640px){
          .${uid} .sb-nav-inner{padding:12px 16px}
          .${uid} .sb-nav-desktop{display:none}
          .${uid} .sb-nav-toggle{display:flex}
        }
        @container (max-width:640px){
          .${uid} .sb-nav-inner{padding:12px 16px}
          .${uid} .sb-nav-desktop{display:none}
          .${uid} .sb-nav-toggle{display:flex}
        }
      `}</style>

      <input
        id={`${uid}-toggle`}
        type="checkbox"
        className="sb-nav-checkbox"
        aria-label="展开导航菜单"
        {...(editing ? { onClick: (e: MouseEvent) => e.stopPropagation() } : {})}
      />

      <div className="sb-nav-inner">
        <div className="text-base font-bold" style={{ color: solid ? 'var(--sb-accent)' : 'var(--sb-text)' }}>
          {String(p.logo ?? 'Logo')}
        </div>

        <nav className="sb-nav-desktop">
          {menus.map((m, i) => (
            <a key={i} href={m.href} className="sb-nav-link">{m.label}</a>
          ))}
        </nav>

        <label
          htmlFor={`${uid}-toggle`}
          className="sb-nav-toggle"
          title="展开菜单"
          {...(editing ? { onClick: (e: MouseEvent) => e.stopPropagation() } : {})}
        >
          <span className="sb-nav-bars"><span /></span>
        </label>
      </div>

      <nav className="sb-nav-mobile">
        {menus.map((m, i) => (
          <a key={i} href={m.href} className="sb-nav-link" {...(editing ? { onClick: (e: MouseEvent) => e.stopPropagation() } : {})}>
            {m.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

/** 页脚：版权 + 联系方式 + 备案号 */
export const footerBlock: BlockDefinition = {
  type: 'footer',
  name: '页脚',
  icon: 'PanelBottom',
  category: '布局',
  defaultProps: {
    brand: '我的网站',
    contact: '电话：400-000-0000　邮箱：hello@example.com',
    copyright: '© 2026 我的网站 版权所有',
    icp: '',
  },
  propertySchema: [
    { key: 'brand', label: '站点名称', type: 'text' },
    { key: 'contact', label: '联系方式', type: 'text' },
    { key: 'copyright', label: '版权信息', type: 'text' },
    { key: 'icp', label: '备案号', type: 'text' },
  ],
  render: ({ node }) => {
    const p = node.props;
    return (
      <div
        className="w-full rounded-md px-5 py-8 text-center"
        style={{ ...toCss(node.style), background: 'var(--sb-primary)' }}
      >
        <div className="text-base font-bold" style={{ color: 'var(--sb-accent)' }}>{String(p.brand ?? '')}</div>
        {String(p.contact ?? '') && (
          <div className="mt-2 text-xs" style={{ color: 'rgba(255,255,255,.75)' }}>{String(p.contact)}</div>
        )}
        <div className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,.55)' }}>
          {String(p.copyright ?? '')}
          {String(p.icp ?? '') && <span className="ml-2">{String(p.icp)}</span>}
        </div>
      </div>
    );
  },
};
