import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantQueryService } from '../../database/tenant-query.service';
import { TenantContext } from '../../common/tenant/tenant-context';
import { Template } from './template.entity';

@Injectable()
export class TemplateService {
  constructor(private readonly tenantQuery: TenantQueryService) {}

  /**
   * 列出模板：全局模板 + 本租户模板。
   * RLS 策略已自动过滤，这里再用 is_global OR tenant_id 显式说明意图。
   */
  async findAll(): Promise<Template[]> {
    return this.tenantQuery.run((m) =>
      m.getRepository(Template)
        .createQueryBuilder('t')
        .where('t.is_global = true OR t.tenant_id = :tenantId', {
          tenantId: TenantContext.getTenantId() ?? '',
        })
        .orderBy('t.created_at', 'DESC')
        .getMany(),
    );
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.tenantQuery.run((m) =>
      m.getRepository(Template).findOne({ where: { id } }),
    );
    if (!template) throw new NotFoundException('模板不存在');
    return template;
  }

  /** 从当前站点 DSL 另存为租户自己的模板 */
  async create(data: {
    name: string;
    category?: string;
    description?: string;
    cover?: string;
    schema: Record<string, unknown>;
  }): Promise<Template> {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new NotFoundException('缺少租户上下文');
    return this.tenantQuery.run((m) =>
      m.getRepository(Template).save(
        m.getRepository(Template).create({ ...data, tenantId, isGlobal: false }),
      ),
    );
  }

  /** 超管创建全局模板 */
  async createGlobal(data: Partial<Template>): Promise<Template> {
    return this.tenantQuery.run((m) =>
      m.getRepository(Template).save(
        m.getRepository(Template).create({ ...data, tenantId: null, isGlobal: true }),
      ),
    );
  }
}
