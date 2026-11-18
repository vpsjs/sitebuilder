/**
 * 服务端数据获取
 * ------------------------------------------------------------------
 * 站点渲染器直接调用后端 API 取已发布 DSL（服务端到服务端，无跨域问题）。
 * 只取 published_schema，草稿不会外泄。
 */

export interface PublishedSite {
  id?: string;
  tenant: string;
  tenantSlug?: string;
  name: string;
  slug: string;
  /** 站点被管理员禁用或已过期 */
  blocked?: boolean;
  blockReason?: string;
  schema: {
    version: number;
    meta: { title: string; description?: string };
    theme?: {
      primary: string; accent: string; background: string;
      text: string; muted: string; radius: number;
    };
    root: {
      id: string;
      type: string;
      props: Record<string, unknown>;
      style?: Record<string, unknown>;
      children?: unknown[];
    };
  };
}

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000/api';

/** 按 id 读取全局组件节点（公开），供公开站展开 DSL 引用；ISR 缓存，更新后靠 tag 失效 */
export async function getGlobalBlock(id: string): Promise<{ node: Record<string, unknown> } | null> {
  try {
    const res = await fetch(`${API_BASE}/global-blocks/public/${encodeURIComponent(id)}`, {
      next: { revalidate: 60, tags: [`global-block:${id}`] },
    });
    if (!res.ok) return null;
    return (await res.json()) as { node: Record<string, unknown> };
  } catch {
    return null;
  }
}

export interface PublicArticle {
  id: string; title: string; summary?: string; cover?: string;
  categoryId?: string; publishedAt?: string; category?: string;
}
export interface PublicCategory { id: string; name: string }

/** 公开读取租户已发布文章（供 article-list 动态渲染） */
export async function getPublishedArticles(tenantSlug: string): Promise<{
  articles: PublicArticle[]; categories: PublicCategory[];
}> {
  try {
    const res = await fetch(`${API_BASE}/articles/public/${encodeURIComponent(tenantSlug)}`, {
      next: { revalidate: 60, tags: [`articles:${tenantSlug}`] },
    });
    if (!res.ok) return { articles: [], categories: [] };
    return (await res.json()) as { articles: PublicArticle[]; categories: PublicCategory[] };
  } catch {
    return { articles: [], categories: [] };
  }
}

/** 公开读取租户产品（供 card-list 动态渲染） */
export async function getPublicProducts(tenantSlug: string): Promise<{
  id: string; name: string; description?: string; image?: string; category?: string;
}[]> {
  // 后端 products 接口按租户上下文过滤，公开站用 resolve 后转发；这里复用公开文章端点的租户解析
  try {
    const res = await fetch(`${API_BASE}/products/public/${encodeURIComponent(tenantSlug)}`, {
      next: { revalidate: 60, tags: [`products:${tenantSlug}`] },
    });
    if (!res.ok) return [];
    return (await res.json()) as { id: string; name: string; description?: string; image?: string; category?: string }[];
  } catch {
    return [];
  }
}

/** 泛域名：解析租户的默认发布站点 slug */
export async function resolveDefaultSite(tenantSlug: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/s/resolve/${tenantSlug}`, {
      next: { revalidate: 60, tags: [`tenant:${tenantSlug}`] },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { siteSlug: string } | null;
    return data?.siteSlug ?? null;
  } catch {
    return null;
  }
}

export async function getPublishedSite(
  tenantSlug: string,
  siteSlug: string,
): Promise<PublishedSite | null> {
  try {
    const res = await fetch(`${API_BASE}/s/${tenantSlug}/${siteSlug}`, {
      // ISR：60 秒重新校验，兼顾SEO与及时更新；发布后可按需 revalidate
      next: { revalidate: 60, tags: [`site:${tenantSlug}:${siteSlug}`] },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublishedSite;
  } catch {
    return null;
  }
}

/** 公开子页面：与站点首页共用缓存标签，页面发布后同步失效 */
export async function getPublishedPage(
  tenantSlug: string,
  siteSlug: string,
  pageSlug: string,
): Promise<PublishedSite | null> {
  try {
    const res = await fetch(`${API_BASE}/s/${tenantSlug}/${siteSlug}/p/${pageSlug}`, {
      next: { revalidate: 60, tags: [`site:${tenantSlug}:${siteSlug}`] },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublishedSite;
  } catch {
    return null;
  }
}
