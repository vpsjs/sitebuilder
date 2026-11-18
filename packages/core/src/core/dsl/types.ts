/**
 * DSL 类型体系
 * ------------------------------------------------------------------
 * 整个平台的基石：页面 = 组件树 + 属性 + 版本。
 * 装修器产出 DSL，渲染器解释 DSL，后端只存 JSONB。
 * 新增能力时无需改动此文件，通过 schemaVersion 做向后兼容。
 */

export const CURRENT_SCHEMA_VERSION = 1 as const;

/** 组件基础样式（交互层再扩展） */
export interface NodeStyle {
  padding?: number;
  marginTop?: number;
  marginBottom?: number;
  background?: string;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  width?: string;
  height?: number;
  opacity?: number;
  transform?: string;
  boxShadow?: string;
  border?: string;
  overflow?: 'hidden' | 'visible' | 'auto';
  borderRadius?: number;
  scale?: number;
  rotate?: number;
  boxShadowPreset?: string;
  hoverEffect?: string;
  entranceAnimation?: string;
  emphasisAnimation?: string;
  scrollAnimation?: string;
  animationDirection?: 'none' | 'left' | 'right' | 'up' | 'down';
  animationDuration?: number;
  animationDelay?: number;
  animationTrigger?: 'once' | 'repeat';

  /** ——— 自由设计能力 ——— */
  /** 定位方式：静态文档流 / 相对自身 / 绝对定位（自由拖拽） / 固定 */
  position?: 'static' | 'relative' | 'absolute' | 'fixed';
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  zIndex?: number;
  minHeight?: number;
  maxWidth?: number;
  /** 四边独立内边距 / 外边距 */
  paddingTop?: number; paddingRight?: number; paddingBottom?: number; paddingLeft?: number;
  marginLeft?: number; marginRight?: number;
  /** 背景：渐变 / 图片 / 视频地址，background 为纯色 */
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto' | string;
  backgroundPosition?: string;
  backgroundRepeat?: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y';
  /** 排版 */
  fontSize?: number;
  fontWeight?: number | string;
  lineHeight?: number;
  letterSpacing?: number;
  fontFamily?: string;
  textDecoration?: string;
  /** 布局 */
  display?: 'block' | 'flex' | 'grid' | 'inline-flex' | 'inline-block' | 'none';
  flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  justifyContent?: string;
  alignItems?: string;
  flexWrap?: 'wrap' | 'nowrap';
  gap?: number;
  gridTemplateColumns?: string;
  /** ——— 形状与裁剪 ——— */
  /** 裁剪形状：circle/triangle/hexagon/star/diamond/arrow/pentagon 或任意 CSS clip-path 值 */
  clipPath?: string;
  /** 四角独立圆角 */
  borderRadiusTL?: number; borderRadiusTR?: number; borderRadiusBR?: number; borderRadiusBL?: number;
  /** 宽高比，如 16/9、1/1 */
  aspectRatio?: string;

  /** ——— 显示效果 ——— */
  /** CSS filter 滤镜串：blur()/grayscale()/brightness()/contrast()/saturate()/hue-rotate()/sepia() */
  filter?: string;
  /** 背景滤镜（毛玻璃），作用于元素背后内容 */
  backdropFilter?: string;
  /** 混合模式：normal/multiply/screen/overlay/darken/lighten/color-dodge/difference 等 */
  mixBlendMode?: string;
  /** 前景/背景混合：additive 等（CSS mix-blend-mode 别名保留给编辑器 UI） */
  blendMode?: string;
  /** CSS transform 原串（与 scale/rotate 可叠加，编辑器生成） */
  transformOrigin?: string;
  /** 模块整体的 CSS transform（倾斜 skew/位移 translate 等自由组合） */
  transformExtra?: string;
  /** 指针穿透 */
  pointerEvents?: 'auto' | 'none';
  /** 内容可见性 */
  visibility?: 'visible' | 'hidden';
  /** 光标样式 */
  cursor?: string;

  /** 高级：自定义 CSS 声明，直接注入该节点的包装层（支持任意效果） */
  customCss?: string;
  /** 高级：自定义动画关键帧名称（配合 customCss 里的 @keyframes） */
  customAnimation?: string;
  customAnimationDuration?: number;
  customAnimationDelay?: number;
  customAnimationIteration?: string;
}

/** 一个 DSL 节点 = 组件实例 */
export interface DslNode {
  id: string;
  /** 对应注册表中的组件 type，如 'heading' / 'image' */
  type: string;
  /** 组件属性，由组件的 propertySchema 定义 */
  props: Record<string, unknown>;
  style?: NodeStyle;
  /** 可视化编辑：隐藏后公开站点不渲染，画布中半透明显示 */
  hidden?: boolean;
  /** 可视化编辑：锁定后不可拖拽、删除 */
  locked?: boolean;
  /** 容器型组件可嵌套子节点 */
  children?: DslNode[];
  /** 全局组件引用：渲染时按 id 拉取并替换为globalBlocks里的节点，实现改一次全站同步 */
  ref?: { kind: 'global-block'; id: string };
}

