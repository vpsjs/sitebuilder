import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { promises as dns } from 'node:dns';
import { TenantQueryService } from '../../database/tenant-query.service';
import { SslService } from './ssl.service';
import { TenantContext } from '../../common/tenant/tenant-context';
import { eventBus } from '../../common/events';
import { RevalidateService } from '../publish/revalidate.service';
import { Page, Domain, FormSubmission, AuditLog, AnalyticsEvent, PluginInstall } from './entities';
import { Site } from '../site/site.entity';

@Injectable()
export class OperationsService {
  constructor(
    private readonly db: TenantQueryService,
    private readonly revalidate: RevalidateService,
    private readonly ssl: SslService,
  ) {}

  // ---------- 多页面 ----------
  async listPages(siteId?: string): Promise<Page[]> {
    return this.db.run((m) =>
      m.getRepository(Page).find({
        where: siteId ? { siteId } : {},
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      }),
    );
  }

  async getPage(id: string): Promise<Page> {
    const page = await this.db.run((m) => m.getRepository(Page).findOne({ where: { id } }));
    if (!page) throw new NotFoundException('页面不存在');
    return page;
  }

  async createPage(data: { siteId: string; name: string; slug: string; schema?: Record<string, unknown> }): Promise<Page> {
    return this.db.run(async (m) => {
      const repo = m.getRepository(Page);
      const dup = await repo.findOne({ where: { siteId: data.siteId, slug: data.slug } });
      if (dup) throw new BadRequestException('该页面标识已存在');
      const count = await repo.count({ where: { siteId: data.siteId } });
      return repo.save(repo.create({
        tenantId: TenantContext.getTenantId(),
        siteId: data.siteId,
        name: data.name,
        slug: data.slug,
        isHome: count === 0,
        sortOrder: count,
        draftSchema: data.schema ?? { version: 1, meta: { title: data.name }, root: { id: 'root', type: 'container', props: {}, children: [] } },
        status: 'draft',
      }));
    });
  }

  async savePageDraft(id: string, schema: Record<string, unknown>): Promise<Page> {
    const page = await this.getPage(id);
    return this.db.run((m) => m.getRepository(Page).save({ ...page, draftSchema: schema }));
  }

  async publishPage(id: string, note?: string): Promise<Page> {
    const page = await this.getPage(id);
    if (!page.draftSchema) throw new BadRequestException('草稿为空');
    const updated = await this.db.run((m) => m.getRepository(Page).save({
      ...page,
      publishedSchema: page.draftSchema,
      publishedAt: new Date(),
      status: 'published',
    }));
    eventBus.emit('site:published', { pageId: id, note });

    // 事务提交后失效公开站点的 ISR 缓存，让子页面发布即时生效
    const info = await this.db.runUnscoped((m) =>
      m.query(
        `SELECT t.slug AS "tenantSlug", s.slug AS "siteSlug"
         FROM sites s JOIN tenants t ON t.id = s.tenant_id
         WHERE s.id = $1`,
        [page.siteId],
      ),
    );
    const slugs = info?.[0];
    if (slugs?.tenantSlug && slugs?.siteSlug) {
      await this.revalidate.revalidateSite(slugs.tenantSlug, slugs.siteSlug);
    }
    await this.log('page:published', 'page', id, { name: page.name, slug: page.slug });
    return updated;
  }

  async deletePage(id: string): Promise<void> {
    const page = await this.getPage(id);
    if (page.isHome) throw new BadRequestException('首页不可删除');
    await this.db.run((m) => m.getRepository(Page).delete({ id }));
  }

  // ---------- 域名 ----------
  /** 规范化域名：去协议、去路径、去端口、转小写 */
  private normalizeDomain(input: string): string {
    let d = input.trim().toLowerCase();
    d = d.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
    d = d.replace(/^www\./, ''); // 统一存根域名，www 单独解析
    return d;
  }

  private validDomain(d: string): boolean {
    return /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(d);
  }

  async listDomains(): Promise<Domain[]> {
    return this.db.run((m) => m.getRepository(Domain).find({ order: { createdAt: 'DESC' } }));
  }

