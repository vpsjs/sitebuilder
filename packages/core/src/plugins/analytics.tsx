/**
 * 示例插件：访客统计
 * ------------------------------------------------------------------
 * 证明「新增功能 = 写一个插件文件 + 注册一行」。
 * 该插件通过协议向注册表贡献一个组件，并订阅事件，
 * 主程序无需任何改动即可获得统计能力。
 */

import type { CSSProperties } from 'react';
import type { BlockDefinition, PluginContext, SitePlugin } from '../core';
import { Events } from '../core';

const visitorCounterBlock: BlockDefinition = {
  type: 'visitor-counter',
  name: '访客计数',
  icon: 'BarChart3',
  category: '营销',
  defaultProps: { label: '本站访客', initial: 12800 },
  propertySchema: [
    { key: 'label', label: '前缀文字', type: 'text' },
    { key: 'initial', label: '初始数值', type: 'number', min: 0, step: 100 },
  ],
  render: ({ node }) => (
    <div className="w-full rounded-lg px-5 py-4 text-center" style={{ background: 'var(--sb-primary)', color: '#ffffff', ...(node.style as CSSProperties) }}>
      <div className="text-xs uppercase tracking-widest opacity-60">{String(node.props.label ?? '访客')}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: 'var(--sb-accent)' }}>
        {Number(node.props.initial ?? 0).toLocaleString()}
      </div>
    </div>
  ),
};

export const analyticsPlugin: SitePlugin = {
  id: 'analytics',
  name: '访客统计',
  version: '1.0.0',
  description: '提供访客计数组件，站点发布时上报埋点事件',
  enabled: true,
  blocks: [visitorCounterBlock],
  install: (ctx: PluginContext) => {
    ctx.setConfig('provider', 'internal');
  },
  onEnable: (ctx: PluginContext) => {
    ctx.on(Events.SITE_PUBLISHED, () => {
      console.info('[analytics] 站点已发布，埋点已就绪');
    });
  },
};
