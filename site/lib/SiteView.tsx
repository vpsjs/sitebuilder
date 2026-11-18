/**
 * 站点视图组件（共享）
 * ------------------------------------------------------------------
 * 标准路径 /s/[tenant]/[site] 与泛域名 /tenant 都用它渲染，
 * 保证两种访问方式输出完全一致。
 */

import { bootstrap, renderDsl, ThemeProvider, type DslNode } from '@sitebuilder/core';
import type { PublishedSite } from './api';
import { expandGlobalBlocks } from './expand-global-blocks';

bootstrap();

export async function SiteView({ data, tenantSlug }: { data: PublishedSite; tenantSlug?: string }) {
  const root = await expandGlobalBlocks(data.schema.root as DslNode, tenantSlug);
  const content = renderDsl(root, { editing: false });
  return (
    <div className="site-root">
      <ThemeProvider theme={data.schema.theme}>
        <div style={{ background: 'var(--sb-bg)', color: 'var(--sb-text)', minHeight: '60vh' }}>
          {content}
        </div>
      </ThemeProvider>
      <footer className="site-footer">
        由 <strong>SiteBuilder Studio</strong> 构建 · {data.tenant}
      </footer>
    </div>
  );
}
