import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { TemplateService } from './template.service';
import { CreateTemplateDto } from './dto/template.dto';

@Controller('templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  findAll() {
    return this.templateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTemplateDto) {
    return this.templateService.create(dto);
  }

  @Post('global')
  @Roles('super_admin')
  createGlobal(@Body() dto: CreateTemplateDto) {
    return this.templateService.createGlobal({ ...dto, isGlobal: true });
  }
}
