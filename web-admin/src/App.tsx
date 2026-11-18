import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Globe2, FileText, Link2, Clock, Inbox, LayoutTemplate,
  Puzzle, ExternalLink, Menu, X, ChevronRight, Plus, Check, RotateCcw,
  Paintbrush, LogOut, Search, Eye, Sparkles, ArrowRight,
  Wand2, CheckCircle2, Newspaper, Copy, Loader2, Image as ImageIcon, ShieldCheck, Images,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { templates as officialTemplates, type TemplatePreviewKind } from '@/templates';
import { TemplatePreview } from './components/TemplatePreview';
import { ArticleManager as Articles } from './ArticleManager';
import AdminPanel from './AdminPanel';
import DomainManager from './DomainManager';
import MediaManager from './MediaManager';
import { currentUser, get, isLoggedIn, login, logout, post, put, register } from './api';
import './App.css';

type NavItem = { id: string; label: string; icon: LucideIcon; section: string; superOnly?: boolean };

const NAV: NavItem[] = [
  { id: 'overview', label: '概览', icon: LayoutDashboard, section: '工作台' },
  { id: 'sites', label: '站点管理', icon: Globe2, section: '工作台' },
  { id: 'pages', label: '页面管理', icon: FileText, section: '工作台' },
  { id: 'domains', label: '域名绑定', icon: Link2, section: '工作台' },
  { id: 'history', label: '发布历史', icon: Clock, section: '工作台' },
  { id: 'media', label: '媒体库', icon: Images, section: '内容' },
  { id: 'submissions', label: '表单留言', icon: Inbox, section: '内容' },
  { id: 'articles', label: '文章管理', icon: Newspaper, section: '内容' },
  { id: 'templates', label: '模板中心', icon: LayoutTemplate, section: '内容' },
  { id: 'plugins', label: '插件中心', icon: Puzzle, section: '内容' },
  { id: 'admin', label: '管理员后台', icon: ShieldCheck, section: '系统', superOnly: true },
];

const EDITOR_URL = 'http://localhost:5173';
const SITE_URL = 'http://localhost:3001';
const DEMO_TENANT = 'demo';
/** 小程序运营后台暂未开放：后续开发完成后改为 true 即可恢复入口（代码保留未删除） */
const MINIAPP_ADMIN_URL = '';

