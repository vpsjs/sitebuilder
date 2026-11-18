/** 管理后台 API 客户端 */

const BASE = 'http://localhost:3000/api';

function token(): string | null { return localStorage.getItem('sb_token'); }
export function isLoggedIn(): boolean { return Boolean(token()); }
export function logout(): void { localStorage.removeItem('sb_token'); localStorage.removeItem('sb_user'); }

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message ?? '登录失败');
  }
  const data = await res.json();
  localStorage.setItem('sb_token', data.accessToken);
  localStorage.setItem('sb_user', JSON.stringify(data.user));
  return data.user;
}

export async function register(data: {
  email: string; password: string; name: string; tenantName: string; tenantSlug: string;
}) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message ?? '注册失败');
  }
  const result = await res.json();
  localStorage.setItem('sb_token', result.accessToken);
  localStorage.setItem('sb_user', JSON.stringify(result.user));
  return result.user;
}

export function currentUser(): { email: string; name: string; role: string; tenantId?: string } | null {
  try { return JSON.parse(localStorage.getItem('sb_user') ?? 'null'); } catch { return null; }
}

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${path.replace(/^\//, '')}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token() ?? ''}`,
      ...init?.headers,
    },
  });
  if (res.status === 401) { logout(); location.reload(); }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message ?? `请求失败: ${res.status}`);
  }
  return res.json();
}

export const get = <T = any,>(path: string) => api<T>(path);
export const post = <T = any,>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
export const put = <T = any,>(path: string, body?: unknown) => api<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) });
export const del = <T = any,>(path: string) => api<T>(path, { method: 'DELETE' });
