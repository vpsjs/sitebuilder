/**
 * 后端 API 客户端
 * ------------------------------------------------------------------
 * 与 NestJS 后端联调：登录、列站点、保存草稿、发布。
 * Token 存在 localStorage，演示用；生产应改为 httpOnly Cookie。
 */

const API_BASE = 'http://localhost:3000/api';

interface AuthResult {
  accessToken: string;
  user: { id: string; email: string; name: string; role: string; tenantId: string };
}

function token(): string | null {
  return localStorage.getItem('sb_token');
}

export function isLoggedIn(): boolean {
  return Boolean(token());
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? '登录失败');
  }
  const data: AuthResult = await res.json();
  localStorage.setItem('sb_token', data.accessToken);
  return data;
}

export function logout(): void {
  localStorage.removeItem('sb_token');
}

async function authed(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token() ?? ''}`,
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error('登录已过期，请重新登录');
  }
  return res;
}

export interface GlobalBlockDto {
  id: string;
  name: string;
  category: string;
  description: string;
  node: Record<string, unknown>;
  isGlobal: boolean;
}

export async function listGlobalBlocks(): Promise<GlobalBlockDto[]> {
  const res = await authed('/global-blocks');
  if (!res.ok) throw new Error('获取全局组件失败');
  return res.json();
}

export async function createGlobalBlock(data: {
  name: string; category?: string; description?: string; node: Record<string, unknown>; isGlobal?: boolean;
}): Promise<GlobalBlockDto> {
  const res = await authed('/global-blocks', { method: 'POST', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('保存全局组件失败');
  return res.json();
}

export async function updateGlobalBlock(id: string, data: {
  name?: string; category?: string; description?: string; node?: Record<string, unknown>;
}): Promise<GlobalBlockDto> {
  const res = await authed(`/global-blocks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  if (!res.ok) throw new Error('更新全局组件失败');
  return res.json();
}

export async function deleteGlobalBlock(id: string): Promise<void> {
  const res = await authed(`/global-blocks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('删除全局组件失败');
}

export interface SiteDto {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export async function listSites(): Promise<SiteDto[]> {
  const res = await authed('/sites');
  if (!res.ok) throw new Error('获取站点列表失败');
  return res.json();
}

export async function createSite(name: string, slug: string): Promise<SiteDto> {
  const res = await authed('/sites', {
    method: 'POST',
    body: JSON.stringify({ name, slug }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? '创建站点失败');
  }
  return res.json();
}

export async function getSite(id: string): Promise<SiteDto & { draftSchema?: unknown; publishedSchema?: unknown }> {
  const res = await authed(`/sites/${id}`);
  if (!res.ok) throw new Error('获取站点失败');
  return res.json();
}

export interface PageDto {
  id: string;
  siteId: string;
  name: string;
  slug: string;
  isHome: boolean;
  draftSchema?: unknown;
  publishedSchema?: unknown;
}

export async function listPages(siteId?: string): Promise<PageDto[]> {
  const res = await authed(`/pages${siteId ? `?siteId=${siteId}` : ''}`);
  if (!res.ok) throw new Error('获取页面列表失败');
  return res.json();
}

export async function createPage(siteId: string, name: string, slug: string): Promise<PageDto> {
  const res = await authed('/pages', {
    method: 'POST',
    body: JSON.stringify({ siteId, name, slug }),
  });
  if (!res.ok) throw new Error('新建页面失败');
  return res.json();
}

export async function getPage(id: string): Promise<PageDto> {
  const res = await authed(`/pages/${id}`);
  if (!res.ok) throw new Error('获取页面失败');
  return res.json();
}

export async function savePageDraft(id: string, schema: unknown): Promise<void> {
  const res = await authed(`/pages/${id}/draft`, {
    method: 'PUT',
    body: JSON.stringify({ schema }),
  });
  if (!res.ok) throw new Error('保存页面草稿失败');
}

export async function publishPage(id: string): Promise<{ version?: number }> {
  const res = await authed(`/pages/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify({ note: '从装修器发布' }),
  });
  if (!res.ok) throw new Error('发布页面失败');
  return res.json();
}

export async function saveDraft(siteId: string, schema: unknown): Promise<void> {
  const res = await authed(`/sites/${siteId}/draft`, {
    method: 'PUT',
    body: JSON.stringify({ schema }),
  });
  if (!res.ok) throw new Error('保存草稿失败');
}

export async function publishSite(siteId: string, note?: string): Promise<{ version: number }> {
  const res = await authed(`/sites/${siteId}/publish`, {
    method: 'POST',
    body: JSON.stringify({ note: note ?? '从可视化装修器发布' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? '发布失败');
  }
  return res.json();
}

/** 确保有一个目标站点：复用第一个，没有则按页面标题创建 */
export async function ensureSite(name: string): Promise<SiteDto> {
  const sites = await listSites();
  if (sites.length > 0) return sites[0];
  const slug = name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').slice(0, 40) || 'my-site';
  return createSite(name, `${slug}-${Date.now().toString(36).slice(-4)}`);
}

export function publicUrl(tenantSlug: string, siteSlug: string): string {
  return `${API_BASE}/s/${tenantSlug}/${siteSlug}/html`;
}