  async addDomain(data: { siteId: string; domain: string }): Promise<Domain> {
    const domain = this.normalizeDomain(data.domain);
    if (!this.validDomain(domain)) throw new BadRequestException('域名格式不正确');
    if (!data.siteId) throw new BadRequestException('请选择要绑定的站点');
    return this.db.run(async (m) => {
      const repo = m.getRepository(Domain);
      const dup = await repo.findOne({ where: { domain } });
      if (dup) throw new BadRequestException('域名已被绑定');
      const token = `sb-verify-${Math.random().toString(36).slice(2, 16)}`;
      return repo.save(repo.create({
        tenantId: TenantContext.getTenantId(),
        siteId: data.siteId,
        domain,
        verifyToken: token,
        verified: false,
        sslStatus: 'pending',
      }));
    });
  }

  /** 校验 DNS TXT 记录：_sb-verify.<domain> 的值需等于 verifyToken */
  async checkDns(domain: Domain): Promise<boolean> {
    const name = `_sb-verify.${domain.domain}`;
    try {
      const records = await dns.resolveTxt(name);
      const values = records.flat().map((s) => s.trim());
      return values.includes(domain.verifyToken);
    } catch {
      return false;
    }
  }

  /** 前端轮询用：按 id 检查 DNS 是否已生效 */
  async checkDnsRecord(id: string): Promise<{ ok: boolean; recordName: string; expected: string }> {
    const domain = await this.db.run((m) => m.getRepository(Domain).findOne({ where: { id } }));
    if (!domain) throw new NotFoundException('域名不存在');
    const ok = await this.checkDns(domain);
    return { ok, recordName: `_sb-verify.${domain.domain}`, expected: domain.verifyToken };
  }

  async verifyDomain(id: string): Promise<Domain & { certMode?: string }> {
    const domain = await this.db.run((m) => m.getRepository(Domain).findOne({ where: { id } }));
    if (!domain) throw new NotFoundException('域名不存在');
    if (domain.verified) return domain;

    const ok = await this.checkDns(domain);
    if (!ok) {
      throw new BadRequestException(
        `DNS 验证失败：请在 ${domain.domain} 添加 TXT 记录 _sb-verify.${domain.domain} = ${domain.verifyToken}，等待生效后重试`,
      );
    }

    // 验证通过 → 签发 SSL 证书
    const cert = await this.ssl.issue(domain.domain);
    const saved = await this.db.run((m) => m.getRepository(Domain).save({
      ...domain,
      verified: true,
      sslStatus: 'active',
      sslExpires: cert.expiresAt,
    }));
    await this.log('domain:verified', 'domain', id, { domain: domain.domain, certMode: cert.mode });
    return { ...saved, certMode: cert.mode };
  }

  /** 单独续期/签发 SSL（已验证域名） */
  async issueSsl(id: string): Promise<Domain & { certMode?: string }> {
    const domain = await this.db.run((m) => m.getRepository(Domain).findOne({ where: { id } }));
    if (!domain) throw new NotFoundException('域名不存在');
    if (!domain.verified) throw new BadRequestException('请先完成域名所有权验证');
    const cert = await this.ssl.issue(domain.domain);
    const saved = await this.db.run((m) => m.getRepository(Domain).save({
      ...domain, sslStatus: 'active', sslExpires: cert.expiresAt,
    }));
    await this.log('domain:ssl_issued', 'domain', id, { domain: domain.domain, certMode: cert.mode });
    return { ...saved, certMode: cert.mode };
  }

  /** 公开解析：按 Host 找到已验证域名对应的租户/站点 */
  async resolveDomain(host: string): Promise<{ tenantSlug: string; siteSlug: string; domain: string } | null> {
    const hostname = host.split(':')[0].toLowerCase();
    return this.db.runUnscoped(async (m) => {
      const row = await m.query(`
        SELECT t.slug AS "tenantSlug", s.slug AS "siteSlug", d.domain AS "domain"
        FROM domains d
        JOIN sites s ON s.id = d.site_id
        JOIN tenants t ON t.id = d.tenant_id
        WHERE d.domain = $1 AND d.verified = true AND d.ssl_status = 'active'
        LIMIT 1
      `, [hostname]);
      return row[0] ?? null;
    });
  }

  async deleteDomain(id: string): Promise<void> {
    const domain = await this.db.run((m) => m.getRepository(Domain).findOne({ where: { id } }));
    if (domain) this.ssl.removeCert(domain.domain);
    await this.db.run((m) => m.getRepository(Domain).delete({ id }));
    await this.log('domain:deleted', 'domain', id, { domain: domain?.domain });
  }

