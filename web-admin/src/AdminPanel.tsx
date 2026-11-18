import { useCallback, useEffect, useState } from 'react';
import {
  Users, Building2, CreditCard, LayoutTemplate, Puzzle, ShieldCheck, Globe2,
  Search, RefreshCw, Plus, Trash2, Check, Ban, Pencil, X, Save, Clock,
  Loader2, ExternalLink,
} from 'lucide-react';
import { get, post, put, patch, del } from './api';
type ApiError = { message?: string } | Error;

const EDITOR_URL = 'http://localhost:5173';

type Tab = 'overview' | 'users' | 'tenants' | 'sites' | 'plans' | 'templates' | 'plugins' | 'audit';

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: '总览', icon: ShieldCheck },
  { id: 'users', label: '用户管理', icon: Users },
  { id: 'tenants', label: '租户管理', icon: Building2 },
  { id: 'sites', label: '站点管理', icon: Globe2 },
  { id: 'plans', label: '套餐管理', icon: CreditCard },
  { id: 'templates', label: '模板管理', icon: LayoutTemplate },
  { id: 'plugins', label: '插件目录', icon: Puzzle },
  { id: 'audit', label: '审计日志', icon: ShieldCheck },
];

function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true); setError('');
    try { setData(await get<T>(path)); }
    catch (e) { setError((e as ApiError)?.message ?? '加载失败'); }
    finally { setLoading(false); }
  }, [path, ...deps]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load, setData };
}

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('overview');
  return (
    <div className="admin-panel">
      <div className="ap-header">
        <div><h1>管理员后台</h1><p>管理全站用户、租户、套餐、模板与插件（仅超级管理员可见）</p></div>
      </div>
      <div className="ap-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`ap-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>
      <div className="ap-body">
        {tab === 'overview' && <Overview />}
        {tab === 'users' && <UsersPanel />}
        {tab === 'tenants' && <TenantsPanel />}
        {tab === 'sites' && <SitesPanel />}
        {tab === 'plans' && <PlansPanel />}
        {tab === 'templates' && <TemplatesPanel />}
        {tab === 'plugins' && <PluginsPanel />}
        {tab === 'audit' && <AuditPanel />}
      </div>
    </div>
  );
}

