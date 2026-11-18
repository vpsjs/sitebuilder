import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 缓存失效客户端
 * ------------------------------------------------------------------
 * 发布成功后通知 Next.js 渲染器让对应站点的 ISR 缓存立即失效。
 * 失败不影响发布结果（只记日志），保证主流程可用。
 */
@Injectable()
export class RevalidateService {
  private readonly logger = new Logger(RevalidateService.name);

  constructor(private readonly config: ConfigService) {}

  async revalidateSite(tenantSlug: string, siteSlug: string): Promise<void> {
    const url = this.config.get<string>('revalidate.url');
    const secret = this.config.get<string>('revalidate.secret');
    if (!url) return;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': secret ?? '',
        },
        body: JSON.stringify({ tenant: tenantSlug, site: siteSlug }),
        // 超时保护，避免拖慢发布响应
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) {
        this.logger.warn(`缓存失效失败: ${res.status} ${await res.text()}`);
      } else {
        this.logger.log(`已失效缓存: site:${tenantSlug}:${siteSlug}`);
      }
    } catch (err) {
      this.logger.warn(`缓存失效请求异常: ${err instanceof Error ? err.message : err}`);
    }
  }
}
