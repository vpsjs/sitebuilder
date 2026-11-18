import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantQueryService } from '../../database/tenant-query.service';
import { TenantContext } from '../../common/tenant/tenant-context';
import { Article, ArticleCategory } from './article.entity';
import {
  CreateArticleDto, UpdateArticleDto, CreateCategoryDto, UpdateCategoryDto,
} from './dto/article.dto';

@Injectable()
export class ArticleService {
  constructor(private readonly tenantQuery: TenantQueryService) {}

  private tenantId(): string {
    const id = TenantContext.getTenantId();
    if (!id) throw new NotFoundException('缺少租户上下文');
    return id;
  }

  // ---------- 分类 ----------
  async listCategories(): Promise<ArticleCategory[]> {
    return this.tenantQuery.run((m) =>
      m.getRepository(ArticleCategory)
        .createQueryBuilder('c')
        .where('c.tenant_id = :tid', { tid: this.tenantId() })
        .orderBy('c.sort_order', 'ASC')
        .addOrderBy('c.created_at', 'ASC')
        .getMany(),
    );
  }

  async createCategory(dto: CreateCategoryDto): Promise<ArticleCategory> {
    return this.tenantQuery.run((m) => {
      const repo = m.getRepository(ArticleCategory);
      return repo.save(repo.create({ ...dto, tenantId: this.tenantId() }));
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<ArticleCategory> {
    return this.tenantQuery.run(async (m) => {
      const repo = m.getRepository(ArticleCategory);
      const row = await repo.findOne({ where: { id, tenantId: this.tenantId() } });
      if (!row) throw new NotFoundException('分类不存在');
      return repo.save(Object.assign(row, dto));
    });
  }

  async removeCategory(id: string): Promise<void> {
    await this.tenantQuery.run(async (m) => {
      const repo = m.getRepository(ArticleCategory);
      const row = await repo.findOne({ where: { id, tenantId: this.tenantId() } });
      if (!row) throw new NotFoundException('分类不存在');
      await repo.remove(row);
    });
  }

  // ---------- 文章 ----------
  async listArticles(categoryId?: string): Promise<Article[]> {
    return this.tenantQuery.run((m) => {
      const qb = m.getRepository(Article)
        .createQueryBuilder('a')
        .where('a.tenant_id = :tid', { tid: this.tenantId() });
      if (categoryId) qb.andWhere('a.category_id = :cid', { cid: categoryId });
      return qb.orderBy('a.published_at', 'DESC').addOrderBy('a.created_at', 'DESC').getMany();
    });
  }

  async findArticle(id: string): Promise<Article> {
    const row = await this.tenantQuery.run((m) =>
      m.getRepository(Article).findOne({ where: { id, tenantId: this.tenantId() } }),
    );
    if (!row) throw new NotFoundException('文章不存在');
    return row;
  }

  async createArticle(dto: CreateArticleDto): Promise<Article> {
    return this.tenantQuery.run((m) => {
      const repo = m.getRepository(Article);
      return repo.save(repo.create({
        ...dto,
        tenantId: this.tenantId(),
        publishedAt: dto.status === 'draft' ? null : new Date(),
      }));
    });
  }

  async updateArticle(id: string, dto: UpdateArticleDto): Promise<Article> {
    return this.tenantQuery.run(async (m) => {
      const repo = m.getRepository(Article);
      const row = await repo.findOne({ where: { id, tenantId: this.tenantId() } });
      if (!row) throw new NotFoundException('文章不存在');
      Object.assign(row, dto);
      if (dto.status && dto.status !== 'draft' && !row.publishedAt) row.publishedAt = new Date();
      return repo.save(row);
    });
  }

  async removeArticle(id: string): Promise<void> {
    await this.tenantQuery.run(async (m) => {
      const repo = m.getRepository(Article);
      const row = await repo.findOne({ where: { id, tenantId: this.tenantId() } });
      if (!row) throw new NotFoundException('文章不存在');
      await repo.remove(row);
    });
  }

  /** 公开站读取：按站点所属租户取已发布文章（绕过 RLS，用 tenantId 精确限定） */
  async findPublished(tenantId: string, categoryId?: string): Promise<{ articles: Article[]; categories: ArticleCategory[] }> {
    return this.tenantQuery.runUnscoped(async (m) => {
      const aq = m.getRepository(Article)
        .createQueryBuilder('a')
        .where('a.tenant_id = :tid', { tid: tenantId })
        .andWhere('a.status = :status', { status: 'published' });
      if (categoryId) aq.andWhere('a.category_id = :cid', { cid: categoryId });
      const articles = await aq.orderBy('a.published_at', 'DESC').getMany();
      const categories = await m.getRepository(ArticleCategory)
        .createQueryBuilder('c')
        .where('c.tenant_id = :tid', { tid: tenantId })
        .orderBy('c.sort_order', 'ASC')
        .getMany();
      return { articles, categories };
    });
  }
}