// ---------- 总览 ----------
function Overview() {
  const { data, loading, error, reload } = useApi<any>('admin/overview');
  const cards = [
    { label: '用户', value: data?.users, icon: Users, color: '#6366f1' },
    { label: '租户', value: data?.tenants, icon: Building2, color: '#0ea5e9' },
    { label: '站点', value: data?.sites, icon: LayoutTemplate, color: '#22c55e' },
    { label: '模板', value: data?.templates, icon: LayoutTemplate, color: '#f59e0b' },
    { label: '套餐', value: data?.plans, icon: CreditCard, color: '#ec4899' },
    { label: '插件', value: data?.plugins, icon: Puzzle, color: '#8b5cf6' },
    { label: '有效订阅', value: data?.activeSubscriptions, icon: ShieldCheck, color: '#14b8a6' },
  ];
  return (
    <section>
      <Toolbar loading={loading} onReload={reload} error={error} />
      <div className="ap-cards">
        {cards.map((c) => (
          <div key={c.label} className="ap-card">
            <div className="ap-card-icon" style={{ background: `${c.color}18`, color: c.color }}><c.icon size={20} /></div>
            <div><div className="ap-card-value">{loading ? '—' : (c.value ?? 0)}</div><div className="ap-card-label">{c.label}</div></div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- 用户管理 ----------
function UsersPanel() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const query = `admin/users?pageSize=100${q ? `&q=${encodeURIComponent(q)}` : ''}${role ? `&role=${role}` : ''}${status ? `&status=${status}` : ''}`;
  const { data, loading, error, reload } = useApi<any>(query, [q, role, status]);

  return (
    <section>
      <div className="ap-toolbar">
        <div className="ap-filters">
          <div className="ap-search"><Search size={15} /><input placeholder="搜索邮箱/姓名" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">全部角色</option><option value="super_admin">超级管理员</option><option value="tenant_admin">租户管理员</option><option value="user">普通用户</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部状态</option><option value="active">正常</option><option value="disabled">已禁用</option>
          </select>
        </div>
        <div className="ap-actions"><button className="ap-btn primary" onClick={() => setCreating(true)}><Plus size={14} />新建用户</button><button className="ap-btn" onClick={reload} disabled={loading}><RefreshCw size={14} /></button></div>
      </div>
      {error && <div className="ap-error">{error}</div>}
      <DataTable
        loading={loading}
        columns={['邮箱', '姓名', '角色', '租户', '状态', '最后登录', '操作']}
        rows={(data?.items ?? []).map((u: any) => [
          <strong key="e">{u.email}</strong>,
          u.name || '—',
          <RoleBadge key="r" role={u.role} />,
          u.tenant?.name || '—',
          <StatusBadge key="s" status={u.status} />,
          u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('zh-CN') : '从未',
          <div key="a" className="ap-row-actions">
            <button title="编辑" onClick={() => setEditing(u)}><Pencil size={14} /></button>
            <button title={u.status === 'disabled' ? '启用' : '禁用'} onClick={async () => { await patch(`admin/users/${u.id}/status`, { status: u.status === 'disabled' ? 'active' : 'disabled' }); reload(); }}>{u.status === 'disabled' ? <Check size={14} /> : <Ban size={14} />}</button>
            <button title="删除" className="danger" onClick={async () => { if (confirm(`确定删除用户 ${u.email}？`)) { await del(`admin/users/${u.id}`); reload(); } }}><Trash2 size={14} /></button>
          </div>,
        ])}
      />
      <div className="ap-footer">共 {data?.total ?? 0} 个用户</div>
      {(editing || creating) && <UserModal user={editing} onClose={() => { setEditing(null); setCreating(false); reload(); }} />}
    </section>
  );
}

function UserModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [form, setForm] = useState({
    email: user?.email ?? '', password: '', name: user?.name ?? '',
    role: user?.role ?? 'user', status: user?.status ?? 'active', tenantId: user?.tenantId ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    setSaving(true); setError('');
    try {
      const body: any = { ...form, tenantId: form.tenantId || null };
      if (!user) body.password = form.password;
      else if (!form.password) delete body.password;
      if (user) await put(`admin/users/${user.id}`, body);
      else await post('admin/users', body);
      onClose();
    } catch (e) { setError((e as ApiError)?.message ?? '保存失败'); }
    finally { setSaving(false); }
  };
  return (
    <Modal title={user ? `编辑用户：${user.email}` : '新建用户'} onClose={onClose}>
      <div className="ap-form">
        <Field label="邮箱" value={form.email} onChange={(v) => set('email', v)} />
        <Field label="密码" type="password" value={form.password} onChange={(v) => set('password', v)} placeholder={user ? '留空不改' : '必填'} />
        <Field label="姓名" value={form.name} onChange={(v) => set('name', v)} />
        <div className="ap-field"><label>角色</label><select value={form.role} onChange={(e) => set('role', e.target.value)}><option value="user">普通用户</option><option value="tenant_admin">租户管理员</option><option value="super_admin">超级管理员</option></select></div>
        <div className="ap-field"><label>状态</label><select value={form.status} onChange={(e) => set('status', e.target.value)}><option value="active">正常</option><option value="disabled">禁用</option></select></div>
        <Field label="租户 ID（可选）" value={form.tenantId} onChange={(v) => set('tenantId', v)} placeholder="留空则不关联租户" />
        {error && <div className="ap-error">{error}</div>}
        <div className="ap-modal-actions"><button className="ap-btn" onClick={onClose}>取消</button><button className="ap-btn primary" onClick={submit} disabled={saving}><Save size={14} />保存</button></div>
      </div>
    </Modal>
  );
}

// ---------- 租户管理 ----------
function TenantsPanel() {
  const [q, setQ] = useState('');
  const { data, loading, error, reload } = useApi<any>(`admin/tenants${q ? `?q=${encodeURIComponent(q)}` : ''}`, [q]);
  const [editing, setEditing] = useState<any>(null);
  return (
    <section>
      <div className="ap-toolbar">
        <div className="ap-filters"><div className="ap-search"><Search size={15} /><input placeholder="搜索租户" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
        <div className="ap-actions"><button className="ap-btn" onClick={reload} disabled={loading}><RefreshCw size={14} /></button></div>
      </div>
      {error && <div className="ap-error">{error}</div>}
      <DataTable loading={loading} columns={['租户', '标识', '套餐', '状态', '用户数', '站点数', '操作']}
        rows={(data ?? []).map((t: any) => [
          <strong key="n">{t.name}</strong>, <code key="s">{t.slug}</code>, <span key="p" className="ap-tag">{t.plan}</span>,
          <StatusBadge key="st" status={t.status} />, t.userCount, t.siteCount,
          <button key="a" title="编辑" onClick={() => setEditing(t)}><Pencil size={14} /></button>,
        ])} />
      {editing && <TenantModal tenant={editing} onClose={() => { setEditing(null); reload(); }} />}
    </section>
  );
}

function TenantModal({ tenant, onClose }: { tenant: any; onClose: () => void }) {
  const [form, setForm] = useState({ name: tenant.name, slug: tenant.slug, plan: tenant.plan, status: tenant.status });
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    try { await put(`admin/tenants/${tenant.id}`, form); onClose(); }
    catch (e) { setError((e as ApiError)?.message ?? '保存失败'); }
  };
  return (
    <Modal title={`编辑租户：${tenant.name}`} onClose={onClose}>
      <div className="ap-form">
        <Field label="名称" value={form.name} onChange={(v) => set('name', v)} />
        <Field label="标识 slug" value={form.slug} onChange={(v) => set('slug', v)} />
        <div className="ap-field"><label>套餐</label><input value={form.plan} onChange={(e) => set('plan', e.target.value)} /></div>
        <div className="ap-field"><label>状态</label><select value={form.status} onChange={(e) => set('status', e.target.value)}><option value="active">正常</option><option value="suspended">停用</option></select></div>
        {error && <div className="ap-error">{error}</div>}
        <div className="ap-modal-actions"><button className="ap-btn" onClick={onClose}>取消</button><button className="ap-btn primary" onClick={submit}><Save size={14} />保存</button></div>
      </div>
    </Modal>
  );
}

// ---------- 站点管理 ----------
function SitesPanel() {
  const [q, setQ] = useState('');
  const [disabled, setDisabled] = useState('');
  const { data, loading, error, reload } = useApi<any[]>(
    `admin/sites${q ? `?q=${encodeURIComponent(q)}` : ''}${q && disabled ? '&' : (!q && disabled ? '?' : '')}${disabled ? `disabled=${disabled}` : ''}`,
    [q, disabled],
  );
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const { data: tenants } = useApi<any[]>('admin/tenants');
  const tenantName = (id: string) => tenants?.find((t) => t.id === id)?.name || id.slice(0, 8);

  const toggleDisabled = async (s: any) => {
    let reason: string | undefined;
    if (!s.disabled) {
      reason = prompt('请输入禁用原因（访客可见）：', '该站点正在维护中，请稍后再访问');
      if (reason === null) return;
    }
    await patch(`admin/sites/${s.id}/disabled`, { disabled: !s.disabled, reason });
    reload();
  };

  const [entering, setEntering] = useState('');
  const enterEditor = async (s: any) => {
    setEntering(s.id);
    try {
      const r = await post<any>(`admin/sites/${s.id}/impersonate`);
      const editorBase = EDITOR_URL;
      const url = `${editorBase}/?site=${encodeURIComponent(s.id)}&token=${encodeURIComponent(r.token)}&imp=1`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      alert((e as ApiError)?.message ?? '进入编辑失败');
    } finally { setEntering(''); }
  };

  return (
    <section>
      <div className="ap-toolbar">
        <div className="ap-filters">
          <div className="ap-search"><Search size={15} /><input placeholder="搜索站点名称/标识" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select value={disabled} onChange={(e) => setDisabled(e.target.value)}>
            <option value="">全部状态</option><option value="false">正常</option><option value="true">已禁用</option>
          </select>
        </div>
        <div className="ap-actions">
          <button className="ap-btn primary" onClick={() => setCreating(true)}><Plus size={14} />新建站点</button>
          <button className="ap-btn" onClick={reload} disabled={loading}><RefreshCw size={14} /></button>
        </div>
      </div>
      {error && <div className="ap-error">{error}</div>}
      <DataTable loading={loading} columns={['站点', '标识', '租户', '状态', '有效期', '操作']}
        rows={(data ?? []).map((s: any) => {
          const isBlocked = s.disabled || s.expired;
          let statusLabel = '正常';
          if (s.disabled) statusLabel = '已禁用';
          else if (s.expired) statusLabel = '已过期';
          return [
            <strong key="n">{s.name}</strong>, <code key="s">/s/{s.tenant_slug}/{s.slug}</code>, tenantName(s.tenant_id),
            <span key="st" className={`ap-status ${isBlocked ? 'off' : 'on'}`}>{statusLabel}</span>,
            <span key="e" className="ap-meta">{s.expires_at ? new Date(s.expires_at).toLocaleDateString('zh-CN') : '永久'}</span>,
            <div key="a" className="ap-row-actions">
              <button
                title="以用户身份进入编辑器修改站点"
                disabled={entering === s.id}
                onClick={() => enterEditor(s)}
                style={{ color: '#D97706' }}
              >
                {entering === s.id ? <Loader2 size={14} className="spin" /> : <ExternalLink size={14} />}
              </button>
              <button title={s.disabled ? '启用' : '禁用'} onClick={() => toggleDisabled(s)}>{s.disabled ? <Check size={14} /> : <Ban size={14} />}</button>
              <button title="编辑站点信息" onClick={() => setEditing(s)}><Pencil size={14} /></button>
              <button title="删除" className="danger" onClick={async () => { if (confirm(`确定删除站点 ${s.name}？此操作不可恢复。`)) { await del(`admin/sites/${s.id}`); reload(); } }}><Trash2 size={14} /></button>
            </div>,
          ];
        })} />
      <div className="ap-footer">共 {data?.length ?? 0} 个站点</div>
      {(editing || creating) && <SiteModal site={editing} tenants={tenants ?? []} onClose={() => { setEditing(null); setCreating(false); reload(); }} />}
    </section>
  );
}

function SiteModal({ site, tenants, onClose }: { site: any; tenants: any[]; onClose: () => void }) {
  const toLocal = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [form, setForm] = useState({
    tenantId: site?.tenant_id ?? tenants[0]?.id ?? '',
    name: site?.name ?? '', slug: site?.slug ?? '',
    expiresAt: toLocal(site?.expires_at),
    disabled: site?.disabled ?? false,
    disabledReason: site?.disabled_reason ?? '',
  });
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    try {
      const body: any = {
        tenantId: form.tenantId, name: form.name, slug: form.slug,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        disabled: form.disabled,
        disabledReason: form.disabled ? (form.disabledReason || '该站点已被管理员禁用') : null,
      };
      if (site) await put(`admin/sites/${site.id}`, body);
      else {
        const { disabled, disabledReason, ...createBody } = body;
        await post('admin/sites', createBody);
      }
      onClose();
    } catch (e) { setError((e as ApiError)?.message ?? '保存失败'); }
  };
  return (
    <Modal title={site ? `编辑站点：${site.name}` : '新建站点'} onClose={onClose}>
      <div className="ap-form">
        {!site && (
          <div className="ap-field"><label>所属租户</label><select value={form.tenantId} onChange={(e) => set('tenantId', e.target.value)}>
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>)}
          </select></div>
        )}
        <Field label="站点名称" value={form.name} onChange={(v) => set('name', v)} />
        <Field label="站点标识 slug" value={form.slug} onChange={(v) => set('slug', v)} placeholder="如 www，访问路径 /s/租户/www" />
        <div className="ap-field"><label>有效期（留空=永久，到期自动停用）</label><input type="datetime-local" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} /></div>
        <div className="ap-field"><label>状态</label><select value={String(form.disabled)} onChange={(e) => set('disabled', e.target.value === 'true')}><option value="false">正常</option><option value="true">禁用</option></select></div>
        {form.disabled && <Field label="禁用原因（访客可见）" value={form.disabledReason} onChange={(v) => set('disabledReason', v)} placeholder="该站点正在维护中" />}
        {error && <div className="ap-error">{error}</div>}
        <div className="ap-modal-actions"><button className="ap-btn" onClick={onClose}>取消</button><button className="ap-btn primary" onClick={submit}><Save size={14} />保存</button></div>
      </div>
    </Modal>
  );
}

