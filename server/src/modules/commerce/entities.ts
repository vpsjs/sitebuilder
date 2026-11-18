import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() code: string;
  @Column() name: string;
  @Column({ name: 'price_monthly', type: 'numeric' }) priceMonthly: number;
  @Column({ name: 'price_yearly', type: 'numeric' }) priceYearly: number;
  @Column({ type: 'jsonb', default: () => "'[]'" }) features: string[];
  @Column({ type: 'jsonb', default: () => "'{}'" }) limits: Record<string, number>;
  @Column({ name: 'sort_order', default: 0 }) sortOrder: number;
  @Column({ default: true }) active: boolean;
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ name: 'plan_id' }) planId: string;
  @Column({ default: 'active' }) status: string;
  @Column({ name: 'billing_cycle', default: 'monthly' }) billingCycle: string;
  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: true }) currentPeriodEnd: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ name: 'order_no' }) orderNo: string;
  @Column() type: string;
  @Column({ type: 'numeric' }) amount: number;
  @Column({ default: 'pending' }) status: string;
  @Column({ name: 'payment_method', nullable: true }) paymentMethod: string;
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true }) paidAt: Date;
  @Column({ type: 'jsonb', default: () => "'{}'" }) meta: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column() name: string;
  @Column() type: string;
  @Column({ type: 'numeric' }) value: number;
  @Column({ name: 'min_amount', type: 'numeric', default: 0 }) minAmount: number;
  @Column({ default: 0 }) total: number;
  @Column({ default: 0 }) used: number;
  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true }) startsAt: Date;
  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true }) endsAt: Date;
  @Column({ default: 'active' }) status: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column() name: string;
  @Column() type: string;
  @Column({ type: 'jsonb', default: () => "'{}'" }) config: Record<string, unknown>;
  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true }) startsAt: Date;
  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true }) endsAt: Date;
  @Column({ default: 'active' }) status: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('member_levels')
export class MemberLevel {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column() name: string;
  @Column({ name: 'min_points', default: 0 }) minPoints: number;
  @Column({ type: 'numeric', default: 1 }) discount: number;
  @Column({ nullable: true }) color: string;
  @Column({ name: 'sort_order', default: 0 }) sortOrder: number;
}

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ nullable: true }) name: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) email: string;
  @Column({ name: 'level_id', nullable: true }) levelId: string;
  @Column({ default: 0 }) points: number;
  @Column({ name: 'total_spent', type: 'numeric', default: 0 }) totalSpent: number;
  @Column({ type: 'jsonb', default: () => "'[]'" }) tags: string[];
  @Column({ default: 'active' }) status: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column() name: string;
  @Column({ nullable: true }) description: string;
  @Column({ type: 'numeric' }) price: number;
  @Column({ default: 0 }) stock: number;
  @Column({ nullable: true }) image: string;
  @Column({ nullable: true }) category: string;
  @Column({ default: 'active' }) status: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('shop_orders')
export class ShopOrder {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ name: 'order_no' }) orderNo: string;
  @Column({ name: 'member_id', nullable: true }) memberId: string;
  @Column({ type: 'numeric' }) amount: number;
  @Column({ type: 'numeric', default: 0 }) discount: number;
  @Column({ default: 'pending' }) status: string;
  @Column({ type: 'jsonb', default: () => "'[]'" }) items: Record<string, unknown>[];
  @Column({ type: 'jsonb', nullable: true }) address: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('distributors')
export class Distributor {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ name: 'user_id', nullable: true }) userId: string;
  @Column() name: string;
  @Column({ unique: true }) code: string;
  @Column({ name: 'commission_rate', type: 'numeric', default: 10 }) commissionRate: number;
  @Column({ name: 'total_commission', type: 'numeric', default: 0 }) totalCommission: number;
  @Column({ default: 'active' }) status: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('commissions')
export class Commission {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'tenant_id' }) tenantId: string;
  @Column({ name: 'distributor_id' }) distributorId: string;
  @Column({ name: 'order_id', nullable: true }) orderId: string;
  @Column({ type: 'numeric' }) amount: number;
  @Column({ default: 'pending' }) status: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
