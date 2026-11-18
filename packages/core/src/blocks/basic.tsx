/**
 * 基础组件集合
 * ------------------------------------------------------------------
 * 每个组件是独立的 BlockDefinition，通过 propertySchema 描述可配置项，
 * 属性面板据此自动生成，无需为每个组件手写配置 UI。
 */

import type { CSSProperties } from 'react';
import type { BlockDefinition } from '../core';
import { toCss } from '../core';

export const headingBlock: BlockDefinition = {
  type: 'heading',
  name: '标题',
  icon: 'Heading',
  category: '基础',
  defaultProps: {
    text: '在这里输入标题', level: 'h2', color: '#171717', align: 'left',
    variant: 'normal', eyebrow: '', highlight: '', desc: '',
  },
  propertySchema: [
    { key: 'text', label: '标题文字', type: 'text' },
    {
      key: 'level', label: '级别', type: 'select',
      options: [
        { label: 'H1', value: 'h1' }, { label: 'H2', value: 'h2' }, { label: 'H3', value: 'h3' },
      ],
    },
    { key: 'color', label: '颜色', type: 'color' },
    {
      key: 'align', label: '对齐', type: 'select',
      options: [
        { label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' },
      ],
    },
    {
      key: 'variant', label: '布局样式', type: 'select',
      options: [
        { label: '普通标题', value: 'normal' }, { label: '大标题（眉标+渐变高亮+描述）', value: 'hero' },
      ],
    },
    { key: 'eyebrow', label: '眉标（hero 样式）', type: 'text' },
    { key: 'highlight', label: '渐变高亮词（hero 样式）', type: 'text' },
    { key: 'desc', label: '描述（hero 样式）', type: 'textarea', rows: 2 },
  ],
  render: ({ node }) => {
    const p = node.props;
    const Tag = (['h1', 'h2', 'h3'].includes(String(p.level)) ? p.level : 'h2') as 'h1' | 'h2' | 'h3';
    const size = Tag === 'h1' ? 'text-4xl' : Tag === 'h3' ? 'text-xl' : 'text-2xl';
    const align = (p.align as CSSProperties['textAlign']) ?? 'left';
    const color = String(p.color ?? '#171717');

    if (p.variant === 'hero') {
      const heroSize = 'clamp(38px,5.5vw,72px)';
      return (
        <div style={{ ...toCss(node.style), textAlign: align }} className="w-full">
          {String(p.eyebrow ?? '') && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 999,
              border: '1px solid rgba(34,211,238,.35)', background: 'rgba(34,211,238,.08)',
              color: '#67E8F9', fontSize: 11, letterSpacing: 3, fontWeight: 700,
            }}>● {String(p.eyebrow)}</span>
          )}
          <Tag style={{ margin: '20px 0 14px', fontSize: heroSize, lineHeight: 1.08, fontWeight: 800, letterSpacing: -2, color }}>
            {String(p.text ?? '')}
            {String(p.highlight ?? '') && (
              <>
                <br />
                <span style={{
                  background: 'linear-gradient(100deg,#22D3EE,#34D399 55%,#A3E635)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                }}>{String(p.highlight)}</span>
              </>
            )}
          </Tag>
          {String(p.desc ?? '') && (
            <p style={{ maxWidth: 560, fontSize: 16, lineHeight: 1.9, color: 'var(--sb-muted)', margin: align === 'center' ? '0 auto' : 0 }}>
              {String(p.desc)}
            </p>
          )}
        </div>
      );
    }

    return (
      <div style={toCss(node.style)} className="w-full">
        <Tag
          className={`${size} font-bold leading-tight`}
          style={{ color, textAlign: align }}
        >
          {String(p.text ?? '')}
        </Tag>
      </div>
    );
  },
};