// ---------- 套餐管理 ----------
function PlansPanel() {
  const { data, loading, error, reload } = useApi<any[]>('admin/plans');
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  return (
    <section>
      <div className="ap-toolbar">
        <div className="ap-filters" />
        <div className="ap-actions"><button className="ap-btn primary" onClick={() => setCreating(true)}><Plus size={14} />新建套餐</button><button className="ap-btn" onClick={reload} disabled={loading}><RefreshCw size={14} /></button></div>
      </div>
      {error && <div className="ap-error">{error}</div>}
      <DataTable loading={loading} columns={['编码', '名称', '月付', '年付', '排序', '状态', '操作']}
        rows={(data ?? []).map((p: any) => [
          <code key="c">{p.code}</code>, <strong key="n">{p.name}</strong>, `¥${p.priceMonthly}`, `¥${p.priceYearly}`, p.sortOrder,
          <StatusBadge key="s" status={p.active ? 'active' : 'disabled'} />,
          <div key="a" className="ap-row-actions">
            <button title="编辑" onClick={() => setEditing(p)}><Pencil size={14} /></button>
            <button title="删除" className="danger" onClick={async () => { if (confirm(`删除套餐 ${p.name}？`)) { try { await del(`admin/plans/${p.id}`); reload(); } catch (e) { alert((e as ApiError).message); } } }}><Trash2 size={14} /></button>
          </div>,
        ])} />
      {(editing || creating) && <PlanModal plan={editing} onClose={() => { setEditing(null); setCreating(false); reload(); }} />}
    </section>
  );
}

