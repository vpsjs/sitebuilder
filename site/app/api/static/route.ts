/**
 * 静态化端点（供后端发布后调用，上传 HTML 到对象存储）
 * POST /api/static  Body: { tenant, site }
 * 需 x-revalidate-secret 校验，与缓存失效端点共用密钥。
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateStaticHtml } from '../../../lib/staticHtml';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  const expected = process.env.REVALIDATE_SECRET ?? 'dev-revalidate-secret';
  if (secret !== expected) {
    return NextResponse.json({ error: 'invalid secret' }, { status: 401 });
  }

  let body: { tenant?: string; site?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body.tenant || !body.site) {
    return NextResponse.json({ error: 'missing tenant or site' }, { status: 400 });
  }

  const html = await generateStaticHtml(body.tenant, body.site);
  if (!html) {
    return NextResponse.json({ error: 'site not found or not published' }, { status: 404 });
  }
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
