/**
 * 静态 HTML 生成器
 * ------------------------------------------------------------------
 * 通过自请求本站的 SSR 页面拿到完整 HTML，再把外链 CSS 内联、脚本移除，
 * 得到自包含的静态文件供后端上传对象存储/CDN。
 * 这样产出的 HTML 与用户实际看到的页面 100% 一致。
 */

const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'http://localhost:3001';

export async function generateStaticHtml(tenant: string, site: string): Promise<string | null> {
  try {
    const res = await fetch(`${SITE_ORIGIN}/s/${tenant}/${site}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    let html = await res.text();

    // 找出所有外链 CSS 并内联
    const cssLinks = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g)];
    for (const match of cssLinks) {
      const full = match[0];
      const href = match[1];
      try {
        const cssUrl = href.startsWith('http') ? href : `${SITE_ORIGIN}${href}`;
        const cssRes = await fetch(cssUrl);
        if (cssRes.ok) {
          const css = await cssRes.text();
          html = html.replace(full, `<style>${css}</style>`);
        }
      } catch {
        // 单个 CSS 拉取失败则保留原 link
      }
    }

    // 移除 Next.js 的水合脚本（静态页无需交互）
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');

    return html;
  } catch {
    return null;
  }
}
