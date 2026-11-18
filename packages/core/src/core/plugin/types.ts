/**
 * 插件协议
 * ------------------------------------------------------------------
 * 插件 = 声明 + 生命周期钩子 + 可选组件 + 可选事件处理。
 * 加一个功能 = 写一个插件文件 + pluginManager.register() 一行注册。
 * 后续接入 Module Federation 远程加载时，插件包实现此接口即可，
 * 主程序无需改动。
 */

import type { ReactNode } from 'react';
import type { BlockDefinition } from '../registry/types';

export interface PluginContext {
  /** 注册组件能力 */
  registerBlock: (block: BlockDefinition) => void;
  /** 订阅事件 */
  on: (event: string, handler: (payload?: unknown) => void) => () => void;
  /** 发出事件 */
  emit: (event: string, payload?: unknown) => void;
  /** 读取/写入插件配置 */
  getConfig: <T>(key: string, fallback: T) => T;
  setConfig: (key: string, value: unknown) => void;
}

export interface SitePlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  /** 插件提供的组件（安装时注册到注册表） */
  blocks?: BlockDefinition[];
  /** 插件提供的设置面板（可选，后端对应独立 Module） */
  settingsPanel?: (ctx: PluginContext) => ReactNode;
  /** 安装时执行一次（注册组件、初始化） */
  install?: (ctx: PluginContext) => void;
  /** 启用时执行 */
  onEnable?: (ctx: PluginContext) => void;
  /** 禁用时执行 */
  onDisable?: (ctx: PluginContext) => void;
}
