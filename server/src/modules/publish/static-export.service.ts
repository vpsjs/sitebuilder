import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../../common/storage/storage.service';

/**
 * 静态化导出服务
 * ------------------------------------------------------------------
 * 发布后调用 Next.js 渲染器的 /api/static 拿到预渲染 HTML（已内联 CSS），
 * 再通过对象存储抽象上传到 bucket（本地磁盘 / 生产 S3+CDN）。
 * 失败只记日志，不阻塞发布主流程。
 */
@Injectable()
export class StaticExportService {
  private readonly logger = new Logger(StaticExportService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {}

  async exportAndUpload(tenantSlug: string, siteSlug: string): Promise<string | null> {
    const renderer = this.config.get<string>('renderer.url');
    const secret = this.config.get<string>('revalidate.secret');
    if (!renderer) return null;

    try {
      const res = await fetch(`${renderer}/api/static`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': secret ?? '',
        },
        body: JSON.stringify({ tenant: tenantSlug, site: siteSlug }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        this.logger.warn(`静态化失败: ${res.status} ${await res.text()}`);
        return null;
      }
      const html = await res.text();
      const url = await this.storage.putObject(
        'sites',
        `${tenantSlug}/${siteSlug}/index.html`,
        html,
      );
      this.logger.log(`静态站点已发布: ${url}`);
      return url;
    } catch (err) {
      this.logger.warn(`静态化异常: ${err instanceof Error ? err.message : err}`);
      return null;
    }
  }
}
