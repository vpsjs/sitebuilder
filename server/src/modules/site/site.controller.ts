import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { SiteService } from './site.service';
import { CreateSiteDto, SaveDraftDto } from './dto/site.dto';

@Controller('sites')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Get()
  findAll() {
    return this.siteService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.siteService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSiteDto) {
    return this.siteService.create(dto);
  }

  @Put(':id/draft')
  saveDraft(@Param('id') id: string, @Body() dto: SaveDraftDto) {
    return this.siteService.saveDraft(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.siteService.remove(id);
  }
}
