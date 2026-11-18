import { useEffect, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, Blocks, ChevronRight, Copy, Eye, EyeOff, GripVertical,
  Lock, LockOpen, MoreHorizontal, MoveLeft, MoveRight, Plus, Search,
  Sparkles, Trash2, Globe, Package, RefreshCw,
} from 'lucide-react';
import {
  listGlobalBlocks, createGlobalBlock, deleteGlobalBlock, type GlobalBlockDto,
} from '@/api/client';
import { BOTTOM_ICONS, type BottomNavItem, type MobileOptions } from './mobileOptions';
import {
  registry, themeToCssVars, findNode, FONT_PRESETS,
  type DslNode, type SiteTheme,
} from '@/core';
import { FieldControl } from './PropertyPanel';
import type { EditorApi } from './useEditor';

export type ElementTab = 'image' | 'effect' | 'animation' | 'responsive' | 'content' | 'style' | 'layout' | 'advanced';

/** 左侧图层树：按 DSL 层级展示所有节点，支持选中/显隐/锁定/上下移动 */
export function LayerDrawer({ api }: { api: EditorApi }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);

  const parentOf = (root: DslNode, id: string): DslNode | null => {
    if ((root.children ?? []).some((c) => c.id === id)) return root;
    for (const child of root.children ?? []) {
      const found = parentOf(child, id);
      if (found) return found;
    }
    return null;
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const parent = parentOf(api.page.root, targetId);
    if (!parent) return;
    const index = (parent.children ?? []).findIndex((c) => c.id === targetId);
    if (index >= 0) api.move(dragId, parent.id, index);
    setDragId(null);
  };

  const toggleHidden = (node: DslNode) => api.patch(node.id, { hidden: !node.hidden });
  const toggleLocked = (node: DslNode) => api.patch(node.id, { locked: !node.locked });

  const renderNode = (node: DslNode, depth: number) => {
    const block = registry.get(node.type);
    const children = node.children ?? [];
    const isOpen = !collapsed[node.id];
    const selected = api.selectedId === node.id;
    return (
      <div key={node.id}>
        <div
          draggable={node.id !== 'root' && !node.locked}
          onDragStart={(e) => { e.stopPropagation(); setDragId(node.id); e.dataTransfer.effectAllowed = 'move'; }}
          onDragEnd={() => setDragId(null)}
          onDragOver={(e) => { if (dragId && dragId !== node.id) e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(node.id); }}
          onClick={() => api.select(node.id)}
          title={node.id}
          className={`group flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors ${
            selected ? 'bg-[var(--ui-accent)] text-white' : 'hover:bg-[var(--ui-hover)] text-[var(--ui-fg)]'
          } ${node.hidden ? 'opacity-50' : ''}`}
          style={{ paddingLeft: 6 + depth * 14 }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed((c) => ({ ...c, [node.id]: isOpen })); }}
            className={`flex h-4 w-4 shrink-0 items-center justify-center ${children.length ? '' : 'invisible'}`}
            title={isOpen ? '折叠' : '展开'}
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </button>
          <GripVertical className="h-3 w-3 shrink-0 opacity-30 group-hover:opacity-70" />
          <span className="min-w-0 flex-1 truncate">{block?.name ?? node.type}{node.id === 'root' ? ' · 页面' : ''}</span>
          {node.id !== 'root' && (
            <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button onClick={(e) => { e.stopPropagation(); toggleHidden(node); }} title={node.hidden ? '显示' : '隐藏'} className="rounded p-0.5 hover:bg-black/10">
                {node.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); toggleLocked(node); }} title={node.locked ? '解锁' : '锁定'} className="rounded p-0.5 hover:bg-black/10">
                {node.locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
              </button>
            </span>
          )}
        </div>
        {isOpen && children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] leading-relaxed text-[var(--ui-muted)]">点击选中图层，拖动可调整层级顺序。</p>
      <div className="rounded-md border border-[var(--ui-border)] p-1.5">
        {renderNode(api.page.root, 0)}
      </div>
    </div>
  );
}

const THEME_PRESETS: { name: string; theme: SiteTheme }[] = [
  { name: '高端黑白金', theme: { primary: '#171717', accent: '#D4AF37', background: '#ffffff', text: '#171717', muted: '#475569', radius: 8 } },
  { name: '科技蓝', theme: { primary: '#1E3A8A', accent: '#3B82F6', background: '#F8FAFC', text: '#0F172A', muted: '#475569', radius: 6 } },
  { name: '自然绿', theme: { primary: '#14532D', accent: '#22C55E', background: '#F7FEE7', text: '#14532D', muted: '#4D7C0F', radius: 12 } },
  { name: '活力橙', theme: { primary: '#7C2D12', accent: '#F97316', background: '#FFF7ED', text: '#431407', muted: '#9A3412', radius: 16 } },
];