  // ---------- 表单留言 ----------
  async listSubmissions(status?: string): Promise<FormSubmission[]> {
    return this.db.run((m) => m.getRepository(FormSubmission).find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
      take: 200,
    }));
  }

  async createSubmission(data: Partial<FormSubmission>): Promise<FormSubmission> {
    let tenantId = TenantContext.getTenantId();
    // 公开站访客提交：无 JWT 租户上下文，按 siteId 反查租户
    if (!tenantId && data.siteId) {
      const site = await this.db.runUnscoped((m) =>
        m.getRepository(Site).findOne({ where: { id: data.siteId } }),
      );
      tenantId = site?.tenantId ?? null;
    }
    if (!tenantId) throw new BadRequestException('无法确定提交所属租户');
    return this.db.runUnscoped(async (m) => {
      const repo = m.getRepository(FormSubmission);
      return repo.save(repo.create({
        ...data,
        tenantId,
        status: 'unread',
      }));
    });
  }

  async markSubmission(id: string, status: string): Promise<void> {
    await this.db.run((m) => m.getRepository(FormSubmission).update({ id }, { status }));
  }

  async deleteSubmission(id: string): Promise<void> {
    await this.db.run((m) => m.getRepository(FormSubmission).delete({ id }));
  }

  // ---------- 审计 ----------
  async listAudit(limit = 100): Promise<AuditLog[]> {
    return this.db.run((m) => m.getRepository(AuditLog).find({ order: { createdAt: 'DESC' }, take: limit }));
  }

  async log(action: string, targetType?: string, targetId?: string, meta?: Record<string, unknown>): Promise<void> {
    await this.db.run(async (m) => {
      await m.getRepository(AuditLog).save(m.getRepository(AuditLog).create({
        tenantId: TenantContext.getTenantId() ?? undefined,
        userId: TenantContext.get()?.userId,
        action,
        targetType,
        targetId,
        meta: meta ?? {},
      } as Partial<AuditLog>));
    });
  }

  // ---------- 统计 ----------
  async track(type: string, data: Record<string, unknown>): Promise<void> {
    await this.db.runUnscoped(async (m) => {
      await m.query(
        `INSERT INTO analytics_events (tenant_id, type, data) VALUES ($1,$2,$3)`,
        [TenantContext.getTenantId() ?? null, type, JSON.stringify(data)],
      );
    });
  }

  async getStats(): Promise<Record<string, unknown>> {
    return this.db.run(async (m) => {
      const views = await m.query(`SELECT count(*)::int AS n FROM analytics_events WHERE type='page_view'`);
      const submissions = await m.query(`SELECT count(*)::int AS n FROM form_submissions`);
      const unread = await m.query(`SELECT count(*)::int AS n FROM form_submissions WHERE status='unread'`);
      const members = await m.query(`SELECT count(*)::int AS n FROM members`);
      const orders = await m.query(`SELECT count(*)::int AS n FROM shop_orders`);
      const revenue = await m.query(`SELECT COALESCE(sum(amount),0)::float AS n FROM shop_orders WHERE status='paid'`);
      const daily = await m.query(`
        SELECT date_trunc('day', created_at) AS day, count(*)::int AS views
        FROM analytics_events WHERE type='page_view' AND created_at > now() - interval '14 days'
        GROUP BY 1 ORDER BY 1
      `);
      return {
        pageViews: views[0]?.n ?? 0,
        submissions: submissions[0]?.n ?? 0,
        unread: unread[0]?.n ?? 0,
        members: members[0]?.n ?? 0,
        orders: orders[0]?.n ?? 0,
        revenue: revenue[0]?.n ?? 0,
        dailyViews: daily,
      };
    });
  }

  // ---------- 插件安装 ----------
  async listPlugins(): Promise<PluginInstall[]> {
    return this.db.run((m) => m.getRepository(PluginInstall).find());
  }

  async installPlugin(pluginId: string, config?: Record<string, unknown>): Promise<PluginInstall> {
    return this.db.run(async (m) => {
      const repo = m.getRepository(PluginInstall);
      const existing = await repo.findOne({ where: { pluginId } });
      if (existing) return repo.save({ ...existing, enabled: true, config: config ?? existing.config });
      return repo.save(repo.create({ tenantId: TenantContext.getTenantId(), pluginId, config: config ?? {}, enabled: true }));
    });
  }
}
