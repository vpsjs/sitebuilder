import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RenderService } from './render.service';

/**
 * 小程序渲染数据端点
 * ------------------------------------------------------------------
 * 小程序端不跑 React，而是拿到规范化后的节点树自己渲染。
 * 与 Web 端共用同一份 published_schema，保证内容一致。
 * 输出精简结构：type / props / style / children，去掉 id 等内部字段。
 */
@Controller('mp')
export class MiniAppController {
  constructor(private readonly renderService: RenderService) {}

  @Public()
  @Get(':tenantSlug/:siteSlug')
  async getPage(@Param('tenantSlug') tenantSlug: string, @Param('siteSlug') siteSlug: string) {
    let data;
    try {
      data = await this.renderService.getPublished(tenantSlug, siteSlug);
    } catch {
      throw new NotFoundException('站点不存在或尚未发布');
    }

    const normalize = (node: any): any => ({
      type: node.type,
      props: node.props ?? {},
      style: node.style ?? {},
      children: (node.children ?? []).map(normalize),
    });

    return {
      title: data.schema.meta?.title ?? data.name,
      description: data.schema.meta?.description ?? '',
      theme: data.schema.theme ?? {},
      page: normalize(data.schema.root),
      version: data.version,
    };
  }
}
