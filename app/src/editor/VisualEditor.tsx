/**
 * 凡科式可视化编辑界面
 * 大画布 + 左侧悬浮工具 + 抽屉属性面板。
 */
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  Blocks, ChevronDown, ChevronUp, Cloud, Globe2, GripVertical, Layers3, LayoutTemplate, Monitor,
  Moon, Paintbrush, Redo2, Settings, SlidersHorizontal, Smartphone, Sun, Undo2, X, Zap,
} from 'lucide-react';
import { findNode, registry, type DslNode } from '@/core';
import { Canvas } from './Canvas';
import { PublishDialog } from './PublishDialog';
import { adminUrl, saveTarget, type EditTarget, type TargetInfo } from '@/api/target';
import { createPage, isLoggedIn, login } from '@/api/client';
import type { EditorApi } from './useEditor';
import { ElementDrawer, LayerDrawer, ModuleDrawer, SettingsDrawer, StyleDrawer, type ElementTab } from './VisualDrawers';
import { DEFAULT_MOBILE_OPTIONS, type MobileOptions } from './mobileOptions';
import { loadUiTheme, saveUiTheme, UI_ACCENTS } from './uiTheme';

type DrawerKind = 'modules' | 'layers' | 'styles' | 'settings' | 'element' | null;

export function VisualEditor({ api, target, targetInfo, onSwitchPage }: {
  api: EditorApi;
  target: EditTarget;
  targetInfo: TargetInfo | null;
  onSwitchPage?: (next: EditTarget) => void;
}) {
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [elementTab, setElementTab] = useState<ElementTab>('content');
  const [showPublish, setShowPublish] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [moduleKeyword, setModuleKeyword] = useState('');
  const [panelPos, setPanelPos] = useState({ x: 78, y: 16 });
  const [railPos, setRailPos] = useState({ x: 12, y: 12 });
  const [railOpen, setRailOpen] = useState(true);
  const [mobileWidth, setMobileWidth] = useState(390);
  const [mobileOptions, setMobileOptions] = useState<MobileOptions>(DEFAULT_MOBILE_OPTIONS);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [uiTheme, setUiTheme] = useState(loadUiTheme);
  const [uiMenuOpen, setUiMenuOpen] = useState(false);
  const clipboardRef = useRef<DslNode | null>(null);
  const [impersonating, setImpersonating] = useState(() => localStorage.getItem('sb_impersonating') === '1');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return;
      const meta = e.metaKey || e.ctrlKey;
      const id = api.selectedId;
      if (meta) {
        const key = e.key.toLowerCase();
        if (key === 'z') { e.preventDefault(); e.shiftKey ? api.redo() : api.undo(); return; }
        if (key === 'y') { e.preventDefault(); api.redo(); return; }
        if (key === 'd' && id && id !== 'root') { e.preventDefault(); api.duplicate(id); return; }
        if (key === 'c' && id) { clipboardRef.current = findNode(api.page.root, id); return; }
        if (key === 'v' && clipboardRef.current) {
          e.preventDefault();
          const node = clipboardRef.current;
          const found = id ? findParent(api.page.root, id) : null;
          const parentId = found?.parent.id ?? 'root';
          const index = found ? found.index + 1 : (api.page.root.children ?? []).length;
          api.addNode({ ...node, id: `${node.type}-${Date.now().toString(36)}` }, parentId, index);
          return;
        }
      } else {
        if ((e.key === 'Delete' || e.key === 'Backspace') && id && id !== 'root') { e.preventDefault(); api.remove(id); return; }
        if (e.key === 'Escape') { setDrawer(null); setShowPublish(false); api.select(null); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [api]);

  const toggleUiDark = () => setUiTheme((t) => {
    const next = { ...t, dark: !t.dark };
    saveUiTheme({ dark: next.dark });
    return next;
  });
  const pickUiAccent = (accent: string) => setUiTheme((t) => {
    const next = { ...t, accent };
    saveUiTheme({ accent });
    setUiMenuOpen(false);
    return next;
  });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const railDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const node = api.selectedId ? findNode(api.page.root, api.selectedId) : null;
  const block = node ? registry.get(node.type) : null;
  const pageLabel = targetInfo?.page?.name ?? (targetInfo?.site ? '站点首页' : api.page.meta.title);

  const switchTo = (next: EditTarget) => {
    setPageMenuOpen(false);
    setDrawer(null);
    setSaved(false);
    api.select(null);
    onSwitchPage?.(next);
  };

  const addPage = async () => {
    const name = newPageName.trim();
    if (!name || !targetInfo?.site) return;
    try {
      const created = await createPage(targetInfo.site.id, name, `page-${Date.now().toString(36)}`);
      setNewPageName('');
      switchTo({ siteId: targetInfo.site.id, pageId: created.id });
    } catch {
      // 新建失败时保留菜单，便于重试
    }
  };

  const openProperties = (id: string) => {
    const current = findNode(api.page.root, id);
    if (!current) return;
    api.select(id);
    const hasImage = registry.get(current.type)?.propertySchema.some((f) => f.type === 'image');
    const isLayout = Boolean(current.children) || current.type === 'grid' || current.id === 'root';
    setElementTab(isLayout ? 'layout' : hasImage ? 'image' : 'content');
    setDrawer('element');
  };

  const patchProps = (patch: Record<string, unknown>) => {
    if (!node) return;
    api.patch(node.id, { props: { ...node.props, ...patch } });
    setSaved(false);
  };

  const patchStyle = (patch: Record<string, unknown>) => {
    if (!node) return;
    api.patch(node.id, { style: { ...node.style, ...patch } });
    setSaved(false);
  };

  const quickAdd = (blockType: string) => {
    let parentId = 'root';
    let index = api.page.root.children?.length ?? 0;
    if (api.selectedId) {
      const current = findNode(api.page.root, api.selectedId);
      if (current?.children) {
        parentId = api.selectedId;
        index = current.children.length;
      } else {
        const parent = findParent(api.page.root, api.selectedId);
        if (parent) {
          parentId = parent.parent.id;
          index = parent.index + 1;
        }
      }
    }
    api.add(blockType, parentId, index);
    setDrawer(null);
    setSaved(false);
  };

  const beginPanelDrag = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: panelPos.x, originY: panelPos.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const movePanel = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const width = panelRef.current?.offsetWidth ?? 340;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const maxY = Math.max(8, window.innerHeight - 100);
    setPanelPos({
      x: Math.min(maxX, Math.max(8, drag.originX + e.clientX - drag.startX)),
      y: Math.min(maxY, Math.max(8, drag.originY + e.clientY - drag.startY)),
    });
  };

  const endPanelDrag = () => { dragRef.current = null; };

  const beginRailDrag = (e: ReactPointerEvent) => {
    railDragRef.current = { startX: e.clientX, startY: e.clientY, originX: railPos.x, originY: railPos.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const moveRail = (e: ReactPointerEvent) => {
    const drag = railDragRef.current;
    if (!drag) return;
    const width = railRef.current?.offsetWidth ?? 56;
    const height = railRef.current?.offsetHeight ?? 340;
    const maxX = Math.max(8, window.innerWidth - width - 8);
    const maxY = Math.max(8, window.innerHeight - 56 - height - 8);
    setRailPos({
      x: Math.min(maxX, Math.max(8, drag.originX + e.clientX - drag.startX)),
      y: Math.min(maxY, Math.max(8, drag.originY + e.clientY - drag.startY)),
    });
  };

  const endRailDrag = () => { railDragRef.current = null; };

  const saveDraftOnly = async () => {
    if (!target.siteId) { setSaveError('当前为本地草稿，未绑定站点'); return; }
    setSaving(true);
    setSaveError('');
    try {
      if (!isLoggedIn()) await login('user@demo.com', 'demo123');
      await saveTarget(target, api.page);
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const exitImpersonation = () => {
    localStorage.removeItem('sb_impersonating');
    localStorage.removeItem('sb_token');
    window.location.href = `${WEB_ADMIN_URL}/#/admin`;
  };

  const saveRef = useRef(saveDraftOnly);
  saveRef.current = saveDraftOnly;
  useEffect(() => {
    if (!target.siteId) return;
    const timer = window.setInterval(() => {
      if (!saved && !saving && !document.hidden) void saveRef.current();
    }, 20000);
    return () => window.clearInterval(timer);
  }, [target.siteId, saved, saving]);

  const togglePreview = async () => {
    if (api.preview) { api.setPreview(false); return; }
    api.setPreview(true);
  };

  const exit = () => { window.location.href = adminUrl(target); };

  return (
    <div
      data-ui-theme={uiTheme.dark ? 'dark' : 'light'}
      style={{ '--ui-accent': uiTheme.accent } as CSSProperties}
      className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--ui-bg)] text-[var(--ui-fg)]"
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--ui-border)] bg-[var(--ui-panel)] px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ui-accent)] text-white"><Zap className="h-4 w-4" /></div>
          <div className="hidden md:block"><div className="text-xs font-semibold">极速建站</div><div className="text-[10px] text-[var(--ui-muted)]">可视化编辑</div></div>
        </div>
        <button onClick={exit} className="hidden items-center gap-1 rounded px-2 py-1.5 text-xs text-[var(--ui-muted)] hover:bg-[var(--ui-hover)] lg:flex"><Globe2 className="h-3.5 w-3.5" /> 网站管理</button>

        <div className="mx-auto flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPageMenuOpen((v) => !v)}
              disabled={!onSwitchPage || !targetInfo?.site}
              title="切换编辑页面"
              className="flex max-w-[280px] items-center gap-2 rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] py-1.5 pl-3 pr-2 text-xs hover:border-[var(--ui-accent)] disabled:cursor-default disabled:hover:border-[var(--ui-border)]"
            >
              <span className="truncate">{pageLabel}</span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[var(--ui-muted)] transition-transform ${pageMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {pageMenuOpen && targetInfo?.site && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPageMenuOpen(false)} />
                <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)] py-1 shadow-xl">
                  <div className="border-b border-[var(--ui-border)] px-3 py-1.5 text-[10px] text-[var(--ui-muted)]">切换编辑页面</div>
                  <button
                    onClick={() => switchTo({ siteId: target.siteId })}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--ui-hover)] ${!target.pageId ? 'bg-[var(--ui-accent-soft)] font-medium text-[var(--ui-accent-text)]' : 'text-[var(--ui-fg)]'}`}
                  >
                    <span>站点首页</span>
                    <span className="max-w-[110px] truncate text-[10px] text-[var(--ui-muted)]">{targetInfo.site.name}</span>
                  </button>
                  {targetInfo.pages.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => switchTo({ siteId: target.siteId, pageId: p.id })}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--ui-hover)] ${target.pageId === p.id ? 'bg-[var(--ui-accent-soft)] font-medium text-[var(--ui-accent-text)]' : 'text-[var(--ui-fg)]'}`}
                    >
                      <span className="truncate">{p.name}{p.isHome ? ' · 首页' : ''}</span>
                      <span className="shrink-0 text-[10px] text-[var(--ui-muted)]">/{p.slug}</span>
                    </button>
                  ))}
                  {targetInfo.pages.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-[var(--ui-muted)]">该站点暂无子页面</div>
                  )}
                  {(targetInfo.sites ?? []).filter((s) => s.id !== targetInfo.site?.id).length > 0 && (
                    <>
                      <div className="border-t border-[var(--ui-border)] px-3 py-1.5 text-[10px] text-[var(--ui-muted)]">切换站点</div>
                      {(targetInfo.sites ?? []).filter((s) => s.id !== targetInfo.site?.id).map((s) => (
                        <button
                          key={s.id}
                          onClick={() => switchTo({ siteId: s.id })}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--ui-fg)] hover:bg-[var(--ui-hover)]"
                        >
                          <span className="truncate">{s.name}</span>
                        </button>
                      ))}
                    </>
                  )}
                  <div className="border-t border-[var(--ui-border)] p-2">
                    <div className="flex gap-1">
                      <input
                        value={newPageName}
                        onChange={(e) => setNewPageName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addPage(); }}
                        placeholder="新建页面名称"
                        className="min-w-0 flex-1 rounded border border-[var(--ui-border)] px-2 py-1.5 text-[11px] outline-none focus:border-[var(--ui-accent)]"
                      />
                      <button onClick={addPage} className="shrink-0 rounded bg-[var(--ui-accent)] px-2 py-1.5 text-[11px] text-white">新建</button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-0.5 rounded-md border border-[var(--ui-border)] p-0.5">
            {[
              { id: 'desktop', icon: Monitor, label: '电脑宽屏 1440px' },
              { id: 'mobile', icon: Smartphone, label: `手机 ${mobileWidth}px` },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => api.setDevice(d.id as 'desktop' | 'mobile')}
                className={`rounded p-1.5 ${api.device === d.id ? 'bg-[var(--ui-accent)] text-white' : 'text-[var(--ui-muted)] hover:bg-[var(--ui-hover)]'}`}
                title={d.label}
                aria-label={d.label}
              >
                <d.icon className="h-3.5 w-3.5" />
              </button>
            ))}
            <span className="mx-0.5 h-4 w-px bg-[var(--ui-border)]" />
            <button
              onClick={() => setDrawer((current) => current === 'settings' ? null : 'settings')}
              className={`rounded p-1.5 ${drawer === 'settings' ? 'bg-[var(--ui-accent)] text-white' : 'text-[var(--ui-muted)] hover:bg-[var(--ui-hover)]'}`}
              title="分辨率设置"
              aria-label="分辨率设置"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="hidden items-center gap-1 rounded-md bg-[var(--ui-hover)] px-2 py-1.5 text-[11px] text-[var(--ui-muted)] xl:flex"><Cloud className="h-3.5 w-3.5" /> {saved ? '已保存' : '草稿'}</span>
          <button onClick={api.undo} title="撤销" className="rounded-md p-2 text-[var(--ui-muted)] hover:bg-[var(--ui-hover)]"><Undo2 className="h-4 w-4" /></button>
          <button onClick={api.redo} title="重做" className="rounded-md p-2 text-[var(--ui-muted)] hover:bg-[var(--ui-hover)]"><Redo2 className="h-4 w-4" /></button>
          <div className="mx-0.5 h-5 w-px bg-[var(--ui-border)]" />
          <button onClick={toggleUiDark} title={uiTheme.dark ? '切换到亮色界面' : '切换到暗色界面'} className="rounded-md p-2 text-[var(--ui-muted)] hover:bg-[var(--ui-hover)]">
            {uiTheme.dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="relative">
            <button onClick={() => setUiMenuOpen((v) => !v)} title="更换工具强调色" className="flex items-center gap-1.5 rounded-md border border-[var(--ui-border)] px-2 py-1.5 hover:bg-[var(--ui-hover)]">
              <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: uiTheme.accent }} />
              <span className="hidden text-[10px] text-[var(--ui-muted)] xl:inline">工具色</span>
            </button>
            {uiMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUiMenuOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)] p-2 shadow-xl">
                  <div className="mb-1.5 text-[10px] text-[var(--ui-muted)]">工具强调色</div>
                  {UI_ACCENTS.map((a) => (
                    <button key={a.value} onClick={() => pickUiAccent(a.value)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-[var(--ui-hover)]">
                      <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: a.value }} />
                      <span className="flex-1 text-left">{a.name}</span>
                      {uiTheme.accent === a.value && <span className="text-[var(--ui-accent)]">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={saveDraftOnly} disabled={saving} title="仅保存草稿，不发布" className="rounded-md border border-[var(--ui-border)] px-3 py-1.5 text-xs text-[var(--ui-fg)] hover:border-[var(--ui-accent)] disabled:opacity-50">{saving ? '保存中…' : '保存'}</button>
          <button onClick={() => setShowPublish(true)} title="发布到公开站点" className="rounded-md bg-[var(--ui-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">发布</button>
          {saveError && <span className="max-w-[140px] truncate text-[10px] text-red-600" title={saveError}>{saveError}</span>}
          <button onClick={togglePreview} className="rounded-md border border-[var(--ui-border)] px-3 py-1.5 text-xs text-[var(--ui-fg)] hover:border-[var(--ui-accent)]">{api.preview ? '退出预览' : '预览'}</button>
          <button onClick={exit} className="hidden rounded-md border border-[var(--ui-border)] px-3 py-1.5 text-xs text-[var(--ui-fg)] hover:bg-[var(--ui-hover)] md:block">取消</button>
        </div>
      </header>

      {impersonating && (
        <div className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          <Zap className="h-3.5 w-3.5" />
          <span className="font-medium">管理员代客编辑中</span>
          <span className="text-amber-600">你正在以站点所属用户的身份修改其站点，所有保存与发布都会作用到该用户站点。</span>
          <button onClick={exitImpersonation} className="ml-auto rounded-md border border-amber-300 bg-white px-2.5 py-1 font-medium text-amber-800 hover:bg-amber-100">退出代客并返回后台</button>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1"><Canvas api={api} minimal onOpenProperties={openProperties} mobileWidth={mobileWidth} mobileOptions={mobileOptions} hideToolbar={drawer !== null || showPublish} /></div>

        {!api.preview && (
          <div
            ref={railRef}
            className="absolute z-30 flex flex-col gap-2"
            style={{ left: railPos.x, top: railPos.y }}
          >
            <div className="flex items-center gap-0.5 rounded-full bg-[var(--ui-panel)]/95 p-0.5 shadow-md">
              <div
                onPointerDown={beginRailDrag}
                onPointerMove={moveRail}
                onPointerUp={endRailDrag}
                onPointerCancel={endRailDrag}
                className="flex h-7 w-6 cursor-move items-center justify-center rounded-full text-[var(--ui-muted)] select-none"
                title="拖动移动工具栏"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </div>
              <button
                onClick={() => setRailOpen((v) => !v)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ui-accent)] text-white"
                title={railOpen ? '收起工具栏' : '展开工具栏'}
                aria-label={railOpen ? '收起工具栏' : '展开工具栏'}
              >
                {railOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
            {railOpen && ([
              { id: 'modules', label: '模块', icon: Blocks },
              { id: 'layers', label: '图层', icon: Layers3 },
              { id: 'styles', label: '样式', icon: Paintbrush },
              { id: 'settings', label: '设置', icon: Settings },
            ] as { id: Exclude<DrawerKind, null | 'element'>; label: string; icon: typeof Blocks }[]).map((item) => (
              <button key={item.id} onClick={() => setDrawer((current) => current === item.id ? null : item.id)} title={item.label} className={`flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-2xl shadow-lg transition-transform hover:-translate-y-0.5 ${drawer === item.id ? 'bg-[var(--ui-accent)] text-white ring-2 ring-[var(--ui-panel)]' : 'bg-[var(--ui-panel)] text-[var(--ui-fg)] border border-[var(--ui-border)]'}`}>
                <item.icon className="h-4 w-4" />
                <span className="text-[9px] leading-none">{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {drawer && !api.preview && (
          <div
            ref={panelRef}
            className="absolute z-20 w-[360px] max-w-[calc(100%-90px)] overflow-hidden rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel)] shadow-2xl"
            style={{ left: panelPos.x, top: panelPos.y, maxHeight: 'calc(100% - 32px)' }}
          >
            <DrawerHeader
              title={drawer === 'element' ? (block?.name ?? '组件属性') : drawerTitle(drawer)}
              subtitle={drawer === 'element' && elementTab === 'layout' ? '设计通栏' : undefined}
              icon={drawerIcon(drawer)}
              tabs={drawer === 'element' ? elementTabs(node) : undefined}
              activeTab={elementTab}
              onTab={setElementTab}
              onClose={() => setDrawer(null)}
              onDragStart={beginPanelDrag}
              onDragMove={movePanel}
              onDragEnd={endPanelDrag}
            />
            <div className="max-h-[calc(100vh-130px)] overflow-y-auto bg-[var(--ui-panel)] p-4">
              {drawer === 'element' && node && block && <ElementDrawer api={api} node={node} tab={elementTab} patchProps={patchProps} patchStyle={patchStyle} />}
              {drawer === 'modules' && <ModuleDrawer keyword={moduleKeyword} onKeyword={setModuleKeyword} onAdd={quickAdd} />}
              {drawer === 'layers' && <LayerDrawer api={api} />}
              {drawer === 'styles' && <StyleDrawer theme={api.page.theme} api={api} />}
              {drawer === 'settings' && (
                <SettingsDrawer
                  api={api}
                  mobileWidth={mobileWidth}
                  onMobileWidth={setMobileWidth}
                  mobileOptions={mobileOptions}
                  onMobileOptions={setMobileOptions}
                  onDevice={api.setDevice}
                />
              )}
            </div>
          </div>
        )}

        {!api.selectedId && !api.preview && !drawer && (
          <div className="pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-full bg-[var(--ui-panel)]/90 px-4 py-2 text-[11px] text-[var(--ui-fg)] shadow-lg">
            点击页面中的文字、图片或模块即可直接修改
          </div>
        )}
      </div>

      {showPublish && <PublishDialog page={api.page} target={target} targetInfo={targetInfo} onClose={() => setShowPublish(false)} />}
    </div>
  );
}

function findParent(root: DslNode, id: string): { parent: DslNode; index: number } | null {
  const children = root.children ?? [];
  const index = children.findIndex((child) => child.id === id);
  if (index >= 0) return { parent: root, index };
  for (const child of children) {
    const found = findParent(child, id);
    if (found) return found;
  }
  return null;
}

function drawerTitle(drawer: DrawerKind) {
  return ({ modules: '模块库', layers: '图层', styles: '整站样式', settings: '页面设置', element: '组件属性' } as Record<Exclude<DrawerKind, null>, string>)[drawer as Exclude<DrawerKind, null>];
}

function drawerIcon(drawer: DrawerKind) {
  const map = { modules: LayoutTemplate, layers: Layers3, styles: Paintbrush, settings: Settings, element: Settings };
  const Icon = map[drawer as Exclude<DrawerKind, null>];
  return <Icon className="h-4 w-4" />;
}

function DrawerHeader({ title, subtitle, icon, tabs, activeTab, onTab, onClose, onDragStart, onDragMove, onDragEnd }: {
  title: string; subtitle?: string; icon: ReactNode; tabs?: { id: ElementTab; label: string }[];
  activeTab: ElementTab; onTab: (tab: ElementTab) => void; onClose: () => void;
  onDragStart: (e: ReactPointerEvent) => void;
  onDragMove: (e: ReactPointerEvent) => void;
  onDragEnd: () => void;
}) {
  return (
    <div className="bg-[var(--ui-accent)] text-white">
      <div
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        className="flex cursor-move items-center gap-2 px-4 py-3 select-none"
        title="拖动标题栏移动面板"
      >
        {icon}
        <span className="flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          {subtitle && <span className="block text-[10px] text-white/70">{subtitle}</span>}
        </span>
        <span className="mr-1 rounded bg-white/15 px-1.5 py-0.5 text-[9px]">拖动</span>
        <button onClick={onClose} className="rounded p-1 hover:bg-white/15" title="关闭"><X className="h-4 w-4" /></button>
      </div>
      {tabs && (
        <div className="flex border-t border-white/20">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => onTab(tab.id)} className={`flex-1 border-b-2 py-2 text-[11px] transition-colors ${activeTab === tab.id ? 'border-white bg-white/10 font-semibold' : 'border-transparent text-white/70 hover:text-white'}`}>{tab.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function elementTabs(node: DslNode | null): { id: ElementTab; label: string }[] {
  if (!node) return [];
  const hasImage = registry.get(node.type)?.propertySchema.some((f) => f.type === 'image');
  const isLayout = Boolean(node.children) || node.type === 'grid' || node.id === 'root';
  const tabs: { id: ElementTab; label: string }[] = [];
  if (isLayout) tabs.push({ id: 'layout', label: '通栏设计' });
  if (hasImage) tabs.push({ id: 'image', label: '图片' });
  tabs.push(
    { id: 'content', label: '内容' },
    { id: 'style', label: '样式' },
    { id: 'animation', label: '动画' },
    { id: 'effect', label: '显示效果' },
    { id: 'responsive', label: '适应' },
    { id: 'advanced', label: '高级' },
  );
  return tabs;
}
