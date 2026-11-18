/**
 * 左侧面板：组件库 / 模板中心 / 插件中心
 * ------------------------------------------------------------------
 * 组件库内容完全来自注册表，新增组件自动出现，无需改动本文件。
 */

import {
  AlignLeft,
  BarChart3,
  Heading,
  Image,
  LayoutTemplate,
  Minus,
  MousePointerClick,
  MoveVertical,
  Package,
  Puzzle,
  Square,
  Blocks,
  Palette,
  ShoppingBag,
  Ticket,
  Timer,
  ClipboardList,
  LayoutGrid,
  Columns2,
  ListChecks,
  Images,
  PanelTop,
  PanelBottom,
  GalleryVerticalEnd,
  Newspaper,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { registry, pluginManager, findNode } from '@/core';
import { templates } from '@/templates';
import { DND_BLOCK_TYPE } from '@/core';
import { setDragPayload, clearDragPayload } from '@/core';
import type { EditorApi, PanelTab } from './useEditor';

const iconMap: Record<string, LucideIcon> = {
  Heading, AlignLeft, MousePointerClick, Image, Minus, MoveVertical, Square, BarChart3,
  ShoppingBag, Ticket, Timer, ClipboardList,
  LayoutGrid, Columns2, ListChecks, Images, PanelTop, PanelBottom,
  GalleryVerticalEnd, Newspaper,
};

export function ComponentPanel({ api }: { api: EditorApi }) {
  const grouped = registry.listByCategory();
  const plugins = pluginManager.list();

  return (
    <aside className="flex h-full w-full flex-1 flex-col border-r border-neutral-200 bg-white md:w-[268px] md:flex-none">
      <div className="flex border-b border-neutral-200">
        {([
          { id: 'blocks', label: '组件', icon: Blocks },
          { id: 'templates', label: '模板', icon: LayoutTemplate },
          { id: 'plugins', label: '插件', icon: Puzzle },
          { id: 'theme', label: '主题', icon: Palette },
        ] as { id: PanelTab; label: string; icon: LucideIcon }[]).map((tab) => (
          <TabButton key={tab.id} active={api.panelTab === tab.id} icon={tab.icon} label={tab.label} tab={tab.id} api={api} />
        ))}
      </div>
      <PanelContent grouped={grouped} plugins={plugins} api={api} />
    </aside>
  );
}

function TabButton({ active, icon: Icon, label, tab, api }: {
  active: boolean; icon: LucideIcon; label: string; tab: PanelTab; api: EditorApi;
}) {
  return (
    <button
      onClick={() => api.setPanelTab(tab)}
      className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-xs font-medium transition-colors ${
        active
          ? 'border-[#D4AF37] bg-[#D4AF37]/5 text-neutral-900'
          : 'border-transparent text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function PanelContent({ grouped, plugins, api }: {
  grouped: Record<string, ReturnType<typeof registry.all>>;
  plugins: ReturnType<typeof pluginManager.list>;
  api: EditorApi;
}) {
  const tab = api.panelTab;

  if (tab === 'templates') {
    return (
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <p className="text-[11px] text-neutral-400">套用模板将替换当前画布内容</p>
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => api.load(t.build())}
            className="group block w-full overflow-hidden rounded-lg border border-neutral-200 text-left transition-colors hover:border-[#D4AF37]"
          >
            <div className="h-20 w-full" style={{ background: t.cover }} />
            <div className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-900">{t.name}</span>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500">{t.category}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{t.description}</p>
            </div>
          </button>
        ))}
      </div>
    );
  }

  if (tab === 'theme') {
    return <ThemePanel api={api} />;
  }

  if (tab === 'plugins') {
    return (
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <p className="text-[11px] text-neutral-400">插件提供的组件自动进入组件库</p>
        {plugins.map((p) => (
          <div key={p.id} className="rounded-lg border border-neutral-200 p-3">
            <div className="flex items-center gap-2">
              <Puzzle className="h-4 w-4 text-[#A67C1E]" />
              <span className="text-sm font-semibold text-neutral-900">{p.name}</span>
              <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] ${p.enabled ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'}`}>
                {p.enabled ? '已启用' : '未启用'}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">{p.description}</p>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-neutral-400">
              <Package className="h-3 w-3" /> v{p.version} · 提供 {p.blocks?.length ?? 0} 个组件
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 点击添加：优先加入当前选中的容器，否则追加到根节点末尾
  const quickAdd = (blockType: string) => {
    let parentId = 'root';
    let index = api.page.root.children?.length ?? 0;
    if (api.selectedId) {
      const node = findNode(api.page.root, api.selectedId);
      if (node?.children) {
        parentId = api.selectedId;
        index = node.children.length;
      }
    }
    api.add(blockType, parentId, index);
  };

  return (
    <div className="flex-1 space-y-5 overflow-y-auto p-4">
      <p className="text-[11px] text-neutral-400">点击添加，或拖拽组件到画布</p>
      {Object.entries(grouped).map(([category, blocks]) => (
        <div key={category}>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{category}</h3>
          <div className="grid grid-cols-2 gap-2">
            {blocks.map((block) => {
              const Icon = iconMap[block.icon] ?? Square;
              return (
                <div
                  key={block.type}
                  draggable
                  onClick={() => quickAdd(block.type)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DND_BLOCK_TYPE, block.type);
                    e.dataTransfer.effectAllowed = 'copy';
                    setDragPayload({ blockType: block.type });
                  }}
                  onDragEnd={() => clearDragPayload()}
                  title={`添加${block.name}`}
                  className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 py-3 transition-colors hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 active:bg-[#D4AF37]/10 md:cursor-grab"
                >
                  <Icon className="h-5 w-5 text-neutral-700" />
                  <span className="text-[11px] text-neutral-600">{block.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 预设主题方案 */
const THEME_PRESETS: { name: string; theme: import('@/core').SiteTheme }[] = [
  { name: '经典黑白金', theme: { primary: '#171717', accent: '#D4AF37', background: '#ffffff', text: '#171717', muted: '#475569', radius: 8 } },
  { name: '科技蓝', theme: { primary: '#1E3A8A', accent: '#3B82F6', background: '#F8FAFC', text: '#0F172A', muted: '#475569', radius: 6 } },
  { name: '自然绿', theme: { primary: '#14532D', accent: '#22C55E', background: '#F7FEE7', text: '#14532D', muted: '#4D7C0F', radius: 12 } },
  { name: '活力橙', theme: { primary: '#7C2D12', accent: '#F97316', background: '#FFF7ED', text: '#431407', muted: '#9A3412', radius: 16 } },
];

function ThemePanel({ api }: { api: EditorApi }) {
  const current = api.page.theme;
  const fields: { key: keyof import('@/core').SiteTheme; label: string; type: 'color' | 'number' }[] = [
    { key: 'primary', label: '主色', type: 'color' },
    { key: 'accent', label: '强调色', type: 'color' },
    { key: 'background', label: '背景色', type: 'color' },
    { key: 'text', label: '正文色', type: 'color' },
    { key: 'muted', label: '次要文字', type: 'color' },
    { key: 'radius', label: '圆角', type: 'number' },
  ];

  return (
    <div className="flex-1 space-y-5 overflow-y-auto p-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">一键套用</p>
        <div className="grid grid-cols-2 gap-2">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => api.setTheme(preset.theme)}
              className="rounded-lg border border-neutral-200 p-2.5 text-left transition-colors hover:border-[#D4AF37]"
            >
              <div className="mb-1.5 flex gap-1">
                <span className="h-5 w-5 rounded" style={{ background: preset.theme.primary }} />
                <span className="h-5 w-5 rounded" style={{ background: preset.theme.accent }} />
                <span className="h-5 w-5 rounded border border-neutral-200" style={{ background: preset.theme.background }} />
              </div>
              <span className="text-[11px] text-neutral-700">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">自定义令牌</p>
        <div className="space-y-2.5">
          {fields.map((f) => {
            const value = current?.[f.key] ?? '';
            return (
              <div key={f.key} className="flex items-center justify-between gap-2">
                <label className="text-xs text-neutral-600">{f.label}</label>
                {f.type === 'color' ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={String(value || '#000000')}
                      onChange={(e) => api.setTheme({ [f.key]: e.target.value })}
                      className="h-7 w-7 cursor-pointer rounded border border-neutral-200 bg-white p-0.5"
                    />
                    <span className="w-20 font-mono text-[10px] text-neutral-400">{String(value)}</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    value={Number(value || 0)}
                    min={0}
                    max={32}
                    onChange={(e) => api.setTheme({ [f.key]: Number(e.target.value) })}
                    className="w-20 rounded-md border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-[#D4AF37]"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-neutral-400">
        主题通过 CSS 变量注入，发布后公开站点立即同步换肤。
      </p>
    </div>
  );
}
