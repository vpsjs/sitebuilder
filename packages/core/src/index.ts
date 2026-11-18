/**
 * @sitebuilder/core —— 装修器与站点渲染器共享的同构核心
 * ------------------------------------------------------------------
 * 包含 DSL 类型、组件注册表、渲染器、内置组件、插件、模板。
 * 服务端（Next.js）与浏览器（Vite 装修器）消费同一份代码，
 * 新增一个组件只改这里一处，两端同时生效。
 */

// 核心协议与运行时
export * from './core';

// 内置组件
export * from './blocks/basic';
export * from './blocks/container';
export * from './blocks/commerce';
export * from './blocks/layout';
export * from './blocks/display';
export * from './blocks/content';

// 插件
export * from './plugins/analytics';

// 模板
export * from './templates';

// 启动引导
export * from './bootstrap';
