import { EventEmitter } from 'node:events';

/**
 * 后端事件总线
 * ------------------------------------------------------------------
 * 与前端 eventBus 对应，供插件/后续模块订阅（如发布后触发静态化、通知）。
 * 真实多实例部署时替换为 Redis Pub/Sub 或消息队列即可，接口不变。
 */
export const eventBus = new EventEmitter();
eventBus.setMaxListeners(50);
