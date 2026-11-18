import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CommerceService } from './commerce.service';
import { Public } from '../../common/decorators/public.decorator';
import { TenantQueryService } from '../../database/tenant-query.service';
import { Tenant } from '../tenant/tenant.entity';
import { Product } from './entities';

@Controller('billing')
export class BillingController {
  constructor(private readonly commerce: CommerceService) {}

  @Get('plans')
  plans() { return this.commerce.listPlans(); }

  @Get('subscription')
  subscription() { return this.commerce.currentSubscription(); }

  @Post('subscribe')
  subscribe(@Body() body: { planId: string; cycle?: 'monthly' | 'yearly' }) {
    return this.commerce.subscribe(body.planId, body.cycle ?? 'monthly');
  }

  @Get('orders')
  orders() { return this.commerce.listOrders(); }

  @Post('orders/:id/pay')
  pay(@Param('id') id: string, @Body() body?: { method?: string }) {
    return this.commerce.payOrder(id, body?.method);
  }
}

@Controller('coupons')
export class CouponsController {
  constructor(private readonly commerce: CommerceService) {}
  @Get() list() { return this.commerce.listCoupons(); }
  @Post() create(@Body() body: any) { return this.commerce.createCoupon(body); }
}

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly commerce: CommerceService) {}
  @Get() list() { return this.commerce.listCampaigns(); }
  @Post() create(@Body() body: any) { return this.commerce.createCampaign(body); }
}

@Controller('members')
export class MembersController {
  constructor(private readonly commerce: CommerceService) {}
  @Get() list() { return this.commerce.listMembers(); }
  @Get('levels') levels() { return this.commerce.listLevels(); }
  @Post() create(@Body() body: any) { return this.commerce.createMember(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.commerce.updateMember(id, body); }
  @Post(':id/points') addPoints(@Param('id') id: string, @Body() body: { delta: number }) {
    return this.commerce.addPoints(id, body.delta);
  }
}

@Controller('products')
export class ProductsController {
  constructor(
    private readonly commerce: CommerceService,
    private readonly tenantQuery: TenantQueryService,
  ) {}
  @Get() list() { return this.commerce.listProducts(); }
  @Post() create(@Body() body: any) { return this.commerce.createProduct(body); }

  /** 公开站读取租户上架产品（供 card-list 动态渲染） */
  @Public()
  @Get('public/:tenantSlug')
  async publicList(@Param('tenantSlug') tenantSlug: string) {
    const tenant = await this.tenantQuery.runUnscoped((m) =>
      m.getRepository(Tenant).findOne({ where: { slug: tenantSlug } }),
    );
    if (!tenant) return [];
    return this.tenantQuery.runUnscoped((m) =>
      m.getRepository(Product)
        .createQueryBuilder('p')
        .where('p.tenant_id = :tid', { tid: tenant.id })
        .andWhere("p.status = 'active'")
        .orderBy('p.created_at', 'DESC')
        .getMany(),
    );
  }
}

@Controller('shop-orders')
export class ShopOrdersController {
  constructor(private readonly commerce: CommerceService) {}
  @Get() list() { return this.commerce.listShopOrders(); }
  @Post() create(@Body() body: { items: { productId: string; quantity: number }[]; memberId?: string; discount?: number }) {
    return this.commerce.createShopOrder(body);
  }
}

@Controller('distributors')
export class DistributorsController {
  constructor(private readonly commerce: CommerceService) {}
  @Get() list() { return this.commerce.listDistributors(); }
  @Get('commissions') commissions() { return this.commerce.listCommissions(); }
  @Post() create(@Body() body: any) { return this.commerce.createDistributor(body); }
  @Post('commissions/:id/settle') settle(@Param('id') id: string) { return this.commerce.settleCommission(id); }
}
