/**
 * 缓存失效端点（供后端发布后回调）
 * ------------------------------------------------------------------
 * POST /api/revalidate
 * Header: x-revalidate-secret
 * Body:   { "tag": "site:demo:my-site" } 或 { "tenant": "demo", "site": "my-site" }
 *
 * 收到请求后调用 Next.js revalidateTag，让指定站点的 ISR 缓存立即失效，
 * 下一次访问即拉取最新已发布 DSL —— 发布后无需等待 60 秒。
 */

import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret');
  const expected = process.env.REVALIDATE_SECRET ?? 'dev-revalidate-secret';

  if (secret !== expected) {
    return NextResponse.json({ error: 'invalid secret' }, { status: 401 });
  }

  let body: { tag?: string; tenant?: string; site?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const tag = body.tag ?? (body.tenant && body.site ? `site:${body.tenant}:${body.site}` : null);
  if (!tag) {
    return NextResponse.json(
      { error: 'missing tag or tenant+site' },
      { status: 400 },
    );
  }

  revalidateTag(tag);
  return NextResponse.json({ revalidated: true, tag, at: new Date().toISOString() });
}
