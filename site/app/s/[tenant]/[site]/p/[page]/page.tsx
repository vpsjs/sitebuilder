/**
 * 公开子页面（服务端渲染 + ISR）
 * 路由：/s/[tenant]/[site]/p/[page]
 * 与站点首页共用 SiteView，保证样式与主题一致。
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublishedPage } from '../../../../../../lib/api';
import { SiteView } from '../../../../../../lib/SiteView';
import { SiteBlocked } from '../../../../../../lib/SiteBlocked';

interface Props {
  params: Promise<{ tenant: string; site: string; page: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant, site, page } = await params;
  const data = await getPublishedPage(tenant, site, page);
  if (!data) return { title: '页面不存在' };
  return {
    title: data.schema.meta.title || data.name,
    description: data.schema.meta.description || `${data.name} · 由 SiteBuilder Studio 构建`,
  };
}

export default async function PublishedPage({ params }: Props) {
  const { tenant, site, page } = await params;
  const data = await getPublishedPage(tenant, site, page);
  if (!data) notFound();
  if (data.blocked) {
    return <SiteBlocked reason={data.blockReason ?? '该站点已被禁用'} tenantSlug={data.tenantSlug ?? tenant} />;
  }
  return <SiteView data={data} tenantSlug={tenant} />;
}
