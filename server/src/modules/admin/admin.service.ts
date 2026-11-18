import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { TenantQueryService } from '../../database/tenant-query.service';
import { TenantContext } from '../../common/tenant/tenant-context';
import { User } from '../auth/user.entity';
import { Tenant } from '../tenant/tenant.entity';
import { Template } from '../template/template.entity';
import { Site } from '../site/site.entity';
import { AuditLog } from '../operations/entities';
import {
  Plan, Subscription, Order,
} from '../commerce/entities';
import { PluginDefinition } from './entities';

/** 管理员后台服务：用户/租户/套餐/模板/插件的全局管理，全部要求 super_admin */
@Injectable()
export class AdminService {
  constructor(
    private readonly db: TenantQueryService,
    private readonly jwt: JwtService,
  ) {}

  private async audit(action: string, targetType?: string, targetId?: string, meta?: Record<string, unknown>) {
    await this.db.runUnscoped(async (m) => {
      await m.getRepository(AuditLog).save(m.getRepository(AuditLog).create({
        tenantId: TenantContext.getTenantId(),
        userId: TenantContext.getUserId(),
        action, targetType, targetId,
        meta: meta ?? {},
      } as Partial<AuditLog>));
    });
  }

  // ==================== 用户管理 ====================
  async listUsers(params: { page?: number; pageSize?: number; role?: string; status?: string; tenantId?: string; q?: string }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(200, Number(params.pageSize) || 20);
    return this.db.runUnscoped(async (m) => {
      const qb = m.getRepository(User)
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.tenant', 't')
        .select([
          'u.id', 'u.email', 'u.name', 'u.role', 'u.status', 'u.createdAt', 'u.lastLoginAt', 'u.tenantId',
          't.id', 't.name', 't.slug', 't.plan', 't.status',
        ])
        .orderBy('u.createdAt', 'DESC')
        .skip((page - 1) * pageSize)
        .take(pageSize);
      if (params.role) qb.andWhere('u.role = :role', { role: params.role });
      if (params.status) qb.andWhere('u.status = :status', { status: params.status });
      if (params.tenantId) qb.andWhere('u.tenant_id = :tenantId', { tenantId: params.tenantId });
      if (params.q) qb.andWhere('(u.email ILIKE :q OR u.name ILIKE :q)', { q: `%${params.q}%` });
      const [items, total] = await qb.getManyAndCount();
      return { items, total, page, pageSize };
    });
  }

