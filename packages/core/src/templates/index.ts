/**
 * 模板中心
 * ------------------------------------------------------------------
 * 模板本质 = 预置的 PageSchema。用户套用模板 = 复制一份 DSL 到自己的站点。
 * 模板元数据与 DSL 统一维护在 catalog.json，装修器、公开站点、后端种子、
 * 网站装修后台共用同一份数据，避免模板中心出现两套列表。
 */

import type { PageSchema } from '../core';
import catalogData from './catalog.json';

export type TemplatePreviewKind = 'agency' | 'enterprise' | 'landing' | 'blank' | 'generic';

export interface SiteTemplate {
  id: string;
  name: string;
  category: string;
  industry: string;
  description: string;
  /** 缩略预览的配色 */
  cover: string;
  /** 模板卡片缩略图风格 */
  preview: TemplatePreviewKind;
  badge?: string;
  tags: string[];
  usage?: number;
  isFree?: boolean;
  /** 预置页面 DSL */
  schema: PageSchema;
  build: () => PageSchema;
}

type CatalogItem = Omit<SiteTemplate, 'build'>;

export const templateCatalog = catalogData as unknown as CatalogItem[];

export const templates: SiteTemplate[] = templateCatalog.map((item) => ({
  ...item,
  build: () => JSON.parse(JSON.stringify(item.schema)) as PageSchema,
}));

export function getTemplate(id: string): SiteTemplate | undefined {
  return templates.find((item) => item.id === id);
}
