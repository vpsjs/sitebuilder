/**
 * 中间画布
 * ------------------------------------------------------------------
 * 用通用渲染器渲染 DSL，编辑态包裹交互层。
 * 顶部空区域作为根容器的放置目标。
 */

import { Monitor, Smartphone, Check, X, Home, LayoutGrid, ShoppingBag, User, Search, Heart, MessageCircle, Menu, Package } from 'lucide-react';
import { useMemo, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react';
import { findNode, getDragPayload, clearDragPayload, registry, renderDsl, ThemeProvider, type DslNode } from '@/core';
import type { Device, EditorApi } from './useEditor';
import type { BottomIcon, MobileOptions } from './mobileOptions';

const bottomIconMap: Record<BottomIcon, typeof Home> = {
  home: Home, grid: LayoutGrid, cart: ShoppingBag, user: User,
  search: Search, heart: Heart, message: MessageCircle, menu: Menu, package: Package,
};

const deviceLabel: Record<Device, string> = {
  desktop: '电脑宽屏 · 1440px',
  tablet: '平板 · 768px',
  mobile: '手机预览',
};

export function Canvas({ api, minimal = false, onOpenProperties, mobileWidth = 390, mobileOptions, hideToolbar = false }: {
  api: EditorApi;
  minimal?: boolean;
  onOpenProperties?: (id: string) => void;
  mobileWidth?: number;
  mobileOptions?: MobileOptions;
  hideToolbar?: boolean;
}) {
  const deviceWidth: Record<Device, string> = {
    desktop: '1440px',
    tablet: '768px',
    mobile: `${mobileWidth}px`,
  };
  const { page, device, preview, selectedId, hoveredId } = api;
  const [quickEdit, setQuickEdit] = useState<{ id: string; key: string; label: string; value: string; multiline: boolean } | null>(null);
  const [bottomCategoryOpen, setBottomCategoryOpen] = useState(false);

  const navMenus = useMemo(() => {
    const findNav = (node: DslNode): DslNode | null => {
      if (node.type === 'navbar' || (node.type === 'custom-html' && node.props.menus)) return node;
      return (node.children ?? []).reduce<DslNode | null>((acc, child) => acc ?? findNav(child), null);
    };
    const nav = findNav(page.root);
    return String(nav?.props.menus ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, ...rest] = line.split('|');
        return { label: label ?? '', href: rest.join('|').trim() || '#' };
      });
  }, [page.root]);

  const selectedNode = useMemo(
    () => (selectedId ? findNode(page.root, selectedId) : null),
    [page.root, selectedId],
  );

  const openQuickEdit = (id: string) => {
    if (minimal && onOpenProperties) {
      onOpenProperties(id);
      return;
    }
    const node = findNode(page.root, id);
    if (!node || node.locked) return;
    const block = registry.get(node.type);
    const field = block?.propertySchema.find((f) => f.type === 'text' || f.type === 'textarea');
    if (!field) {
      api.select(id);
      return;
    }
    setQuickEdit({
      id,
      key: field.key,
      label: `编辑${field.label}`,
      value: String(node.props[field.key] ?? ''),
      multiline: field.type === 'textarea',
    });
  };

  const saveQuickEdit = () => {
    if (!quickEdit) return;
    const node = findNode(page.root, quickEdit.id);
    if (!node) return;
    api.patch(quickEdit.id, {
      props: { ...node.props, [quickEdit.key]: quickEdit.value },
    });
    setQuickEdit(null);
  };

  const toggleHidden = (id: string) => {
    const node = findNode(page.root, id);
    if (!node || node.locked) return;
    api.patch(id, { hidden: !node.hidden });
  };

  const toggleLock = (id: string) => {
    const node = findNode(page.root, id);
    if (!node || id === 'root') return;
    api.patch(id, { locked: !node.locked });
  };

  const applyDrop = (parentId: string, index: number) => {
    const payload = getDragPayload();
    if (payload.blockType) api.add(payload.blockType, parentId, index);
    else if (payload.nodeId) api.move(payload.nodeId, parentId, index);
    clearDragPayload();
  };

  const handleRootDrop = (e: DragEvent) => {
    e.preventDefault();
    applyDrop('root', page.root.children?.length ?? 0);
  };

  const rendered: ReactNode = renderDsl(page.root, {
    editing: !preview,
    hideNodeToolbar: hideToolbar,
    selectedId,
    hoveredId,
    onSelect: api.select,
    onHover: preview ? undefined : api.hover,
    onDropNode: applyDrop,
    onQuickEdit: openQuickEdit,
    onOpenProperties,
    onMoveRelative: api.moveRelative,
    onDuplicate: api.duplicate,
    onToggleHidden: toggleHidden,
    onToggleLock: toggleLock,
    onDelete: (id) => {
      if (id === page.root.id) {
        api.patch(id, { children: [] });
        return;
      }
      api.remove(id);
    },
    onResize: (id, size) => {
      const node = findNode(page.root, id);
      if (!node) return;
      const style = { ...(node.style ?? {}), width: `${size.width}px`, height: size.height };
      api.patch(id, { style, props: { ...node.props, width: size.width, height: size.height } });
    },
    onMoveTo: (id, pos) => {
      const node = findNode(page.root, id);
      if (!node) return;
      api.patch(id, { style: { ...(node.style ?? {}), position: 'absolute', left: pos.left, top: pos.top } });
    },
  });

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-neutral-100">
      {!minimal && (
        <div className="flex items-center justify-center gap-1 border-b border-neutral-200 bg-white py-2">
          {([
            { id: 'desktop', icon: Monitor },
            { id: 'mobile', icon: Smartphone },
          ] as { id: Device; icon: typeof Monitor }[]).map((d) => (
            <button
              key={d.id}
              onClick={() => api.setDevice(d.id)}
              title={deviceLabel[d.id]}
              className={`rounded p-1.5 transition-colors ${device === d.id ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900'}`}
            >
              <d.icon className="h-4 w-4" />
            </button>
          ))}
          <span className="ml-2 text-[11px] text-neutral-400">
            {preview
              ? '预览模式 · 点击右上角退出'
              : selectedNode
                ? `已选中：${registry.get(selectedNode.type)?.name ?? selectedNode.type} · 双击文字可直接修改`
                : '编辑模式 · 点击页面任意模块即可修改'}
          </span>
        </div>
      )}

      {quickEdit && !preview && !minimal && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2">
          <span className="shrink-0 text-xs font-medium text-amber-900">{quickEdit.label}</span>
          {quickEdit.multiline ? (
            <textarea
              autoFocus
              value={quickEdit.value}
              onChange={(e) => setQuickEdit({ ...quickEdit, value: e.target.value })}
              rows={2}
              className="flex-1 rounded border border-amber-300 bg-white px-2 py-1 text-xs outline-none focus:border-[#D4AF37]"
            />
          ) : (
            <input
              autoFocus
              value={quickEdit.value}
              onChange={(e) => setQuickEdit({ ...quickEdit, value: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') saveQuickEdit(); }}
              className="flex-1 rounded border border-amber-300 bg-white px-2 py-1 text-xs outline-none focus:border-[#D4AF37]"
            />
          )}
          <button onClick={saveQuickEdit} className="flex items-center gap-1 rounded bg-[#171717] px-2.5 py-1.5 text-[11px] text-white">
            <Check className="h-3.5 w-3.5" /> 保存
          </button>
          <button onClick={() => setQuickEdit(null)} className="rounded p-1.5 text-neutral-500 hover:bg-white" title="取消">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-auto p-6">
        <div
          onClick={() => !preview && api.select(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleRootDrop}
          className={`relative min-h-full rounded-lg bg-white shadow-sm transition-all ${device === 'desktop' ? '' : 'mx-auto'} ${mobileOptions?.category === false ? 'editor-hide-category' : ''}`}
          style={{
            width: deviceWidth[device],
            maxWidth: device === 'desktop' ? 'none' : '100%',
            containerType: 'inline-size',
            // 抓取页的 rawCss 原样注入，其中 position:fixed/sticky 的导航会相对浏览器
            // 视口固定，浮到编辑器顶栏之上。这里创建包含块，让它们相对画布定位，
            // 既不影响发布态（发布走 SiteView，不用 Canvas），也保证编辑/预览可操作。
            transform: 'translateZ(0)',
          } as CSSProperties}
        >
          <style>{`
            /* 头部分类按钮关闭：手机端像 PC 一样直接显示完整分类，隐藏折叠按钮 */
            ${mobileOptions?.category === false ? `
            .editor-hide-category .sb-nav-desktop{display:flex!important;flex-wrap:wrap!important}
            .editor-hide-category .sb-nav-toggle,
            .editor-hide-category .sb-nav-mobile{display:none!important}
            .editor-hide-category .mc-nav{display:block!important;overflow-x:auto}
            .editor-hide-category .mc-nav-in{display:flex!important;min-width:max-content;width:auto}
            .editor-hide-category .mc-nav-in a{flex:0 0 auto;white-space:nowrap;padding:0 16px}
            .editor-hide-category .mc-hd-menu-btn,
            .editor-hide-category .mc-hd-mobile-nav{display:none!important}
            ` : ''}
          `}</style>
          <ThemeProvider theme={page.theme}>{rendered}</ThemeProvider>
          {device === 'mobile' && mobileOptions?.bottomBar !== false && (
            <div
              className="sticky bottom-0 z-10 mt-4 border-t border-neutral-200 bg-white/95 shadow-[0_-6px_20px_rgba(0,0,0,.06)] backdrop-blur"
              onClick={(e) => e.stopPropagation()}
            >
              {bottomCategoryOpen && navMenus.length > 0 && (
                <div className="border-b border-neutral-100 px-4 py-3">
                  <div className="mb-2 text-[10px] text-neutral-400">全部分类</div>
                  <div className="grid grid-cols-3 gap-2">
                    {navMenus.map((m, i) => (
                      <a key={i} href={m.href} className="rounded-md bg-neutral-50 py-2 text-center text-[11px] text-neutral-600" onClick={(e) => { e.stopPropagation(); setBottomCategoryOpen(false); }}>
                        {m.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex">
                {(mobileOptions?.bottomItems ?? []).map((item, i) => {
                  const Icon = bottomIconMap[item.icon] ?? Home;
                  const isCategory = Boolean(item.category);
                  return (
                    <button
                      key={`${item.label}-${i}`}
                      onClick={isCategory ? () => setBottomCategoryOpen((v) => !v) : undefined}
                      className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] ${bottomCategoryOpen && isCategory ? 'text-[#635BFF]' : i === 0 ? 'text-[#635BFF]' : 'text-neutral-500'}`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
