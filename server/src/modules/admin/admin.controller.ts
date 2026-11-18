import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put, Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

/** 管理员后台：所有端点仅 super_admin 可访问 */
@Controller('admin')
@Roles('super_admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // ---------- 概览 ----------
  @Get('overview')
  overview() { return this.admin.overview(); }

  // ---------- 用户 ----------
  @Get('users')
  listUsers(@Query() q: any) { return this.admin.listUsers(q); }

  @Post('users')
  createUser(@Body() body: any) { return this.admin.createUser(body); }

  @Put('users/:id')
  updateUser(@Param('id') id: string, @Body() body: any) { return this.admin.updateUser(id, body); }

  @Patch('users/:id/status')
  setUserStatus(@Param('id') id: string, @Body() body: { status: 'active' | 'disabled' }) {
    return this.admin.setUserStatus(id, body.status);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) { return this.admin.deleteUser(id); }

  // ---------- 租户 ----------
  @Get('tenants')
  listTenants(@Query() q: any) { return this.admin.listTenants(q); }

  @Put('tenants/:id')
  updateTenant(@Param('id') id: string, @Body() body: any) { return this.admin.updateTenant(id, body); }

  // ---------- 套餐 ----------
  @Get('plans')
  listPlans() { return this.admin.listPlans(); }

  @Post('plans')
  createPlan(@Body() body: any) { return this.admin.createPlan(body); }

  @Put('plans/:id')
  updatePlan(@Param('id') id: string, @Body() body: any) { return this.admin.updatePlan(id, body); }

  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) { return this.admin.deletePlan(id); }

  @Get('subscriptions')
  listSubscriptions(@Query() q: any) { return this.admin.listSubscriptions(q); }

  @Patch('subscriptions/:id/cancel')
  cancelSubscription(@Param('id') id: string) { return this.admin.cancelSubscription(id); }

  @Get('orders')
  listOrders(@Query() q: any) { return this.admin.listOrders(q); }

  // ---------- 模板 ----------
  @Get('templates')
  listTemplates(@Query() q: any) { return this.admin.listTemplates(q); }

  @Put('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() body: any) { return this.admin.updateTemplate(id, body); }

  @Patch('templates/:id/public')
  setTemplatePublic(@Param('id') id: string, @Body() body: { isPublic: boolean }) {
    return this.admin.setTemplatePublic(id, body.isPublic);
  }

  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) { return this.admin.deleteTemplate(id); }

  // ---------- 插件目录 ----------
  @Get('plugins')
  listPlugins() { return this.admin.listPluginDefinitions(); }

  @Post('plugins')
  createPlugin(@Body() body: any) { return this.admin.createPluginDefinition(body); }

  @Put('plugins/:id')
  updatePlugin(@Param('id') id: string, @Body() body: any) { return this.admin.updatePluginDefinition(id, body); }

  @Delete('plugins/:id')
  deletePlugin(@Param('id') id: string) { return this.admin.deletePluginDefinition(id); }

  // ---------- 站点 ----------
  @Get('sites')
  listSites(@Query() q: any) { return this.admin.listSites(q); }

  @Post('sites')
  createSite(@Body() body: any) { return this.admin.createSite(body); }

  @Put('sites/:id')
  updateSite(@Param('id') id: string, @Body() body: any) { return this.admin.updateSite(id, body); }

  @Patch('sites/:id/disabled')
  setSiteDisabled(@Param('id') id: string, @Body() body: { disabled: boolean; reason?: string }) {
    return this.admin.setSiteDisabled(id, body.disabled, body.reason);
  }

  /** 代客编辑：签发目标租户身份的 token，供管理员进入编辑器修改用户站点 */
  @Post('sites/:id/impersonate')
  impersonateSite(@Param('id') id: string) { return this.admin.impersonateSite(id); }

  @Delete('sites/:id')
  deleteSite(@Param('id') id: string) { return this.admin.deleteSite(id); }

  // ---------- 审计 ----------
  @Get('audit')
  listAudit(@Query() q: any) { return this.admin.listAudit(q); }
}
