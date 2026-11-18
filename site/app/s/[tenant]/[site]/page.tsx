/**
 * 公开站点页面（服务端渲染 + ISR）
 * 路由：/s/[tenant]/[site]
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublishedSite } from '../../../../lib/api';
import { SiteView } from '../../../../lib/SiteView';
import { SiteBlocked } from '../../../../lib/SiteBlocked';

interface Props {
  params: Promise<{ tenant: string; site: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant, site } = await params;
  const data = await getPublishedSite(tenant, site);
  if (!data) return { title: '站点不存在' };
  if (data.blocked) return { title: '站点已停用' };
  return {
    title: data.schema.meta.title || data.name,
    description: data.schema.meta.description || `${data.name} · 由 SiteBuilder Studio 构建`,
  };
}

export default async function SitePage({ params }: Props) {
  const { tenant, site } = await params;
  const data = await getPublishedSite(tenant, site);
  if (!data) notFound();
  if (data.blocked) {
    return <SiteBlocked reason={data.blockReason ?? '该站点已被禁用'} tenantSlug={data.tenantSlug ?? tenant} />;
  }
  return <SiteView data={data} tenantSlug={tenant} />;
}
