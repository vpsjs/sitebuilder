import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantQueryService } from '../../database/tenant-query.service';
import { TenantContext } from '../../common/tenant/tenant-context';
import { GlobalBlock } from './global-block.entity';
import { CreateGlobalBlockDto, UpdateGlobalBlockDto } from './dto/global-block.dto';

@Injectable()
export class GlobalBlockService {
  constructor(private readonly tenantQuery: TenantQueryService) {}

  /** 全局组件 + 本租户组件 */
  async findAll(): Promise<GlobalBlock[]> {
    return this.tenantQuery.run((m) =>
      m.getRepository(GlobalBlock)
        .createQueryBuilder('b')
        .where('b.is_global = true OR b.tenant_id = :tenantId', {
          tenantId: TenantContext.getTenantId() ?? '',
        })
        .orderBy('b.created_at', 'DESC')
        .getMany(),
    );
  }

  async findOne(id: string): Promise<GlobalBlock> {
    const block = await this.tenantQuery.run((m) =>
      m.getRepository(GlobalBlock).findOne({ where: { id } }),
    );
    if (!block) throw new NotFoundException('全局组件不存在');
    return block;
  }

  /** 公开站按 id 展开引用：绕过租户 RLS，公开站服务端无租户上下文 */
  async findPublic(id: string): Promise<GlobalBlock | null> {
    return this.tenantQuery.runUnscoped((m) =>
      m.getRepository(GlobalBlock).findOne({ where: { id } }),
    );
  }

  async create(dto: CreateGlobalBlockDto): Promise<GlobalBlock> {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new NotFoundException('缺少租户上下文');
    const isGlobal = Boolean(dto.isGlobal);
    return this.tenantQuery.run((m) =>
      m.getRepository(GlobalBlock).save(
        m.getRepository(GlobalBlock).create({
          ...dto,
          tenantId: isGlobal ? null : tenantId,
          isGlobal,
        }),
      ),
    );
  }

  async update(id: string, dto: UpdateGlobalBlockDto): Promise<GlobalBlock> {
    const block = await this.findOne(id);
    Object.assign(block, dto);
    return this.tenantQuery.run((m) => m.getRepository(GlobalBlock).save(block));
  }

  async remove(id: string): Promise<void> {
    const block = await this.findOne(id);
    await this.tenantQuery.run((m) => m.getRepository(GlobalBlock).remove(block));
  }
}