/** 用户自定义颜色令牌（可在属性面板中像主题色一样引用） */
export interface ThemeColorToken {
  name: string;
  value: string;
}

/** 站点主题（设计令牌）—— 以 CSS 变量注入，组件引用变量实现换肤 */
export interface SiteTheme {
  primary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
  radius: number;
  /** 全站字体族（CSS font-family 值） */
  fontFamily?: string;
  /** 正文字号（px） */
  fontSize?: number;
  /** 正文行高 */
  lineHeight?: number;
  /** 标题字重 */
  headingWeight?: number;
  /** 自定义颜色令牌：注入为 --sb-c-{name} */
  colors?: ThemeColorToken[];
}

export const DEFAULT_THEME: SiteTheme = {
  primary: '#171717',
  accent: '#D4AF37',
  background: '#ffffff',
  text: '#171717',
  muted: '#475569',
  radius: 8,
  fontFamily: 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  fontSize: 16,
  lineHeight: 1.7,
  headingWeight: 700,
  colors: [],
};

/** 常用字体族预设（供设计面板下拉选择） */
export const FONT_PRESETS: { name: string; value: string }[] = [
  { name: '系统默认', value: DEFAULT_THEME.fontFamily! },
  { name: '思源黑体 / 苹方', value: '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif' },
  { name: '宋体（衬线）', value: 'Georgia, "Songti SC", "SimSun", serif' },
  { name: '现代无衬线', value: 'Inter, "Helvetica Neue", Arial, sans-serif' },
  { name: '等宽字体', value: '"SF Mono", Consolas, "Liberation Mono", monospace' },
];

/** 主题转 CSS 变量对象 */
export function themeToCssVars(theme?: Partial<SiteTheme>): Record<string, string> {
  const t = { ...DEFAULT_THEME, ...theme };
  const vars: Record<string, string> = {
    '--sb-primary': t.primary,
    '--sb-accent': t.accent,
    '--sb-bg': t.background,
    '--sb-text': t.text,
    '--sb-muted': t.muted,
    '--sb-radius': `${t.radius}px`,
    '--sb-font': t.fontFamily ?? DEFAULT_THEME.fontFamily!,
    '--sb-font-size': `${t.fontSize ?? DEFAULT_THEME.fontSize}px`,
    '--sb-line-height': String(t.lineHeight ?? DEFAULT_THEME.lineHeight),
    '--sb-heading-weight': String(t.headingWeight ?? DEFAULT_THEME.headingWeight),
  };
  for (const token of t.colors ?? []) {
    if (token.name && token.value) vars[`--sb-c-${token.name}`] = token.value;
  }
  return vars;
}

/** 一个页面的完整描述 */
export interface PageSchema {
  /** DSL 版本，用于迁移与向后兼容 */
  version: number;
  meta: {
    title: string;
    description?: string;
  };
  /** 站点主题（可选，缺省使用 DEFAULT_THEME，保证老数据兼容） */
  theme?: SiteTheme;
  /** 根节点为容器组件 */
  root: DslNode;
}

/** 生成一个页面骨架 */
export function createEmptyPage(title = '未命名页面'): PageSchema {
  return {
    version: CURRENT_SCHEMA_VERSION,
    meta: { title },
    theme: { ...DEFAULT_THEME },
    root: {
      id: 'root',
      type: 'container',
      props: { gap: 12, background: '#ffffff' },
      children: [],
    },
  };
}

/** 递归查找节点 */
export function findNode(root: DslNode, id: string): DslNode | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

/** 递归更新节点（不可变） */
export function updateNode(root: DslNode, id: string, patch: Partial<DslNode>): DslNode {
  if (root.id === id) return { ...root, ...patch };
  if (!root.children) return root;
  return {
    ...root,
    children: root.children.map((child) => updateNode(child, id, patch)),
  };
}

/** 递归删除节点（不可变） */
export function removeNode(root: DslNode, id: string): DslNode {
  if (!root.children) return root;
  return {
    ...root,
    children: root.children
      .filter((child) => child.id !== id)
      .map((child) => removeNode(child, id)),
  };
}

/** 在指定父节点下插入子节点；parentId 为空则插入根节点 */
export function insertNode(root: DslNode, parentId: string, node: DslNode, index?: number): DslNode {
  if (root.id === parentId) {
    const children = [...(root.children ?? [])];
    const at = index ?? children.length;
    children.splice(at, 0, node);
    return { ...root, children };
  }
  if (!root.children) return root;
  return {
    ...root,
    children: root.children.map((child) => insertNode(child, parentId, node, index)),
  };
}

/** 移动节点：从原位置移除后插入到目标容器的指定位置 */
export function moveNode(
  root: DslNode,
  nodeId: string,
  targetParentId: string,
  index: number,
): DslNode {
  const node = findNode(root, nodeId);
  if (!node || node.id === 'root') return root;
  const withoutNode = removeNode(root, nodeId);
  return insertNode(withoutNode, targetParentId, node, index);
}
