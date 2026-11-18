import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ArticleService } from './article.service';
import { TenantQueryService } from '../../database/tenant-query.service';
import { Tenant } from '../tenant/tenant.entity';
import {
  CreateArticleDto, UpdateArticleDto, CreateCategoryDto, UpdateCategoryDto,
} from './dto/article.dto';

@Controller('articles')
export class ArticleController {
  constructor(
    private readonly service: ArticleService,
    private readonly tenantQuery: TenantQueryService,
  ) {}

  // ---------- 分类（管理端） ----------
  @Get('categories')
  listCategories() { return this.service.listCategories(); }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) { return this.service.createCategory(dto); }

  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) { return this.service.updateCategory(id, dto); }

  @Delete('categories/:id')
  removeCategory(@Param('id') id: string) { return this.service.removeCategory(id); }

  // ---------- 文章（管理端） ----------
  @Get()
  list(@Query('categoryId') categoryId?: string) { return this.service.listArticles(categoryId); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findArticle(id); }

  @Post()
  create(@Body() dto: CreateArticleDto) { return this.service.createArticle(dto); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) { return this.service.updateArticle(id, dto); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.removeArticle(id); }

  /** 公开站读取：GET /api/articles/public/:tenantSlug?categoryId= */
  @Public()
  @Get('public/:tenantSlug')
  async publicList(
    @Param('tenantSlug') tenantSlug: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const tenant = await this.tenantQuery.runUnscoped((m) =>
      m.getRepository(Tenant).findOne({ where: { slug: tenantSlug } }),
    );
    if (!tenant) return { articles: [], categories: [] };
    return this.service.findPublished(tenant.id, categoryId);
  }
}