export const textBlock: BlockDefinition = {
  type: 'text',
  name: '正文',
  icon: 'AlignLeft',
  category: '基础',
  defaultProps: { content: '在这里输入正文内容，支持多段落文字。', color: '#475569', size: 15, align: 'left' },
  propertySchema: [
    { key: 'content', label: '内容', type: 'textarea', rows: 4 },
    { key: 'size', label: '字号', type: 'number', min: 12, max: 32, step: 1 },
    { key: 'color', label: '颜色', type: 'color' },
    {
      key: 'align', label: '对齐', type: 'select',
      options: [
        { label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' },
      ],
    },
  ],
  render: ({ node }) => {
    const p = node.props;
    return (
      <div style={toCss(node.style)} className="w-full">
        <p
          className="whitespace-pre-wrap leading-relaxed"
          style={{ color: String(p.color ?? '#475569'), fontSize: Number(p.size ?? 15), textAlign: (p.align as CSSProperties['textAlign']) ?? 'left' }}
        >
          {String(p.content ?? '')}
        </p>
      </div>
    );
  },
};

export const buttonBlock: BlockDefinition = {
  type: 'button',
  name: '按钮',
  icon: 'MousePointerClick',
  category: '基础',
  defaultProps: { label: '立即咨询', bg: '', color: '', radius: 8, align: 'left', variant: 'normal', href: '', target: '_self' },
  propertySchema: [
    { key: 'label', label: '按钮文字', type: 'text' },
    { key: 'href', label: '跳转链接（URL 或 #锚点）', type: 'text', placeholder: 'https://... 或 #contact' },
    {
      key: 'target', label: '打开方式', type: 'select',
      options: [
        { label: '当前窗口', value: '_self' }, { label: '新窗口', value: '_blank' },
      ],
    },
    { key: 'bg', label: '背景色', type: 'color' },
    { key: 'color', label: '文字色', type: 'color' },
    { key: 'radius', label: '圆角', type: 'number', min: 0, max: 24, step: 1 },
    {
      key: 'variant', label: '布局样式', type: 'select',
      options: [
        { label: '普通按钮', value: 'normal' }, { label: '科技发光按钮', value: 'glow' },
      ],
    },
    {
      key: 'align', label: '对齐', type: 'select',
      options: [
        { label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' },
      ],
    },
  ],
  render: ({ node, editing }) => {
    const p = node.props;
    const align = (p.align as string) ?? 'left';
    const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
    const href = String(p.href ?? '');
    const target = String(p.target ?? '_self');
    const linkProps = href && !editing ? { href, target, rel: target === '_blank' ? 'noopener noreferrer' : undefined } : {};
    const Tag = href ? 'a' : 'span';
    if (p.variant === 'glow') {
      return (
        <div style={toCss(node.style)} className="w-full">
          <div className={`flex ${justify}`}>
            <Tag {...linkProps} className="sb-btn-glow" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 30px',
              borderRadius: Number(p.radius ?? 10), fontSize: 15, fontWeight: 700, cursor: 'pointer', textDecoration: 'none',
              color: '#04121C', background: 'linear-gradient(100deg,#22D3EE,#34D399)',
              boxShadow: '0 10px 34px rgba(34,211,238,.35)', transition: 'transform .3s,box-shadow .3s',
            }}>
              {String(p.label ?? '按钮')} <span style={{ fontSize: 18 }}>→</span>
            </Tag>
          </div>
          <style>{`.sb-btn-glow:hover{transform:translateY(-3px);box-shadow:0 16px 44px rgba(34,211,238,.55)!important}`}</style>
        </div>
      );
    }
    return (
      <div style={toCss(node.style)} className="w-full">
        <div className={`flex ${justify}`}>
          <Tag
            {...linkProps}
            className="inline-block cursor-pointer px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: String(p.bg || 'var(--sb-accent)'), color: String(p.color || 'var(--sb-primary)'), borderRadius: Number(p.radius ?? 8), textDecoration: 'none' }}
          >
            {String(p.label ?? '按钮')}
          </Tag>
        </div>
      </div>
    );
  },
};

