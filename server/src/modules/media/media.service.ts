import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantQueryService } from '../../database/tenant-query.service';
import { TenantContext } from '../../common/tenant/tenant-context';
import { StorageService } from '../../common/storage/storage.service';
import { MediaAsset } from './media.entity';

export type MediaKind = 'image' | 'video';

const LIMITS: Record<MediaKind, number> = {
  image: 8 * 1024 * 1024, // 8MB
  video: 30 * 1024 * 1024, // 30MB
};

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
  'image/svg+xml': 'svg', 'image/x-icon': 'ico', 'image/bmp': 'bmp',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogv',
  'video/quicktime': 'mov', 'video/x-m4v': 'm4v',
};

@Injectable()
export class MediaService {
  constructor(
    private readonly db: TenantQueryService,
    private readonly storage: StorageService,
  ) {}

  /**
   * 上传媒体（base64 data URL）。图片与视频统一入口：
   * 校验 MIME/大小 → 写入对象存储 → 落媒体库记录（RLS 自动隔离租户）。
   */
  async upload(input: { data: string; filename?: string }): Promise<MediaAsset> {
    const match = /^data:([^;]+);base64,(.+)$/s.exec(input.data ?? '');
    if (!match) throw new BadRequestException('无效的 base64 数据');
    const mime = match[1].toLowerCase();
    const kind: MediaKind | null = mime.startsWith('image/') ? 'image'
      : mime.startsWith('video/') ? 'video' : null;
    if (!kind) throw new BadRequestException('仅支持图片或视频');
    if (!EXT_BY_MIME[mime]) throw new BadRequestException(`不支持的格式: ${mime}`);

    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length) throw new BadRequestException('文件内容为空');
    if (buffer.length > LIMITS[kind]) {
      const limit = LIMITS[kind] / 1024 / 1024;
      throw new BadRequestException(`${kind === 'image' ? '图片' : '视频'}不能超过 ${limit}MB`);
    }

    const tenantId = TenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('缺少租户上下文');

    const ext = EXT_BY_MIME[mime];
    const stamp = Date.now().toString(36);
    const name = `${stamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const objectKey = `media/${tenantId}/${new Date().toISOString().slice(0, 7)}/${name}`;
    await this.storage.putObjectBinary('sites', objectKey, buffer, mime);
    const url = this.storage.publicUrl('sites', objectKey);

    const originalName = (input.filename ?? '').slice(0, 255) || `upload.${ext}`;
    return this.db.run((m) => m.getRepository(MediaAsset).save(m.getRepository(MediaAsset).create({
      tenantId,
      name,
      originalName,
      mimeType: mime,
      kind,
      size: String(buffer.length),
      bucket: 'sites',
      objectKey,
      url,
      createdBy: TenantContext.getUserId() ?? null,
    })));
  }

  /** 媒体列表：按 kind 筛选、关键词搜索，倒序返回（上限 500） */
  async list(params?: { kind?: string; q?: string }): Promise<MediaAsset[]> {
    return this.db.run(async (m) => {
      const qb = m.getRepository(MediaAsset)
        .createQueryBuilder('media')
        .orderBy('media.createdAt', 'DESC')
        .take(500);
      if (params?.kind && ['image', 'video'].includes(params.kind)) {
        qb.andWhere('media.kind = :kind', { kind: params.kind });
      }
      if (params?.q) {
        qb.andWhere('(media.originalName ILIKE :q OR media.name ILIKE :q)', { q: `%${params.q}%` });
      }
      return qb.getMany();
    });
  }

  /** 统计各类型数量与占用空间 */
  async stats(): Promise<{ total: number; images: number; videos: number; bytes: number }> {
    return this.db.run(async (m) => {
      const rows = await m.query(
        `SELECT kind, COUNT(*)::int AS count, COALESCE(SUM(size), 0)::bigint AS bytes
         FROM media_assets GROUP BY kind`,
      );
      const result = { total: 0, images: 0, videos: 0, bytes: 0 };
      for (const r of rows) {
        const count = Number(r.count);
        result.total += count;
        result.bytes += Number(r.bytes);
        if (r.kind === 'image') result.images = count;
        if (r.kind === 'video') result.videos = count;
      }
      return result;
    });
  }

  /** 删除媒体：同时移除对象存储文件与数据库记录 */
  async remove(id: string): Promise<void> {
    const asset = await this.db.run((m) => m.getRepository(MediaAsset).findOne({ where: { id } }));
    if (!asset) throw new NotFoundException('媒体不存在');
    await this.storage.deleteObject(asset.bucket, asset.objectKey);
    await this.db.run((m) => m.getRepository(MediaAsset).delete({ id }));
  }
}
