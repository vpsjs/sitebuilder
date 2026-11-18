import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Globe2, Inbox, LayoutTemplate,
  Puzzle, CreditCard, Users, Shield, BarChart3, Ticket, Megaphone,
  UserRound, ShoppingBag, ShoppingCart, Network, LogOut, ExternalLink,
  Menu, X, ChevronRight, Plus, Check, AlertCircle, Clock, RotateCcw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { currentUser, del, get, isLoggedIn, login, logout, post, put, register } from './api';
import './App.css';

type NavItem = { id: string; label: string; icon: LucideIcon; section: string; superOnly?: boolean };

const NAV: NavItem[] = [
  { id: 'overview', label: '运营概览', icon: LayoutDashboard, section: '工作台' },
  { id: 'stats', label: '数据统计', icon: BarChart3, section: '运营' },
  { id: 'coupons', label: '优惠券', icon: Ticket, section: '运营' },
  { id: 'campaigns', label: '营销活动', icon: Megaphone, section: '运营' },
  { id: 'members', label: '会员管理', icon: UserRound, section: '运营' },
  { id: 'products', label: '商品管理', icon: ShoppingBag, section: '交易' },
  { id: 'shopOrders', label: '商城订单', icon: ShoppingCart, section: '交易' },
  { id: 'distributors', label: '分销管理', icon: Network, section: '交易' },
  { id: 'templates', label: '模板中心', icon: LayoutTemplate, section: '通用' },
  { id: 'plugins', label: '插件中心', icon: Puzzle, section: '通用' },
  { id: 'billing', label: '套餐与订单', icon: CreditCard, section: '账户' },
  { id: 'team', label: '团队管理', icon: Users, section: '账户' },
  { id: 'audit', label: '操作日志', icon: Shield, section: '账户' },
  { id: 'tenants', label: '租户管理', icon: Shield, section: '系统', superOnly: true },
];

