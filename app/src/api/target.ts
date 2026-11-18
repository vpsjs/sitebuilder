/**
 * 装修目标解析
 * ------------------------------------------------------------------
 * URL 参数决定装修器正在编辑哪一个站点/页面：
 *   /?site=<siteId>               → 编辑站点首页（site.draftSchema）
 *   /?site=<siteId>&page=<pageId> → 编辑站点下的某个页面（page.draftSchema）
 * 无参数时沿用原有行为（本地草稿，发布时选择站点）。
 */

import { getTemplate } from '@/core';
import {
  getPage, getSite, listPages, listSites, publishPage, publishSite,
  saveDraft, savePageDraft, type PageDto, type SiteDto,
} from './client';

export interface EditTarget {
  siteId?: string;
  pageId?: string;
  /** 从模板中心直接进入可视化编辑：?template=模板ID */
  templateId?: string;
}

export function readTarget(): EditTarget {
  const params = new URLSearchParams(location.search);
  return {
    siteId: params.get('site') ?? undefined,
    pageId: params.get('page') ?? undefined,
    templateId: params.get('template') ?? undefined,
  };
}

export function hasRemoteTarget(t: EditTarget): boolean {
  return Boolean(t.siteId);
}

/** 加载目标已有的草稿 DSL；没有草稿返回 null */
export async function loadTargetSchema(t: EditTarget): Promise<unknown | null> {
  if (t.templateId) {
    return getTemplate(t.templateId)?.build() ?? null;
  }
  if (t.pageId) {
    const page = await getPage(t.pageId);
    return page.draftSchema ?? page.publishedSchema ?? null;
  }
  if (t.siteId) {
    const site = await getSite(t.siteId);
    return (site as any).draftSchema ?? (site as any).publishedSchema ?? null;
  }
  return null;
}

export interface TargetInfo {
  label: string;
  site?: SiteDto;
  page?: PageDto;
  pages: PageDto[];
  sites?: SiteDto[];
}

export async function loadTargetInfo(t: EditTarget): Promise<TargetInfo | null> {
  if (t.templateId) {
    const template = getTemplate(t.templateId);
    return { label: `模板预览 · ${template?.name ?? t.templateId}`, pages: [] };
  }
  if (!t.siteId) return null;
  const [site, pages, sites] = await Promise.all([getSite(t.siteId), listPages(t.siteId), listSites()]);
  const page = t.pageId ? pages.find((p) => p.id === t.pageId) : undefined;
  return {
    label: page ? `${site.name} / ${page.name}` : site.name,
    site,
    page,
    pages,
    sites,
  };
}

/** 保存草稿到正确的目标 */
export async function saveTarget(t: EditTarget, schema: unknown): Promise<void> {
  if (t.pageId) return savePageDraft(t.pageId, schema);
  if (t.siteId) return saveDraft(t.siteId, schema);
  throw new Error('未指定保存目标');
}

/** 发布到正确的目标，返回版本号 */
export async function publishTarget(t: EditTarget): Promise<{ version?: number }> {
  if (t.pageId) return publishPage(t.pageId);
  if (t.siteId) return publishSite(t.siteId);
  throw new Error('未指定发布目标');
}

/** 生成公开访问地址（子页面带 /p/ 路径） */
export function targetPublicUrl(tenantSlug: string, siteSlug: string, pageSlug?: string): string {
  const origin = location.origin.replace(':5173', ':3001');
  return pageSlug
    ? `${origin}/s/${tenantSlug}/${siteSlug}/p/${pageSlug}`
    : `${origin}/s/${tenantSlug}/${siteSlug}`;
}

/** 返回网站装修后台对应位置（5175） */
export const WEB_ADMIN_URL = 'http://localhost:5175';

export function adminUrl(t: EditTarget): string {
  if (t.templateId) return `${WEB_ADMIN_URL}/#/templates`;
  const section = t.pageId ? 'pages' : 'sites';
  return `${WEB_ADMIN_URL}/#/${section}`;
}
