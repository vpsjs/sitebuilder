-- ============================================================
-- 运营能力扩展迁移（有赞/微盟式）
-- ------------------------------------------------------------
-- 覆盖：多页面、域名、表单留言、套餐计费、团队、审计、
--       统计、营销（优惠券/秒杀/拼团）、会员、分销、CRM、商品订单
-- 所有租户表启用 RLS，沿用 001_init.sql 的会话变量约定。
-- ============================================================

-- ---------- 多页面 ----------
CREATE TABLE IF NOT EXISTS pages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id          UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name             VARCHAR(120) NOT NULL,
  slug             VARCHAR(80) NOT NULL,
  is_home          BOOLEAN NOT NULL DEFAULT false,
  draft_schema     JSONB,
  published_schema JSONB,
  published_at     TIMESTAMPTZ,
  status           VARCHAR(20) NOT NULL DEFAULT 'draft',
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

-- ---------- 域名绑定 ----------
CREATE TABLE IF NOT EXISTS domains (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  domain      VARCHAR(180) NOT NULL UNIQUE,
  verified    BOOLEAN NOT NULL DEFAULT false,
  verify_token VARCHAR(64),
  ssl_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
  ssl_expires TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 表单留言 ----------
CREATE TABLE IF NOT EXISTS form_submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id     UUID REFERENCES sites(id) ON DELETE SET NULL,
  page_id     UUID,
  form_id     VARCHAR(80) NOT NULL,
  data        JSONB NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'unread',
  source_url  TEXT,
  ip          INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 套餐与订阅 ----------
CREATE TABLE IF NOT EXISTS plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(40) NOT NULL UNIQUE,
  name          VARCHAR(80) NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly  NUMERIC(10,2) NOT NULL DEFAULT 0,
  features      JSONB NOT NULL DEFAULT '[]',
  limits        JSONB NOT NULL DEFAULT '{}',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id           UUID NOT NULL REFERENCES plans(id),
  status            VARCHAR(20) NOT NULL DEFAULT 'active',
  billing_cycle     VARCHAR(10) NOT NULL DEFAULT 'monthly',
  current_period_end TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_no        VARCHAR(40) NOT NULL UNIQUE,
  type            VARCHAR(20) NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_method  VARCHAR(20),
  paid_at         TIMESTAMPTZ,
  meta            JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 团队与邀请 ----------
CREATE TABLE IF NOT EXISTS invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       VARCHAR(180) NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'user',
  token       VARCHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID,
  action      VARCHAR(60) NOT NULL,
  target_type VARCHAR(40),
  target_id   VARCHAR(80),
  meta        JSONB NOT NULL DEFAULT '{}',
  ip          INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 统计事件 ----------
CREATE TABLE IF NOT EXISTS analytics_events (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id     UUID,
  page_id     UUID,
  type        VARCHAR(30) NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 营销：优惠券 ----------
CREATE TABLE IF NOT EXISTS coupons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(80) NOT NULL,
  type        VARCHAR(20) NOT NULL,
  value       NUMERIC(10,2) NOT NULL,
  min_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  total       INTEGER NOT NULL DEFAULT 0,
  used        INTEGER NOT NULL DEFAULT 0,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  status      VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupon_claims (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  coupon_id   UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  member_id   UUID,
  code        VARCHAR(40) NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 营销活动（秒杀/拼团） ----------
CREATE TABLE IF NOT EXISTS campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  type        VARCHAR(20) NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}',
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  status      VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 会员与 CRM ----------
CREATE TABLE IF NOT EXISTS member_levels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(60) NOT NULL,
  min_points  INTEGER NOT NULL DEFAULT 0,
  discount    NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  color       VARCHAR(20),
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(80),
  phone       VARCHAR(30),
  email       VARCHAR(180),
  level_id    UUID REFERENCES member_levels(id) ON DELETE SET NULL,
  points      INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  tags        JSONB NOT NULL DEFAULT '[]',
  status      VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 商品与商城订单 ----------
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(140) NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  image       TEXT,
  category    VARCHAR(60),
  status      VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shop_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_no    VARCHAR(40) NOT NULL UNIQUE,
  member_id   UUID REFERENCES members(id) ON DELETE SET NULL,
  amount      NUMERIC(10,2) NOT NULL,
  discount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',
  items       JSONB NOT NULL DEFAULT '[]',
  address     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 分销 ----------
CREATE TABLE IF NOT EXISTS distributors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  name            VARCHAR(80) NOT NULL,
  code            VARCHAR(30) NOT NULL UNIQUE,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  total_commission NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES shop_orders(id) ON DELETE SET NULL,
  amount      NUMERIC(10,2) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 插件安装 ----------
CREATE TABLE IF NOT EXISTS plugin_installs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plugin_id   VARCHAR(80) NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}',
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, plugin_id)
);

-- ---------- 模板市场扩展字段 ----------
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS installs INTEGER NOT NULL DEFAULT 0;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) NOT NULL DEFAULT 5.00;

-- ============================================================
-- RLS 策略（批量启用）
-- plans 是全局表，不做 RLS。其余全部按 tenant_id 隔离。
-- ============================================================

DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    'pages','domains','form_submissions','subscriptions','orders',
    'invitations','audit_logs','analytics_events','coupons','coupon_claims',
    'campaigns','member_levels','members','products','shop_orders',
    'distributors','commissions','plugin_installs'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation_%I ON %I
        FOR ALL
        USING (
          current_setting('app.is_super_admin', true) = 'on'
          OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
        WITH CHECK (
          current_setting('app.is_super_admin', true) = 'on'
          OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
        )
    $f$, t, t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant ON %I(tenant_id)', t, t);
  END LOOP;
END $$;

-- super_admin 角色需要能访问新表
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sitebuilder_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sitebuilder_app;