export const imageBlock: BlockDefinition = {
  type: 'image',
  name: '图片',
  icon: 'Image',
  category: '基础',
  defaultProps: { src: '', alt: '图片描述', height: 200, radius: 8 },
  propertySchema: [
    { key: 'src', label: '图片地址', type: 'image', placeholder: 'https://...' },
    { key: 'alt', label: '替代文字', type: 'text' },
    { key: 'width', label: '宽度（px 或 %）', type: 'text', placeholder: '100%' },
    { key: 'height', label: '高度', type: 'number', min: 40, max: 800, step: 10 },
    { key: 'radius', label: '圆角', type: 'number', min: 0, max: 999, step: 1 },
    { key: 'objectFit', label: '缩放方式', type: 'select', options: [
      { label: '填充裁剪 cover', value: 'cover' },
      { label: '完整显示 contain', value: 'contain' },
      { label: '拉伸 fill', value: 'fill' },
      { label: '原始尺寸 none', value: 'none' },
    ] },
    { key: 'objectPosition', label: '焦点位置', type: 'text', placeholder: 'center / top / 50% 30%' },
    { key: 'opacity', label: '不透明度(%)', type: 'number', min: 0, max: 100, step: 5 },
    { key: 'scale', label: '缩放(%)', type: 'number', min: 10, max: 300, step: 5 },
    { key: 'rotate', label: '旋转(°)', type: 'number', min: -180, max: 180, step: 5 },
    { key: 'border', label: '边框（CSS，如 2px solid #fff）', type: 'text', placeholder: '2px solid #ffffff' },
    { key: 'boxShadow', label: '阴影（CSS，如 0 8px 24px rgba(0,0,0,.3)）', type: 'text', placeholder: '0 8px 24px rgba(0,0,0,.3)' },
  ],
  render: ({ node, editing }) => {
    const p = node.props;
    const src = String(p.src ?? '');
    const width = p.width ? String(p.width) : '100%';
    const objectFit = String(p.objectFit ?? 'cover');
    const objectPosition = String(p.objectPosition ?? 'center');
    const style: CSSProperties = {
      width,
      height: Number(p.height ?? 200),
      borderRadius: Number(p.radius ?? 8),
      objectFit: objectFit as CSSProperties['objectFit'],
      objectPosition,
      opacity: p.opacity === undefined ? 1 : Number(p.opacity) / 100,
      boxShadow: p.boxShadow ? String(p.boxShadow) : undefined,
      border: p.border ? String(p.border) : undefined,
      transform: p.scale || p.rotate
        ? `scale(${Number(p.scale ?? 100) / 100}) rotate(${Number(p.rotate ?? 0)}deg)`
        : undefined,
    };
    return (
      <div style={toCss(node.style)} className="w-full">
        {src ? (
          <img
            src={src}
            alt={String(p.alt ?? '')}
            className="block max-w-full"
            style={style}
          />
        ) : (
          <div
            className="flex items-center justify-center border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400"
            style={style}
          >
            {editing ? '请在左侧面板填入图片地址' : '图片'}
          </div>
        )}
      </div>
    );
  },
};

export const dividerBlock: BlockDefinition = {
  type: 'divider',
  name: '分割线',
  icon: 'Minus',
  category: '基础',
  defaultProps: { color: '#E5E7EB', thickness: 1 },
  propertySchema: [
    { key: 'color', label: '颜色', type: 'color' },
    { key: 'thickness', label: '粗细', type: 'number', min: 1, max: 10, step: 1 },
  ],
  render: ({ node }) => (
    <div style={toCss(node.style)} className="w-full py-2">
      <hr style={{ border: 'none', borderTop: `${Number(node.props.thickness ?? 1)}px solid ${String(node.props.color ?? '#E5E7EB')}` }} />
    </div>
  ),
};

export const spacerBlock: BlockDefinition = {
  type: 'spacer',
  name: '空白间距',
  icon: 'MoveVertical',
  category: '布局',
  defaultProps: { height: 32 },
  propertySchema: [{ key: 'height', label: '高度', type: 'number', min: 8, max: 200, step: 8 }],
  render: ({ node }) => <div style={{ height: Number(node.props.height ?? 32), width: '100%' }} />,
};
