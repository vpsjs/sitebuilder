/**
 * 轻量事件总线
 * ------------------------------------------------------------------
 * 插件之间、插件与宿主之间不直接互相调用，通过事件解耦。
 * 这样插件可独立启停，一个插件崩溃不会拖垮其他功能。
 */

type Handler = (payload?: unknown) => void;

class EventBus {
  private listeners = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(handler);
    this.listeners.set(event, set);
    return () => set.delete(handler);
  }

  emit(event: string, payload?: unknown): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[eventBus] 处理事件 "${event}" 出错`, err);
      }
    });
  }

  clear(event?: string): void {
    if (event) this.listeners.delete(event);
    else this.listeners.clear();
  }
}

export const eventBus = new EventBus();

/** 内置事件名常量，避免拼写错误 */
export const Events = {
  NODE_SELECTED: 'node:selected',
  PAGE_CHANGED: 'page:changed',
  PLUGIN_ENABLED: 'plugin:enabled',
  SITE_PUBLISHED: 'site:published',
} as const;
