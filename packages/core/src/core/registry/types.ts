/**
 * 组件注册表协议
 * ------------------------------------------------------------------
 * 每个装修组件 = 一个 BlockDefinition：
 *   - 元数据（type / name / icon / category）
 *   - 默认属性 defaultProps
 *   - 属性面板描述 propertySchema（驱动右侧配置面板自动渲染）
 *   - 画布渲染器 render
 *   - 站点渲染器 siteRender（可复用 render，也可单独定制）
 *
 * 新增一个组件 = 写一个文件 + registry.register() 一行注册，
 * 无需改动装修器、渲染器、属性面板的任何代码。
 */

import type { ComponentType } from 'react';
import type { DslNode } from '../dsl/types';

export type BlockCategory = '基础' | '布局' | '营销' | '表单' | '内容' | '互动' | '高级';

/** 属性字段类型，属性面板据此自动渲染控件 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'color'
  | 'select'
  | 'switch'
  | 'image'
  /** 图标列表：每条可上传图片/填符号+标题+描述，值为 JSON 数组，兼容旧的「标题|描述」文本 */
  | 'icon-list';

export interface PropertyField {
  key: string;
  label: string;
  type: FieldType;
  /** select 的选项 */
  options?: { label: string; value: string }[];
  /** number 的范围 */
  min?: number;
  max?: number;
  step?: number;
  /** textarea 行数 */
  rows?: number;
  placeholder?: string;
}

export interface BlockRenderProps {
  node: DslNode;
  /** 是否处于装修态（可在画布中显示占位/边框） */
  editing: boolean;
  /** 渲染子节点（容器组件使用） */
  renderChildren?: () => React.ReactNode;
}

export interface BlockDefinition {
  type: string;
  name: string;
  /** lucide 图标名（在图标映射表中查找） */
  icon: string;
  category: BlockCategory;
  /** 是否为容器（可拖入子节点） */
  container?: boolean;
  defaultProps: Record<string, unknown>;
  /** 驱动属性面板自动生成 */
  propertySchema: PropertyField[];
  /** 画布渲染器 */
  render: ComponentType<BlockRenderProps>;
  /** 站点渲染器，缺省时复用 render */
  siteRender?: ComponentType<BlockRenderProps>;
}