function PlanModal({ plan, onClose }: { plan: any; onClose: () => void }) {
  const [form, setForm] = useState({
    code: plan?.code ?? '', name: plan?.name ?? '',
    priceMonthly: plan?.priceMonthly ?? 0, priceYearly: plan?.priceYearly ?? 0,
    sortOrder: plan?.sortOrder ?? 0, active: plan?.active ?? true,
    features: JSON.stringify(plan?.features ?? [], null, 2),
    limits: JSON.stringify(plan?.limits ?? {}, null, 2),
  });
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    try {
      const body: any = { ...form, features: JSON.parse(form.features), limits: JSON.parse(form.limits) };
      if (plan) await put(`admin/plans/${plan.id}`, body); else await post('admin/plans', body);
      onClose();
    } catch (e) { setError((e as ApiError)?.message ?? '保存失败（检查 JSON 格式）'); }
  };
  return (
    <Modal title={plan ? `编辑套餐：${plan.name}` : '新建套餐'} onClose={onClose}>
      <div className="ap-form">
        <Field label="编码 code" value={form.code} onChange={(v) => set('code', v)} placeholder="如 pro" />
        <Field label="名称" value={form.name} onChange={(v) => set('name', v)} />
        <div className="ap-form-row"><Field label="月付价格" value={String(form.priceMonthly)} onChange={(v) => set('priceMonthly', Number(v))} /><Field label="年付价格" value={String(form.priceYearly)} onChange={(v) => set('priceYearly', Number(v))} /></div>
        <div className="ap-form-row"><Field label="排序" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v))} /><div className="ap-field"><label>状态</label><select value={String(form.active)} onChange={(e) => set('active', e.target.value === 'true')}><option value="true">上架</option><option value="false">下架</option></select></div></div>
        <div className="ap-field"><label>权益 features（JSON 数组）</label><textarea rows={3} value={form.features} onChange={(e) => set('features', e.target.value)} /></div>
        <div className="ap-field"><label>限制 limits（JSON 对象）</label><textarea rows={3} value={form.limits} onChange={(e) => set('limits', e.target.value)} /></div>
        {error && <div className="ap-error">{error}</div>}
        <div className="ap-modal-actions"><button className="ap-btn" onClick={onClose}>取消</button><button className="ap-btn primary" onClick={submit}><Save size={14} />保存</button></div>
      </div>
    </Modal>
  );
}

