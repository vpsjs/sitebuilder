import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantQueryService } from '../../database/tenant-query.service';
import { TenantContext } from '../../common/tenant/tenant-context';
import { Tenant } from './tenant.entity';

@Injectable()
export class TenantService {
  constructor(private readonly tenantQuery: TenantQueryService) {}

  /** 超管：列出所有租户 */
  async findAll(): Promise<Tenant[]> {
    if (!TenantContext.isSuperAdmin()) throw new NotFoundException('仅超管可查看租户列表');
    return this.tenantQuery.runUnscoped((m) => m.getRepository(Tenant).find());
  }

  /** 当前租户信息 */
  async findMine(): Promise<Tenant | null> {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) return null;
    return this.tenantQuery.runUnscoped((m) =>
      m.getRepository(Tenant).findOne({ where: { id: tenantId } }),
    );
  }
}
