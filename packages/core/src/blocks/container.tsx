/**
 * 容器组件 —— 证明「嵌套结构」同样由注册表驱动。
 * 装修态下提供放置区域，站点态下仅做布局。
 */

import type { CSSProperties } from 'react';
import type { BlockDefinition } from '../core';
import { toCss } from '../core';

export const containerBlock: BlockDefinition = {
  type: 'container',
  name: '通栏',
  icon: 'Square',
  category: '布局',
  container: true,
  defaultProps: { gap: 12, background: '#ffffff', padding: 24, columns: 1, columnWidths: '', variant: 'normal' },
  propertySchema: [
    { key: 'gap', label: '子元素间距', type: 'number', min: 0, max: 64, step: 4 },
    { key: 'background', label: '背景色', type: 'color' },
    { key: 'padding', label: '内边距', type: 'number', min: 0, max: 64, step: 4 },
    { key: 'columns', label: '列数', type: 'number', min: 1, max: 6, step: 1 },
    { key: 'columnWidths', label: '列宽比例', type: 'text', placeholder: '1fr 2fr 1fr' },
    {
      key: 'variant', label: '布局样式', type: 'select',
      options: [
        { label: '常规容器', value: 'normal' }, { label: '响应式分屏（桌面多列 / 手机单列）', value: 'split' },
      ],
    },
  ],
  render: ({ node, editing, renderChildren }) => {
    const p = node.props;
    const children = renderChildren?.();
    const columns = Math.max(1, Number(p.columns ?? 1));
    const columnWidths = String(p.columnWidths ?? '').trim();
    if (p.variant === 'split') {
      const cls = `sb-split-${String(node.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
      return (
        <div
          className={`w-full ${cls}`}
          style={{
            ...toCss(node.style),
            background: String(p.background ?? '#ffffff'),
            padding: Number(p.padding ?? 0),
            gap: Number(p.gap ?? 0),
            display: 'grid',
            gridTemplateColumns: columnWidths || `repeat(${columns}, minmax(0, 1fr))`,
            alignItems: 'center',
          } as CSSProperties}
        >
          <style>{`@container(max-width:840px){.${cls}{grid-template-columns:1fr!important}}`}</style>
          {children}
          {editing && (!node.children || node.children.length === 0) && (
            <div className="col-span-full flex min-h-20 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
              拖入组件，桌面分栏 / 手机单列
            </div>
          )}
        </div>
      );
    }
    const isGrid = String(p.layoutMode ?? '') === 'columns' || columns > 1 || Boolean(columnWidths);
    const style = {
      ...toCss(node.style),
      background: String(p.background ?? '#ffffff'),
      padding: Number(p.padding ?? 24),
      gap: Number(p.gap ?? 12),
      display: isGrid ? 'grid' : 'flex',
      gridTemplateColumns: isGrid
        ? (columnWidths || `repeat(${columns}, minmax(0, 1fr))`)
        : undefined,
      flexDirection: isGrid ? undefined : ('column' as const),
    } as CSSProperties;
    return (
      <div
        style={style}
        className="w-full rounded-md"
      >
        {children}
        {editing && (!node.children || node.children.length === 0) && (
          <div className="flex min-h-20 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
            拖入组件
          </div>
        )}
      </div>
    );
  },
};
