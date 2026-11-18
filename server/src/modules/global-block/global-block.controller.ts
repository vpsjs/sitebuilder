import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { GlobalBlockService } from './global-block.service';
import { CreateGlobalBlockDto, UpdateGlobalBlockDto } from './dto/global-block.dto';

@Controller('global-blocks')
export class GlobalBlockController {
  constructor(private readonly service: GlobalBlockService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** 公开读取：公开站按 id 展开全局组件引用（只返回节点 DSL，无敏感数据） */
  @Public()
  @Get('public/:id')
  findPublic(@Param('id') id: string) {
    return this.service.findPublic(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateGlobalBlockDto) {
    return this.service.create(dto);
  }

  @Post('global')
  @Roles('super_admin')
  createGlobal(@Body() dto: CreateGlobalBlockDto) {
    return this.service.create({ ...dto, isGlobal: true });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateGlobalBlockDto) {
    const result = await this.service.update(id, dto);
    // 通知公开站失效缓存，让所有引用该组件的页面立即同步
    const revalidateUrl = process.env.SITE_REVALIDATE_URL ?? 'http://localhost:3001/api/revalidate';
    const secret = process.env.REVALIDATE_SECRET ?? 'dev-revalidate-secret';
    void fetch(revalidateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tag: `global-block:${id}` }),
    }).catch(() => {});
    return result;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
