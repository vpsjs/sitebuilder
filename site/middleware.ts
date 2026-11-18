/**
 * 域名解析中间件
 * ------------------------------------------------------------------
 * 1) 自定义域名：按 Host 查后端域名表，命中则重写到 /s/[tenant]/[site]
 *    www.example.com → /s/demo/my-site
 * 2) 泛域名：子域名识别为租户 slug（兼容原有行为）
 *    demo.localhost:3001 → /demo
 * 保留 /s/... 与 /api/... 路径不处理。
 */

import { NextRequest, NextResponse } from 'next/server';

const RESERVED = new Set(['www', 'api', 's', 'app', 'admin']);
const API_BASE = process.env.API_BASE ?? 'http://localhost:3000/api';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const hostname = host.split(':')[0].toLowerCase();
  const url = request.nextUrl.clone();

  // 内部路径跳过
  if (url.pathname.startsWith('/s/') || url.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 1) 自定义域名解析（仅处理看起来是真实域名的 Host，跳过 localhost/IP）
  const isLocal = hostname === 'localhost' || hostname.endsWith('.localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
  if (!isLocal && hostname.includes('.')) {
    try {
      const res = await fetch(`${API_BASE}/public/domains/resolve/${encodeURIComponent(hostname)}`, {
        headers: { 'x-internal': '1' },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        const tenantSlug = data?.tenantSlug ?? data?.tenant_slug;
        const siteSlug = data?.siteSlug ?? data?.site_slug;
        if (tenantSlug && siteSlug) {
          url.pathname = `/s/${tenantSlug}/${siteSlug}${url.pathname === '/' ? '' : url.pathname}`;
          return NextResponse.rewrite(url);
        }
      }
    } catch {
      // 后端不可达时回退到泛域名逻辑
    }
  }

  // 2) 泛域名：取第一段作为租户 slug
  const parts = hostname.split('.');
  if (parts.length < 2) return NextResponse.next();
  const sub = parts[0];
  if (RESERVED.has(sub)) return NextResponse.next();
  url.pathname = `/${sub}${url.pathname === '/' ? '' : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
