/**
 * DSL 渲染器（通用）
 * ------------------------------------------------------------------
 * 递归解释 DslNode 树，从注册表查找组件渲染器。
 * 同一份 DSL：
 *   - 站点端 editing=false，输出纯净页面
 *   - 装修器 editing=true，输出带选中/拖拽/放置能力的画布
 * 新增组件自动被渲染器支持，无需改动此文件。
 */

import type { CSSProperties, DragEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { DslNode, NodeStyle, SiteTheme } from '../dsl/types';
import { themeToCssVars } from '../dsl/types';
import { registry } from '../registry/registry';
import { DND_BLOCK_TYPE, DND_NODE_ID } from '../dnd';
import { setDragPayload, clearDragPayload } from '../dragState';

export function toCss(style?: NodeStyle): CSSProperties {
  if (!style) return {};
  const css: CSSProperties = {
    padding: style.padding,
    marginTop: style.marginTop,
    marginBottom: style.marginBottom,
    background: style.background,
    color: style.color,
    textAlign: style.textAlign,
    width: style.width,
    height: style.height,
    opacity: style.opacity,
    transform: style.transform,
    boxShadow: style.boxShadow,
    border: style.border,
    overflow: style.overflow,
    borderRadius: style.borderRadius,
    position: style.position,
    top: style.top,
    right: style.right,
    bottom: style.bottom,
    left: style.left,
    zIndex: style.zIndex,
    minHeight: style.minHeight,
    maxWidth: style.maxWidth,
    paddingTop: style.paddingTop,
    paddingRight: style.paddingRight,
    paddingBottom: style.paddingBottom,
    paddingLeft: style.paddingLeft,
    marginLeft: style.marginLeft,
    marginRight: style.marginRight,
    backgroundImage: style.backgroundImage,
    backgroundSize: style.backgroundSize,
    backgroundPosition: style.backgroundPosition,
    backgroundRepeat: style.backgroundRepeat,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight as CSSProperties['fontWeight'],
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    fontFamily: style.fontFamily,
    textDecoration: style.textDecoration,
    display: style.display,
    flexDirection: style.flexDirection,
    justifyContent: style.justifyContent,
    alignItems: style.alignItems,
    flexWrap: style.flexWrap,
    gap: style.gap,
    gridTemplateColumns: style.gridTemplateColumns,
    clipPath: style.clipPath,
    aspectRatio: style.aspectRatio,
    filter: style.filter,
    backdropFilter: style.backdropFilter,
    WebkitBackdropFilter: style.backdropFilter,
    mixBlendMode: style.mixBlendMode as CSSProperties['mixBlendMode'],
    transformOrigin: style.transformOrigin,
    pointerEvents: style.pointerEvents,
    visibility: style.visibility,
    cursor: style.cursor,
    borderTopLeftRadius: style.borderRadiusTL,
    borderTopRightRadius: style.borderRadiusTR,
    borderBottomRightRadius: style.borderRadiusBR,
    borderBottomLeftRadius: style.borderRadiusBL,
  };
  if (style.customAnimation) {
    css.animation = `${style.customAnimation} ${style.customAnimationDuration ?? 1}s ${style.customAnimationDelay ?? 0}s ${style.customAnimationIteration ?? '1'} both`;
  }
  return css;
}

/** 自定义 CSS：把节点的 customCss 注入为作用域样式 */
function customCssClass(node: DslNode): string {
  return `sb-custom-${String(node.id).replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

function CustomStyle({ node }: { node: DslNode }) {
  const css = node.style?.customCss?.trim();
  if (!css) return null;
  const cls = customCssClass(node);
  const scoped = css.replace(/([^{}]+)\{/g, (selector) => {
    const s = selector.trim();
    if (s.startsWith('@')) return selector;
    if (s.includes('.')) return `.${cls} ${selector}`;
    return `.${cls} ${selector}`;
  });
  return <style>{`.${cls}{}\n${scoped}`}</style>;
}

export interface RendererOptions {
  editing?: boolean;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  /** 拖放：把当前拖拽项放入 parentId 容器的 index 位置 */
  onDropNode?: (parentId: string, index: number) => void;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  /** 可视化编辑：双击节点直接编辑主文案 */
  onQuickEdit?: (id: string) => void;
  /** 可视化编辑：点击选中工具条的“编辑”文字后打开属性面板 */
  onOpenProperties?: (id: string) => void;
  /** 是否隐藏选中节点的浮动编辑条（如属性面板已打开时） */
  hideNodeToolbar?: boolean;
  /** 可视化编辑：悬浮工具条动作 */
  onMoveRelative?: (id: string, delta: number) => void;
  onDuplicate?: (id: string) => void;
  onToggleHidden?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** 画布中拖动节点右下角把手调整尺寸 */
  onResize?: (id: string, size: { width: number; height: number }) => void;
  /** 画布中拖动绝对定位节点改变坐标 */
  onMoveTo?: (id: string, pos: { left: number; top: number }) => void;
}

/** 判断拖拽数据中是否含有可放置内容 */
function hasDragPayload(e: DragEvent): boolean {
  return Boolean(e.dataTransfer.types.includes(DND_BLOCK_TYPE) || e.dataTransfer.types.includes(DND_NODE_ID));
}

const HOVER_CLASSES: Record<string, string> = {
  none: '',
  lift: 'hover:-translate-y-1 hover:shadow-xl',
  zoom: 'hover:scale-[1.03]',
  glow: 'hover:shadow-[0_0_24px_rgba(212,175,55,0.45)]',
};

const ANIMATION_CLASSES: Record<string, string> = {
  none: '',
  fade: 'sb-animate-fade',
  up: 'sb-animate-up',
  zoom: 'sb-animate-zoom',
  slide: 'sb-animate-slide',
  fly: 'sb-animate-fly',
  wipe: 'sb-animate-wipe',
  cut: 'sb-animate-cut',
  jump: 'sb-animate-jump',
  flash: 'sb-animate-flash',
  roll: 'sb-animate-roll',
  flip: 'sb-animate-flip',
  elasticIn: 'sb-animate-elastic-in',
  elasticOut: 'sb-animate-elastic-out',
};

const DIRECTION_CLASSES: Record<string, string> = {
  left: 'sb-dir-left',
  right: 'sb-dir-right',
  up: 'sb-dir-up',
  down: 'sb-dir-down',
};

const EMPHASIS_CLASSES: Record<string, string> = {
  none: '',
  pulse: 'sb-emphasis-pulse',
  shake: 'sb-emphasis-shake',
  bounce: 'sb-emphasis-bounce',
  glow: 'sb-emphasis-glow',
};

const EFFECT_STYLES = `
/* 编辑器选中态：优先读外壳 --ui-* 变量，缺省回退保证公开站/独立使用不破样式 */
.sb-node-selected{outline:2px solid var(--ui-accent,#D4AF37)}
.sb-node-hovered{outline:2px dashed color-mix(in srgb,var(--ui-accent,#D4AF37) 60%,transparent)}
.sb-node-idle:hover{outline:1px dashed color-mix(in srgb,var(--ui-accent,#D4AF37) 35%,transparent)}
.sb-node-label{background:var(--ui-accent,#171717)}
.sb-node-toolbar{background:var(--ui-panel,#171717);border-color:var(--ui-border,rgba(255,255,255,.25));color:var(--ui-fg,#fff)}
.sb-node-toolbar button{color:var(--ui-muted,rgba(255,255,255,.8))}
.sb-node-toolbar button:hover{background:var(--ui-hover,rgba(255,255,255,.15));color:var(--ui-fg,#fff)}
.sb-node-resize{background:var(--ui-accent,#635BFF)}
@keyframes sbFade{from{opacity:0}to{opacity:1}}
@keyframes sbUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes sbZoom{from{opacity:0;transform:scale(.82)}to{opacity:1;transform:scale(1)}}
@keyframes sbSlide{from{opacity:0;transform:translateX(-32px)}to{opacity:1;transform:translateX(0)}}
@keyframes sbFly{from{opacity:0;transform:translate(var(--sb-anim-x,-32px),var(--sb-anim-y,0))}to{opacity:1;transform:translate(0,0)}}
@keyframes sbWipe{from{opacity:.2;clip-path:var(--sb-wipe-clip,inset(0 100% 0 0))}to{opacity:1;clip-path:inset(0)}}
@keyframes sbCut{from{opacity:1}to{opacity:1}}
@keyframes sbJump{0%{transform:translateY(0)}40%{transform:translateY(-22px)}70%{transform:translateY(6px)}100%{transform:translateY(0)}}
@keyframes sbFlash{0%,100%{opacity:1}20%,60%{opacity:.15}40%,80%{opacity:1}}
@keyframes sbRoll{from{opacity:0;transform:translateY(30px) rotate(-8deg)}to{opacity:1;transform:translateY(0) rotate(0)}}
@keyframes sbFlip{from{opacity:0;transform:perspective(600px) rotateY(90deg)}to{opacity:1;transform:perspective(600px) rotateY(0)}}
@keyframes sbElasticIn{0%{opacity:0;transform:scale(.4)}60%{opacity:1;transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes sbElasticOut{0%{transform:scale(1)}45%{transform:scale(.72)}100%{transform:scale(1)}}
@keyframes sbPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes sbShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
@keyframes sbBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes sbGlow{0%,100%{box-shadow:0 0 0 rgba(212,175,55,0)}50%{box-shadow:0 0 26px rgba(212,175,55,.75)}}
.sb-dir-left{--sb-anim-x:32px;--sb-anim-y:0;--sb-wipe-clip:inset(0 0 0 100%)}
.sb-dir-right{--sb-anim-x:-32px;--sb-anim-y:0;--sb-wipe-clip:inset(0 100% 0 0)}
.sb-dir-up{--sb-anim-x:0;--sb-anim-y:32px;--sb-wipe-clip:inset(100% 0 0 0)}
.sb-dir-down{--sb-anim-x:0;--sb-anim-y:-32px;--sb-wipe-clip:inset(0 0 100% 0)}
.sb-animate-fade{animation-name:sbFade}
.sb-animate-up{animation-name:sbUp}
.sb-animate-zoom{animation-name:sbZoom}
.sb-animate-slide{animation-name:sbSlide}
.sb-animate-fly{animation-name:sbFly}
.sb-animate-wipe{animation-name:sbWipe}
.sb-animate-cut{animation-name:sbCut}
.sb-animate-jump{animation-name:sbJump}
.sb-animate-flash{animation-name:sbFlash}
.sb-animate-roll{animation-name:sbRoll}
.sb-animate-flip{animation-name:sbFlip}
.sb-animate-elastic-in{animation-name:sbElasticIn}
.sb-animate-elastic-out{animation-name:sbElasticOut}
.sb-emphasis-pulse:hover{animation:sbPulse .8s ease both}
.sb-emphasis-shake:hover{animation:sbShake .6s ease both}
.sb-emphasis-bounce:hover{animation:sbBounce .8s ease both}
.sb-emphasis-glow:hover{animation:sbGlow .9s ease both}
`;

function effectStyle(node: DslNode): CSSProperties {
  const style = toCss(node.style);
  const p = node.props;
  const scale = Number(p.scale ?? node.style?.scale ?? 100);
  const rotate = Number(p.rotate ?? node.style?.rotate ?? 0);
  const transformParts: string[] = [];
  if (scale !== 100) transformParts.push(`scale(${scale / 100})`);
  if (rotate !== 0) transformParts.push(`rotate(${rotate}deg)`);
  if (node.style?.transformExtra) transformParts.push(node.style.transformExtra);
  if (transformParts.length) style.transform = transformParts.join(' ');
  if (node.style?.boxShadowPreset) {
    const shadows: Record<string, string> = {
      small: '0 2px 8px rgba(15,23,42,.08)',
      medium: '0 10px 30px rgba(15,23,42,.12)',
      large: '0 24px 60px rgba(15,23,42,.2)',
    };
    style.boxShadow = shadows[node.style.boxShadowPreset];
  }

  const animationName = ANIMATION_CLASSES[String(node.style?.entranceAnimation ?? 'none')]
    || ANIMATION_CLASSES[String(node.style?.scrollAnimation ?? 'none')];
  if (animationName) {
    const duration = Number(node.style?.animationDuration ?? 0.6);
    const delay = Number(node.style?.animationDelay ?? 0);
    (style as CSSProperties & Record<string, string | number>).animationDuration = `${duration}s`;
    (style as CSSProperties & Record<string, string | number>).animationDelay = `${delay}s`;
    (style as CSSProperties & Record<string, string | number>).animationFillMode = 'both';
    (style as CSSProperties & Record<string, string | number>).animationIterationCount = node.style?.animationTrigger === 'repeat' ? 'infinite' : '1';
  }
  return style;
}

function effectClasses(node: DslNode): string {
  const hover = HOVER_CLASSES[String(node.style?.hoverEffect ?? 'none')] ?? '';
  const entrance = ANIMATION_CLASSES[String(node.style?.entranceAnimation ?? 'none')]
    || ANIMATION_CLASSES[String(node.style?.scrollAnimation ?? 'none')]
    || '';
  const emphasis = EMPHASIS_CLASSES[String(node.style?.emphasisAnimation ?? 'none')] ?? '';
  const direction = DIRECTION_CLASSES[String(node.style?.animationDirection ?? 'none')] ?? '';
  return [hover, entrance, emphasis, direction].filter(Boolean).join(' ');
}

function isImageLike(node: DslNode): boolean {
  return node.type === 'image' || Boolean(registry.get(node.type)?.propertySchema.some((f) => f.type === 'image'));
}

function startResize(e: ReactPointerEvent, node: DslNode, options: RendererOptions) {
  e.preventDefault();
  e.stopPropagation();
  const target = e.currentTarget as HTMLElement;
  const wrapper = target.parentElement;
  if (!wrapper || !options.onResize) return;
  const rect = wrapper.getBoundingClientRect();
  const startX = e.clientX;
  const startY = e.clientY;
  const startWidth = Math.round(Number(node.props.width ?? rect.width));
  const startHeight = Math.round(Number(node.props.height ?? rect.height));
  target.setPointerCapture?.(e.pointerId);
  const move = (ev: PointerEvent) => {
    options.onResize?.(node.id, {
      width: Math.max(60, startWidth + Math.round(ev.clientX - startX)),
      height: Math.max(40, startHeight + Math.round(ev.clientY - startY)),
    });
  };
  const stop = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);
}

function startMove(e: ReactPointerEvent, node: DslNode, options: RendererOptions) {
  e.preventDefault();
  e.stopPropagation();
  const target = e.currentTarget as HTMLElement;
  const wrapper = target.parentElement;
  if (!wrapper || !options.onMoveTo) return;
  const startX = e.clientX;
  const startY = e.clientY;
  const startLeft = Number(node.style?.left ?? 0);
  const startTop = Number(node.style?.top ?? 0);
  target.setPointerCapture?.(e.pointerId);
  const move = (ev: PointerEvent) => {
    options.onMoveTo?.(node.id, {
      left: Math.round(startLeft + ev.clientX - startX),
      top: Math.round(startTop + ev.clientY - startY),
    });
  };
  const stop = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);
}

function renderNode(node: DslNode, options: RendererOptions, parentId: string, index: number): ReactNode {
  if (node.hidden && !options.editing) return null;

  const block = registry.get(node.type);
  if (!block) {
    return (
      <div className="rounded border border-dashed border-red-400 bg-red-50 p-3 text-xs text-red-600">
        未知组件类型：<code>{node.type}</code>（是否忘记注册？）
      </div>
    );
  }

  const Renderer = options.editing ? block.render : (block.siteRender ?? block.render);
  const children = node.children ?? [];

  const content = (
    <Renderer
      node={node}
      editing={Boolean(options.editing)}
      renderChildren={() => children.map((child, i) => renderNode(child, options, node.id, i))}
    />
  );

  if (!options.editing) {
    return (
      <div
        key={node.id}
        style={{ ...effectStyle(node), containerType: parentId === '' ? 'inline-size' : undefined } as CSSProperties}
        className={`${effectClasses(node)} ${customCssClass(node)}`}
      >
        <CustomStyle node={node} />
        {content}
      </div>
    );
  }

  // 装修态：包裹选中框、点击选中、拖放放置能力
  const selected = options.selectedId === node.id;
  const hovered = options.hoveredId === node.id;

  const handleDragOver = (e: DragEvent) => {
    if (!hasDragPayload(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    options.onHover?.(node.id);
  };

  const handleDrop = (e: DragEvent) => {
    if (!hasDragPayload(e)) return;
    e.preventDefault();
    e.stopPropagation();
    options.onHover?.(null);
    // 根据鼠标在节点中的垂直位置决定插入到前方还是后方
    const rect = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    options.onDropNode?.(parentId, after ? index + 1 : index);
  };

  return (
    <div
      key={node.id}
      draggable={!node.locked}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData(DND_NODE_ID, node.id);
        e.dataTransfer.effectAllowed = 'move';
        setDragPayload({ nodeId: node.id });
      }}
      onDragEnd={() => clearDragPayload()}
      onDragOver={handleDragOver}
      onDragLeave={() => options.onHover?.(null)}
      onDrop={handleDrop}
      onClick={(e) => {
        e.stopPropagation();
        options.onSelect?.(node.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        options.onSelect?.(node.id);
        options.onQuickEdit?.(node.id);
      }}
      style={{ ...effectStyle(node), containerType: parentId === '' ? 'inline-size' : undefined } as CSSProperties}
      className={`group rounded transition-all ${node.style?.position ? '' : 'relative'} ${effectClasses(node)} ${customCssClass(node)} ${
        node.locked ? 'cursor-default' : 'cursor-pointer'
      } ${node.hidden ? 'opacity-40' : ''} sb-node-select ${
        selected
          ? 'sb-node-selected'
          : hovered
            ? 'sb-node-hovered'
            : 'sb-node-idle'
      }`}
    >
      <CustomStyle node={node} />
      <span className="sb-node-label pointer-events-none absolute -left-0.5 -top-5 z-10 hidden rounded px-1.5 py-0.5 text-[10px] text-white group-hover:block">
        {block.name}{node.locked ? ' · 已锁定' : ''}{node.hidden ? ' · 已隐藏' : ''}
      </span>

      {selected && !options.hideNodeToolbar && (
        <div
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className={`sb-node-toolbar absolute ${parentId === '' ? 'top-2' : '-top-8'} left-0 z-40 flex items-center gap-0.5 rounded-md border p-0.5 text-white shadow-xl`}
        >
          <button
            type="button"
            title="打开组件属性"
            onClick={() => options.onOpenProperties?.(node.id)}
            className="rounded px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/15"
          >
            编辑{block.name}
          </button>
          {node.style?.position === 'absolute' && !node.locked && (
            <button
              type="button"
              title="拖动移动位置"
              onPointerDown={(e) => startMove(e, node, options)}
              className="cursor-move rounded px-2 py-1 text-[11px] text-white hover:bg-white/15"
            >
              ✥
            </button>
          )}
          <ToolbarButton title="上移" disabled={node.locked} onClick={() => options.onMoveRelative?.(node.id, -1)}>↑</ToolbarButton>
          <ToolbarButton title="下移" disabled={node.locked} onClick={() => options.onMoveRelative?.(node.id, 1)}>↓</ToolbarButton>
          <ToolbarButton title={node.hidden ? '显示模块' : '隐藏模块'} disabled={node.locked || parentId === ''} onClick={() => options.onToggleHidden?.(node.id)}>
            {node.hidden ? '显示' : '隐藏'}
          </ToolbarButton>
          <ToolbarButton title={node.locked ? '解锁模块' : '锁定模块'} onClick={() => options.onToggleLock?.(node.id)}>
            {node.locked ? '解锁' : '锁定'}
          </ToolbarButton>
          <ToolbarButton
            title={parentId === '' ? '清空页面内容' : '删除模块'}
            disabled={node.locked}
            danger
            onClick={() => options.onDelete?.(node.id)}
          >
            删除
          </ToolbarButton>
        </div>
      )}

      {content}

      {selected && !node.locked && (isImageLike(node) || node.style?.position === 'absolute') && (
        <div
          onPointerDown={(e) => startResize(e, node, options)}
          onClick={(e) => e.stopPropagation()}
          title="拖动调整尺寸"
          className="sb-node-resize absolute -bottom-2 -right-2 z-30 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-white shadow-lg"
        />
      )}
    </div>
  );
}

function ToolbarButton({ title, onClick, children, disabled, danger }: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-1.5 py-1 text-[10px] leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        danger ? 'text-red-300 hover:bg-white/10' : 'text-white/80 hover:bg-white/15 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export function renderDsl(root: DslNode, options: RendererOptions = {}): ReactNode {
  return (
    <>
      <style>{EFFECT_STYLES}</style>
      {renderNode(root, options, '', 0)}
    </>
  );
}

/**
 * 主题包裹层：把主题令牌注入为 CSS 变量，供所有组件引用。
 * 装修器画布与站点页面都用它包裹，保证换肤两端一致。
 */
export function ThemeProvider({
  theme,
  children,
}: {
  theme?: Partial<SiteTheme>;
  children: ReactNode;
}) {
  const vars = themeToCssVars(theme);
  return (
    <div
      style={{
        ...vars,
        fontFamily: vars['--sb-font'],
        fontSize: vars['--sb-font-size'],
        lineHeight: vars['--sb-line-height'],
      } as CSSProperties}
      className="sb-theme-root"
    >
      {children}
    </div>
  );
}