// ---------- 模板管理 ----------
function TemplatesPanel() {
  const [globalOnly, setGlobalOnly] = useState(false);
  const { data, loading, error, reload } = useApi<any>(`admin/templates${globalOnly ? '?isGlobal=true' : ''}`, [globalOnly]);
  return (
    <section>
      <div className="ap-toolbar">
        <div className="ap-filters"><label className="ap-checkbox"><input type="checkbox" checked={globalOnly} onChange={(e) => setGlobalOnly(e.target.checked)} />只看全局模板</label></div>
        <div className="ap-actions"><button className="ap-btn" onClick={reload} disabled={loading}><RefreshCw size={14} /></button></div>
      </div>
      {error && <div className="ap-error">{error}</div>}
      <DataTable loading={loading} columns={['名称', '分类', '归属', '上架', '价格', '安装数', '操作']}
        rows={(data ?? []).map((t: any) => [
          <strong key="n">{t.name}</strong>, t.category || '—', t.isGlobal ? <span key="g" className="ap-tag">全局</span> : '租户私有',
          <StatusBadge key="p" status={t.isPublic ? 'active' : 'disabled'} />, `¥${t.price}`, t.installs,
          <div key="a" className="ap-row-actions">
            <button title={t.isPublic ? '下架' : '上架'} onClick={async () => { await patch(`admin/templates/${t.id}/public`, { isPublic: !t.isPublic }); reload(); }}>{t.isPublic ? <Ban size={14} /> : <Check size={14} />}</button>
            <button title="删除" className="danger" onClick={async () => { if (confirm(`删除模板 ${t.name}？`)) { await del(`admin/templates/${t.id}`); reload(); } }}><Trash2 size={14} /></button>
          </div>,
        ])} />
    </section>
  );
}

