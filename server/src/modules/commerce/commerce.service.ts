import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantQueryService } from '../../database/tenant-query.service';
import { TenantContext } from '../../common/tenant/tenant-context';
import { eventBus } from '../../common/events';
import {
  Plan, Subscription, Order, Coupon, Campaign, MemberLevel,
  Member, Product, ShopOrder, Distributor, Commission,
} from './entities';

@Injectable()
export class CommerceService {
  constructor(private readonly db: TenantQueryService) {}

  // ---------- 套餐与订阅 ----------
  async listPlans(): Promise<Plan[]> {
    return this.db.runUnscoped((m) => m.getRepository(Plan).find({ order: { sortOrder: 'ASC' } }));
  }

  async currentSubscription() {
    return this.db.run((m) =>
      m.getRepository(Subscription).find({
        where: { status: 'active' },
        order: { createdAt: 'DESC' },
        take: 1,
      }),
    );
  }

  async subscribe(planId: string, cycle: 'monthly' | 'yearly' = 'monthly') {
    return this.db.run(async (m) => {
      const plan = await m.getRepository(Plan).findOne({ where: { id: planId } });
      if (!plan) throw new NotFoundException('套餐不存在');
      const tenantId = TenantContext.getTenantId();
      const amount = cycle === 'yearly' ? Number(plan.priceYearly) : Number(plan.priceMonthly);
      await m.getRepository(Subscription).update({ tenantId, status: 'active' }, { status: 'cancelled' });
      const sub = await m.getRepository(Subscription).save(m.getRepository(Subscription).create({
        tenantId, planId, status: 'active', billingCycle: cycle,
        currentPeriodEnd: new Date(Date.now() + (cycle === 'yearly' ? 365 : 30) * 86400 * 1000),
      }));
      const orderNo = `SB${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const order = await m.getRepository(Order).save(m.getRepository(Order).create({
        tenantId, orderNo, type: 'subscription', amount,
        status: amount === 0 ? 'paid' : 'pending',
        paidAt: amount === 0 ? new Date() : undefined,
        meta: { planId, cycle, planName: plan.name },
      }));
      await m.query('UPDATE tenants SET plan=$1 WHERE id=$2', [plan.code, tenantId]);
      eventBus.emit('order:created', { orderNo, amount });
      return { subscription: sub, order };
    });
  }

  async listOrders(): Promise<Order[]> {
    return this.db.run((m) => m.getRepository(Order).find({ order: { createdAt: 'DESC' }, take: 100 }));
  }

  async payOrder(id: string, method = 'mock'): Promise<Order> {
    const order = await this.db.run((m) => m.getRepository(Order).findOne({ where: { id } }));
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status === 'paid') return order;
    const paid = await this.db.run((m) => m.getRepository(Order).save({
      ...order, status: 'paid', paymentMethod: method, paidAt: new Date(),
    }));
    eventBus.emit('order:paid', { orderId: id, amount: order.amount });
    return paid;
  }

  // ---------- 优惠券 ----------
  async listCoupons(): Promise<Coupon[]> {
    return this.db.run((m) => m.getRepository(Coupon).find({ order: { createdAt: 'DESC' } }));
  }

  async createCoupon(data: Partial<Coupon>): Promise<Coupon> {
    return this.db.run((m) => {
      const repo = m.getRepository(Coupon);
      return repo.save(repo.create({ ...data, tenantId: TenantContext.getTenantId() }));
    });
  }

  // ---------- 营销活动 ----------
  async listCampaigns(): Promise<Campaign[]> {
    return this.db.run((m) => m.getRepository(Campaign).find({ order: { createdAt: 'DESC' } }));
  }

  async createCampaign(data: Partial<Campaign>): Promise<Campaign> {
    return this.db.run((m) => {
      const repo = m.getRepository(Campaign);
      return repo.save(repo.create({ ...data, tenantId: TenantContext.getTenantId() }));
    });
  }

  // ---------- 会员 ----------
  async listMembers(): Promise<Member[]> {
    return this.db.run((m) => m.getRepository(Member).find({ order: { createdAt: 'DESC' }, take: 200 }));
  }

  async createMember(data: Partial<Member>): Promise<Member> {
    return this.db.run((m) => {
      const repo = m.getRepository(Member);
      return repo.save(repo.create({ ...data, tenantId: TenantContext.getTenantId() }));
    });
  }

  async updateMember(id: string, patch: Partial<Member>): Promise<Member> {
    const member = await this.db.run((m) => m.getRepository(Member).findOne({ where: { id } }));
    if (!member) throw new NotFoundException('会员不存在');
    return this.db.run((m) => m.getRepository(Member).save({ ...member, ...patch, id }));
  }

  async listLevels(): Promise<MemberLevel[]> {
    return this.db.run((m) => m.getRepository(MemberLevel).find({ order: { sortOrder: 'ASC' } }));
  }

  async addPoints(memberId: string, delta: number): Promise<Member> {
    const member = await this.db.run((m) => m.getRepository(Member).findOne({ where: { id: memberId } }));
    if (!member) throw new NotFoundException('会员不存在');
    const points = Math.max(0, member.points + delta);
    return this.db.run((m) => m.getRepository(Member).save({ ...member, points }));
  }

  // ---------- 商品 ----------
  async listProducts(): Promise<Product[]> {
    return this.db.run((m) => m.getRepository(Product).find({ order: { createdAt: 'DESC' } }));
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    return this.db.run((m) => {
      const repo = m.getRepository(Product);
      return repo.save(repo.create({ ...data, tenantId: TenantContext.getTenantId() }));
    });
  }

  // ---------- 商城订单 ----------
  async listShopOrders(): Promise<ShopOrder[]> {
    return this.db.run((m) => m.getRepository(ShopOrder).find({ order: { createdAt: 'DESC' }, take: 100 }));
  }

  async createShopOrder(data: { items: { productId: string; quantity: number }[]; memberId?: string; discount?: number }) {
    return this.db.run(async (m) => {
      const productRepo = m.getRepository(Product);
      let amount = 0;
      const items: Record<string, unknown>[] = [];
      for (const item of data.items) {
        const p = await productRepo.findOne({ where: { id: item.productId } });
        if (!p) throw new BadRequestException(`商品 ${item.productId} 不存在`);
        if (p.stock < item.quantity) throw new BadRequestException(`商品 ${p.name} 库存不足`);
        const lineTotal = Number(p.price) * item.quantity;
        amount += lineTotal;
        items.push({ productId: p.id, name: p.name, price: p.price, quantity: item.quantity, total: lineTotal });
        await productRepo.update({ id: p.id }, { stock: p.stock - item.quantity });
      }
      const discount = data.discount ?? 0;
      const orderNo = `SH${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const order = await m.getRepository(ShopOrder).save(m.getRepository(ShopOrder).create({
        tenantId: TenantContext.getTenantId(), orderNo, memberId: data.memberId,
        amount: amount - discount, discount, items, status: 'paid',
      }));

      // 会员积分 + 累计消费
      if (data.memberId) {
        await m.query(
          'UPDATE members SET points = points + $1, total_spent = total_spent + $2 WHERE id = $3',
          [Math.floor(amount - discount), amount - discount, data.memberId],
        );
      }

      // 分销佣金
      const distributor = await m.getRepository(Distributor).findOne({ where: { status: 'active' } });
      if (distributor) {
        const commissionAmount = (amount - discount) * Number(distributor.commissionRate) / 100;
        await m.getRepository(Commission).save(m.getRepository(Commission).create({
          tenantId: TenantContext.getTenantId(), distributorId: distributor.id,
          orderId: order.id, amount: commissionAmount, status: 'pending',
        }));
        await m.query(
          'UPDATE distributors SET total_commission = total_commission + $1 WHERE id = $2',
          [commissionAmount, distributor.id],
        );
      }
      eventBus.emit('order:paid', { orderId: order.id, type: 'shop' });
      return order;
    });
  }

  // ---------- 分销 ----------
  async listDistributors(): Promise<Distributor[]> {
    return this.db.run((m) => m.getRepository(Distributor).find());
  }

  async createDistributor(data: Partial<Distributor>): Promise<Distributor> {
    return this.db.run((m) => {
      const repo = m.getRepository(Distributor);
      const code = data.code || `DIST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      return repo.save(repo.create({ ...data, code, tenantId: TenantContext.getTenantId() }));
    });
  }

  async listCommissions(): Promise<Commission[]> {
    return this.db.run((m) => m.getRepository(Commission).find({ order: { createdAt: 'DESC' } }));
  }

  async settleCommission(id: string): Promise<Commission> {
    const c = await this.db.run((m) => m.getRepository(Commission).findOne({ where: { id } }));
    if (!c) throw new NotFoundException('佣金记录不存在');
    return this.db.run((m) => m.getRepository(Commission).save({ ...c, status: 'settled' }));
  }
}
