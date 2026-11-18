import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantQueryService } from '../../database/tenant-query.service';
import { TenantContext } from '../../common/tenant/tenant-context';
import { Site } from './site.entity';
import { CreateSiteDto, SaveDraftDto } from './dto/site.dto';

@Injectable()
export class SiteService {
  constructor(private readonly tenantQuery: TenantQueryService) {}

  async findAll(): Promise<Site[]> {
    return this.tenantQuery.run((m) =>
      m.getRepository(Site).find({ order: { updatedAt: 'DESC' } }),
    );
  }

  /**
   * 按 id 查询。RLS 保证跨租户查询返回空 —— 这就是用户端隔离的兜底。
   */
  async findOne(id: string): Promise<Site> {
    const site = await this.tenantQuery.run((m) =>
      m.getRepository(Site).findOne({ where: { id } }),
    );
    if (!site) throw new NotFoundException('站点不存在或无权访问');
    return site;
  }

  async create(dto: CreateSiteDto): Promise<Site> {
    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new NotFoundException('缺少租户上下文');

    return this.tenantQuery.run(async (m) => {
      const repo = m.getRepository(Site);
      const dup = await repo.findOne({ where: { slug: dto.slug } });
      if (dup) throw new ConflictException('该站点标识已存在');
      return repo.save(
        repo.create({
          tenantId,
          name: dto.name,
          slug: dto.slug,
          draftSchema: dto.draftSchema ?? null,
          status: 'draft',
        }),
      );
    });
  }

  async saveDraft(id: string, dto: SaveDraftDto): Promise<Site> {
    const site = await this.findOne(id);
    return this.tenantQuery.run((m) =>
      m.getRepository(Site).save({
        ...site,
        draftSchema: dto.schema,
        status: 'draft',
      }),
    );
  }

  /** 删除站点：级联清理发布记录与 pages（数据库外键 ON DELETE CASCADE） */
  async remove(id: string): Promise<{ deleted: true; id: string }> {
    await this.findOne(id);
    await this.tenantQuery.run((m) => m.getRepository(Site).delete({ id }));
    return { deleted: true, id };
  }
}
