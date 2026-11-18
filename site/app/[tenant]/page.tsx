/**
 * 泛域名站点页
 * ------------------------------------------------------------------
 * 直接访问 /tenant 或子域名 demo.localhost:3001（经 middleware 重写）时，
 * 解析该租户最新发布的站点并用同一套 SiteView 渲染。
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublishedSite, resolveDefaultSite } from '../../lib/api';
import { SiteView } from '../../lib/SiteView';

interface Props {
  params: Promise<{ tenant: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant } = await params;
  const siteSlug = await resolveDefaultSite(tenant);
  if (!siteSlug) return { title: '站点不存在' };
  const data = await getPublishedSite(tenant, siteSlug);
  return {
    title: data?.schema.meta.title || tenant,
    description: data?.schema.meta.description || `${tenant} 的官方站点`,
  };
}

export default async function TenantSitePage({ params }: Props) {
  const { tenant } = await params;
  const siteSlug = await resolveDefaultSite(tenant);
  if (!siteSlug) notFound();
  const data = await getPublishedSite(tenant, siteSlug);
  if (!data) notFound();
  return <SiteView data={data} tenantSlug={tenant} />;
}
