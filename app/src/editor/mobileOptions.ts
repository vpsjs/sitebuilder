/** 移动端预览选项（编辑器本地配置，不写入 DSL） */

export type BottomIcon = 'home' | 'grid' | 'cart' | 'user' | 'search' | 'heart' | 'message' | 'menu' | 'package';

export interface BottomNavItem {
  label: string;
  icon: BottomIcon;
  /** 是否展开分类面板（仅预览交互） */
  category?: boolean;
}

export interface MobileOptions {
  category: boolean;
  bottomBar: boolean;
  bottomItems: BottomNavItem[];
}

export const DEFAULT_MOBILE_OPTIONS: MobileOptions = {
  category: true,
  bottomBar: true,
  bottomItems: [
    { label: '首页', icon: 'home' },
    { label: '分类', icon: 'grid', category: true },
    { label: '产品', icon: 'package' },
    { label: '购物车', icon: 'cart' },
    { label: '我的', icon: 'user' },
  ],
};

export const BOTTOM_ICONS: { value: BottomIcon; label: string }[] = [
  { value: 'home', label: '首页' },
  { value: 'grid', label: '分类' },
  { value: 'cart', label: '购物车' },
  { value: 'user', label: '我的' },
  { value: 'search', label: '搜索' },
  { value: 'heart', label: '收藏' },
  { value: 'message', label: '消息' },
  { value: 'menu', label: '菜单' },
  { value: 'package', label: '产品' },
];
