import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { TenantContext } from '../common/tenant/tenant-context';

/**
 * 租户感知的查询执行器
 * ------------------------------------------------------------------
 * 每个数据库操作都在独立事务的 QueryRunner 上执行，并在事务内用
 * SET LOCAL 设置 RLS 会话变量。SET LOCAL 只在该连接/事务内生效，
 * 因此即使使用连接池，也能保证 RLS 作用于正确的租户。
 *
 * 这是"应用层 + 数据库层双重隔离"中数据库层的落地实现。
 */
@Injectable()
export class TenantQueryService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async run<T>(fn: (manager: QueryRunner['manager']) => Promise<T>): Promise<T> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const ctx = TenantContext.get();
      const tenantId = ctx?.tenantId ?? '';
      const superAdmin = ctx?.isSuperAdmin ? 'on' : 'off';
      await qr.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
      await qr.query(`SELECT set_config('app.is_super_admin', $1, true)`, [superAdmin]);
      const result = await fn(qr.manager);
      await qr.commitTransaction();
      return result;
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  /**
   * 跨租户查询（仅用于认证、超管等合法场景）。
   * 显式设置 app.is_super_admin=on 以通过 RLS —— 调用方必须自行鉴权。
   */
  async runUnscoped<T>(fn: (manager: QueryRunner['manager']) => Promise<T>): Promise<T> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await qr.query(`SELECT set_config('app.is_super_admin', 'on', true)`);
      const result = await fn(qr.manager);
      await qr.commitTransaction();
      return result;
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}