  async createUser(data: { email: string; password: string; name?: string; role?: string; tenantId?: string; status?: string }) {
    if (!data.email || !data.password) throw new BadRequestException('邮箱和密码必填');
    return this.db.runUnscoped(async (m) => {
      const repo = m.getRepository(User);
      if (await repo.findOne({ where: { email: data.email } })) throw new ConflictException('邮箱已被注册');
      let tenantId = data.tenantId ?? null;
      if (tenantId && !await m.getRepository(Tenant).findOne({ where: { id: tenantId } })) {
        throw new BadRequestException('指定租户不存在');
      }
      const user = await repo.save(repo.create({
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 10),
        name: data.name,
        role: (data.role as User['role']) ?? 'user',
        tenantId,
        status: data.status ?? 'active',
      }));
      await this.audit('admin.user.create', 'user', user.id, { email: user.email, role: user.role });
      return this.publicUser(user);
    });
  }

  async updateUser(id: string, data: { name?: string; email?: string; role?: string; status?: string; tenantId?: string | null; password?: string }) {
    return this.db.runUnscoped(async (m) => {
      const repo = m.getRepository(User);
      const user = await repo.findOne({ where: { id } });
      if (!user) throw new NotFoundException('用户不存在');
      if (data.email && data.email !== user.email) {
        if (await repo.findOne({ where: { email: data.email } })) throw new ConflictException('邮箱已被使用');
        user.email = data.email;
      }
      if (data.name !== undefined) user.name = data.name;
      if (data.role !== undefined) user.role = data.role as User['role'];
      if (data.status !== undefined) user.status = data.status;
      if (data.tenantId !== undefined) user.tenantId = data.tenantId;
      if (data.password) user.passwordHash = await bcrypt.hash(data.password, 10);
      await repo.save(user);
      await this.audit('admin.user.update', 'user', id, data);
      return this.publicUser(user);
    });
  }

  async setUserStatus(id: string, status: 'active' | 'disabled') {
    return this.updateUser(id, { status });
  }

  async deleteUser(id: string) {
    return this.db.runUnscoped(async (m) => {
      const repo = m.getRepository(User);
      const user = await repo.findOne({ where: { id } });
      if (!user) throw new NotFoundException('用户不存在');
      if (user.role === 'super_admin') throw new BadRequestException('不能删除超级管理员');
      // 清理关联：分销员引用、邀请记录
      await m.query('UPDATE distributors SET user_id = NULL WHERE user_id = $1', [id]);
      await m.query('DELETE FROM invitations WHERE email = $1', [user.email]);
      await repo.delete(id);
      await this.audit('admin.user.delete', 'user', id, { email: user.email });
      return { ok: true };
    });
  }

  private publicUser(u: User) {
    return {
      id: u.id, email: u.email, name: u.name, role: u.role,
      status: u.status, tenantId: u.tenantId,
      lastLoginAt: u.lastLoginAt, createdAt: u.createdAt,
    };
  }

  // ==================== 租户管理 ====================
  async listTenants(params: { q?: string; status?: string; plan?: string }) {
    return this.db.runUnscoped(async (m) => {
      const qb = m.getRepository(Tenant).createQueryBuilder('t').orderBy('t.createdAt', 'DESC');
      if (params.q) qb.andWhere('(t.name ILIKE :q OR t.slug ILIKE :q)', { q: `%${params.q}%` });
      if (params.status) qb.andWhere('t.status = :status', { status: params.status });
      if (params.plan) qb.andWhere('t.plan = :plan', { plan: params.plan });
      const items = await qb.getMany();
      // 附带每个租户的用户数与站点数
      const users = await m.query('SELECT tenant_id, COUNT(*)::int AS n FROM users GROUP BY tenant_id');
      const sites = await m.query('SELECT tenant_id, COUNT(*)::int AS n FROM sites GROUP BY tenant_id');
      const uc = new Map(users.map((x: any) => [x.tenant_id, x.n]));
      const sc = new Map(sites.map((x: any) => [x.tenant_id, x.n]));
      return items.map((t) => ({ ...t, userCount: uc.get(t.id) ?? 0, siteCount: sc.get(t.id) ?? 0 }));
    });
  }

  async updateTenant(id: string, data: { name?: string; status?: string; plan?: string; slug?: string }) {
    return this.db.runUnscoped(async (m) => {
      const repo = m.getRepository(Tenant);
      const tenant = await repo.findOne({ where: { id } });
      if (!tenant) throw new NotFoundException('租户不存在');
      if (data.slug && data.slug !== tenant.slug) {
        if (await repo.findOne({ where: { slug: data.slug } })) throw new ConflictException('租户标识已被占用');
        tenant.slug = data.slug;
      }
      if (data.name !== undefined) tenant.name = data.name;
      if (data.status !== undefined) tenant.status = data.status;
      if (data.plan !== undefined) tenant.plan = data.plan;
      await repo.save(tenant);
      await this.audit('admin.tenant.update', 'tenant', id, data);
      return tenant;
    });
  }

  // ==================== 套餐管理 ====================
  async listPlans() {
    return this.db.runUnscoped((m) => m.getRepository(Plan).find({ order: { sortOrder: 'ASC' } }));
  }

  async createPlan(data: Partial<Plan> & { code: string; name: string }) {
    if (!data.code || !data.name) throw new BadRequestException('套餐编码和名称必填');
    return this.db.runUnscoped(async (m) => {
      const repo = m.getRepository(Plan);
      if (await repo.findOne({ where: { code: data.code } })) throw new ConflictException('套餐编码已存在');
      const plan = await repo.save(repo.create({
        ...data,
        priceMonthly: data.priceMonthly ?? 0,
        priceYearly: data.priceYearly ?? 0,
        features: data.features ?? [],
        limits: data.limits ?? {},
        sortOrder: data.sortOrder ?? 0,
        active: data.active ?? true,
      }));
      await this.audit('admin.plan.create', 'plan', plan.id, { code: plan.code });
      return plan;
    });
  }

  async updatePlan(id: string, data: Partial<Plan>) {
    return this.db.runUnscoped(async (m) => {
      const repo = m.getRepository(Plan);
      const plan = await repo.findOne({ where: { id } });
      if (!plan) throw new NotFoundException('套餐不存在');
      if (data.code && data.code !== plan.code) {
        if (await repo.findOne({ where: { code: data.code } })) throw new ConflictException('套餐编码已存在');
      }
      Object.assign(plan, data);
      await repo.save(plan);
      await this.audit('admin.plan.update', 'plan', id, data);
      return plan;
    });
  }

  async deletePlan(id: string) {
    return this.db.runUnscoped(async (m) => {
      const used = await m.getRepository(Subscription).count({ where: { planId: id } });
      if (used > 0) throw new BadRequestException(`该套餐被 ${used} 个订阅引用，不能删除`);
      await m.getRepository(Plan).delete(id);
      await this.audit('admin.plan.delete', 'plan', id);
      return { ok: true };
    });
  }

  async listSubscriptions(params?: { status?: string; tenantId?: string }) {
    return this.db.runUnscoped(async (m) => {
      const qb = m.getRepository(Subscription).createQueryBuilder('s')
        .leftJoinAndSelect('s.plan', 'p')
        .orderBy('s.createdAt', 'DESC').take(200);
      if (params?.status) qb.andWhere('s.status = :status', { status: params.status });
      if (params?.tenantId) qb.andWhere('s.tenant_id = :tenantId', { tenantId: params.tenantId });
      return qb.getMany();
    });
  }

  async cancelSubscription(id: string) {
    return this.db.runUnscoped(async (m) => {
      const repo = m.getRepository(Subscription);
      const sub = await repo.findOne({ where: { id } });
      if (!sub) throw new NotFoundException('订阅不存在');
      sub.status = 'cancelled';
      await repo.save(sub);
      await this.audit('admin.subscription.cancel', 'subscription', id);
      return sub;
    });
  }

  async listOrders(params?: { status?: string; tenantId?: string }) {
    return this.db.runUnscoped(async (m) => {
      const qb = m.getRepository(Order).createQueryBuilder('o').orderBy('o.createdAt', 'DESC').take(200);
      if (params?.status) qb.andWhere('o.status = :status', { status: params.status });
      if (params?.tenantId) qb.andWhere('o.tenant_id = :tenantId', { tenantId: params.tenantId });
      return qb.getMany();
    });
  }

  // ==================== 模板管理 ====================
  async listTemplates(params?: { isGlobal?: string; isPublic?: string; category?: string }) {
    return this.db.runUnscoped(async (m) => {
      const qb = m.getRepository(Template).createQueryBuilder('t').orderBy('t.createdAt', 'DESC');
      if (params?.isGlobal !== undefined) qb.andWhere('t.is_global = :g', { g: params.isGlobal === 'true' });
      if (params?.isPublic !== undefined) qb.andWhere('t.is_public = :p', { p: params.isPublic === 'true' });
      if (params?.category) qb.andWhere('t.category = :category', { category: params.category });
      return qb.getMany();
    });
  }

  async updateTemplate(id: string, data: Partial<Template>) {
    return this.db.runUnscoped(async (m) => {
      const repo = m.getRepository(Template);
      const t = await repo.findOne({ where: { id } });
      if (!t) throw new NotFoundException('模板不存在');
      const allowed = ['name', 'category', 'description', 'cover', 'isGlobal', 'isPublic', 'price', 'installs', 'rating', 'schema'];
      for (const k of allowed) if (data[k] !== undefined) (t as any)[k] = data[k];
      await repo.save(t);
      await this.audit('admin.template.update', 'template', id, data);
      return t;
    });
  }

  async setTemplatePublic(id: string, isPublic: boolean) {
    return this.updateTemplate(id, { isPublic } as Partial<Template>);
  }

  async deleteTemplate(id: string) {
    return this.db.runUnscoped(async (m) => {
      const t = await m.getRepository(Template).findOne({ where: { id } });
      if (!t) throw new NotFoundException('模板不存在');
      await m.getRepository(Template).delete(id);
      await this.audit('admin.template.delete', 'template', id, { name: t.name });
      return { ok: true };
    });
  }

  // ==================== 插件目录管理 ====================
  async listPluginDefinitions() {
    return this.db.runUnscoped((m) =>
      m.getRepository(PluginDefinition).find({ order: { sortOrder: 'ASC' } }));
  }

  async createPluginDefinition(data: Partial<PluginDefinition> & { code: string; name: string }) {
    if (!data.code || !data.name) throw new BadRequestException('插件编码和名称必填');
    return this.db.runUnscoped(async (m) => {
      const repo = m.getRepository(PluginDefinition);
      if (await repo.findOne({ where: { code: data.code } })) throw new ConflictException('插件编码已存在');
      const def = await repo.save(repo.create({
        ...data,
        category: data.category ?? 'general',
        version: data.version ?? '1.0.0',
        configSchema: data.configSchema ?? [],
        price: data.price ?? 0,
        enabled: data.enabled ?? true,
        sortOrder: data.sortOrder ?? 0,
      }));
      await this.audit('admin.plugin.create', 'plugin', def.id, { code: def.code });
      return def;
    });
  }

  async updatePluginDefinition(id: string, data: Partial<PluginDefinition>) {
    return this.db.runUnscoped(async (m) => {
      const repo = m.getRepository(PluginDefinition);
      const def = await repo.findOne({ where: { id } });
      if (!def) throw new NotFoundException('插件不存在');
      Object.assign(def, data);
      await repo.save(def);
      await this.audit('admin.plugin.update', 'plugin', id, data);
      return def;
    });
  }

  async deletePluginDefinition(id: string) {
    return this.db.runUnscoped(async (m) => {
      const def = await m.getRepository(PluginDefinition).findOne({ where: { id } });
      if (!def) throw new NotFoundException('插件不存在');
      const installs = await m.query('SELECT COUNT(*)::int AS n FROM plugin_installs WHERE plugin_id = $1', [def.code]);
      if (installs[0]?.n > 0) throw new BadRequestException(`该插件已被 ${installs[0].n} 个租户安装，不能删除`);
      await m.getRepository(PluginDefinition).delete(id);
      await this.audit('admin.plugin.delete', 'plugin', id, { code: def.code });
      return { ok: true };
    });
  }

  // ==================== 站点管理 ====================
  async listSites(params?: { tenantId?: string; q?: string; disabled?: string }) {
    return this.db.runUnscoped(async (m) => {
      const rows = await m.query(`
        SELECT s.*, t.name AS tenant_name, t.slug AS tenant_slug,
               (s.expires_at IS NOT NULL AND s.expires_at < now()) AS expired
        FROM sites s
        LEFT JOIN tenants t ON t.id = s.tenant_id
        WHERE ($1::uuid IS NULL OR s.tenant_id = $1)
          AND ($2::text IS NULL OR s.name ILIKE '%'||$2||'%' OR s.slug ILIKE '%'||$2||'%')
          AND ($3::boolean IS NULL OR s.disabled = $3)
        ORDER BY s.updated_at DESC
      `, [params?.tenantId ?? null, params?.q ?? null,
          params?.disabled === undefined ? null : params.disabled === 'true']);
      return rows;
    });
  }

  async createSite(data: { tenantId: string; name: string; slug: string; expiresAt?: string | null }) {
    if (!data.tenantId || !data.name || !data.slug) throw new BadRequestException('租户、站点名称和标识必填');
    if (!/^[a-z0-9-]+$/.test(data.slug)) throw new BadRequestException('站点标识只能包含小写字母、数字和连字符');
    return this.db.runUnscoped(async (m) => {
      if (!await m.getRepository(Tenant).findOne({ where: { id: data.tenantId } })) {
        throw new BadRequestException('指定租户不存在');
      }
      const repo = m.getRepository(Site);
      if (await repo.findOne({ where: { tenantId: data.tenantId, slug: data.slug } })) {
        throw new ConflictException('该租户下站点标识已存在');
      }
      const site = await repo.save(repo.create({
        tenantId: data.tenantId,
        name: data.name,
        slug: data.slug,
        status: 'draft',
        disabled: false,
        disabledReason: null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        draftSchema: null,
        publishedSchema: null,
      }));
      await this.audit('admin.site.create', 'site', site.id, { name: site.name, slug: site.slug });
      return site;
    });
  }

  async updateSite(id: string, data: {
    name?: string; slug?: string; tenantId?: string;
    disabled?: boolean; disabledReason?: string | null; expiresAt?: string | null;
  }) {
    return this.db.runUnscoped(async (m) => {
      const repo = m.getRepository(Site);
      const site = await repo.findOne({ where: { id } });
      if (!site) throw new NotFoundException('站点不存在');
      if (data.slug && data.slug !== site.slug) {
        if (!/^[a-z0-9-]+$/.test(data.slug)) throw new BadRequestException('站点标识格式不合法');
        const dup = await repo.createQueryBuilder('s')
          .where('s.tenant_id = :tid', { tid: data.tenantId ?? site.tenantId })
          .andWhere('s.slug = :slug', { slug: data.slug })
          .andWhere('s.id != :id', { id })
          .getOne();
        if (dup) throw new ConflictException('该租户下站点标识已存在');
        site.slug = data.slug;
      }
      if (data.name !== undefined) site.name = data.name;
      if (data.tenantId !== undefined) site.tenantId = data.tenantId;
      if (data.disabled !== undefined) site.disabled = data.disabled;
      if (data.disabledReason !== undefined) site.disabledReason = data.disabledReason;
      if (data.expiresAt !== undefined) site.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
      await repo.save(site);
      await this.audit('admin.site.update', 'site', id, data);
      return site;
    });
  }

  async setSiteDisabled(id: string, disabled: boolean, reason?: string) {
    return this.updateSite(id, {
      disabled,
      disabledReason: disabled ? (reason || '该站点已被管理员禁用') : null,
    });
  }

  async deleteSite(id: string) {
    return this.db.runUnscoped(async (m) => {
      const site = await m.getRepository(Site).findOne({ where: { id } });
      if (!site) throw new NotFoundException('站点不存在');
      // 级联清理 pages / publish_records（数据库外键 ON DELETE CASCADE）
      await m.query('DELETE FROM pages WHERE site_id = $1', [id]);
      await m.query('DELETE FROM publish_records WHERE site_id = $1', [id]);
      await m.getRepository(Site).delete(id);
      await this.audit('admin.site.delete', 'site', id, { name: site.name, slug: site.slug });
      return { ok: true };
    });
  }

  /**
   * 代客编辑：管理员以目标租户身份进入装修器修改用户站点。
   * 签发的 JWT 带目标 tenantId（RLS 匹配）+ 超管角色（可跨租户）+ imp 标记（可审计）。
   */
  async impersonateSite(id: string) {
    const site = await this.db.runUnscoped((m) =>
      m.getRepository(Site).createQueryBuilder('s')
        .select(['s.id', 's.name', 's.slug', 's.tenantId'])
        .addSelect('t.slug', 'tenantSlug')
        .addSelect('t.name', 'tenantName')
        .innerJoin('tenants', 't', 't.id = s.tenant_id')
        .where('s.id = :id', { id })
        .getRawOne(),
    );
    if (!site) throw new NotFoundException('站点不存在');

    const adminId = TenantContext.getUserId() ?? 'admin';
    const token = this.jwt.sign({
      sub: adminId,
      email: 'admin@sitebuilder.io',
      role: 'super_admin',
      tenantId: site.s_tenant_id,
      imp: true,
      impSite: id,
    });
    await this.audit('admin.site.impersonate', 'site', id, {
      name: site.s_name, tenant: site.tenantName, adminId,
    });
    return {
      token,
      user: {
        id: adminId,
        email: 'admin@sitebuilder.io',
        name: '管理员代客编辑',
        role: 'super_admin',
        tenantId: site.s_tenant_id,
      },
      site: {
        id: site.s_id,
        name: site.s_name,
        slug: site.s_slug,
        tenantSlug: site.tenantSlug,
        tenantName: site.tenantName,
      },
    };
  }

  // ==================== 审计日志 ====================
  async listAudit(params?: { action?: string; limit?: number }) {
    return this.db.runUnscoped(async (m) => {
      const qb = m.getRepository(AuditLog).createQueryBuilder('a').orderBy('a.createdAt', 'DESC')
        .take(Math.min(500, Number(params?.limit) || 100));
      if (params?.action) qb.andWhere('a.action LIKE :action', { action: `%${params.action}%` });
      return qb.getMany();
    });
  }

  // ==================== 全局概览 ====================
  async overview() {
    return this.db.runUnscoped(async (m) => {
      const [users, tenants, sites, templates, plans, plugins, subscriptions] = await Promise.all([
        m.query('SELECT COUNT(*)::int AS n FROM users'),
        m.query('SELECT COUNT(*)::int AS n FROM tenants'),
        m.query('SELECT COUNT(*)::int AS n FROM sites'),
        m.query('SELECT COUNT(*)::int AS n FROM templates'),
        m.query('SELECT COUNT(*)::int AS n FROM plans'),
        m.query('SELECT COUNT(*)::int AS n FROM plugin_definitions'),
        m.query("SELECT COUNT(*)::int AS n FROM subscriptions WHERE status = 'active'"),
      ]);
      return {
        users: users[0].n, tenants: tenants[0].n, sites: sites[0].n,
        templates: templates[0].n, plans: plans[0].n, plugins: plugins[0].n,
        activeSubscriptions: subscriptions[0].n,
      };
    });
  }
}
