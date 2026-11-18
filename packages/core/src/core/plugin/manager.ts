/**
 * 插件管理器
 * ------------------------------------------------------------------
 * 管理插件的安装、启用、禁用。通过 PluginContext 向插件暴露受控能力，
 * 插件不直接依赖宿主内部实现。
 */

import { registry } from '../registry/registry';
import { eventBus, Events } from './eventBus';
import type { PluginContext, SitePlugin } from './types';

class PluginManager {
  private plugins = new Map<string, SitePlugin>();
  private configs = new Map<string, unknown>();

  private createContext(plugin: SitePlugin): PluginContext {
    const prefix = `plugin:${plugin.id}`;
    return {
      registerBlock: (block) => registry.register(block),
      on: (event, handler) => eventBus.on(`${prefix}:${event}`, handler),
      emit: (event, payload) => eventBus.emit(`${prefix}:${event}`, payload),
      getConfig: <T,>(key: string, fallback: T): T =>
        (this.configs.get(`${prefix}:${key}`) as T) ?? fallback,
      setConfig: (key, value) => this.configs.set(`${prefix}:${key}`, value),
    };
  }

  register(plugin: SitePlugin): this {
    this.plugins.set(plugin.id, plugin);
    const ctx = this.createContext(plugin);
    plugin.install?.(ctx);
    plugin.blocks?.forEach((block) => registry.register(block));
    if (plugin.enabled) plugin.onEnable?.(ctx);
    return this;
  }

  enable(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin || plugin.enabled) return false;
    plugin.enabled = true;
    plugin.onEnable?.(this.createContext(plugin));
    eventBus.emit(Events.PLUGIN_ENABLED, { id });
    return true;
  }

  disable(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin || !plugin.enabled) return false;
    plugin.enabled = false;
    plugin.onDisable?.(this.createContext(plugin));
    return true;
  }

  list(): SitePlugin[] {
    return [...this.plugins.values()];
  }

  get(id: string): SitePlugin | undefined {
    return this.plugins.get(id);
  }
}

export const pluginManager = new PluginManager();
