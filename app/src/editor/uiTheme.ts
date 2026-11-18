/**
 * 编辑器外壳 UI 主题（与用户站点主题相互独立）
 * ------------------------------------------------------------------
 * 编辑器是通用 DIY 工具，不应绑定某套品牌配色。这里提供：
 *  - 亮 / 暗两种外壳模式（localStorage 持久化）
 *  - 可切换的工具强调色
 * 所有色值通过 --ui-* CSS 变量供外壳组件引用。
 */

export const UI_ACCENTS = [
  { name: '石墨', value: '#27272A' },
  { name: '靛蓝', value: '#4F46E5' },
  { name: '天青', value: '#0284C7' },
  { name: '青绿', value: '#0D9488' },
  { name: '朱砂', value: '#DC2626' },
  { name: '紫罗兰', value: '#7C3AED' },
] as const;

const KEY_DARK = 'sb_ui_dark';
const KEY_ACCENT = 'sb_ui_accent';

export function loadUiTheme(): { dark: boolean; accent: string } {
  const dark = typeof localStorage !== 'undefined' && localStorage.getItem(KEY_DARK) === '1';
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY_ACCENT) : null;
  const accent = UI_ACCENTS.some((a) => a.value === stored) ? stored! : UI_ACCENTS[0].value;
  return { dark, accent };
}

export function saveUiTheme(next: { dark?: boolean; accent?: string }): void {
  if (typeof localStorage === 'undefined') return;
  if (next.dark !== undefined) localStorage.setItem(KEY_DARK, next.dark ? '1' : '0');
  if (next.accent !== undefined) localStorage.setItem(KEY_ACCENT, next.accent);
}
