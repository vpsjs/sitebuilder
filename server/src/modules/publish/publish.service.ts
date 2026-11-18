import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantQueryService } from '../../database/tenant-query.service';
import { TenantContext } from '../../common/tenant/tenant-context';
import { eventBus } from '../../common/events';
import { Site } from '../site/site.entity';
import { Tenant } from '../tenant/tenant.entity';
import { PublishRecord } from './publish-record.entity';
import { RevalidateService } from './revalidate.service';
import { StaticExportService } from './static-export.service';
import { OperationsService } from '../operations/operations.service';

@Injectable()
export class PublishService {
  constructor(
    private readonly tenantQuery: TenantQueryService,
    private readonly revalidate: RevalidateService,
    private readonly staticExport: StaticExportService,
    private readonly ops: OperationsService,
  ) {}

  /**
   * 发布站点：把草稿 DSL 固化为已发布快照，并追加一条版本记录。
   * 全部在单个事务中完成，保证快照与记录一致。
   * 事务提交后通知渲染器失效 ISR 缓存 —— 发布即生效，无需等 60 秒。
   */
  async publish(siteId: string, note?: string) {
    const result = await this.tenantQuery.run(async (m) => {
      const siteRepo = m.getRepository(Site);
      const recordRepo = m.getRepository(PublishRecord);
      const tenantRepo = m.getRepository(Tenant);

      const site = await siteRepo.findOne({ where: { id: siteId } });
      if (!site) throw new BadRequestException('站点不存在或无权访问');
      if (!site.draftSchema) throw new BadRequestException('草稿为空，无法发布');

      const tenant = await tenantRepo.findOne({ where: { id: site.tenantId } });

      const last = await recordRepo.findOne({
        where: { siteId },
        order: { version: 'DESC' },
      });
      const nextVersion = (last?.version ?? 0) + 1;

      site.publishedSchema = site.draftSchema;
      site.publishedAt = new Date();
      site.status = 'published';
      await siteRepo.save(site);

      const record = await recordRepo.save(
        recordRepo.create({
          tenantId: TenantContext.getTenantId(),
          siteId,
          version: nextVersion,
          schema: site.draftSchema,
          note: note ?? '',
        }),
      );

      // 仅保留最新 N 个版本，避免历史无限增长
      await this.pruneHistory(m, siteId);

      eventBus.emit('site:published', { siteId, version: nextVersion });
      return {
        siteId,
        version: nextVersion,
        publishedAt: site.publishedAt,
        schema: site.publishedSchema,
        // 供事务提交后失效缓存
        _tenantSlug: tenant?.slug ?? '',
        _siteSlug: site.slug,
      };
    });

    // 事务已提交，再通知渲染器（失败不影响发布结果）
    let staticUrl: string | null = null;
    if (result._tenantSlug) {
      await this.revalidate.revalidateSite(result._tenantSlug, result._siteSlug);
      // 预渲染静态 HTML 并上传到对象存储/CDN
      staticUrl = await this.staticExport.exportAndUpload(result._tenantSlug, result._siteSlug);
    }
    await this.ops.log('site:published', 'site', siteId, { version: result.version });

    const { _tenantSlug, _siteSlug, ...payload } = result;
    void _tenantSlug; void _siteSlug;
    return { ...payload, staticUrl };
  }

  async history(siteId: string): Promise<PublishRecord[]> {
    return this.tenantQuery.run((m) =>
      m.getRepository(PublishRecord).find({
        where: { siteId },
        order: { version: 'DESC' },
      }),
    );
  }

  /**
   * 裁剪发布历史：仅保留最新 KEEP_VERSIONS 个版本（按 version 倒序）。
   * 传入事务 manager，保证与发布/回滚在同一事务内完成。
   */
  private async pruneHistory(
    m: Parameters<Parameters<typeof this.tenantQuery.run>[0]>[0],
    siteId: string,
    keep = PublishService.KEEP_VERSIONS,
  ): Promise<number> {
    const deleted = await m.query(
      `DELETE FROM publish_records
       WHERE id IN (
         SELECT id FROM (
           SELECT id, ROW_NUMBER() OVER (ORDER BY version DESC) AS rn
           FROM publish_records
           WHERE site_id = $1
         ) ranked
         WHERE rn > $2
       )`,
      [siteId, keep],
    );
    return deleted?.length ?? 0;
  }

  /** 每个站点最多保留的发布历史版本数 */
  static readonly KEEP_VERSIONS = 3;

  /** 回滚：找到历史版本快照，写回站点已发布状态并触发缓存失效/静态化 */
  async rollback(siteId: string, version: number) {
    const result = await this.tenantQuery.run(async (m) => {
      const recordRepo = m.getRepository(PublishRecord);
      const siteRepo = m.getRepository(Site);
      const tenantRepo = m.getRepository(Tenant);

      const record = await recordRepo.findOne({ where: { siteId, version } });
      if (!record) throw new BadRequestException(`版本 v${version} 不存在`);

      const site = await siteRepo.findOne({ where: { id: siteId } });
      if (!site) throw new BadRequestException('站点不存在');

      const tenant = await tenantRepo.findOne({ where: { id: site.tenantId } });
      site.publishedSchema = record.schema;
      site.publishedAt = new Date();
      site.status = 'published';
      await siteRepo.save(site);

      // 追加一条「回滚」记录，保证历史可追溯
      const last = await recordRepo.findOne({ where: { siteId }, order: { version: 'DESC' } });
      await recordRepo.save(recordRepo.create({
        tenantId: TenantContext.getTenantId(),
        siteId,
        version: (last?.version ?? 0) + 1,
        schema: record.schema,
        note: `回滚至 v${version}`,
      }));

      // 回滚也会追加版本记录，同样裁剪到最新 N 个
      await this.pruneHistory(m, siteId);

      eventBus.emit('site:published', { siteId, rolledBackTo: version });
      return { siteId, rolledBackTo: version, schema: record.schema,
        _tenantSlug: tenant?.slug ?? '', _siteSlug: site.slug };
    });

    if (result._tenantSlug) {
      await this.revalidate.revalidateSite(result._tenantSlug, result._siteSlug);
      await this.staticExport.exportAndUpload(result._tenantSlug, result._siteSlug);
    }
    await this.ops.log('site:rollback', 'site', siteId, { toVersion: version });
    const { _tenantSlug, _siteSlug, ...payload } = result;
    void _tenantSlug; void _siteSlug;
    return payload;
  }

  /** 草稿预览数据（发布前验收） */
  async getDraftPreview(siteId: string) {
    return this.tenantQuery.run(async (m) => {
      const site = await m.getRepository(Site).findOne({ where: { id: siteId } });
      if (!site) throw new BadRequestException('站点不存在');
      return {
        siteId,
        name: site.name,
        slug: site.slug,
        schema: site.draftSchema,
        // 装修器内的「预览模式」即草稿预览（未发布内容不影响公开站点）
        previewUrl: `http://localhost:5173?preview=${site.slug}`,
        updatedAt: site.updatedAt,
      };
    });
  }
}
