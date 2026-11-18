/**
 * 右侧属性面板
 * ------------------------------------------------------------------
 * 完全由组件的 propertySchema 驱动，自动渲染对应控件。
 * 新增组件只要声明 propertySchema，这里无需任何改动。
 */

import { useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, ImagePlus, Lock, Settings2, Trash2, Unlock, Upload } from 'lucide-react';
import { findNode, isImageIcon, parseIconItems, registry, type IconItem, type PropertyField } from '@/core';
import type { EditorApi } from './useEditor';

export function PropertyPanel({ api }: { api: EditorApi }) {
  const { selectedId, page } = api;
  const [tab, setTab] = useState<'content' | 'style' | 'advanced'>('content');
  const node = selectedId ? findNode(page.root, selectedId) : null;
  const block = node ? registry.get(node.type) : null;
  const tokens: ColorTokenOption[] = [
    { label: '主题色', value: '--sb-primary' },
    { label: '强调色', value: '--sb-accent' },
    { label: '背景色', value: '--sb-bg' },
    { label: '正文色', value: '--sb-text' },
    { label: '次要文字', value: '--sb-muted' },
    ...(page.theme?.colors ?? []).map((c) => ({ label: c.name, value: `--sb-c-${c.name}` })),
  ];

  if (!node || !block) {
    return (
      <aside className="flex h-full w-full shrink-0 flex-col items-center justify-center border-l border-[var(--ui-border)] bg-[var(--ui-panel)] md:w-[300px]">
        <Settings2 className="h-8 w-8 text-neutral-300" />
        <p className="mt-3 text-sm text-neutral-400">选中一个组件以编辑属性</p>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-l border-[var(--ui-border)] bg-[var(--ui-panel)] md:w-[300px]">
      <div className="flex items-center justify-between border-b border-[var(--ui-border)] px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-neutral-900">{block.name}</div>
          <div className="mt-0.5 font-mono text-[10px] text-neutral-400">{node.type} · {node.id}</div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => api.duplicate(node.id)}
            title="复制组件"
            className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <Copy className="h-4 w-4" />
          </button>
          {node.id !== 'root' && (
            <button
              onClick={() => api.remove(node.id)}
              title="删除组件"
              className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-[var(--ui-border)]">
        {([
          { id: 'content', label: '内容' },
          { id: 'style', label: '样式' },
          { id: 'advanced', label: '高级' },
        ] as { id: typeof tab; label: string }[]).map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex-1 border-b-2 py-2 text-xs font-medium transition-colors ${
              tab === item.id
                ? 'border-[var(--ui-accent)] text-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {tab === 'content' && (
          <div>
            <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">内容属性</h4>
            <div className="space-y-3">
              {block.propertySchema.map((field) => (
                <FieldControl
                  key={field.key}
                  field={field}
                  value={node.props[field.key]}
                  tokens={tokens}
                  onChange={(v) => api.patch(node.id, { props: { ...node.props, [field.key]: v } })}
                />
              ))}
              {block.propertySchema.length === 0 && (
                <p className="text-xs text-neutral-400">该组件无可配置属性</p>
              )}
            </div>
          </div>
        )}

        {tab === 'style' && (
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">样式属性</h4>
            <StyleNumber label="上间距" value={node.style?.padding} onChange={(padding) => api.patch(node.id, { style: { ...node.style, padding } })} />
            <StyleNumber label="顶部外边距" value={node.style?.marginTop} onChange={(marginTop) => api.patch(node.id, { style: { ...node.style, marginTop } })} />
            <StyleNumber label="底部外边距" value={node.style?.marginBottom} onChange={(marginBottom) => api.patch(node.id, { style: { ...node.style, marginBottom } })} />
            <StyleText label="背景色" value={node.style?.background} placeholder="#ffffff" onChange={(background) => api.patch(node.id, { style: { ...node.style, background } })} />
            <StyleText label="文字色" value={node.style?.color} placeholder="#171717" onChange={(color) => api.patch(node.id, { style: { ...node.style, color } })} />
          </div>
        )}

        {tab === 'advanced' && (
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">模块操作</h4>
            <AdvancedRow
              icon={node.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              title={node.hidden ? '当前已隐藏' : '当前显示中'}
              desc="隐藏后公开站点不展示，可在画布中随时恢复"
              action={node.hidden ? '显示' : '隐藏'}
              disabled={node.locked}
              onClick={() => api.patch(node.id, { hidden: !node.hidden })}
            />
            <AdvancedRow
              icon={node.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              title={node.locked ? '当前已锁定' : '当前未锁定'}
              desc="锁定后不可拖拽、隐藏或删除"
              action={node.locked ? '解锁' : '锁定'}
              disabled={node.id === 'root'}
              onClick={() => api.patch(node.id, { locked: !node.locked })}
            />
            <div className="rounded-md bg-neutral-50 p-3 font-mono text-[10px] leading-relaxed text-neutral-500">
              <div>ID：{node.id}</div>
              <div>Type：{node.type}</div>
              <div>Hidden：{String(Boolean(node.hidden))}</div>
              <div>Locked：{String(Boolean(node.locked))}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function StyleNumber({ label, value, onChange }: { label: string; value?: number; onChange: (v?: number) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-neutral-600">{label}</label>
      <input
        type="number"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-[var(--ui-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ui-accent)]"
      />
    </div>
  );
}

function StyleText({ label, value, placeholder, onChange }: { label: string; value?: unknown; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-neutral-600">{label}</label>
      <input
        value={String(value ?? '')}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[var(--ui-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ui-accent)]"
      />
    </div>
  );
}

function AdvancedRow({ icon, title, desc, action, onClick, disabled }: {
  icon: React.ReactNode; title: string; desc: string; action: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-[var(--ui-border)] p-3">
      <div className="text-neutral-500">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-neutral-800">{title}</div>
        <div className="mt-0.5 text-[10px] leading-relaxed text-neutral-400">{desc}</div>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className="rounded border border-[var(--ui-border)] px-2 py-1 text-[11px] text-neutral-600 hover:border-[var(--ui-accent)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {action}
      </button>
    </div>
  );
}

export interface ColorTokenOption { label: string; value: string }

export function FieldControl({ field, value, onChange, tokens }: {
  field: PropertyField; value: unknown; onChange: (v: unknown) => void; tokens?: ColorTokenOption[];
}) {
  const label = (
    <label className="mb-1.5 block text-xs font-medium text-neutral-600">{field.label}</label>
  );
  const tokenValue = tokens?.find((t) => value === `var(${t.value})`)?.value ?? '';
  const applyToken = (tokenVar: string) => onChange(tokenVar ? `var(${tokenVar})` : String(value ?? '').replace(/^var\([^)]*\)$/, '#000000'));

  switch (field.type) {
    case 'text':
      return <div>{label}<input
        type="text"
        value={String(value ?? '')}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[var(--ui-border)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--ui-accent)]"
      /></div>;

    case 'textarea':
      return <div>{label}<textarea
        rows={field.rows ?? 3}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-md border border-[var(--ui-border)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--ui-accent)]"
      /></div>;

    case 'number':
      return <div>{label}<input
        type="number"
        value={Number(value ?? 0)}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-[var(--ui-border)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--ui-accent)]"
      /></div>;

    case 'color': {
      const raw = String(value ?? '');
      const isToken = raw.startsWith('var(');
      return <div>{label}<div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={isToken ? '#888888' : raw || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-9 shrink-0 cursor-pointer rounded border border-[var(--ui-border)] bg-[var(--ui-panel)] p-0.5"
          />
          <input
            type="text"
            value={raw}
            onChange={(e) => onChange(e.target.value)}
            placeholder="var(--sb-accent) 或 #xxxxxx"
            className="min-w-0 flex-1 rounded-md border border-[var(--ui-border)] px-2 py-1.5 font-mono text-xs outline-none focus:border-[var(--ui-accent)]"
          />
        </div>
        {tokens && tokens.length > 0 && (
          <select
            value={tokenValue}
            onChange={(e) => applyToken(e.target.value)}
            className="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-2 py-1.5 text-[11px] outline-none focus:border-[var(--ui-accent)]"
          >
            <option value="">使用令牌…（当前：{isToken ? '引用中' : '自定义色'}）</option>
            {tokens.map((t) => <option key={t.value} value={t.value}>{t.label} · {t.value}</option>)}
          </select>
        )}
      </div></div>;
    }

    case 'select':
      return <div>{label}<select
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--ui-accent)]"
      >
        {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select></div>;

    case 'image':
      return <ImageField value={String(value ?? '')} placeholder={field.placeholder} onChange={onChange} label={field.label} />;

    case 'icon-list':
      return <IconListField value={String(value ?? '')} onChange={onChange} label={field.label} />;

    case 'switch':
      return <div className="flex items-center justify-between">
        {label}
        <button
          onClick={() => onChange(!value)}
          className={`relative h-5 w-9 rounded-full transition-colors ${value ? 'bg-[#171717]' : 'bg-neutral-300'}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--ui-panel)] transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>;

    default:
      return null;
  }
}

/** 图片字段：支持本地上传与 URL 输入 */
function ImageField({ value, onChange, label, placeholder }: {
  value: string; onChange: (v: string) => void; label: string; placeholder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file?: File) => {
    if (!file) return;
    setUploading(true); setError('');
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sb_token') ?? ''}`,
        },
        body: JSON.stringify({ data, filename: file.name }),
      });
      if (!res.ok) throw new Error('上传失败');
      const json = await res.json();
      onChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally { setUploading(false); }
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-neutral-600">{label}</label>
      {value && <img src={value} alt="预览" className="mb-2 h-24 w-full rounded border border-[var(--ui-border)] object-cover" />}
      <input
        type="text"
        value={value}
        placeholder={placeholder ?? 'https://...'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[var(--ui-border)] px-3 py-2 text-xs outline-none focus:border-[var(--ui-accent)]"
      />
      <label className="mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-300 py-2 text-[11px] text-neutral-500 transition-colors hover:border-[var(--ui-accent)] hover:text-neutral-900">
        <Upload className="h-3.5 w-3.5" />
        {uploading ? '上传中…' : '上传本地图片（≤5MB）'}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </label>
      {error && <p className="mt-1 text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

/** 图标列表字段：每条可上传图片 / 填图片地址 / 填 Emoji 符号，并编辑标题与描述 */
function IconListField({ value, onChange, label }: {
  value: string; onChange: (v: string) => void; label: string;
}) {
  const items = parseIconItems(value);
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState('');

  const commit = (next: IconItem[]) => onChange(JSON.stringify(next));
  const patch = (i: number, part: Partial<IconItem>) => commit(items.map((x, idx) => idx === i ? { ...x, ...part } : x));
  const add = () => commit([...items, { icon: '', title: '', desc: '' }]);
  const remove = (i: number) => commit(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items]; [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  const handleFile = async (i: number, file?: File) => {
    if (!file) return;
    setUploading(i); setError('');
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sb_token') ?? ''}`,
        },
        body: JSON.stringify({ data, filename: file.name }),
      });
      if (!res.ok) throw new Error('上传失败');
      const json = await res.json();
      patch(i, { icon: json.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败');
    } finally { setUploading(null); }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-neutral-600">{label}</label>
        <span className="text-[10px] text-neutral-400">共 {items.length} 项</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] p-2">
            <div className="mb-2 flex items-center gap-2">
              <label className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-neutral-300 bg-neutral-50 text-lg text-neutral-400 transition-colors hover:border-[var(--ui-accent)]">
                {item.icon
                  ? isImageIcon(item.icon)
                    ? <img src={item.icon} alt="图标" className="h-full w-full object-cover" />
                    : <span>{item.icon}</span>
                  : <ImagePlus className="h-4 w-4" />}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(i, e.target.files?.[0])} />
              </label>
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={item.icon ?? ''}
                  placeholder="图片地址或 Emoji 符号（如 🚀）"
                  onChange={(e) => patch(i, { icon: e.target.value })}
                  className="w-full rounded border border-[var(--ui-border)] px-2 py-1 text-[11px] outline-none focus:border-[var(--ui-accent)]"
                />
                {uploading === i && <p className="mt-0.5 text-[10px] text-blue-500">上传中…</p>}
              </div>
            </div>
            <input
              type="text"
              value={item.title}
              placeholder="标题"
              onChange={(e) => patch(i, { title: e.target.value })}
              className="mb-1.5 w-full rounded border border-[var(--ui-border)] px-2 py-1 text-xs outline-none focus:border-[var(--ui-accent)]"
            />
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={item.desc}
                placeholder="描述（可选）"
                onChange={(e) => patch(i, { desc: e.target.value })}
                className="min-w-0 flex-1 rounded border border-[var(--ui-border)] px-2 py-1 text-[11px] outline-none focus:border-[var(--ui-accent)]"
              />
              <button type="button" onClick={() => move(i, -1)} title="上移" className="rounded p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30" disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => move(i, 1)} title="下移" className="rounded p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30" disabled={i === items.length - 1}><ArrowDown className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => remove(i)} title="删除" className="rounded p-1 text-red-400 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="rounded border border-dashed border-[var(--ui-border)] py-3 text-center text-[11px] text-neutral-400">暂无条目，点击下方添加</p>}
      </div>
      <button type="button" onClick={add} className="mt-2 w-full rounded-md border border-dashed border-[var(--ui-accent)] py-1.5 text-[11px] text-[var(--ui-accent)] transition-colors hover:bg-opacity-10">+ 添加一项</button>
      {error && <p className="mt-1 text-[10px] text-red-500">{error}</p>}
      <p className="mt-1.5 text-[10px] leading-relaxed text-neutral-400">提示：点击左侧圆框可上传本地图片；也可在输入框填图片网址或 Emoji 符号。留空则显示序号。</p>
    </div>
  );
}