export function ElementDrawer({ api, node, tab, patchProps, patchStyle }: {
  api: EditorApi;
  node: DslNode;
  tab: ElementTab;
  patchProps: (patch: Record<string, unknown>) => void;
  patchStyle: (patch: Record<string, unknown>) => void;
}) {
  const block = registry.get(node.type);
  const tokens = [
    { label: '主题色', value: '--sb-primary' },
    { label: '强调色', value: '--sb-accent' },
    { label: '背景色', value: '--sb-bg' },
    { label: '正文色', value: '--sb-text' },
    { label: '次要文字', value: '--sb-muted' },
    ...(api.page.theme?.colors ?? []).map((c) => ({ label: c.name, value: `--sb-c-${c.name}` })),
  ];
  if (!block) return null;

  if (tab === 'image') {
    const imageField = block.propertySchema.find((f) => f.type === 'image');
    return (
      <div className="space-y-4">
        {imageField && <FieldControl field={imageField} value={node.props[imageField.key]} tokens={tokens} onChange={(v) => patchProps({ [imageField.key]: v })} />}
        <div className="grid grid-cols-2 gap-2">
          <NumField label="宽" value={node.props.width} onChange={(width) => patchProps({ width })} />
          <NumField label="高" value={node.props.height} onChange={(height) => patchProps({ height })} />
        </div>
        <TextField label="图片地址" value={node.props.src} placeholder="https://..." onChange={(src) => patchProps({ src })} />
        <TextField label="链接" value={node.props.link} placeholder="无" onChange={(link) => patchProps({ link })} />
        <TextField label="描述（alt）" value={node.props.alt} placeholder="添加图片描述，有利于网站关键词排名" onChange={(alt) => patchProps({ alt })} />
        <SelectField label="缩放方式" value={String(node.props.objectFit ?? 'cover')} options={['cover', 'contain', 'fill', 'none']} onChange={(objectFit) => patchProps({ objectFit })} />
        <TextField label="焦点位置" value={node.props.objectPosition} placeholder="center / top / 50% 30%" onChange={(objectPosition) => patchProps({ objectPosition })} />
        <div>
          <div className="mb-2 text-xs text-[var(--ui-muted)]">图形</div>
          <div className="grid grid-cols-3 gap-2">
            {['无裁剪', '圆角', '圆形'].map((shape, i) => (
              <button key={shape} onClick={() => patchProps({ shape, radius: i === 2 ? 999 : i === 1 ? 12 : 0 })} className={`rounded-md border px-2 py-3 text-[10px] ${i === 0 ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]' : 'border-[var(--ui-border)] text-[var(--ui-muted)]'}`}>{shape}</button>
            ))}
          </div>
        </div>
        <div className="space-y-3 rounded-lg border border-[var(--ui-border)] p-3">
          <div className="text-xs font-semibold">样式设置</div>
          <RangeField label="圆角" suffix="px" min={0} max={999} value={Number(node.props.radius ?? 8)} onChange={(radius) => patchProps({ radius })} />
          <RangeField label="不透明度" suffix="%" min={10} max={100} value={Number(node.props.opacity ?? 100)} onChange={(opacity) => patchProps({ opacity })} />
          <RangeField label="缩放" suffix="%" min={50} max={150} value={Number(node.props.scale ?? 100)} onChange={(scale) => patchProps({ scale })} />
          <RangeField label="旋转" suffix="°" min={-180} max={180} value={Number(node.props.rotate ?? 0)} onChange={(rotate) => patchProps({ rotate })} />
          <TextField label="边框" value={node.props.border} placeholder="1px solid #E5E7EB" onChange={(border) => patchProps({ border })} />
          <TextField label="阴影" value={node.props.boxShadow} placeholder="0 10px 30px rgba(0,0,0,.12)" onChange={(boxShadow) => patchProps({ boxShadow })} />
        </div>
      </div>
    );
  }

  if (tab === 'effect') {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-[var(--ui-accent-soft)] p-3 text-xs leading-relaxed text-[var(--ui-accent-text)]">显示效果会同时作用于装修预览和公开站点。</div>
        <RangeField label="模块透明度" suffix="%" min={10} max={100} value={Number(node.style?.opacity ?? 100)} onChange={(opacity) => patchStyle({ opacity: opacity / 100 })} />
        <RangeField label="圆角" suffix="px" min={0} max={48} value={Number(node.style?.borderRadius ?? 0)} onChange={(borderRadius) => patchStyle({ borderRadius })} />
        <TextField label="边框" value={node.style?.border} placeholder="1px solid #E5E7EB" onChange={(border) => patchStyle({ border })} />
        <div>
          <div className="mb-2 text-xs text-[var(--ui-muted)]">阴影预设</div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'none', label: '无' }, { id: 'small', label: '轻' },
              { id: 'medium', label: '中' }, { id: 'large', label: '重' },
            ].map((item) => (
              <button key={item.id} onClick={() => patchStyle({ boxShadowPreset: item.id })} className={`rounded-md border px-2 py-2 text-[11px] ${(node.style?.boxShadowPreset ?? 'none') === item.id ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]' : 'border-[var(--ui-border)] text-[var(--ui-muted)]'}`}>{item.label}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs text-[var(--ui-muted)]">悬停效果</div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'none', label: '无' }, { id: 'lift', label: '上浮' },
              { id: 'zoom', label: '放大' }, { id: 'glow', label: '发光' },
            ].map((item) => (
              <button key={item.id} onClick={() => patchStyle({ hoverEffect: item.id })} className={`rounded-md border px-2 py-2 text-[11px] ${(node.style?.hoverEffect ?? 'none') === item.id ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]' : 'border-[var(--ui-border)] text-[var(--ui-muted)]'}`}>{item.label}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs text-[var(--ui-muted)]">入场动画</div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'none', label: '无' }, { id: 'fade', label: '淡入' },
              { id: 'up', label: '上浮' }, { id: 'zoom', label: '缩放' },
            ].map((item) => (
              <button key={item.id} onClick={() => patchStyle({ entranceAnimation: item.id })} className={`rounded-md border px-2 py-2 text-[11px] ${(node.style?.entranceAnimation ?? 'none') === item.id ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]' : 'border-[var(--ui-border)] text-[var(--ui-muted)]'}`}>{item.label}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tab === 'animation') {
    return <AnimationPanel node={node} patchStyle={patchStyle} />;
  }

  if (tab === 'layout') {
    return <LayoutPanel api={api} node={node} patchProps={patchProps} />;
  }

  if (tab === 'responsive') {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-[var(--ui-accent-soft)] p-3 text-xs leading-relaxed text-[var(--ui-accent-text)]">设置不同设备上的显示方式，移动端可单独隐藏或调整图片高度。</div>
        <SelectField label="电脑端显示" value="显示" options={['显示', '隐藏']} />
        <SelectField label="平板显示" value="跟随电脑" options={['跟随电脑', '显示', '隐藏']} />
        <SelectField label="手机显示" value="跟随电脑" options={['跟随电脑', '显示', '隐藏']} />
        <NumField label="手机端高度" value={node.props.mobileHeight} onChange={(mobileHeight) => patchProps({ mobileHeight })} />
      </div>
    );
  }

  if (tab === 'content') {
    return <div className="space-y-3">{block.propertySchema.map((field) => <FieldControl key={field.key} field={field} value={node.props[field.key]} tokens={tokens} onChange={(v) => patchProps({ [field.key]: v })} />)}</div>;
  }

  if (tab === 'style') {
    return <FreeStylePanel node={node} patchStyle={patchStyle} />;
  }

  return (
    <div className="space-y-3">
      <ActionRow icon={node.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} title={node.hidden ? '当前已隐藏' : '当前显示中'} desc="隐藏后公开站点不展示" action={node.hidden ? '显示' : '隐藏'} disabled={node.locked || node.id === 'root'} onClick={() => api.patch(node.id, { hidden: !node.hidden })} />
      <ActionRow icon={node.locked ? <Lock className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />} title={node.locked ? '当前已锁定' : '当前未锁定'} desc="锁定后不能拖拽和删除" action={node.locked ? '解锁' : '锁定'} disabled={node.id === 'root'} onClick={() => api.patch(node.id, { locked: !node.locked })} />
      <button onClick={() => api.remove(node.id)} disabled={node.locked || node.id === 'root'} className="flex w-full items-center justify-center gap-2 rounded-md border border-red-200 py-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> 删除模块</button>
      <div className="rounded-md bg-[var(--ui-hover)] p-3 font-mono text-[10px] text-[var(--ui-muted)]">{node.id} · {node.type}</div>
    </div>
  );
}

const CLIP_SHAPES: { id: string; label: string; value: string }[] = [
  { id: 'none', label: '无', value: '' },
  { id: 'circle', label: '圆形', value: 'circle(50% at 50% 50%)' },
  { id: 'triangle', label: '三角', value: 'polygon(50% 0%, 0% 100%, 100% 100%)' },
  { id: 'diamond', label: '菱形', value: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' },
  { id: 'hexagon', label: '六边', value: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' },
  { id: 'star', label: '星形', value: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' },
  { id: 'arrow', label: '箭头', value: 'polygon(0% 35%, 65% 35%, 65% 10%, 100% 50%, 65% 90%, 65% 65%, 0% 65%)' },
  { id: 'pentagon', label: '五边', value: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' },
];

const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturate', 'color', 'luminosity'];

function parseFilter(filter: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of ['blur', 'grayscale', 'brightness', 'contrast', 'saturate', 'sepia']) {
    const m = filter.match(new RegExp(`${key}\\(([\\d.]+)(px|%?)\\)`));
    if (m) out[key] = key === 'blur' ? Number(m[1]) : Number(m[1]);
  }
  const h = filter.match(/hue-rotate\((-?[\d.]+)deg\)/);
  if (h) out.hue = Number(h[1]);
  return out;
}

function FreeStylePanel({ node, patchStyle }: { node: DslNode; patchStyle: (patch: Record<string, unknown>) => void }) {
  const s = node.style ?? {};
  const f = parseFilter(s.filter ?? '');
  const setFilter = (key: string, value: number) => {
    const next = { ...f, [key]: value };
    const parts: string[] = [];
    if (next.blur) parts.push(`blur(${next.blur}px)`);
    if (next.grayscale) parts.push(`grayscale(${next.grayscale}%)`);
    if (next.brightness && next.brightness !== 100) parts.push(`brightness(${next.brightness}%)`);
    if (next.contrast && next.contrast !== 100) parts.push(`contrast(${next.contrast}%)`);
    if (next.saturate && next.saturate !== 100) parts.push(`saturate(${next.saturate}%)`);
    if (next.sepia) parts.push(`sepia(${next.sepia}%)`);
    if (next.hue) parts.push(`hue-rotate(${next.hue}deg)`);
    patchStyle({ filter: parts.join(' ') });
  };
  return (
    <div className="space-y-5">
      <div className="rounded-md bg-[var(--ui-accent-soft)] p-3 text-[11px] leading-relaxed text-[var(--ui-accent-text)]">这里的设置会作用于装修预览和公开站点，改完即时生效。绝对定位后可在画布上直接拖动模块。</div>

      <Group title="定位与层级">
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="定位方式" value={String(s.position ?? 'static')} options={['static', 'relative', 'absolute', 'fixed']} onChange={(position) => patchStyle({ position })} />
          <NumField label="层级 z-index" value={s.zIndex} onChange={(zIndex) => patchStyle({ zIndex })} />
        </div>
        {s.position && s.position !== 'static' && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <NumField label="上 top" value={s.top} onChange={(top) => patchStyle({ top })} />
            <NumField label="右 right" value={s.right} onChange={(right) => patchStyle({ right })} />
            <NumField label="下 bottom" value={s.bottom} onChange={(bottom) => patchStyle({ bottom })} />
            <NumField label="左 left" value={s.left} onChange={(left) => patchStyle({ left })} />
          </div>
        )}
      </Group>

      <Group title="尺寸">
        <div className="grid grid-cols-3 gap-2">
          <TextField label="宽" value={s.width} placeholder="100% / 320px" onChange={(width) => patchStyle({ width })} />
          <NumField label="高" value={s.height} onChange={(height) => patchStyle({ height })} />
          <NumField label="最小高" value={s.minHeight} onChange={(minHeight) => patchStyle({ minHeight })} />
        </div>
      </Group>

      <Group title="背景">
        <TextField label="背景色" value={s.background} placeholder="#ffffff 或 rgba(...)" onChange={(background) => patchStyle({ background })} />
        <div className="mt-2">
          <div className="mb-1.5 text-xs text-[var(--ui-muted)]">快捷配色</div>
          <div className="flex flex-wrap gap-1.5">
            {['#ffffff', '#000000', '#f5f5f5', 'var(--sb-primary)', 'var(--sb-accent)', 'linear-gradient(135deg,#667eea,#764ba2)', 'linear-gradient(135deg,#f093fb,#f5576c)'].map((c) => (
              <button key={c} onClick={() => patchStyle({ background: c })} title={c} className="h-7 w-7 rounded border border-[var(--ui-border)]" style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="mt-2 space-y-2">
          <TextField label="背景图 / 渐变" value={s.backgroundImage} placeholder="url(...) 或 linear-gradient(...)" onChange={(backgroundImage) => patchStyle({ backgroundImage })} />
          <div className="grid grid-cols-2 gap-2">
            <SelectField label="缩放" value={String(s.backgroundSize ?? 'cover')} options={['cover', 'contain', 'auto', '100% 100%']} onChange={(backgroundSize) => patchStyle({ backgroundSize })} />
            <SelectField label="平铺" value={String(s.backgroundRepeat ?? 'no-repeat')} options={['no-repeat', 'repeat', 'repeat-x', 'repeat-y']} onChange={(backgroundRepeat) => patchStyle({ backgroundRepeat })} />
          </div>
          <TextField label="位置" value={s.backgroundPosition} placeholder="center / top / 50% 30%" onChange={(backgroundPosition) => patchStyle({ backgroundPosition })} />
        </div>
      </Group>

      <Group title="形状与裁剪">
        <div className="mb-2 text-[10px] text-[var(--ui-muted)]">点击套用裁剪形状，作用于整个模块区域。</div>
        <div className="grid grid-cols-4 gap-2">
          {CLIP_SHAPES.map((shape) => (
            <button
              key={shape.id}
              onClick={() => patchStyle({ clipPath: shape.value })}
              className={`rounded-md border px-2 py-2 text-[11px] ${(s.clipPath ?? '') === shape.value ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]' : 'border-[var(--ui-border)] text-[var(--ui-muted)]'}`}
            >{shape.label}</button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <NumField label="左上圆角" value={s.borderRadiusTL ?? s.borderRadius} onChange={(borderRadiusTL) => patchStyle({ borderRadiusTL })} />
          <NumField label="右上圆角" value={s.borderRadiusTR ?? s.borderRadius} onChange={(borderRadiusTR) => patchStyle({ borderRadiusTR })} />
          <NumField label="右下圆角" value={s.borderRadiusBR ?? s.borderRadius} onChange={(borderRadiusBR) => patchStyle({ borderRadiusBR })} />
          <NumField label="左下圆角" value={s.borderRadiusBL ?? s.borderRadius} onChange={(borderRadiusBL) => patchStyle({ borderRadiusBL })} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <TextField label="宽高比" value={s.aspectRatio} placeholder="16/9 或 1/1" onChange={(aspectRatio) => patchStyle({ aspectRatio })} />
          <TextField label="变换原点" value={s.transformOrigin} placeholder="center / top left" onChange={(transformOrigin) => patchStyle({ transformOrigin })} />
        </div>
      </Group>

      <Group title="背景增强">
        <div className="mb-2 text-[10px] text-[var(--ui-muted)]">渐变生成器：选两个颜色与角度，自动生成背景。</div>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-[10px] text-[var(--ui-muted)]">起始色<input type="color" defaultValue="#667eea" id="grad-a" className="mt-1 h-8 w-full cursor-pointer rounded border border-[var(--ui-border)]" /></label>
          <label className="text-[10px] text-[var(--ui-muted)]">结束色<input type="color" defaultValue="#764ba2" id="grad-b" className="mt-1 h-8 w-full cursor-pointer rounded border border-[var(--ui-border)]" /></label>
          <label className="text-[10px] text-[var(--ui-muted)]">角度<input type="number" id="grad-angle" defaultValue={135} min={0} max={360} className="mt-1 w-full rounded border border-[var(--ui-border)] px-1 py-1.5 text-[11px]" /></label>
        </div>
        <button
          onClick={() => {
            const a = (document.getElementById('grad-a') as HTMLInputElement)?.value ?? '#667eea';
            const b = (document.getElementById('grad-b') as HTMLInputElement)?.value ?? '#764ba2';
            const angle = Number((document.getElementById('grad-angle') as HTMLInputElement)?.value ?? 135);
            patchStyle({ backgroundImage: `linear-gradient(${angle}deg, ${a}, ${b})` });
          }}
          className="mt-2 w-full rounded-md bg-[var(--ui-accent)] px-2 py-1.5 text-[11px] font-semibold text-white"
        >应用渐变背景</button>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            'linear-gradient(135deg,#0ea5e9,#2563eb)', 'linear-gradient(135deg,#f59e0b,#ef4444)',
            'linear-gradient(135deg,#10b981,#059669)', 'radial-gradient(circle at 30% 30%,#6366f1,#1e1b4b)',
            'linear-gradient(135deg,#0f172a,#334155)', 'repeating-linear-gradient(45deg,#1e293b,#1e293b 10px,#0f172a 10px,#0f172a 20px)',
          ].map((g) => <button key={g} onClick={() => patchStyle({ backgroundImage: g })} title={g} className="h-8 w-8 rounded border border-[var(--ui-border)]" style={{ backgroundImage: g }} />)}
        </div>
      </Group>

      <Group title="滤镜与混合">
        <div className="space-y-2">
          <RangeField label="模糊" suffix="px" min={0} max={20} step={1} value={f.blur ?? 0} onChange={(v) => setFilter('blur', v)} />
          <RangeField label="灰度" suffix="%" min={0} max={100} step={1} value={f.grayscale ?? 0} onChange={(v) => setFilter('grayscale', v)} />
          <RangeField label="亮度" suffix="%" min={20} max={200} step={5} value={f.brightness ?? 100} onChange={(v) => setFilter('brightness', v)} />
          <RangeField label="对比度" suffix="%" min={20} max={200} step={5} value={f.contrast ?? 100} onChange={(v) => setFilter('contrast', v)} />
          <RangeField label="饱和度" suffix="%" min={0} max={300} step={5} value={f.saturate ?? 100} onChange={(v) => setFilter('saturate', v)} />
          <RangeField label="怀旧" suffix="%" min={0} max={100} step={1} value={f.sepia ?? 0} onChange={(v) => setFilter('sepia', v)} />
          <RangeField label="色相旋转" suffix="°" min={-180} max={180} step={5} value={f.hue ?? 0} onChange={(v) => setFilter('hue', v)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <NumField label="毛玻璃(px)" value={s.backdropFilter ? Number(String(s.backdropFilter).match(/[\d.]+/)?.[0] ?? 0) : 0} onChange={(v) => patchStyle({ backdropFilter: v ? `blur(${v}px)` : '' })} />
          <SelectField label="混合模式" value={String(s.mixBlendMode ?? 'normal')} options={BLEND_MODES} onChange={(mixBlendMode) => patchStyle({ mixBlendMode })} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <TextField label="倾斜/位移" value={s.transformExtra} placeholder="skew(-6deg) translateX(10px)" onChange={(transformExtra) => patchStyle({ transformExtra })} />
          <SelectField label="指针穿透" value={String(s.pointerEvents ?? '')} options={['', 'auto', 'none']} onChange={(pointerEvents) => patchStyle({ pointerEvents: pointerEvents || undefined })} />
        </div>
      </Group>

      <Group title="内边距（四边独立）">
        <div className="grid grid-cols-4 gap-2">
          <NumField label="上" value={s.paddingTop ?? s.padding} onChange={(paddingTop) => patchStyle({ paddingTop })} />
          <NumField label="右" value={s.paddingRight ?? s.padding} onChange={(paddingRight) => patchStyle({ paddingRight })} />
          <NumField label="下" value={s.paddingBottom ?? s.padding} onChange={(paddingBottom) => patchStyle({ paddingBottom })} />
          <NumField label="左" value={s.paddingLeft ?? s.padding} onChange={(paddingLeft) => patchStyle({ paddingLeft })} />
        </div>
      </Group>

      <Group title="外边距">
        <div className="grid grid-cols-4 gap-2">
          <NumField label="上" value={s.marginTop} onChange={(marginTop) => patchStyle({ marginTop })} />
          <NumField label="右" value={s.marginRight} onChange={(marginRight) => patchStyle({ marginRight })} />
          <NumField label="下" value={s.marginBottom} onChange={(marginBottom) => patchStyle({ marginBottom })} />
          <NumField label="左" value={s.marginLeft} onChange={(marginLeft) => patchStyle({ marginLeft })} />
        </div>
      </Group>

      <Group title="文字排版">
        <div className="grid grid-cols-2 gap-2">
          <NumField label="字号" value={s.fontSize} onChange={(fontSize) => patchStyle({ fontSize })} />
          <SelectField label="字重" value={String(s.fontWeight ?? '')} options={['', '300', '400', '500', '600', '700', 'bold']} onChange={(fontWeight) => patchStyle({ fontWeight: fontWeight || undefined })} />
          <NumField label="行高" value={s.lineHeight} onChange={(lineHeight) => patchStyle({ lineHeight })} />
          <NumField label="字间距" value={s.letterSpacing} onChange={(letterSpacing) => patchStyle({ letterSpacing })} />
        </div>
        <div className="mt-2 space-y-2">
          <TextField label="文字色" value={s.color} placeholder="#171717" onChange={(color) => patchStyle({ color })} />
          <SelectField label="对齐" value={String(s.textAlign ?? '')} options={['', 'left', 'center', 'right']} onChange={(textAlign) => patchStyle({ textAlign: textAlign || undefined })} />
          <TextField label="字体" value={s.fontFamily} placeholder="Arial, sans-serif" onChange={(fontFamily) => patchStyle({ fontFamily })} />
        </div>
      </Group>

      <Group title="布局模式">
        <div className="grid grid-cols-2 gap-2">
          <SelectField label="display" value={String(s.display ?? '')} options={['', 'block', 'flex', 'inline-flex', 'grid', 'inline-block', 'none']} onChange={(display) => patchStyle({ display: display || undefined })} />
          <NumField label="间距 gap" value={s.gap} onChange={(gap) => patchStyle({ gap })} />
          <SelectField label="方向" value={String(s.flexDirection ?? '')} options={['', 'row', 'row-reverse', 'column', 'column-reverse']} onChange={(flexDirection) => patchStyle({ flexDirection: flexDirection || undefined })} />
          <SelectField label="主轴对齐" value={String(s.justifyContent ?? '')} options={['', 'flex-start', 'center', 'flex-end', 'space-between', 'space-around']} onChange={(justifyContent) => patchStyle({ justifyContent: justifyContent || undefined })} />
          <SelectField label="交叉轴对齐" value={String(s.alignItems ?? '')} options={['', 'flex-start', 'center', 'flex-end', 'stretch']} onChange={(alignItems) => patchStyle({ alignItems: alignItems || undefined })} />
          <TextField label="网格列" value={s.gridTemplateColumns} placeholder="repeat(3,1fr)" onChange={(gridTemplateColumns) => patchStyle({ gridTemplateColumns })} />
        </div>
      </Group>

      <Group title="高级：自定义 CSS">
        <div className="text-[10px] leading-relaxed text-[var(--ui-muted)]">直接写 CSS，作用于当前模块内部。例如 <code className="rounded bg-[var(--ui-hover)] px-1">h2{'{'}color:red{'}'}</code>。</div>
        <label className="mt-2 block">
          <textarea
            value={s.customCss ?? ''}
            onChange={(e) => patchStyle({ customCss: e.target.value })}
            rows={5}
            placeholder={'.title{color:#fff}\nbutton{border-radius:20px}'}
            className="w-full rounded-md border border-[var(--ui-border)] bg-neutral-900 p-2 font-mono text-[11px] leading-relaxed text-emerald-300 outline-none focus:border-[var(--ui-accent)]"
          />
        </label>
      </Group>

      <Group title="高级：自定义动画">
        <div className="text-[10px] leading-relaxed text-[var(--ui-muted)]">在自定义 CSS 里写 <code className="rounded bg-[var(--ui-hover)] px-1">@keyframes myAnim{'{'}...{'}'}</code>，这里填动画名。</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <TextField label="动画名" value={s.customAnimation} placeholder="myAnim" onChange={(customAnimation) => patchStyle({ customAnimation })} />
          <NumField label="时长(秒)" value={s.customAnimationDuration} onChange={(customAnimationDuration) => patchStyle({ customAnimationDuration })} />
          <NumField label="延迟(秒)" value={s.customAnimationDelay} onChange={(customAnimationDelay) => patchStyle({ customAnimationDelay })} />
          <SelectField label="次数" value={String(s.customAnimationIteration ?? '1')} options={['1', '2', '3', 'infinite']} onChange={(customAnimationIteration) => patchStyle({ customAnimationIteration })} />
        </div>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--ui-border)] p-3">
      <div className="mb-2 text-xs font-semibold text-[var(--ui-fg)]">{title}</div>
      {children}
    </div>
  );
}

const ENTRANCE_EFFECTS = [
  { id: 'none', label: '无效果' }, { id: 'fade', label: '淡入' },
  { id: 'fly', label: '飞入' }, { id: 'wipe', label: '擦除' },
  { id: 'zoom', label: '放大' }, { id: 'cut', label: '切入' },
  { id: 'jump', label: '跳入' }, { id: 'flash', label: '闪现' },
  { id: 'roll', label: '滚入' }, { id: 'flip', label: '翻转' },
  { id: 'elasticIn', label: '弹性放大' }, { id: 'elasticOut', label: '弹性缩小' },
];

const EMPHASIS_EFFECTS = [
  { id: 'none', label: '无效果' }, { id: 'pulse', label: '心跳' },
  { id: 'shake', label: '震动' }, { id: 'bounce', label: '弹跳' },
  { id: 'glow', label: '发光' },
];

const SCROLL_EFFECTS = [
  { id: 'none', label: '无效果' }, { id: 'fade', label: '淡入' },
  { id: 'up', label: '上浮' }, { id: 'zoom', label: '缩放' },
  { id: 'slide', label: '滑入' },
];

function AnimationPanel({ node, patchStyle }: {
  node: DslNode;
  patchStyle: (patch: Record<string, unknown>) => void;
}) {
  const [group, setGroup] = useState<'entrance' | 'emphasis' | 'scroll'>('entrance');
  const effects = group === 'entrance' ? ENTRANCE_EFFECTS : group === 'emphasis' ? EMPHASIS_EFFECTS : SCROLL_EFFECTS;
  const field = group === 'entrance' ? 'entranceAnimation' : group === 'emphasis' ? 'emphasisAnimation' : 'scrollAnimation';
  const active = String(node.style?.[field as keyof typeof node.style] ?? 'none');

  return (
    <div className="space-y-4">
      <div className="flex border-b border-[var(--ui-border)] text-xs">
        {[
          { id: 'entrance', label: '入场动画' },
          { id: 'emphasis', label: '强调动画' },
          { id: 'scroll', label: '滚动动画' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setGroup(item.id as typeof group)}
            className={`flex-1 border-b-2 py-2 transition-colors ${group === item.id ? 'border-[var(--ui-accent)] font-semibold text-[var(--ui-accent)]' : 'border-transparent text-[var(--ui-muted)] hover:text-[var(--ui-fg)]'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {effects.map((effect) => (
          <button
            key={effect.id}
            onClick={() => patchStyle({ [field]: effect.id })}
            className={`rounded-md border p-2 text-center text-[10px] ${active === effect.id ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]' : 'border-[var(--ui-border)] text-[var(--ui-muted)]'}`}
          >
            <span className="mb-2 flex h-10 items-center justify-center rounded bg-[var(--ui-hover)] text-[10px] text-[var(--ui-muted)]">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            {effect.label}
          </button>
        ))}
      </div>

      {group !== 'emphasis' && (
        <>
          <div>
            <div className="mb-2 text-xs text-[var(--ui-muted)]">方向</div>
            <div className="flex gap-3 text-[11px] text-[var(--ui-fg)]">
              {[
                { id: 'left', label: '向左' }, { id: 'right', label: '向右' },
                { id: 'up', label: '向上' }, { id: 'down', label: '向下' },
              ].map((item) => (
                <label key={item.id} className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="animation-direction"
                    checked={(node.style?.animationDirection ?? 'left') === item.id}
                    onChange={() => patchStyle({ animationDirection: item.id as 'left' | 'right' | 'up' | 'down' })}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
          <RangeField label="持续" suffix="s" min={0.1} max={3} step={0.1} value={Number(node.style?.animationDuration ?? 0.6)} onChange={(animationDuration) => patchStyle({ animationDuration })} />
          <RangeField label="延迟" suffix="s" min={0} max={3} step={0.1} value={Number(node.style?.animationDelay ?? 0)} onChange={(animationDelay) => patchStyle({ animationDelay })} />
          <div>
            <div className="mb-2 text-xs text-[var(--ui-muted)]">触发</div>
            <div className="flex gap-4 text-[11px] text-[var(--ui-fg)]">
              <label className="flex items-center gap-1">
                <input type="radio" name="animation-trigger" checked={(node.style?.animationTrigger ?? 'once') === 'once'} onChange={() => patchStyle({ animationTrigger: 'once' })} />单次触发
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" name="animation-trigger" checked={node.style?.animationTrigger === 'repeat'} onChange={() => patchStyle({ animationTrigger: 'repeat' })} />多次触发
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LayoutPanel({ api, node, patchProps }: {
  api: EditorApi;
  node: DslNode;
  patchProps: (patch: Record<string, unknown>) => void;
}) {
  const [activeColumn, setActiveColumn] = useState(0);
  const [columnTab, setColumnTab] = useState<'design' | 'layout'>('design');
  const children = node.children ?? [];
  const safeColumn = Math.min(activeColumn, Math.max(0, children.length - 1));
  const current = children[safeColumn];

  const patchColumnProps = (id: string, patch: Record<string, unknown>) => {
    const target = findNodeInTree(node, id);
    if (!target) return;
    api.patch(id, { props: { ...target.props, ...patch } });
  };

  const patchColumnStyle = (id: string, patch: Record<string, unknown>) => {
    const target = findNodeInTree(node, id);
    if (!target) return;
    api.patch(id, { style: { ...target.style, ...patch } });
  };

  const setColumnCount = (count: number) => {
    const currentCount = children.length;
    if (count > currentCount) {
      for (let i = currentCount; i < count; i++) {
        api.add('container', node.id, i);
      }
    } else if (count < currentCount) {
      [...children].slice(count).forEach((child) => api.remove(child.id));
    }
    patchProps({ layoutMode: 'columns', columns: count });
    setActiveColumn(Math.min(safeColumn, count - 1));
    api.select(node.id);
  };

  const deleteCurrent = () => {
    if (node.id === api.page.root.id) {
      api.patch(node.id, { children: [] });
      api.select(null);
      return;
    }
    api.remove(node.id);
    api.select(null);
  };

  return (
    <div className="space-y-4">
      <button onClick={deleteCurrent} className="flex w-full items-center justify-center gap-2 rounded-md border border-red-200 py-2 text-xs text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> 删除此通栏</button>
      <div className="flex border-b border-[var(--ui-border)] text-xs">
        {[
          { id: 'design', label: '列设计' },
          { id: 'layout', label: '列布局' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setColumnTab(item.id as typeof columnTab)}
            className={`flex-1 border-b-2 py-2 ${columnTab === item.id ? 'border-[var(--ui-accent)] font-semibold text-[var(--ui-accent)]' : 'border-transparent text-[var(--ui-muted)]'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {columnTab === 'layout' && (
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs text-[var(--ui-muted)]">通栏列数</div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((count) => (
                <button key={count} onClick={() => setColumnCount(count)} className={`rounded-md border p-2 text-[11px] ${children.length === count ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]' : 'border-[var(--ui-border)] text-[var(--ui-muted)]'}`}>
                  {count} 列
                </button>
              ))}
            </div>
          </div>
          <RangeField label="子元素间距" suffix="px" min={0} max={64} value={Number(node.props.gap ?? 12)} onChange={(gap) => patchProps({ gap })} />
          <TextField label="列宽比例" value={node.props.columnWidths} placeholder="1fr 2fr 1fr" onChange={(columnWidths) => patchProps({ columnWidths })} />
          <p className="rounded-md bg-[var(--ui-hover)] p-3 text-[10px] leading-relaxed text-[var(--ui-muted)]">列宽比例示例：等宽留空；左窄右宽填写 1fr 2fr；三列自定义填写 1fr 2fr 1fr。</p>
        </div>
      )}

      {columnTab === 'design' && (
        <>
          <div>
            <div className="mb-2 text-xs text-[var(--ui-muted)]">选择当前列</div>
            <div className="flex gap-2">
              {children.map((child, i) => (
                <button
                  key={child.id}
                  onClick={() => setActiveColumn(i)}
                  className={`flex h-12 flex-1 items-center justify-center rounded-md border text-[11px] ${safeColumn === i ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]' : 'border-[var(--ui-border)] text-[var(--ui-muted)]'}`}
                >
                  第 {i + 1} 列
                </button>
              ))}
              {children.length === 0 && <p className="text-[11px] text-[var(--ui-muted)]">请先新增列</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((count) => (
              <button
                key={count}
                onClick={() => setColumnCount(count)}
                className={`flex h-24 flex-col gap-1 rounded-md border p-2 ${children.length === count ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-soft)]' : 'border-[var(--ui-border)]'}`}
              >
                <div className="flex flex-1 gap-1">
                  {Array.from({ length: count }).map((_, i) => <span key={i} className="flex-1 rounded bg-neutral-200" />)}
                </div>
                <span className="text-[10px] text-[var(--ui-muted)]">{count} 列</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-1.5">
        <SmallAction icon={<Plus className="h-3.5 w-3.5" />} label="新增列" onClick={() => setColumnCount(children.length + 1)} />
        <SmallAction icon={<Copy className="h-3.5 w-3.5" />} label="复制" onClick={() => current && api.duplicate(current.id)} />
        <SmallAction icon={<MoveLeft className="h-3.5 w-3.5" />} label="左移" onClick={() => current && api.move(current.id, node.id, Math.max(0, safeColumn - 1))} />
        <SmallAction icon={<MoveRight className="h-3.5 w-3.5" />} label="右移" onClick={() => current && api.move(current.id, node.id, Math.min(children.length - 1, safeColumn + 1))} />
        <SmallAction icon={<Trash2 className="h-3.5 w-3.5" />} label="删除列" danger disabled={!current} onClick={() => current && api.remove(current.id)} />
      </div>

      <div className="rounded-md border border-[var(--ui-border)]">
        <div className="border-b border-[var(--ui-border)] bg-[var(--ui-hover)] px-3 py-2 text-xs font-semibold">当前列设计</div>
        {current ? (
          <div className="space-y-4 p-3">
            <div>
              <div className="mb-2 text-xs text-[var(--ui-muted)]">对齐</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'left', icon: AlignLeft },
                  { id: 'center', icon: AlignCenter },
                  { id: 'right', icon: AlignRight },
                ].map((item) => (
                  <button key={item.id} onClick={() => patchColumnStyle(current.id, { textAlign: item.id })} className="flex items-center justify-center rounded-md border border-[var(--ui-border)] p-2 text-[var(--ui-muted)]">
                    <item.icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>
            <ChoiceRow label="背景" value={String(current.props.background ?? 'default')} onChange={(v) => patchColumnProps(current.id, { background: v === 'hide' ? 'transparent' : v === 'default' ? '#ffffff' : '#F3F4F6' })} />
            <ChoiceRow label="边框" value={String(current.style?.border ? 'custom' : 'default')} onChange={(v) => patchColumnStyle(current.id, { border: v === 'custom' ? '1px solid #E5E7EB' : undefined })} />
            <RangeField label="圆角" suffix="px" min={0} max={48} value={Number(current.style?.borderRadius ?? 0)} onChange={(borderRadius) => patchColumnStyle(current.id, { borderRadius })} />
            <RangeField label="内间距" suffix="px" min={0} max={64} value={Number(current.props.padding ?? 16)} onChange={(padding) => patchColumnProps(current.id, { padding })} />
            <TextField label="列内容提示" value={current.props.placeholder} placeholder="可拖入组件到当前列" onChange={(placeholder) => patchColumnProps(current.id, { placeholder })} />
          </div>
        ) : (
          <p className="p-4 text-xs text-[var(--ui-muted)]">点击“新增列”开始布局</p>
        )}
      </div>
    </div>
  );
}

function findNodeInTree(root: DslNode, id: string): DslNode | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findNodeInTree(child, id);
    if (found) return found;
  }
  return null;
}

function SmallAction({ icon, label, onClick, danger, disabled }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-[10px] disabled:cursor-not-allowed disabled:opacity-40 ${danger ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-[var(--ui-border)] text-[var(--ui-fg)] hover:border-[var(--ui-accent)]'}`}>
      {icon}{label}
    </button>
  );
}

function ChoiceRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-2 text-xs text-[var(--ui-muted)]">{label}</div>
      <div className="flex gap-3 text-[11px] text-[var(--ui-fg)]">
        {['default', 'hide', 'custom'].map((item, i) => (
          <label key={item} className="flex items-center gap-1">
            <input type="radio" checked={value === item} onChange={() => onChange(item)} />{['默认', '隐藏', '自定义'][i]}
          </label>
        ))}
      </div>
    </div>
  );
}

export function ModuleDrawer({ keyword, onKeyword, onAdd }: {
  keyword: string; onKeyword: (v: string) => void; onAdd: (type: string) => void;
}) {
  const groups = registry.listByCategory();
  const q = keyword.trim().toLowerCase();
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 rounded-md border border-[var(--ui-border)] px-3 py-2"><Search className="h-3.5 w-3.5 text-[var(--ui-muted)]" /><input value={keyword} onChange={(e) => onKeyword(e.target.value)} placeholder="搜索模块" className="w-full text-xs outline-none" /></label>
      {Object.entries(groups).map(([category, blocks]) => {
        const visible = blocks.filter((b) => !q || `${b.name}${b.type}`.toLowerCase().includes(q));
        if (!visible.length) return null;
        return (
          <div key={category}>
            <div className="mb-2 text-[11px] font-semibold text-[var(--ui-muted)]">{category}</div>
            <div className="grid grid-cols-2 gap-2">
              {visible.map((b) => <button key={b.type} onClick={() => onAdd(b.type)} className="flex items-center gap-2 rounded-md border border-[var(--ui-border)] p-2 text-left text-[11px] hover:border-[var(--ui-accent)] hover:bg-[var(--ui-accent-soft)]"><Blocks className="h-3.5 w-3.5 text-[var(--ui-accent)]" /><span className="truncate">{b.name}</span></button>)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StyleDrawer({ theme, api }: { theme?: SiteTheme; api: EditorApi }) {
  const vars = themeToCssVars(theme);
  const colors = theme?.colors ?? [];
  const updateColor = (index: number, patch: Partial<{ name: string; value: string }>) => {
    api.setTheme({ colors: colors.map((c, i) => i === index ? { ...c, ...patch } : c) });
  };
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 text-xs font-semibold">一键套用风格</div>
        <div className="grid grid-cols-2 gap-2">
          {THEME_PRESETS.map((preset) => (
            <button key={preset.name} onClick={() => api.setTheme(preset.theme)} className="rounded-md border border-[var(--ui-border)] p-2 text-left hover:border-[var(--ui-accent)]">
              <div className="mb-2 flex gap-1"><span className="h-5 w-5 rounded" style={{ background: preset.theme.primary }} /><span className="h-5 w-5 rounded" style={{ background: preset.theme.accent }} /><span className="h-5 w-5 rounded border border-[var(--ui-border)]" style={{ background: preset.theme.background }} /></div>
              <span className="text-[11px]">{preset.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-xs font-semibold">主题色</div>
        <p className="text-[10px] leading-relaxed text-[var(--ui-muted)]">改一次，全站引用该颜色的地方同步更新。</p>
        {(['primary', 'accent', 'background', 'text', 'muted'] as const).map((key) => (
          <label key={key} className="flex items-center justify-between text-xs text-[var(--ui-muted)]">
            <span>{LABELS[key]}</span>
            <span className="flex items-center gap-2"><span className="font-mono text-[10px]">{vars[`--sb-${key}`]}</span><input type="color" value={String(vars[`--sb-${key}`] ?? '#000000')} onChange={(e) => api.setTheme({ [key]: e.target.value })} className="h-7 w-7 cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel)] p-0.5" /></span>
          </label>
        ))}
      </section>

      <section className="space-y-3 border-t border-[var(--ui-border)] pt-4">
        <div className="text-xs font-semibold">字体与排版</div>
        <label className="block text-xs text-[var(--ui-muted)]">
          <span className="mb-1.5 block">全站字体</span>
          <select
            value={theme?.fontFamily ?? ''}
            onChange={(e) => api.setTheme({ fontFamily: e.target.value })}
            className="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-2 py-1.5 text-xs outline-none focus:border-[var(--ui-accent)]"
          >
            {!theme?.fontFamily && <option value="">（默认）</option>}
            {FONT_PRESETS.map((f) => <option key={f.value} value={f.value}>{f.name}</option>)}
          </select>
        </label>
        <RangeField label="正文字号" suffix="px" min={12} max={24} step={1} value={Number(theme?.fontSize ?? 16)} onChange={(fontSize) => api.setTheme({ fontSize })} />
        <RangeField label="正文行高" suffix="" min={1.2} max={2.4} step={0.1} value={Number(theme?.lineHeight ?? 1.7)} onChange={(lineHeight) => api.setTheme({ lineHeight })} />
        <RangeField label="标题字重" suffix="" min={400} max={900} step={100} value={Number(theme?.headingWeight ?? 700)} onChange={(headingWeight) => api.setTheme({ headingWeight })} />
        <RangeField label="全局圆角" suffix="px" min={0} max={32} step={1} value={Number(theme?.radius ?? 8)} onChange={(radius) => api.setTheme({ radius })} />
      </section>

      <section className="space-y-3 border-t border-[var(--ui-border)] pt-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold">自定义颜色令牌</div>
          <button
            onClick={() => api.setTheme({ colors: [...colors, { name: `color${colors.length + 1}`, value: '#888888' }] })}
            className="flex items-center gap-1 rounded-md border border-[var(--ui-border)] px-2 py-1 text-[10px] hover:border-[var(--ui-accent)]"
          >
            <Plus className="h-3 w-3" /> 添加
          </button>
        </div>
        <p className="text-[10px] leading-relaxed text-[var(--ui-muted)]">添加后可在组件颜色字段中通过「使用令牌」引用，实现统一改色。</p>
        {colors.map((token, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              value={token.value}
              onChange={(e) => updateColor(i, { value: e.target.value })}
              className="h-7 w-7 shrink-0 cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel)] p-0.5"
            />
            <input
              value={token.name}
              onChange={(e) => updateColor(i, { name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
              placeholder="令牌名（英文）"
              className="min-w-0 flex-1 rounded-md border border-[var(--ui-border)] px-2 py-1.5 font-mono text-[11px] outline-none focus:border-[var(--ui-accent)]"
            />
            <button
              onClick={() => api.setTheme({ colors: colors.filter((_, j) => j !== i) })}
              title="删除令牌"
              className="shrink-0 rounded p-1.5 text-[var(--ui-muted)] hover:bg-[var(--ui-hover)] hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {colors.length === 0 && <div className="rounded-md bg-[var(--ui-hover)] px-3 py-2 text-[10px] text-[var(--ui-muted)]">暂无自定义令牌</div>}
      </section>
    </div>
  );
}

const LABELS: Record<string, string> = { primary: '主色', accent: '强调色', background: '背景色', text: '正文色', muted: '次要文字' };

export function SettingsDrawer({ api, mobileWidth, onMobileWidth, mobileOptions, onMobileOptions, onDevice }: {
  api: EditorApi;
  mobileWidth: number;
  onMobileWidth: (v: number) => void;
  mobileOptions: MobileOptions;
  onMobileOptions: (v: MobileOptions) => void;
  onDevice: (device: 'desktop' | 'tablet' | 'mobile') => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[var(--ui-border)] p-3">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-xs font-semibold text-[var(--ui-fg)]">分辨率设置</div>
          <span className="text-[10px] text-[var(--ui-muted)]">仅影响手机预览</span>
        </div>
        <div className="mb-3 text-[10px] leading-relaxed text-[var(--ui-muted)]">电脑端固定 1440px 宽屏，可左右滑动查看。选择分辨率会自动切换到手机预览。</div>
        <div className="grid grid-cols-5 gap-1.5">
          {[360, 375, 390, 414, 430].map((w) => (
            <button
              key={w}
              onClick={() => { onMobileWidth(w); onDevice('mobile'); }}
              className={`rounded-md border py-2 text-[11px] transition-colors ${mobileWidth === w ? 'border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] font-semibold text-[var(--ui-accent)]' : 'border-[var(--ui-border)] text-[var(--ui-fg)] hover:border-[var(--ui-accent)]'}`}
            >
              {w}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <NumField label="自定义宽度（px）" value={mobileWidth} onChange={(v) => onMobileWidth(Math.min(768, Math.max(320, v || 390)))} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold text-[var(--ui-fg)]">移动端显示</div>
          <span className="text-[10px] text-[var(--ui-muted)]">电脑端不显示</span>
        </div>
        <ToggleRow label="头部分类按钮" desc="手机视图下导航折叠成可展开的分类按钮" checked={mobileOptions.category} onChange={(category) => onMobileOptions({ ...mobileOptions, category })} />
        <ToggleRow label="底部菜单栏" desc="手机视图下显示底部固定菜单栏" checked={mobileOptions.bottomBar} onChange={(bottomBar) => onMobileOptions({ ...mobileOptions, bottomBar })} />
        {mobileOptions.bottomBar && (
          <div className="mt-3 rounded-md border border-[var(--ui-border)] p-2">
            <div className="mb-2 text-[10px] font-semibold text-[var(--ui-muted)]">菜单项（可增删改文字与图标，最多 5 项）</div>
            <div className="space-y-1.5">
              {(mobileOptions.bottomItems ?? []).map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <select
                    value={item.icon}
                    onChange={(e) => {
                      const items = mobileOptions.bottomItems.map((it, idx) => idx === i ? { ...it, icon: e.target.value as BottomNavItem['icon'] } : it);
                      onMobileOptions({ ...mobileOptions, bottomItems: items });
                    }}
                    className="w-16 rounded border border-[var(--ui-border)] px-1 py-1 text-[10px] outline-none"
                  >
                    {BOTTOM_ICONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <input
                    value={item.label}
                    onChange={(e) => {
                      const items = mobileOptions.bottomItems.map((it, idx) => idx === i ? { ...it, label: e.target.value } : it);
                      onMobileOptions({ ...mobileOptions, bottomItems: items });
                    }}
                    className="min-w-0 flex-1 rounded border border-[var(--ui-border)] px-2 py-1 text-[11px] outline-none focus:border-[var(--ui-accent)]"
                  />
                  <label className="flex items-center gap-0.5 text-[9px] text-[var(--ui-muted)]" title="点击展开分类面板">
                    <input
                      type="checkbox"
                      checked={Boolean(item.category)}
                      onChange={(e) => {
                        const items = mobileOptions.bottomItems.map((it, idx) => idx === i ? { ...it, category: e.target.checked } : it);
                        onMobileOptions({ ...mobileOptions, bottomItems: items });
                      }}
                    />
                    分类
                  </label>
                  <button
                    onClick={() => onMobileOptions({ ...mobileOptions, bottomItems: mobileOptions.bottomItems.filter((_, idx) => idx !== i) })}
                    className="rounded p-1 text-[var(--ui-muted)] hover:bg-red-50 hover:text-red-500"
                    title="删除该项"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                if (mobileOptions.bottomItems.length >= 5) return;
                onMobileOptions({ ...mobileOptions, bottomItems: [...mobileOptions.bottomItems, { label: '新菜单', icon: 'menu' }] });
              }}
              disabled={mobileOptions.bottomItems.length >= 5}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-dashed border-neutral-300 py-1.5 text-[10px] text-[var(--ui-muted)] hover:border-[var(--ui-accent)] disabled:opacity-40"
            >
              <Plus className="h-3 w-3" /> 添加菜单项
            </button>
          </div>
        )}
      </div>

      <GlobalBlockManager api={api} />

      <div className="rounded-md bg-[var(--ui-hover)] p-3 text-xs leading-relaxed text-[var(--ui-muted)]">当前页面：{api.page.meta.title}</div>
      <button onClick={() => api.select(null)} className="w-full rounded-md border border-[var(--ui-border)] py-2 text-xs hover:border-[var(--ui-accent)]">取消当前选中</button>
    </div>
  );
}

/** 全局组件管理：保存选中节点为全局组件 / 插入引用 / 删除 */
function GlobalBlockManager({ api }: { api: EditorApi }) {
  const [blocks, setBlocks] = useState<GlobalBlockDto[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const selectedNode = api.selectedId ? findNode(api.page.root, api.selectedId) : null;

  const load = async () => {
    try { setBlocks(await listGlobalBlocks()); }
    catch (e) { setMessage(e instanceof Error ? e.message : '加载失败'); }
  };
  useEffect(() => { void load(); }, []);

  const saveSelected = async () => {
    if (!selectedNode) { setMessage('请先选中一个模块'); return; }
    const finalName = name.trim() || `${registry.get(selectedNode.type)?.name ?? '组件'} ${blocks.length + 1}`;
    setBusy(true); setMessage('');
    try {
      // 去掉运行时字段，只存 DSL 定义
      const clean = JSON.parse(JSON.stringify(selectedNode)) as DslNode;
      const saved = await createGlobalBlock({ name: finalName, category: '全局组件', node: clean as unknown as Record<string, unknown> });
      setBlocks((prev) => [saved, ...prev]);
      setName('');
      setMessage(`✓ 已保存「${finalName}」`);
    } catch (e) { setMessage(e instanceof Error ? e.message : '保存失败'); }
    finally { setBusy(false); }
  };

  const insert = (block: GlobalBlockDto) => {
    const node = block.node as unknown as DslNode;
    const refNode: DslNode = {
      id: `gb-${Date.now().toString(36)}`,
      type: 'global-block-ref',
      props: { name: block.name, refId: block.id },
      ref: { kind: 'global-block', id: block.id },
    };
    // 保留全局组件的原始类型，让公开站展开后按原类型渲染；引用节点带 ref 供展开识别
    const toInsert: DslNode = { ...node, id: refNode.id, ref: { kind: 'global-block', id: block.id } };
    api.addNode(toInsert, 'root', api.page.root.children?.length ?? 0);
    setMessage(`✓ 已插入「${block.name}」`);
  };

  const remove = async (id: string) => {
    setBusy(true);
    try { await deleteGlobalBlock(id); setBlocks((prev) => prev.filter((b) => b.id !== id)); setMessage('✓ 已删除'); }
    catch (e) { setMessage(e instanceof Error ? e.message : '删除失败'); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border border-[var(--ui-border)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-[var(--ui-fg)]">全局组件</div>
        <button onClick={() => void load()} title="刷新" className="rounded p-1 text-[var(--ui-muted)] hover:bg-[var(--ui-hover)]"><RefreshCw className="h-3.5 w-3.5" /></button>
      </div>
      <p className="mb-2 text-[10px] leading-relaxed text-[var(--ui-muted)]">把选中模块存为全局组件，插入到任意页面。改一次，所有引用处同步更新。</p>
      <div className="mb-2 flex gap-1">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="组件名称（可选）" className="min-w-0 flex-1 rounded border border-[var(--ui-border)] px-2 py-1.5 text-[11px] outline-none focus:border-[var(--ui-accent)]" />
        <button onClick={() => void saveSelected()} disabled={busy || !selectedNode} className="flex items-center gap-1 rounded bg-[var(--ui-accent)] px-2 py-1.5 text-[11px] text-white disabled:opacity-40"><Package className="h-3 w-3" />存为全局</button>
      </div>
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {blocks.length === 0 && <div className="py-2 text-center text-[10px] text-[var(--ui-muted)]">暂无全局组件</div>}
        {blocks.map((b) => (
          <div key={b.id} className="flex items-center gap-2 rounded border border-[var(--ui-border)] px-2 py-1.5">
            <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--ui-accent)]" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-medium text-[var(--ui-fg)]">{b.name}</div>
              <div className="text-[9px] text-[var(--ui-muted)]">{b.isGlobal ? '全局共享' : '本租户'}</div>
            </div>
            <button onClick={() => insert(b)} className="rounded border border-[var(--ui-border)] px-1.5 py-1 text-[10px] hover:border-[var(--ui-accent)]">插入</button>
            <button onClick={() => void remove(b.id)} title="删除" className="rounded p-1 text-[var(--ui-muted)] hover:bg-red-50 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
          </div>
        ))}
      </div>
      {message && <div className="mt-2 text-[10px] text-[var(--ui-muted)]">{message}</div>}
    </div>
  );
}

function TextField({ label, value, placeholder, onChange }: { label: string; value: unknown; placeholder?: string; onChange: (v: string) => void }) {
  return <div><div className="mb-1.5 text-xs text-[var(--ui-muted)]">{label}</div><input value={String(value ?? '')} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-[var(--ui-border)] px-3 py-2 text-xs outline-none focus:border-[var(--ui-accent)]" /></div>;
}

function NumField({ label, value, onChange }: { label: string; value: unknown; onChange: (v: number) => void }) {
  return <div><div className="mb-1.5 text-xs text-[var(--ui-muted)]">{label}</div><input type="number" value={Number(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-md border border-[var(--ui-border)] px-3 py-2 text-xs outline-none focus:border-[var(--ui-accent)]" /></div>;
}

function RangeField({ label, suffix, min, max, step = 1, value, onChange }: { label: string; suffix: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void }) {
  return <div><div className="mb-1 flex justify-between text-xs text-[var(--ui-muted)]"><span>{label}</span><span>{value}{suffix}</span></div><input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--ui-accent)]" /></div>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange?: (v: string) => void }) {
  return <label className="block"><div className="mb-1.5 text-xs text-[var(--ui-muted)]">{label}</div><select value={value} onChange={(e) => onChange?.(e.target.value)} className="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-2 text-xs outline-none focus:border-[var(--ui-accent)]">{options.map((item) => <option key={item}>{item}</option>)}</select></label>;
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mb-2 flex cursor-pointer items-center justify-between gap-3 rounded-md border border-[var(--ui-border)] p-3">
      <span className="min-w-0">
        <span className="block text-xs font-medium text-[var(--ui-fg)]">{label}</span>
        <span className="mt-0.5 block text-[10px] leading-relaxed text-[var(--ui-muted)]">{desc}</span>
      </span>
      <span className="relative block shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="block h-5 w-9 rounded-full bg-neutral-300 transition-colors peer-checked:bg-[var(--ui-accent)]" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-[var(--ui-panel)] shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

function ActionRow({ icon, title, desc, action, disabled, onClick }: {
  icon: React.ReactNode; title: string; desc: string; action: string; disabled?: boolean; onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-[var(--ui-border)] p-3">
      <div className="text-[var(--ui-muted)]">{icon}</div>
      <div className="min-w-0 flex-1"><div className="text-xs font-medium text-[var(--ui-fg)]">{title}</div><div className="mt-0.5 text-[10px] leading-relaxed text-[var(--ui-muted)]">{desc}</div></div>
      <button onClick={onClick} disabled={disabled} className="rounded border border-[var(--ui-border)] px-2 py-1 text-[11px] text-[var(--ui-fg)] hover:border-[var(--ui-accent)] disabled:cursor-not-allowed disabled:opacity-40">{action}</button>
    </div>
  );
}