function currentSection(): string {
  const hash = location.hash.replace(/^#\/?/, '');
  const item = NAV.find((n) => n.id === hash);
  if (!item) return 'overview';
  try {
    const u = JSON.parse(localStorage.getItem('sb_user') ?? 'null');
    if (item.superOnly && u?.role !== 'super_admin') return 'overview';
  } catch { /* ignore */ }
  return hash;
}

function App() {
  const [authed, setAuthed] = useState(isLoggedIn());
  const [active, setActive] = useState(currentSection);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = currentUser();

  const navigate = (id: string) => {
    setActive(id);
    setSidebarOpen(false);
    location.hash = `/${id}`;
  };

  useEffect(() => {
    const onHash = () => setActive(currentSection());
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
            <div className="brand-sub">网站装修管理中心</div>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <nav className="sidebar-nav">
          {[...new Set(NAV.filter((n) => !n.superOnly || user?.role === 'super_admin').map((n) => n.section))].map((section) => (
            <div key={section} className="nav-section">
              <div className="nav-section-label">{section}</div>
              {NAV.filter((n) => n.section === section && (!n.superOnly || user?.role === 'super_admin')).map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${active === item.id ? 'active' : ''}`}
                  onClick={() => navigate(item.id)}
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
          <div className="topbar-title">{NAV.find((n) => n.id === active)?.label ?? '概览'}</div>
          <div className="topbar-actions">
            <a href={`${EDITOR_URL}/`} target="_blank" rel="noreferrer" className="topbar-link topbar-link-primary">
              <Paintbrush size={14} /> 网站设计 <ExternalLink size={13} />
            </a>
            {MINIAPP_ADMIN_URL && (
              <a href={MINIAPP_ADMIN_URL} className="topbar-link" title="切换到小程序运营后台">
                运营后台
              </a>
            )}
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
    case 'sites': return <Sites />;
    case 'pages': return <Pages />;
    case 'domains': return <DomainManager />;
    case 'history': return <History />;
    case 'media': return <MediaManager />;
    case 'submissions': return <Submissions />;
    case 'articles': return <Articles />;
    case 'templates': return <Templates />;
    case 'plugins': return <Plugins />;
    case 'admin': return <AdminPanel />;
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

function formatDate(v?: string) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-CN', { hour12: false });
}

// ---------- 页面 ----------
function Overview() {
  const sites = useFetch<any[]>('sites');
  const pages = useFetch<any[]>('pages');
  const submissions = useFetch<any[]>('submissions');
  const siteCount = sites.data?.length ?? '—';
  const publishedCount = sites.data?.filter((s) => s.status === 'published').length ?? '—';
  const pageCount = pages.data?.length ?? '—';
  const unreadCount = submissions.data?.filter((s) => s.status === 'unread').length ?? '—';

  return (
    <>
      <PageHeader title="建站概览" description="管理您的网站、页面与内容" action={
        <a href={`${EDITOR_URL}/`} target="_blank" rel="noreferrer" className="btn-primary">
          <Paintbrush size={15} /> 网站设计
        </a>
      } />
      <div className="stat-grid">
        <StatCard label="站点总数" value={siteCount} icon={Globe2} tone="blue" />
        <StatCard label="已发布站点" value={publishedCount} icon={Check} tone="green" />
        <StatCard label="页面总数" value={pageCount} icon={FileText} tone="purple" />
        <StatCard label="未读留言" value={unreadCount} icon={Inbox} tone="amber" />
      </div>
      <div className="panel">
        <h3>快速开始</h3>
        <div className="quick-links">
          <a href={`${EDITOR_URL}/`} target="_blank" rel="noreferrer" className="quick-link">
            <Paintbrush size={20} /><div><strong>网站设计</strong><span>进入预览页面，点击任意位置修改</span></div><ExternalLink size={16} />
          </a>
          <a href={`${SITE_URL}/s/${DEMO_TENANT}/my-site`} target="_blank" rel="noreferrer" className="quick-link">
            <Globe2 size={20} /><div><strong>查看站点</strong><span>访问公开站点</span></div><ExternalLink size={16} />
          </a>
          <a href="#/templates" className="quick-link">
            <LayoutTemplate size={20} /><div><strong>套用模板</strong><span>从模板中心快速搭建</span></div><ChevronRight size={16} />
          </a>
        </div>
      </div>
    </>
  );
}

function Sites() {
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
    try {
      const res = await fetch(`http://localhost:3000/api/sites/${r.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('sb_token') ?? ''}` },
      });
      if (!res.ok) throw new Error('删除失败');
      refresh();
    } catch (e) { alert(e instanceof Error ? e.message : '删除失败'); }
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
            <a href={`${EDITOR_URL}/?site=${r.id}`} target="_blank" rel="noreferrer" className="link-btn">网站设计</a>
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

function Pages() {
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
    try {
      const res = await fetch(`http://localhost:3000/api/pages/${r.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('sb_token') ?? ''}` },
      });
      if (!res.ok) throw new Error('删除失败');
      refresh();
    } catch (e) { alert(e instanceof Error ? e.message : '删除失败'); }
  };
  return (
    <>
      <PageHeader title="页面管理" description="装修并发布站点下的独立页面" action={
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

function History() {
  const sites = useFetch<any[]>('sites');
  const [siteId, setSiteId] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [message, setMessage] = useState('');
  const currentSiteId = siteId || sites.data?.[0]?.id || '';
  const history = useFetch<any[]>(currentSiteId ? `sites/${currentSiteId}/publish/history` : 'sites/none/publish/history');
  const rollback = async (v: number) => {
    if (!confirm(`确定回滚到 v${v}？当前线上内容将被替换。`)) return;
    try {
      await post(`sites/${currentSiteId}/publish/rollback/${v}`);
      setMessage(`✓ 已回滚到 v${v}，线上已即时更新`);
      history.refresh();
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

function Submissions() {
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

type TemplateSource = 'official' | 'library' | 'custom';

type TemplateItem = {
  id: string;
  name: string;
  category: string;
  industry: string;
  description: string;
  cover: string;
  preview: TemplatePreviewKind;
  badge?: string;
  tags: string[];
  usage?: number;
  isFree?: boolean;
  source: TemplateSource;
  schema: any;
  isGlobal?: boolean;
  isPublic?: boolean;
  price?: number;
};

const CATEGORY_OPTIONS = ['全部', '企业', '营销', '基础', '我的模板'];
const TAG_OPTIONS = ['全部模板', '热门', '免费', '最新'];

const BLOCK_LABELS: Record<string, string> = {
  container: '容器', heading: '标题', text: '文本', button: '按钮', divider: '分割线',
  image: '图片', navbar: '导航栏', carousel: '轮播图', 'image-text': '图文混排',
  'feature-list': '优势列表', 'card-list': '图文卡片', 'article-list': '文章列表',
  footer: '页脚', 'visitor-counter': '访问统计', form: '表单',
};

function countNodes(node: any): number {
  if (!node) return 0;
  return 1 + (node.children ?? []).reduce((sum: number, child: any) => sum + countNodes(child), 0);
}

function topBlockLabels(schema: any): string[] {
  const children: any[] = schema?.root?.children ?? [];
  return children.map((child) => BLOCK_LABELS[child.type] ?? child.type).slice(0, 8);
}

function formatUsage(value?: number): string {
  if (!value) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k 次使用` : `${value} 次使用`;
}

function Templates() {
  const { data, refresh } = useFetch<any[]>('templates');
  const sites = useFetch<any[]>('sites');
  const pages = useFetch<any[]>('pages');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('全部');
  const [tag, setTag] = useState('全部模板');
  const [sort, setSort] = useState('recommended');
  const [createName, setCreateName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateItem | null>(null);
  const [applyTemplate, setApplyTemplate] = useState<TemplateItem | null>(null);
  const [targetType, setTargetType] = useState<'new' | 'site' | 'page'>('new');
  const [targetId, setTargetId] = useState('');
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');

  const officialItems: TemplateItem[] = officialTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    industry: t.industry,
    description: t.description,
    cover: t.cover,
    preview: t.preview,
    badge: t.badge,
    tags: t.tags,
    usage: t.usage,
    isFree: t.isFree,
    source: 'official',
    schema: t.build(),
  }));

  const officialNames = new Set(officialTemplates.map((t) => t.name));
  const officialIds = new Set(officialTemplates.map((t) => t.id));
  const libraryItems: TemplateItem[] = (data ?? [])
    .filter((t) => !officialNames.has(t.name) && !officialIds.has(String(t.id)) && t.name !== '商务简约')
    .map((t) => ({
      id: `backend-${t.id}`,
      name: t.name,
      category: t.category || '自定义',
      industry: t.isGlobal ? '团队共享模板' : '我的私有模板',
      description: t.description || '从当前页面保存的自定义模板',
      cover: t.cover || 'linear-gradient(135deg,#E2E8F0 0%,#CBD5E1 100%)',
      preview: 'generic',
      tags: [t.isGlobal ? '全局' : '私有'],
      source: t.isGlobal ? 'library' : 'custom',
      schema: t.schema,
      isGlobal: t.isGlobal,
      isPublic: t.isPublic,
      price: t.price,
    }));

  const allItems = useMemo(() => [...officialItems, ...libraryItems], [data]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const result = allItems.filter((item) => {
      const matchesKeyword = !q || `${item.name} ${item.industry} ${item.description} ${item.tags.join(' ')}`.toLowerCase().includes(q);
      const matchesCategory = category === '全部'
        || (category === '我的模板' ? item.source === 'custom' : item.category === category);
      const matchesTag = tag === '全部模板'
        || (tag === '热门' && item.badge === '热门')
        || (tag === '免费' && item.isFree)
        || (tag === '最新' && item.source !== 'official');
      return matchesKeyword && matchesCategory && matchesTag;
    });
    return result.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'zh-CN');
      if (sort === 'usage') return (b.usage ?? 0) - (a.usage ?? 0);
      return Number(b.source === 'official') - Number(a.source === 'official') || (b.usage ?? 0) - (a.usage ?? 0);
    });
  }, [allItems, keyword, category, tag, sort]);

  const openApply = (template: TemplateItem) => {
    setApplyTemplate(template);
    setPreviewTemplate(null);
    setTargetType('new');
    setTargetId('');
    setNewName(`${template.name}站点`);
    setNewSlug(`site-${Date.now().toString(36).slice(-5)}`);
    setMessage('');
  };

  const createCustomTemplate = async () => {
    if (!createName.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      await post('templates/global', {
        name: createName.trim(),
        category: '自定义',
        description: '从模板中心创建的空白模板',
        schema: { version: 1, meta: { title: createName.trim() }, root: { id: 'root', type: 'container', props: {}, children: [] } },
      });
      setCreateName('');
      refresh();
      setMessage('✓ 模板已保存到团队模板库');
    } catch (e) {
      setMessage(`✗ ${e instanceof Error ? e.message : '创建失败'}`);
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!applyTemplate || busy) return;
    setBusy(true);
    setMessage('');
    try {
      let siteId = '';
      let pageId = '';
      if (targetType === 'new') {
        const site = await post<any>('sites', {
          name: newName.trim() || `${applyTemplate.name}站点`,
          slug: newSlug.trim() || `site-${Date.now().toString(36).slice(-5)}`,
        });
        siteId = site.id;
      } else if (targetType === 'site') {
        siteId = targetId;
      } else {
        const page = (pages.data ?? []).find((p) => p.id === targetId);
        if (!page) throw new Error('请选择要装修的页面');
        siteId = page.siteId;
        pageId = page.id;
      }
      if (!siteId) throw new Error('请选择目标站点');

      if (pageId) await put(`pages/${pageId}/draft`, { schema: applyTemplate.schema });
      else await put(`sites/${siteId}/draft`, { schema: applyTemplate.schema });

      const editorUrl = `${EDITOR_URL}/?site=${siteId}${pageId ? `&page=${pageId}` : ''}`;
      window.open(editorUrl, '_blank', 'noopener,noreferrer');
      setApplyTemplate(null);
      sites.refresh();
      pages.refresh();
      setMessage(`✓ 已将「${applyTemplate.name}」写入草稿，装修器已在新窗口打开`);
    } catch (e) {
      setMessage(`✗ ${e instanceof Error ? e.message : '套用失败'}`);
    } finally {
      setBusy(false);
    }
  };

  const siteName = (id: string) => sites.data?.find((s) => s.id === id)?.name ?? '未知站点';
  const visualEditUrl = (item: TemplateItem) => (
    item.source === 'official' ? `${EDITOR_URL}/?template=${encodeURIComponent(item.id)}` : ''
  );
  const openVisualEdit = (item: TemplateItem) => {
    const url = visualEditUrl(item);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else openApply(item);
  };

  return (
    <>
      <PageHeader title="模板中心" description="打开模板预览即可可视化编辑，点击页面任意模块直接修改" action={
        <a href={`${EDITOR_URL}/`} target="_blank" rel="noreferrer" className="btn-small">
          <Paintbrush size={14} /> 自由搭建 <ExternalLink size={13} />
        </a>
      } />

      <div className="template-hero">
        <div className="template-hero-copy">
          <span className="template-kicker"><Sparkles size={14} /> 官方模板库</span>
          <h2>打开模板，点哪里改哪里</h2>
          <p>按行业筛选模板，点击“预览编辑”直接进入真实画布；双击文字、点击图片或模块即可修改。</p>
        </div>
        <div className="template-hero-stats">
          <div><strong>{officialItems.length}</strong><span>官方模板</span></div>
          <div><strong>{allItems.length}</strong><span>可用模板</span></div>
          <div><strong>{CATEGORY_OPTIONS.length - 2}</strong><span>行业分类</span></div>
        </div>
      </div>

      {message && <div className={`template-notice ${message.startsWith('✗') ? 'error' : ''}`}><CheckCircle2 size={15} />{message}</div>}

      <div className="template-toolbar">
        <label className="template-search">
          <Search size={15} />
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索模板名称、行业或标签" />
        </label>
        <div className="template-chips">
          {CATEGORY_OPTIONS.map((item) => (
            <button key={item} className={`template-chip ${category === item ? 'active' : ''}`} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
        <div className="template-toolbar-right">
          <div className="template-chips compact">
            {TAG_OPTIONS.map((item) => (
              <button key={item} className={`template-chip mini ${tag === item ? 'active' : ''}`} onClick={() => setTag(item)}>{item}</button>
            ))}
          </div>
          <select className="template-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recommended">推荐排序</option>
            <option value="usage">最多使用</option>
            <option value="name">名称排序</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty text="没有找到匹配的模板，试试更换关键词或分类" />
      ) : (
        <div className="template-gallery">
          {filtered.map((item) => (
            <article key={item.id} className="template-gallery-card">
              <div className="template-thumb">
                <TemplatePreview kind={item.preview} cover={item.cover} label={item.name} />
                {item.badge && <span className="template-badge">{item.badge}</span>}
                <div className="template-thumb-actions">
                  <button className="tpl-action-btn" onClick={() => openVisualEdit(item)}><Eye size={13} /> 预览编辑</button>
                  <button className="tpl-action-btn primary" onClick={() => openApply(item)}><ArrowRight size={13} /> 一键套用</button>
                </div>
              </div>
              <div className="template-card-body">
                <div className="template-title-row">
                  <h3>{item.name}</h3>
                  <span className={`template-source ${item.source}`}>
                    {item.source === 'official' ? '官方' : item.source === 'library' ? '团队' : '私有'}
                  </span>
                </div>
                <p className="template-industry">{item.industry}</p>
                <p className="template-desc">{item.description}</p>
                <div className="template-tags">
                  {item.tags.map((t) => <span key={t}>{t}</span>)}
                </div>
                <div className="template-card-footer">
                  <span>{formatUsage(item.usage)}</span>
                  <button className="link-btn" onClick={() => setPreviewTemplate(item)}>查看详情 →</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="template-admin-panel" id="template-admin">
        <div>
          <strong>保存为团队模板</strong>
          <p>超管可将空白模板写入团队模板库，成员可在模板中心看到。</p>
        </div>
        <div className="inline-form">
          <input placeholder="新模板名称" value={createName} onChange={(e) => setCreateName(e.target.value)} />
          <button className="btn-small" onClick={createCustomTemplate} disabled={busy}><Plus size={14} />创建模板</button>
        </div>
      </div>

      {previewTemplate && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setPreviewTemplate(null); }}>
          <div className="modal template-modal" role="dialog" aria-modal="true" aria-label={`${previewTemplate.name}模板预览`}>
            <div className="modal-header">
              <div>
                <h3>{previewTemplate.name}</h3>
                <p>{previewTemplate.industry} · {previewTemplate.category}</p>
              </div>
              <button className="modal-close" onClick={() => setPreviewTemplate(null)} aria-label="关闭"><X size={18} /></button>
            </div>
            <div className="template-modal-content">
              <TemplatePreview kind={previewTemplate.preview} cover={previewTemplate.cover} size="detail" label={previewTemplate.name} />
              <div className="template-modal-info">
                <p className="template-modal-desc">{previewTemplate.description}</p>
                <div className="template-facts">
                  <div><span>页面节点</span><strong>{countNodes(previewTemplate.schema)}</strong></div>
                  <div><span>使用次数</span><strong>{previewTemplate.usage ?? '—'}</strong></div>
                  <div><span>模板类型</span><strong>{previewTemplate.isFree === false ? '付费' : '免费'}</strong></div>
                </div>
                <div className="template-blocks">
                  <span className="template-blocks-label">页面结构</span>
                  <div>
                    {topBlockLabels(previewTemplate.schema).map((label, i) => <span key={`${label}-${i}`}>{label}</span>)}
                  </div>
                </div>
                <div className="template-modal-actions">
                  <button className="btn-primary" onClick={() => openVisualEdit(previewTemplate)}><Eye size={15} /> 预览并直接修改 <ArrowRight size={14} /></button>
                  <button className="btn-small" onClick={() => openApply(previewTemplate)}><Wand2 size={15} /> 一键套用到站点</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {applyTemplate && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setApplyTemplate(null); }}>
          <div className="modal apply-modal" role="dialog" aria-modal="true" aria-label="套用模板">
            <div className="modal-header">
              <div>
                <h3><Wand2 size={17} /> 套用「{applyTemplate.name}」</h3>
                <p>模板 DSL 将写入目标草稿，不会直接覆盖线上版本。</p>
              </div>
              <button className="modal-close" onClick={() => setApplyTemplate(null)} disabled={busy} aria-label="关闭"><X size={18} /></button>
            </div>
            <div className="apply-options">
              {([
                { id: 'new', label: '新建站点', desc: '创建站点并写入模板' },
                { id: 'site', label: '覆盖站点首页', desc: '写入现有站点草稿' },
                { id: 'page', label: '覆盖指定页面', desc: '写入现有页面草稿' },
              ] as { id: 'new' | 'site' | 'page'; label: string; desc: string }[]).map((option) => (
                <button
                  key={option.id}
                  className={`apply-option ${targetType === option.id ? 'active' : ''}`}
                  onClick={() => setTargetType(option.id)}
                >
                  <strong>{option.label}</strong><span>{option.desc}</span>
                </button>
              ))}
            </div>

            {targetType === 'new' && (
              <div className="apply-fields">
                <label>站点名称<input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例如：广告传媒官网" /></label>
                <label>站点标识<input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="site-abc12" /></label>
              </div>
            )}
            {targetType === 'site' && (
              <label className="apply-field">选择站点
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  <option value="">请选择站点</option>
                  {(sites.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}（{s.slug}）</option>)}
                </select>
              </label>
            )}
            {targetType === 'page' && (
              <label className="apply-field">选择页面
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  <option value="">请选择页面</option>
                  {(pages.data ?? []).map((p) => <option key={p.id} value={p.id}>{siteName(p.siteId)} / {p.name}</option>)}
                </select>
              </label>
            )}

            <div className="apply-footer">
              <span className="muted">套用后会自动打开装修器，确认内容后再发布。</span>
              <div className="inline-form">
                <button className="btn-small" onClick={() => setApplyTemplate(null)} disabled={busy}>取消</button>
                <button className="btn-primary" onClick={apply} disabled={busy}>
                  {busy ? '正在套用…' : <>确认套用 <ArrowRight size={14} /></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Plugins() {
  const { data, refresh } = useFetch<any[]>('plugins');
  const [copyOpen, setCopyOpen] = useState(false);
  const registry = [
    { id: 'copy-page', name: '网页复制', desc: '输入网址抓取页面代码，一键发布到你的站点', category: '工具', action: true },
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
          if ('action' in p && p.action) {
            return (
              <div key={p.id} className="plugin-card">
                <div className="plugin-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}><Copy size={20} /></div>
                <div className="plugin-info">
                  <div className="plugin-name">{p.name} <span className="tag tag-alt">{p.category}</span> <span className="tag">新</span></div>
                  <p>{p.desc}</p>
                </div>
                <button className="btn-small" onClick={() => setCopyOpen(true)}><Copy size={14} /> 打开</button>
              </div>
            );
          }
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
      {copyOpen && <CopyPageDialog onClose={() => setCopyOpen(false)} />}
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
          <p>网站装修管理中心 · 可视化搭建您的网站</p>
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
            <label>团队标识</label>
            <input value={form.tenantSlug} onChange={(e) => setForm({ ...form, tenantSlug: e.target.value })} required />
          </>}
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? '请稍候…' : mode === 'login' ? '登录管理后台' : '注册并创建团队'}
          </button>
        </form>
        <div className="auth-hint">
          演示账号：user@demo.com / demo123
        </div>
        {MINIAPP_ADMIN_URL && (
          <div className="auth-hint">
            小程序运营后台请访问 <a href={MINIAPP_ADMIN_URL}>{MINIAPP_ADMIN_URL}</a>
          </div>
        )}
      </div>
    </div>
  );
}

type CopyResult = {
  title: string; description: string; url: string; html: string; css: string;
  images: string[]; blocks: { type: string; text: string }[];
  schema: Record<string, unknown>;
  modular: boolean; blockCount: number; mode: 'fidelity' | 'modules' | 'snapshot';
};

function CopyPageDialog({ onClose }: { onClose: () => void }) {
  const sites = useFetch<any[]>('sites');
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<'fidelity' | 'modules' | 'snapshot'>('fidelity');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CopyResult | null>(null);
  const [error, setError] = useState('');
  const [showSource, setShowSource] = useState(false);
  const [target, setTarget] = useState<'new' | 'site-home' | 'site-page'>('new');
  const [siteId, setSiteId] = useState('');
  const [pageId, setPageId] = useState('');
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [publish, setPublish] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ editorUrl: string; siteUrl: string } | null>(null);

  const pages = useFetch<any[]>(siteId ? `pages?siteId=${siteId}` : 'pages');

  const doFetch = async () => {
    setError(''); setResult(null); setLoading(true);
    try {
      const r = await post<CopyResult>('copy-page/fetch', { url: url.trim(), mode });
      setResult(r);
      setNewName(`${r.title || '复制的页面'} · 副本`);
      setNewSlug(`copy-${Date.now().toString(36).slice(-6)}`);
    } catch (e) { setError(e instanceof Error ? e.message : '抓取失败'); }
    finally { setLoading(false); }
  };

  const doPublish = async () => {
    if (!result) return;
    setBusy(true); setError('');
    try {
      let sid = siteId;
      let pid = pageId;
      if (target === 'new') {
        const site = await post<any>('sites', { name: newName.trim() || '复制的站点', slug: newSlug.trim() || `copy-${Date.now()}` });
        sid = site.id;
        await put(`sites/${sid}/draft`, { schema: result.schema });
        if (publish) await post(`sites/${sid}/publish`, { note: '由网页复制插件创建' });
        setDone({ editorUrl: `${EDITOR_URL}/?site=${sid}`, siteUrl: `${SITE_URL}/s/${DEMO_TENANT}/${site.slug}` });
      } else {
        if (!sid) throw new Error('请选择目标站点');
        if (target === 'site-page') {
          if (!pid) throw new Error('请选择目标页面');
          await put(`pages/${pid}/draft`, { schema: result.schema });
          if (publish) await post(`pages/${pid}/publish`, { note: '由网页复制插件覆盖' });
          setDone({ editorUrl: `${EDITOR_URL}/?site=${sid}&page=${pid}`, siteUrl: `${SITE_URL}/s/${DEMO_TENANT}/${sites.data?.find((s) => s.id === sid)?.slug || ''}` });
        } else {
          await put(`sites/${sid}/draft`, { schema: result.schema });
          if (publish) await post(`sites/${sid}/publish`, { note: '由网页复制插件覆盖' });
          setDone({ editorUrl: `${EDITOR_URL}/?site=${sid}`, siteUrl: `${SITE_URL}/s/${DEMO_TENANT}/${sites.data?.find((s) => s.id === sid)?.slug || ''}` });
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : '发布失败'); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal copy-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div><h3><Copy size={18} /> 网页复制插件</h3><p>输入网址，抓取页面代码，一键发布到你的站点</p></div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="copy-body">
          {done ? (
            <div className="copy-done">
              <CheckCircle2 size={40} color="#16a34a" />
              <h3>已成功发布</h3>
              <p>页面代码已写入{done.siteUrl ? '站点' : ''}，可继续在装修器里调整。</p>
              <div className="copy-actions">
                <a className="btn-primary" href={done.editorUrl} target="_blank" rel="noreferrer"><Paintbrush size={14} /> 打开装修器</a>
                <a className="btn-small" href={done.siteUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> 访问站点</a>
                <button className="btn-small" onClick={onClose}>完成</button>
              </div>
            </div>
          ) : (
            <>
              <div className="copy-fetch-row">
                <input
                  className="copy-url" placeholder="https://example.com" value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doFetch()}
                />
                <button className="btn-primary" onClick={doFetch} disabled={loading || !url.trim()}>
                  {loading ? <><Loader2 size={14} className="spin" /> 抓取中…</> : <><Copy size={14} /> 抓取页面</>}
                </button>
              </div>
              <div className="copy-modes">
                {([
                  { id: 'fidelity', name: '区块保真', desc: '按区块切分，外观接近原页，每块可选中/删除/改代码' },
                  { id: 'modules', name: '语义模块', desc: '转成标题/正文/图片等标准组件，布局会简化' },
                  { id: 'snapshot', name: '整页快照', desc: '完整 1:1 还原，整体一个块，不逐块编辑' },
                ] as const).map((m) => (
                  <label key={m.id} className={`copy-mode ${mode === m.id ? 'active' : ''}`}>
                    <input type="radio" name="copy-mode" checked={mode === m.id} onChange={() => setMode(m.id)} />
                    <span><b>{m.name}</b><small>{m.desc}</small></span>
                  </label>
                ))}
              </div>
              {error && <div className="template-notice error">{error}</div>}

              {result && (
                <>
                  <div className="copy-preview">
                    <div className="copy-preview-head">
                      <div><strong>{result.title}</strong><p>{result.description || '（无描述）'}</p></div>
                      <span className="tag tag-alt">{result.mode === 'fidelity' ? '区块保真' : result.mode === 'modules' ? '语义模块' : '整页快照'}</span>
                    </div>
                    <div className="copy-stats">
                      <span><FileText size={13} /> HTML {(result.html.length / 1024).toFixed(1)} KB</span>
                      <span><ImageIcon size={13} /> {result.images.length} 张图片</span>
                      <span><LayoutTemplate size={13} /> {result.blockCount} 个区块/模块</span>
                    </div>
                    {result.mode === 'fidelity' && <p className="copy-hint">✓ 按原页区块切分，外观接近原网页；每个区块可单独选中、排序、删除，点开属性面板还能改该区块的 HTML/CSS。</p>}
                    {result.mode === 'modules' && <p className="copy-hint">✓ 已转成标准组件，可逐块编辑文字与样式；复杂布局会简化。</p>}
                    {result.mode === 'snapshot' && <p className="copy-hint">✓ 整页 1:1 还原，作为一个整体块，不能逐块编辑。</p>}
                    {result.blocks.length > 0 && (
                      <div className="copy-blocks">
                        {result.blocks.slice(0, 8).map((b, i) => (
                          <span key={i} className="copy-block"><b>{b.type}</b> {b.text}</span>
                        ))}
                      </div>
                    )}
                    <button className="btn-small" onClick={() => setShowSource((v) => !v)}>{showSource ? '隐藏' : '查看'}页面代码</button>
                    {showSource && <pre className="copy-source">{result.html.slice(0, 4000)}</pre>}
                  </div>

                  <div className="copy-publish">
                    <h4>发布到</h4>
                    <div className="copy-targets">
                      <label><input type="radio" checked={target === 'new'} onChange={() => setTarget('new')} /> 新建站点</label>
                      <label><input type="radio" checked={target === 'site-home'} onChange={() => setTarget('site-home')} /> 覆盖已有站点首页</label>
                      <label><input type="radio" checked={target === 'site-page'} onChange={() => setTarget('site-page')} /> 覆盖已有页面</label>
                    </div>
                    {target === 'new' ? (
                      <div className="copy-fields">
                        <input className="copy-url" placeholder="站点名称" value={newName} onChange={(e) => setNewName(e.target.value)} />
                        <input className="copy-url" placeholder="站点标识 slug" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
                      </div>
                    ) : (
                      <div className="copy-fields">
                        <select className="copy-url" value={siteId} onChange={(e) => { setSiteId(e.target.value); setPageId(''); }}>
                          <option value="">选择站点…</option>
                          {(sites.data || []).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.slug})</option>)}
                        </select>
                        {target === 'site-page' && (
                          <select className="copy-url" value={pageId} onChange={(e) => setPageId(e.target.value)}>
                            <option value="">选择页面…</option>
                            {(pages.data || []).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>)}
                          </select>
                        )}
                      </div>
                    )}
                    <label className="copy-smart"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> 同时发布（否则仅保存草稿）</label>
                    <button className="btn-primary" onClick={doPublish} disabled={busy}>
                      {busy ? <><Loader2 size={14} className="spin" /> 发布中…</> : <><Check size={14} /> 确认发布</>}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
