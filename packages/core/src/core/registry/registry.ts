/**
 * 全局组件注册表
 * ------------------------------------------------------------------
 * 单例注册表，所有组件在应用启动时注册。
 * 装修器、渲染器、属性面板都从这里读取能力，彼此解耦。
 */

import type { BlockDefinition } from './types';

class BlockRegistry {
  private blocks = new Map<string, BlockDefinition>();

  register(block: BlockDefinition): this {
    if (this.blocks.has(block.type)) {
      console.warn(`[registry] 组件 type "${block.type}" 已存在，将被覆盖`);
    }
    this.blocks.set(block.type, block);
    return this;
  }

  get(type: string): BlockDefinition | undefined {
    return this.blocks.get(type);
  }

  has(type: string): boolean {
    return this.blocks.has(type);
  }

  /** 按分类分组，供左侧组件面板渲染 */
  listByCategory(): Record<string, BlockDefinition[]> {
    const result: Record<string, BlockDefinition[]> = {};
    for (const block of this.blocks.values()) {
      (result[block.category] ??= []).push(block);
    }
    return result;
  }

  all(): BlockDefinition[] {
    return [...this.blocks.values()];
  }
}

export const registry = new BlockRegistry();