// ---------- 插件目录 ----------
function PluginsPanel() {
  const { data, loading, error, reload } = useApi<any[]>('admin/plugins');
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  return (
    <section>
      <div className="ap-toolbar">
        <div className="ap-filters" />
        <div className="ap-actions"><button className="ap-btn primary" onClick={() => setCreating(true)}><Plus size={14} />新建插件</button><button className="ap-btn" onClick={reload} disabled={loading}><RefreshCw size={14} /></button></div>
      </div>
      {error && <div className="ap-error">{error}</div>}
      <DataTable loading={loading} columns={['编码', '名称', '分类', '版本', '价格', '状态', '操作']}
        rows={(data ?? []).map((p: any) => [
          <code key="c">{p.code}</code>, <strong key="n">{p.name}</strong>, <span key="cat" className="ap-tag">{p.category}</span>, p.version, `¥${p.price}`,
          <StatusBadge key="s" status={p.enabled ? 'active' : 'disabled'} />,
          <div key="a" className="ap-row-actions">
            <button title="编辑" onClick={() => setEditing(p)}><Pencil size={14} /></button>
            <button title="删除" className="danger" onClick={async () => { if (confirm(`删除插件 ${p.name}？`)) { try { await del(`admin/plugins/${p.id}`); reload(); } catch (e) { alert((e as ApiError).message); } } }}><Trash2 size={14} /></button>
          </div>,
        ])} />
      {(editing || creating) && <PluginModal plugin={editing} onClose={() => { setEditing(null); setCreating(false); reload(); }} />}
    </section>
  );
}

