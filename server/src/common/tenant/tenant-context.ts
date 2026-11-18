import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContextData {
  tenantId: string | null;
  userId: string;
  role: string;
  isSuperAdmin: boolean;
}

/**
 * 租户上下文：基于 AsyncLocalStorage 在每个请求内隔离 storing 租户身份。
 * 业务层通过 TenantContext.get() 读取，无需在方法间层层传参。
 * 配合 RLS 中间件，形成「应用层 + 数据库层」双重隔离。
 */
export class TenantContext {
  private static storage = new AsyncLocalStorage<TenantContextData>();

  static run<T>(data: TenantContextData, callback: () => T): T {
    return this.storage.run(data, callback);
  }

  static get(): TenantContextData | undefined {
    return this.storage.getStore();
  }

  static getTenantId(): string | null {
    return this.storage.getStore()?.tenantId ?? null;
  }

  static getUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }

  static isSuperAdmin(): boolean {
    return this.storage.getStore()?.isSuperAdmin ?? false;
  }
}
