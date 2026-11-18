import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantQueryService } from '../../database/tenant-query.service';
import { Site } from '../site/site.entity';
import { Page } from '../operations/entities';

@Injectable()
export class RenderService {
  constructor(private readonly tenantQuery: TenantQueryService) {}

  /**
   * 公开访问：按 租户slug + 站点slug 取已发布快照。
   * ----------------------------------------------------------------
   * 访客没有租户身份，无法走 RLS 上下文，因此用 runUnscoped 绕过 RLS，
   * 但用「租户 slug + 站点 slug + status=published」三重条件精确限定，
   * 只返回 published_schema，草稿绝不外泄。生产环境可加 CDN 缓存/静态化。
   */
  async getPublished(tenantSlug: string, siteSlug: string) {
    const site = await this.tenantQuery.runUnscoped((m) =>
      m.getRepository(Site)
        .createQueryBuilder('s')
        .select([
          's.id', 's.name', 's.slug', 's.publishedSchema', 's.updatedAt',
          's.disabled', 's.disabledReason', 's.expiresAt',
        ])
        .innerJoin('tenants', 't', 't.id = s.tenant_id')
        .addSelect('t.id', 'tenantId')
        .addSelect('t.name', 'tenantName')
        .addSelect('t.slug', 'tenantSlugValue')
        .where('t.slug = :tenantSlug', { tenantSlug })
        .andWhere('s.slug = :siteSlug', { siteSlug })
        .getRawOne(),
    );

    if (!site) {
      throw new NotFoundException('站点不存在');
    }

    // 禁用 / 过期：返回 blocked 标记，让前端渲染统一提示页（而非 404）
    const expired = Boolean(site.s_expires_at && new Date(site.s_expires_at).getTime() < Date.now());
    const blocked = Boolean(site.s_disabled) || expired;
    if (blocked) {
      return {
        id: site.s_id,
        tenant: site.tenantName,
        tenantSlug: site.tenantSlugValue,
        name: site.s_name,
        slug: site.s_slug,
        blocked: true,
        blockReason: site.s_disabled
          ? (site.s_disabled_reason || '该站点已被管理员禁用')
          : '该站点已超过有效期，请联系站点管理员续期',
        schema: site.s_published_schema,
      };
    }

    if (!site.s_published_schema) {
      throw new NotFoundException('站点尚未发布');
    }

    return {
      id: site.s_id,
      tenant: site.tenantName,
      tenantSlug: site.tenantSlugValue,
      name: site.s_name,
      slug: site.s_slug,
      version: site.s_updated_at,
      schema: site.s_published_schema,
    };
  }

  /**
   * 公开访问子页面：租户 + 站点 + 页面 slug。
   * 页面的 published_schema 独立于站点首页，让「页面管理」真正对公开站点生效。
   */
  async getPublishedPage(tenantSlug: string, siteSlug: string, pageSlug: string) {
    const row = await this.tenantQuery.runUnscoped((m) =>
      m.getRepository(Page)
        .createQueryBuilder('p')
        .select(['p.name', 'p.slug', 'p.publishedSchema', 'p.updatedAt'])
        .innerJoin('sites', 's', 's.id = p.site_id')
        .innerJoin('tenants', 't', 't.id = s.tenant_id')
        .addSelect('s.name', 'siteName')
        .addSelect('s.disabled', 'siteDisabled')
        .addSelect('s.disabled_reason', 'siteDisabledReason')
        .addSelect('s.expires_at', 'siteExpiresAt')
        .addSelect('t.name', 'tenantName')
        .addSelect('t.slug', 'tenantSlugValue')
        .where('t.slug = :tenantSlug', { tenantSlug })
        .andWhere('s.slug = :siteSlug', { siteSlug })
        .andWhere('p.slug = :pageSlug', { pageSlug })
        .andWhere('p.status = :status', { status: 'published' })
        .getRawOne(),
    );

    if (!row) {
      throw new NotFoundException('页面不存在或尚未发布');
    }
    const expired = Boolean(row.site_expires_at && new Date(row.site_expires_at).getTime() < Date.now());
    if (row.site_disabled || expired) {
      return {
        tenant: row.tenantName,
        tenantSlug: row.tenantSlugValue,
        name: row.p_name,
        slug: row.p_slug,
        siteSlug,
        blocked: true,
        blockReason: row.site_disabled
          ? (row.site_disabled_reason || '该站点已被管理员禁用')
          : '该站点已超过有效期，请联系站点管理员续期',
        schema: row.p_published_schema,
      };
    }

    if (!row.p_published_schema) {
      throw new NotFoundException('页面尚未发布');
    }

    return {
      tenant: row.tenantName,
      name: row.p_name,
      slug: row.p_slug,
      siteSlug,
      version: row.p_updated_at,
      schema: row.p_published_schema,
    };
  }

  /** 泛域名用：按租户 slug 找到其默认（最新发布）站点的 slug */
  async resolveDefaultSite(tenantSlug: string): Promise<{ siteSlug: string } | null> {
    const row = await this.tenantQuery.runUnscoped((m) =>
      m.getRepository(Site)
        .createQueryBuilder('s')
        .select('s.slug', 'siteSlug')
        .innerJoin('tenants', 't', 't.id = s.tenant_id')
        .where('t.slug = :tenantSlug', { tenantSlug })
        .andWhere('s.status = :status', { status: 'published' })
        .orderBy('s.published_at', 'DESC')
        .limit(1)
        .getRawOne(),
    );
    return row ? { siteSlug: row.siteSlug } : null;
  }
}