function PluginModal({ plugin, onClose }: { plugin: any; onClose: () => void }) {
  const [form, setForm] = useState({
    code: plugin?.code ?? '', name: plugin?.name ?? '', description: plugin?.description ?? '',
    category: plugin?.category ?? 'general', version: plugin?.version ?? '1.0.0',
    author: plugin?.author ?? '', price: plugin?.price ?? 0, sortOrder: plugin?.sortOrder ?? 0,
    enabled: plugin?.enabled ?? true,
    configSchema: JSON.stringify(plugin?.configSchema ?? [], null, 2),
  });
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    try {
      const body: any = { ...form, configSchema: JSON.parse(form.configSchema) };
      if (plugin) await put(`admin/plugins/${plugin.id}`, body); else await post('admin/plugins', body);
      onClose();
    } catch (e) { setError((e as ApiError)?.message ?? '保存失败（检查 JSON 格式）'); }
  };
  return (
    <Modal title={plugin ? `编辑插件：${plugin.name}` : '新建插件'} onClose={onClose}>
      <div className="ap-form">
        <div className="ap-form-row"><Field label="编码 code" value={form.code} onChange={(v) => set('code', v)} placeholder="如 ai-builder" /><Field label="名称" value={form.name} onChange={(v) => set('name', v)} /></div>
        <Field label="描述" value={form.description} onChange={(v) => set('description', v)} />
        <div className="ap-form-row"><Field label="分类" value={form.category} onChange={(v) => set('category', v)} /><Field label="版本" value={form.version} onChange={(v) => set('version', v)} /></div>
        <div className="ap-form-row"><Field label="作者" value={form.author} onChange={(v) => set('author', v)} /><Field label="价格" value={String(form.price)} onChange={(v) => set('price', Number(v))} /></div>
        <div className="ap-form-row"><Field label="排序" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v))} /><div className="ap-field"><label>状态</label><select value={String(form.enabled)} onChange={(e) => set('enabled', e.target.value === 'true')}><option value="true">启用</option><option value="false">停用</option></select></div></div>
        <div className="ap-field"><label>配置 schema（JSON 数组）</label><textarea rows={3} value={form.configSchema} onChange={(e) => set('configSchema', e.target.value)} /></div>
        {error && <div className="ap-error">{error}</div>}
        <div className="ap-modal-actions"><button className="ap-btn" onClick={onClose}>取消</button><button className="ap-btn primary" onClick={submit}><Save size={14} />保存</button></div>
      </div>
    </Modal>
  );
}

// ---------- 审计日志 ----------
function AuditPanel() {
  const [action, setAction] = useState('');
  const { data, loading, error, reload } = useApi<any>(`admin/audit?limit=200${action ? `&action=${encodeURIComponent(action)}` : ''}`, [action]);
  return (
    <section>
      <div className="ap-toolbar">
        <div className="ap-filters"><div className="ap-search"><Search size={15} /><input placeholder="筛选操作（如 admin.user）" value={action} onChange={(e) => setAction(e.target.value)} /></div></div>
        <div className="ap-actions"><button className="ap-btn" onClick={reload} disabled={loading}><RefreshCw size={14} /></button></div>
      </div>
      {error && <div className="ap-error">{error}</div>}
      <DataTable loading={loading} columns={['时间', '操作', '对象', '对象 ID', '用户', '详情']}
        rows={(data ?? []).map((a: any) => [
          new Date(a.createdAt).toLocaleString('zh-CN'), <code key="ac">{a.action}</code>, a.targetType || '—',
          a.targetId?.slice(0, 8) || '—', a.userId?.slice(0, 8) || '系统',
          <span key="m" className="ap-meta">{a.meta ? JSON.stringify(a.meta).slice(0, 60) : ''}</span>,
        ])} />
    </section>
  );
}

// ---------- 通用 UI ----------
function Toolbar({ loading, onReload, error }: { loading: boolean; onReload: () => void; error: string }) {
  return (
    <div className="ap-toolbar"><div className="ap-filters" /><div className="ap-actions"><button className="ap-btn" onClick={onReload} disabled={loading}><RefreshCw size={14} /></button></div>
      {error && <div className="ap-error">{error}</div>}
    </div>
  );
}

function DataTable({ columns, rows, loading }: { columns: string[]; rows: React.ReactNode[][]; loading: boolean }) {
  if (loading) return <div className="ap-loading">加载中…</div>;
  if (!rows.length) return <div className="ap-empty">暂无数据</div>;
  return (
    <div className="ap-table-wrap"><table className="ap-table">
      <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody>
    </table></div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="ap-modal-overlay" onClick={onClose}>
      <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ap-modal-header"><h3>{title}</h3><button onClick={onClose}><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return <div className="ap-field"><label>{label}</label><input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></div>;
}

function RoleBadge({ role }: { role: string }) {
  const cls = role === 'super_admin' ? 'super' : role === 'tenant_admin' ? 'tenant' : 'user';
  const label = role === 'super_admin' ? '超管' : role === 'tenant_admin' ? '租户管理员' : '用户';
  return <span className={`ap-role ${cls}`}>{label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`ap-status ${status === 'active' ? 'on' : 'off'}`}>{status === 'active' ? '正常' : status}</span>;
}
