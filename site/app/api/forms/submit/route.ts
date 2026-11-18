/**
 * 公开表单提交端点
 * ------------------------------------------------------------------
 * 表单组件用原生 <form method="post"> 提交到这里，避免客户端 hooks，
 * 保持 Next.js App Router 服务端渲染安全。
 * 转发到后端 SubmissionsController（@Public），由后端自动注入租户。
 *
 * POST /api/forms/submit
 * Body: FormData { formId, name, phone, message, sourceUrl }
 */
import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE ?? 'http://localhost:3000/api';

function siteInfoFromReferer(referer: string): { tenant: string; site: string } | null {
  try {
    const url = new URL(referer);
    // 形如 /s/demo/my-site 或 /demo
    const m = url.pathname.match(/\/s\/([^/]+)\/([^/]+)/);
    if (m) return { tenant: decodeURIComponent(m[1]), site: decodeURIComponent(m[2]) };
    const root = url.pathname.match(/^\/([^/]+)\/?$/);
    if (root && !['s', 'api'].includes(root[1])) return { tenant: decodeURIComponent(root[1]), site: '' };
    return null;
  } catch {
    return null;
  }
}

async function resolveSiteId(tenant: string, slug: string): Promise<string | undefined> {
  if (!slug) return undefined;
  try {
    const res = await fetch(`${API_BASE}/s/${encodeURIComponent(tenant)}/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { id?: string; siteId?: string };
    return data.id ?? data.siteId;
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'invalid form data' }, { status: 400 });
  }

  const formId = String(form.get('formId') ?? '').trim() || 'contact';
  const name = String(form.get('name') ?? '').trim();
  const phone = String(form.get('phone') ?? '').trim();
  const message = String(form.get('message') ?? '').trim();
  const sourceUrl = String(form.get('sourceUrl') ?? request.headers.get('referer') ?? '');

  if (!name && !phone && !message) {
    return NextResponse.json({ error: 'empty submission' }, { status: 400 });
  }

  const info = siteInfoFromReferer(sourceUrl);
  const siteId = info ? await resolveSiteId(info.tenant, info.site) : undefined;

  try {
    const res = await fetch(`${API_BASE}/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId,
        formId,
        data: { name, phone, message },
        sourceUrl,
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'submit failed', detail: text.slice(0, 200) },
        { status: 502 },
      );
    }
  } catch (e) {
    return NextResponse.json(
      { error: 'submit failed', detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }

  // 原生表单提交后跳回来源页并带上成功标记
  const back = sourceUrl || '/';
  const sep = back.includes('?') ? '&' : '?';
  return NextResponse.redirect(`${back}${sep}submitted=1`, 303);
}