function App() {
  const [authed, setAuthed] = useState(isLoggedIn());
  const [active, setActive] = useState(() => {
    const hash = location.hash.replace(/^#\/?/, '');
    return NAV.some((n) => n.id === hash) ? hash : 'overview';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = currentUser();
  const visibleNav = NAV.filter((n) => !n.superOnly || user?.role === 'super_admin');

  useEffect(() => {
    const onHash = () => {
      const hash = location.hash.replace(/^#\/?/, '');
      if (NAV.some((n) => n.id === hash)) setActive(hash);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (!authed) return <AuthScreen onSuccess={() => setAuthed(true)} />;

  return (
    <div className="admin-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">S</div>
          <div>
            <div className="brand-title">SiteBuilder</div>
            <div className="brand-sub">小程序运营中心</div>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <nav className="sidebar-nav">
          {[...new Set(visibleNav.map((n) => n.section))].map((section) => (
            <div key={section} className="nav-section">
              <div className="nav-section-label">{section}</div>
              {visibleNav.filter((n) => n.section === section).map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${active === item.id ? 'active' : ''}`}
                  onClick={() => { setActive(item.id); setSidebarOpen(false); location.hash = `/${item.id}`; }}
                >
                  <item.icon size={17} />
                  <span>{item.label}</span>
                  {active === item.id && <ChevronRight size={14} className="nav-chevron" />}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.[0] ?? 'U'}</div>
            <div className="user-meta">
              <div className="user-name">{user?.name ?? '用户'}</div>
              <div className="user-role">{user?.role === 'super_admin' ? '超级管理员' : '租户管理员'}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={() => { logout(); setAuthed(false); }} title="退出登录">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
          <div className="topbar-title">{visibleNav.find((n) => n.id === active)?.label ?? '概览'}</div>
          <div className="topbar-actions">
            <a href="http://localhost:5175/" target="_blank" rel="noreferrer" className="topbar-link" title="切换到网站装修后台">
              <Globe2 size={14} /> 网站装修后台 <ExternalLink size={14} />
            </a>
          </div>
        </header>
        <div className="content-area">
          <PageRouter active={active} />
        </div>
      </main>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

function PageRouter({ active }: { active: string }) {
  switch (active) {
    case 'overview': return <Overview />;
    case 'templates': return <Templates />;
    case 'plugins': return <Plugins />;
    case 'stats': return <Stats />;
    case 'coupons': return <Coupons />;
    case 'campaigns': return <Campaigns />;
    case 'members': return <Members />;
    case 'products': return <Products />;
    case 'shopOrders': return <ShopOrders />;
    case 'distributors': return <Distributors />;
    case 'billing': return <Billing />;
    case 'team': return <Team />;
    case 'audit': return <Audit />;
    case 'tenants': return <Tenants />;
    default: return <Overview />;
  }
}

// ---------- 通用组件 ----------
function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div><h1>{title}</h1><p>{description}</p></div>
      {action}
    </div>
  );
}

function Loading() { return <div className="loading">加载中…</div>; }
function Empty({ text }: { text: string }) { return <div className="empty">{text}</div>; }

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: LucideIcon; tone: string }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={20} /></div>
      <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
    </div>
  );
}

function DataTable({ columns, rows, onAction }: {
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[];
  rows: any[];
  onAction?: (row: any) => React.ReactNode;
}) {
  if (rows.length === 0) return <Empty text="暂无数据" />;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}{onAction && <th>操作</th>}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
              {columns.map((c) => (
                <td key={c.key} data-label={c.label}>{c.render ? c.render(row) : String(row[c.key] ?? '—')}</td>
              ))}
              {onAction && <td data-label="操作" className="action-cell">{onAction(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function useFetch<T = any>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    get<T>(path).then(setData).catch((e) => setError(e.message));
  }, [path, refreshKey]);
  return { data, error, refresh: () => setRefreshKey((k) => k + 1) };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'green', published: 'green', paid: 'green', read: 'green', settled: 'green',
    pending: 'amber', unread: 'amber', draft: 'gray', cancelled: 'gray',
  };
  const labels: Record<string, string> = {
    active: '正常', published: '已发布', paid: '已支付', read: '已读', settled: '已结算',
    pending: '待处理', unread: '未读', draft: '草稿', cancelled: '已取消',
  };
  return <span className={`badge ${map[status] ?? 'gray'}`}>{labels[status] ?? status}</span>;
}

// ---------- 页面 ----------
function Overview() {
  const { data } = useFetch<any>('stats');
  return (
    <>
      <PageHeader title="运营概览" description="站点与业务数据一览" />
      <div className="stat-grid">
        <StatCard label="累计访问量" value={data?.pageViews ?? '—'} icon={BarChart3} tone="blue" />
        <StatCard label="表单留言" value={data?.submissions ?? '—'} icon={Inbox} tone="amber" />
        <StatCard label="会员数" value={data?.members ?? '—'} icon={UserRound} tone="purple" />
        <StatCard label="商城订单" value={data?.orders ?? '—'} icon={ShoppingCart} tone="green" />
      </div>
      <div className="panel">
        <h3>近 14 天访问趋势</h3>
        {!data ? <Loading /> : (
          <div className="chart">
            {(data.dailyViews ?? []).map((d: any) => {
              const max = Math.max(...(data.dailyViews ?? []).map((x: any) => x.views), 1);
              return (
                <div key={d.day} className="chart-col" title={`${d.day}: ${d.views}`}>
                  <div className="chart-bar" style={{ height: `${Math.max(4, (d.views / max) * 100)}%` }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="quick-links">
        <a href="http://localhost:5175/" target="_blank" rel="noreferrer" className="quick-link">
          <Globe2 size={20} /><div><strong>网站装修后台</strong><span>管理站点、页面与装修</span></div><ExternalLink size={16} />
        </a>
        <a href="#/products" className="quick-link">
          <ShoppingBag size={20} /><div><strong>商品管理</strong><span>上架与管理在售商品</span></div><ChevronRight size={16} />
        </a>
      </div>
    </>
  );
}

const EDITOR_URL = 'http://localhost:5173';
const SITE_URL = 'http://localhost:3001';
const DEMO_TENANT = 'demo';

export function Sites() {
  const { data, refresh } = useFetch<any[]>('sites');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [msg, setMsg] = useState('');
  const create = async () => {
    if (!name.trim() || !slug.trim()) { setMsg('请填写站点名称和标识'); return; }
    try {
      setMsg('');
      await post('sites', { name: name.trim(), slug: slug.trim() });
      setName(''); setSlug(''); refresh();
    } catch (e) { setMsg(e instanceof Error ? e.message : '创建失败'); }
  };
  const remove = async (r: any) => {
    if (!confirm(`确定删除站点「${r.name}」？该站点下的页面与发布记录将一并删除。`)) return;
    try { await del(`sites/${r.id}`); refresh(); }
    catch (e) { alert(e instanceof Error ? e.message : '删除失败'); }
  };
  return (
    <>
      <PageHeader title="站点管理" description="创建和管理您的网站" action={
        <div className="inline-form">
          <input placeholder="站点名称" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="标识 slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <button className="btn-primary" onClick={create}><Plus size={15} />新建站点</button>
        </div>
      } />
      {msg && <div className="text-red">{msg}</div>}
      <div className="panel">
        {!data ? <Loading /> : <DataTable
          columns={[
            { key: 'name', label: '站点名称' },
            { key: 'slug', label: '标识', render: (r) => <code>{r.slug}</code> },
            { key: 'status', label: '状态', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'createdAt', label: '创建时间', render: (r) => formatDate(r.createdAt) },
          ]}
          rows={data}
          onAction={(r) => <>
            <a href={`${EDITOR_URL}/?site=${r.id}`} target="_blank" rel="noreferrer" className="link-btn">装修首页</a>
            {r.status === 'published' && (
              <a href={`${SITE_URL}/s/${DEMO_TENANT}/${r.slug}`} target="_blank" rel="noreferrer" className="link-btn">查看</a>
            )}
            <button className="link-btn" onClick={() => remove(r)}>删除</button>
          </>}
        />}
      </div>
    </>
  );
}

export function Pages() {
  const { data, refresh } = useFetch<any[]>('pages');
  const sites = useFetch<any[]>('sites');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [siteId, setSiteId] = useState('');
  const [msg, setMsg] = useState('');
  const siteOf = (id: string) => (sites.data ?? []).find((s) => s.id === id);
  const siteName = (id: string) => siteOf(id)?.name ?? '—';
  const create = async () => {
    if (!name.trim() || !slug.trim() || !siteId) { setMsg('请选择站点并填写页面名称与标识'); return; }
    try {
      setMsg('');
      await post('pages', { siteId, name: name.trim(), slug: slug.trim() });
      setName(''); setSlug(''); refresh();
    } catch (e) { setMsg(e instanceof Error ? e.message : '创建失败'); }
  };
  const publish = async (r: any) => {
    try { await post(`pages/${r.id}/publish`); refresh(); }
    catch (e) { alert(e instanceof Error ? e.message : '发布失败'); }
  };
  const remove = async (r: any) => {
    if (r.isHome) { alert('首页不可删除，可通过装修器编辑内容'); return; }
    if (!confirm(`确定删除页面「${r.name}」？`)) return;
    try { await del(`pages/${r.id}`); refresh(); }
    catch (e) { alert(e instanceof Error ? e.message : '删除失败'); }
  };
  return (
    <>
      <PageHeader title="页面管理" description="装修并发布站点下的独立页面，发布后可通过专属地址访问" action={
        <div className="inline-form">
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">选择站点</option>
            {(sites.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input placeholder="页面名称" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <button className="btn-primary" onClick={create}><Plus size={15} />新建页面</button>
        </div>
      } />
      {msg && <div className="text-red">{msg}</div>}
      <div className="panel">
        {!data ? <Loading /> : <DataTable
          columns={[
            { key: 'name', label: '页面', render: (r) => <span>{r.isHome && <span className="tag">首页</span>}{r.name}</span> },
            { key: 'site', label: '所属站点', render: (r) => siteName(r.siteId) },
            { key: 'slug', label: 'slug', render: (r) => <code>{r.slug}</code> },
            { key: 'status', label: '状态', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'updatedAt', label: '更新时间', render: (r) => formatDate(r.updatedAt) },
          ]}
          rows={data}
          onAction={(r) => <>
            <a href={`${EDITOR_URL}/?site=${r.siteId}&page=${r.id}`} target="_blank" rel="noreferrer" className="link-btn">装修</a>
            <button className="link-btn" onClick={() => publish(r)}>发布</button>
            {r.status === 'published' && siteOf(r.siteId) && (
              <a href={`${SITE_URL}/s/${DEMO_TENANT}/${siteOf(r.siteId)?.slug}/p/${r.slug}`} target="_blank" rel="noreferrer" className="link-btn">查看</a>
            )}
            <button className="link-btn" onClick={() => remove(r)}>删除</button>
          </>}
        />}
      </div>
    </>
  );
}

export function Domains() {
  const { data, refresh } = useFetch<any[]>('domains');
  const sites = useFetch<any[]>('sites');
  const [domain, setDomain] = useState('');
  const [siteId, setSiteId] = useState('');
  const add = async () => {
    if (!domain || !siteId) return;
    await post('domains', { domain, siteId }); setDomain(''); refresh();
  };
  return (
    <>
      <PageHeader title="域名绑定" description="绑定自有域名，自动配置 SSL 证书" action={
        <div className="inline-form">
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">选择站点</option>
            {(sites.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input placeholder="www.example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
          <button className="btn-primary" onClick={add}><Plus size={15} />添加域名</button>
        </div>
      } />
      <div className="panel">
        {!data ? <Loading /> : <DataTable
          columns={[
            { key: 'domain', label: '域名', render: (r) => <strong>{r.domain}</strong> },
            { key: 'verified', label: '验证', render: (r) => r.verified ? <span className="text-green">已验证</span> : <code className="text-amber">{r.verifyToken}</code> },
            { key: 'sslStatus', label: 'SSL', render: (r) => <StatusBadge status={r.sslStatus === 'active' ? 'active' : 'pending'} /> },
          ]}
          rows={data}
          onAction={(r) => !r.verified ? <button className="link-btn" onClick={async () => { await post(`domains/${r.id}/verify`); refresh(); }}>验证并签发</button> : null}
        />}
      </div>
    </>
  );
}

/** 发布历史与版本回滚 */
export function History() {
  const sites = useFetch<any[]>('sites');
  const [siteId, setSiteId] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [message, setMessage] = useState('');

  const currentSiteId = siteId || sites.data?.[0]?.id || '';
  const history = useFetch<any[]>(currentSiteId ? `sites/${currentSiteId}/publish/history` : 'sites/none/publish/history');

  const rollback = async (v: number) => {
    if (!confirm(`确定回滚到 v${v}？当前线上内容将被替换。`)) return;
    try {
      const r = await post(`sites/${currentSiteId}/publish/rollback/${v}`);
      setMessage(`✓ 已回滚到 v${v}，线上已即时更新`);
      history.refresh();
      void r;
    } catch (e) { setMessage(`✗ ${e instanceof Error ? e.message : '回滚失败'}`); }
  };

  const showPreview = async () => {
    try { setPreview(await get(`sites/${currentSiteId}/publish/preview`)); }
    catch (e) { setMessage(`✗ ${e instanceof Error ? e.message : '预览失败'}`); }
  };

  return (
    <>
      <PageHeader title="发布历史" description="查看版本记录、预览草稿与一键回滚" action={
        <div className="inline-form">
          <select value={currentSiteId} onChange={(e) => { setSiteId(e.target.value); history.refresh(); }}>
            {(sites.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn-small" onClick={showPreview}><Clock size={14} />查看草稿</button>
        </div>
      } />
      {message && <div className="notice">{message}</div>}
      {preview && (
        <div className="panel">
          <div className="flex-between"><h3>草稿快照 · {preview.name}</h3>
            <button className="btn-small" onClick={() => setPreview(null)}>关闭</button></div>
          <p className="muted">标题：{preview.schema?.meta?.title ?? '—'} · 更新于 {formatDate(preview.updatedAt)}</p>
          <a href={preview.previewUrl} target="_blank" rel="noreferrer" className="link-btn">在装修器中预览 →</a>
        </div>
      )}
      <div className="panel">{!history.data ? <Loading /> : <DataTable
        columns={[
          { key: 'version', label: '版本', render: (r) => <strong>v{r.version}</strong> },
          { key: 'note', label: '说明', render: (r) => r.note || '—' },
          { key: 'title', label: '页面标题', render: (r) => r.schema?.meta?.title ?? '—' },
          { key: 'createdAt', label: '发布时间', render: (r) => formatDate(r.createdAt) },
        ]} rows={history.data}
        onAction={(r) => <button className="link-btn" onClick={() => rollback(r.version)} title="回滚到此版本">
          <RotateCcw size={13} /> 回滚
        </button>}
      />}
      </div>
    </>
  );
}

export function Submissions() {
  const { data, refresh } = useFetch<any[]>('submissions');
  return (
    <>
      <PageHeader title="表单留言" description="查看客户通过网站表单提交的信息" />
      <div className="panel">
        {!data ? <Loading /> : <DataTable
          columns={[
            { key: 'status', label: '状态', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'name', label: '姓名', render: (r) => r.data?.name ?? '—' },
            { key: 'phone', label: '电话', render: (r) => r.data?.phone ?? '—' },
            { key: 'message', label: '内容', render: (r) => r.data?.message ?? '—' },
            { key: 'createdAt', label: '时间', render: (r) => formatDate(r.createdAt) },
          ]}
          rows={data}
          onAction={(r) => r.status === 'unread' ? <button className="link-btn" onClick={async () => { await put(`submissions/${r.id}`, { status: 'read' }); refresh(); }}>标为已读</button> : null}
        />}
      </div>
    </>
  );
}

function Templates() {
  const { data, refresh } = useFetch<any[]>('templates');
  const [name, setName] = useState('');
  const create = async () => {
    if (!name) return;
    await post('templates/global', { name, category: '自定义', description: '', schema: { version: 1, meta: { title: name }, root: { id: 'root', type: 'container', props: {}, children: [] } } });
    setName(''); refresh();
  };
  return (
    <>
      <PageHeader title="模板中心" description="管理全局模板与租户模板" action={
        <div className="inline-form"><input placeholder="新模板名称（超管）" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn-primary" onClick={create}><Plus size={15} />创建模板</button></div>
      } />
      <div className="template-grid">
        {!data ? <Loading /> : data.length === 0 ? <Empty text="暂无模板" /> : data.map((t) => (
          <div key={t.id} className="template-card">
            <div className="template-cover" style={{ background: t.cover || '#171717' }} />
            <div className="template-body">
              <div className="template-title">{t.name}</div>
              <p>{t.description || '暂无描述'}</p>
              <div className="template-meta">
                {t.isGlobal ? <span className="tag">全局</span> : <span className="tag tag-alt">私有</span>}
                {t.isPublic && <span className="tag">市场</span>}
                <span className="muted">¥{Number(t.price ?? 0).toFixed(0)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Plugins() {
  const { data, refresh } = useFetch<any[]>('plugins');
  const registry = [
    { id: 'analytics', name: '访客统计', desc: '提供访客计数组件与发布埋点', category: '数据' },
    { id: 'form', name: '表单收集', desc: '表单组件与留言管理', category: '营销' },
    { id: 'seo', name: 'SEO 优化', desc: '自动生成站点地图与元信息', category: '营销' },
    { id: 'coupon', name: '优惠券', desc: '在站点中展示与领取优惠券', category: '交易' },
    { id: 'member', name: '会员中心', desc: '会员注册登录与积分', category: '交易' },
    { id: 'live', name: '直播插件', desc: '直播间与商品挂载', category: '营销' },
  ];
  return (
    <>
      <PageHeader title="插件中心" description="为站点安装和启用能力扩展" />
      <div className="plugin-grid">
        {registry.map((p) => {
          const installed = data?.find((x) => x.pluginId === p.id);
          return (
            <div key={p.id} className="plugin-card">
              <div className="plugin-icon"><Puzzle size={20} /></div>
              <div className="plugin-info">
                <div className="plugin-name">{p.name} <span className="tag tag-alt">{p.category}</span></div>
                <p>{p.desc}</p>
              </div>
              <button
                className={`btn-small ${installed?.enabled ? 'btn-installed' : ''}`}
                onClick={async () => { await post('plugins/install', { pluginId: p.id }); refresh(); }}
              >
                {installed?.enabled ? <><Check size={14} />已启用</> : '安装'}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Stats() {
  const { data } = useFetch<any>('stats');
  return (
    <>
      <PageHeader title="数据统计" description="站点访问、留言与交易数据" />
      <div className="stat-grid">
        <StatCard label="页面访问" value={data?.pageViews ?? '—'} icon={BarChart3} tone="blue" />
        <StatCard label="表单留言" value={data?.submissions ?? '—'} icon={Inbox} tone="amber" />
        <StatCard label="未读留言" value={data?.unread ?? '—'} icon={AlertCircle} tone="red" />
        <StatCard label="营收" value={`¥${Number(data?.revenue ?? 0).toFixed(0)}`} icon={CreditCard} tone="green" />
      </div>
      <div className="panel"><h3>访问趋势（近14天）</h3>
        {!data ? <Loading /> : <div className="chart">
          {(data.dailyViews ?? []).map((d: any) => {
            const max = Math.max(...(data.dailyViews ?? []).map((x: any) => x.views), 1);
            return <div key={d.day} className="chart-col" title={`${d.day}: ${d.views}`}><div className="chart-bar" style={{ height: `${Math.max(4, (d.views / max) * 100)}%` }} /></div>;
          })}
        </div>}
      </div>
    </>
  );
}

function Coupons() {
  const { data, refresh } = useFetch<any[]>('coupons');
  const [form, setForm] = useState({ name: '', type: 'amount', value: 100, minAmount: 0, total: 100 });
  const create = async () => { if (!form.name) return; await post('coupons', { ...form, min_amount: form.minAmount }); setForm({ ...form, name: '' }); refresh(); };
  return (
    <>
      <PageHeader title="优惠券" description="创建与管理营销优惠券" action={
        <div className="inline-form">
          <input placeholder="券名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="amount">满减</option><option value="discount">折扣</option></select>
          <input type="number" placeholder="面额" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          <button className="btn-primary" onClick={create}><Plus size={15} />创建</button>
        </div>
      } />
      <div className="panel">{!data ? <Loading /> : <DataTable
        columns={[
          { key: 'name', label: '名称' },
          { key: 'type', label: '类型', render: (r) => r.type === 'amount' ? '满减' : '折扣' },
          { key: 'value', label: '面额', render: (r) => r.type === 'amount' ? `¥${r.value}` : `${(Number(r.value) * 10).toFixed(0)}折` },
          { key: 'used', label: '已领/总量', render: (r) => `${r.used}/${r.total}` },
          { key: 'status', label: '状态', render: (r) => <StatusBadge status={r.status} /> },
        ]} rows={data} />}
      </div>
    </>
  );
}

function Campaigns() {
  const { data, refresh } = useFetch<any[]>('campaigns');
  const [form, setForm] = useState({ name: '', type: 'seckill' });
  const create = async () => { if (!form.name) return; await post('campaigns', { ...form, config: {} }); setForm({ ...form, name: '' }); refresh(); };
  return (
    <>
      <PageHeader title="营销活动" description="秒杀、拼团、满减等营销玩法" action={
        <div className="inline-form">
          <input placeholder="活动名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="seckill">秒杀</option><option value="groupbuy">拼团</option><option value="fullreduce">满减</option></select>
          <button className="btn-primary" onClick={create}><Plus size={15} />创建活动</button>
        </div>
      } />
      <div className="panel">{!data ? <Loading /> : <DataTable
        columns={[
          { key: 'name', label: '活动名称' },
          { key: 'type', label: '类型', render: (r) => (({ seckill: '秒杀', groupbuy: '拼团', fullreduce: '满减' } as Record<string, string>)[r.type] ?? r.type) },
          { key: 'status', label: '状态', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'createdAt', label: '创建时间', render: (r) => formatDate(r.createdAt) },
        ]} rows={data} />}
      </div>
    </>
  );
}

function Members() {
  const { data, refresh } = useFetch<any[]>('members');
  const levels = useFetch<any[]>('members/levels');
  const [form, setForm] = useState({ name: '', phone: '' });
  const create = async () => { if (!form.name) return; await post('members', form); setForm({ name: '', phone: '' }); refresh(); };
  return (
    <>
      <PageHeader title="会员管理" description="客户 CRM、积分与会员等级" action={
        <div className="inline-form">
          <input placeholder="会员姓名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="手机号" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <button className="btn-primary" onClick={create}><Plus size={15} />添加会员</button>
        </div>
      } />
      <div className="level-row">
        {(levels.data ?? []).map((l) => <div key={l.id} className="level-chip" style={{ borderColor: l.color }}><span style={{ color: l.color }}>●</span>{l.name}<small>≥{l.minPoints}分 · {Number(l.discount) * 10}折</small></div>)}
      </div>
      <div className="panel">{!data ? <Loading /> : <DataTable
        columns={[
          { key: 'name', label: '姓名' }, { key: 'phone', label: '手机号' },
          { key: 'points', label: '积分' },
          { key: 'totalSpent', label: '累计消费', render: (r) => `¥${Number(r.totalSpent).toFixed(0)}` },
          { key: 'level', label: '等级', render: (r) => levels.data?.find((l) => l.id === r.levelId)?.name ?? '—' },
          { key: 'createdAt', label: '加入时间', render: (r) => formatDate(r.createdAt) },
        ]} rows={data} />}
      </div>
    </>
  );
}

function Products() {
  const { data, refresh } = useFetch<any[]>('products');
  const [form, setForm] = useState({ name: '', price: 0, stock: 0 });
  const create = async () => { if (!form.name) return; await post('products', form); setForm({ name: '', price: 0, stock: 0 }); refresh(); };
  return (
    <>
      <PageHeader title="商品管理" description="管理在售商品与服务" action={
        <div className="inline-form">
          <input placeholder="商品名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input type="number" placeholder="价格" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <input type="number" placeholder="库存" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
          <button className="btn-primary" onClick={create}><Plus size={15} />添加商品</button>
        </div>
      } />
      <div className="panel">{!data ? <Loading /> : <DataTable
        columns={[
          { key: 'name', label: '商品' }, { key: 'category', label: '分类' },
          { key: 'price', label: '价格', render: (r) => `¥${Number(r.price).toFixed(2)}` },
          { key: 'stock', label: '库存' },
          { key: 'status', label: '状态', render: (r) => <StatusBadge status={r.status} /> },
        ]} rows={data} />}
      </div>
    </>
  );
}

function ShopOrders() {
  const { data } = useFetch<any[]>('shop-orders');
  const products = useFetch<any[]>('products');
  const members = useFetch<any[]>('members');
  const [productId, setProductId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [qty, setQty] = useState(1);
  const create = async () => {
    if (!productId) return;
    await post('shop-orders', { items: [{ productId, quantity: qty }], memberId: memberId || undefined });
    location.reload();
  };
  return (
    <>
      <PageHeader title="商城订单" description="创建订单自动扣库存、累计积分并计算分销佣金" action={
        <div className="inline-form">
          <select value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">选择商品</option>{(products.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)}><option value="">不关联会员</option>{(members.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <button className="btn-primary" onClick={create}><Plus size={15} />下单</button>
        </div>
      } />
      <div className="panel">{!data ? <Loading /> : <DataTable
        columns={[
          { key: 'orderNo', label: '订单号', render: (r) => <code>{r.orderNo}</code> },
          { key: 'amount', label: '金额', render: (r) => `¥${Number(r.amount).toFixed(2)}` },
          { key: 'items', label: '商品', render: (r) => (r.items ?? []).map((i: any) => i.name).join('、') },
          { key: 'status', label: '状态', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'createdAt', label: '时间', render: (r) => formatDate(r.createdAt) },
        ]} rows={data} />}
      </div>
    </>
  );
}

function Distributors() {
  const { data, refresh } = useFetch<any[]>('distributors');
  const commissions = useFetch<any[]>('distributors/commissions');
  const [name, setName] = useState('');
  const [rate, setRate] = useState(10);
  const create = async () => { if (!name) return; await post('distributors', { name, commissionRate: rate }); setName(''); refresh(); };
  return (
    <>
      <PageHeader title="分销管理" description="分销员与佣金结算" action={
        <div className="inline-form">
          <input placeholder="分销员名称" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="number" placeholder="佣金%" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          <button className="btn-primary" onClick={create}><Plus size={15} />添加分销员</button>
        </div>
      } />
      <div className="panel"><h3>分销员</h3>{!data ? <Loading /> : <DataTable
        columns={[
          { key: 'name', label: '名称' }, { key: 'code', label: '推广码', render: (r) => <code>{r.code}</code> },
          { key: 'commissionRate', label: '佣金率', render: (r) => `${r.commissionRate}%` },
          { key: 'totalCommission', label: '累计佣金', render: (r) => `¥${Number(r.totalCommission).toFixed(2)}` },
          { key: 'status', label: '状态', render: (r) => <StatusBadge status={r.status} /> },
        ]} rows={data} />}
      </div>
      <div className="panel"><h3>佣金记录</h3>{!commissions.data ? <Loading /> : <DataTable
        columns={[
          { key: 'amount', label: '金额', render: (r) => `¥${Number(r.amount).toFixed(2)}` },
          { key: 'status', label: '状态', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'createdAt', label: '时间', render: (r) => formatDate(r.createdAt) },
        ]} rows={commissions.data}
        onAction={(r) => r.status === 'pending' ? <button className="link-btn" onClick={async () => { await post(`distributors/commissions/${r.id}/settle`); commissions.refresh(); }}>结算</button> : null}
      />}
      </div>
    </>
  );
}

function Billing() {
  const plans = useFetch<any[]>('billing/plans');
  const orders = useFetch<any[]>('billing/orders');
  return (
    <>
      <PageHeader title="套餐与订单" description="选择套餐、管理订阅与支付" />
      <div className="plan-grid">
        {(plans.data ?? []).map((p) => (
          <div key={p.id} className="plan-card">
            <div className="plan-name">{p.name}</div>
            <div className="plan-price">¥{Number(p.priceMonthly).toFixed(0)}<small>/月</small></div>
            <div className="plan-yearly">年付 ¥{Number(p.priceYearly).toFixed(0)}</div>
            <ul>{(p.features ?? []).map((f: string, i: number) => <li key={i}><Check size={14} />{f}</li>)}</ul>
            <button className="btn-primary btn-block" onClick={async () => { await post('billing/subscribe', { planId: p.id, cycle: 'yearly' }); location.reload(); }}>
              选择 {p.name}
            </button>
          </div>
        ))}
      </div>
      <div className="panel"><h3>订单记录</h3>{!orders.data ? <Loading /> : <DataTable
        columns={[
          { key: 'orderNo', label: '订单号', render: (r) => <code>{r.orderNo}</code> },
          { key: 'type', label: '类型' },
          { key: 'amount', label: '金额', render: (r) => `¥${Number(r.amount).toFixed(2)}` },
          { key: 'status', label: '状态', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'createdAt', label: '时间', render: (r) => formatDate(r.createdAt) },
        ]} rows={orders.data}
        onAction={(r) => r.status === 'pending' ? <button className="link-btn" onClick={async () => { await post(`billing/orders/${r.id}/pay`); orders.refresh(); }}>支付</button> : null}
      />}
      </div>
    </>
  );
}

function Team() {
  const { data, refresh } = useFetch<any[]>('team/members');
  const [email, setEmail] = useState('');
  const [invited, setInvited] = useState('');
  const invite = async () => {
    if (!email) return;
    const r = await post<{ inviteUrl: string }>('team/invite', { email, role: 'user' });
    setInvited(r.inviteUrl); setEmail(''); refresh();
  };
  return (
    <>
      <PageHeader title="团队管理" description="邀请成员协作管理站点" action={
        <div className="inline-form">
          <input placeholder="成员邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn-primary" onClick={invite}><Plus size={15} />邀请成员</button>
        </div>
      } />
      {invited && <div className="notice"><Check size={16} />邀请已发送：{invited}</div>}
      <div className="panel">{!data ? <Loading /> : <DataTable
        columns={[
          { key: 'name', label: '姓名' }, { key: 'email', label: '邮箱' },
          { key: 'role', label: '角色', render: (r) => r.role === 'tenant_admin' ? '管理员' : '成员' },
          { key: 'createdAt', label: '加入时间', render: (r) => formatDate(r.createdAt) },
        ]} rows={data} />}
      </div>
    </>
  );
}

function Audit() {
  const { data } = useFetch<any[]>('audit');
  return (
    <>
      <PageHeader title="操作日志" description="记录平台内的关键操作" />
      <div className="panel">{!data ? <Loading /> : <DataTable
        columns={[
          { key: 'action', label: '操作', render: (r) => <strong>{r.action}</strong> },
          { key: 'targetType', label: '对象' }, { key: 'targetId', label: '对象ID', render: (r) => r.targetId ? <code>{r.targetId.slice(0, 8)}…</code> : '—' },
          { key: 'createdAt', label: '时间', render: (r) => formatDate(r.createdAt) },
        ]} rows={data} />}
      </div>
    </>
  );
}

function Tenants() {
  const { data } = useFetch<any[]>('tenants');
  return (
    <>
      <PageHeader title="租户管理" description="超级管理员查看所有租户" />
      <div className="panel">{!data ? <Loading /> : <DataTable
        columns={[
          { key: 'name', label: '租户名称' }, { key: 'slug', label: '标识', render: (r) => <code>{r.slug}</code> },
          { key: 'plan', label: '套餐', render: (r) => <span className="tag">{r.plan}</span> },
          { key: 'status', label: '状态', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'createdAt', label: '创建时间', render: (r) => formatDate(r.createdAt) },
        ]} rows={data} />}
      </div>
    </>
  );
}

function AuthScreen({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({
    email: 'user@demo.com', password: 'demo123', name: '',
    tenantName: '', tenantSlug: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-logo lg">S</div>
          <h1>SiteBuilder Studio</h1>
          <p>小程序运营中心 · 商品、会员、营销与分销</p>
        </div>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>登录</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>注册</button>
        </div>
        <form onSubmit={submit}>
          <label>邮箱</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <label>密码</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          {mode === 'register' && <>
            <label>您的姓名</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <label>企业/团队名称</label>
            <input value={form.tenantName} onChange={(e) => setForm({ ...form, tenantName: e.target.value })} required />
            <label>域名标识（用于子域名访问）</label>
            <input placeholder="mycompany" value={form.tenantSlug} onChange={(e) => setForm({ ...form, tenantSlug: e.target.value })} required />
          </>}
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn-primary btn-block auth-submit" disabled={loading}>
            {loading ? '处理中…' : mode === 'login' ? '登录管理后台' : '创建账号'}
          </button>
        </form>
        <div className="auth-hint">
          演示账号：user@demo.com / demo123<br />超管账号：admin@sitebuilder.io / admin123
        </div>
        <div className="auth-hint">
          网站装修后台请访问 <a href="http://localhost:5175/">localhost:5175</a>
        </div>
      </div>
    </div>
  );
}

function formatDate(d?: string | Date) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default App;
