-- ============================================================
-- 自助建站平台 初始化迁移
-- ------------------------------------------------------------
-- 关键点：所有租户数据表启用 PostgreSQL Row Level Security (RLS)
-- 通过会话变量 app.current_tenant_id 隔离，应用与数据库双重防线。
-- 本脚本由 docker-entrypoint-initdb.d 在首次启动时自动执行。
-- ============================================================

-- 通用工具：uuid
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- 租户表（顶层，不需要 RLS 按 tenant 过滤）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(60) UNIQUE NOT NULL,
  plan        VARCHAR(20) NOT NULL DEFAULT 'free',
  status      VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 用户表：role = user | tenant_admin | super_admin
-- super_admin 不属于任何租户（tenant_id 为空），可跨租户
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email         VARCHAR(180) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          VARCHAR(80),
  role          VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 模板表：tenant_id 为空表示系统全局模板
-- schema 用 JSONB 存储 DSL
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(120) NOT NULL,
  category    VARCHAR(40),
  description TEXT,
  cover       TEXT,
  schema      JSONB NOT NULL,
  is_global   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 站点表：draft_schema = 草稿 DSL，published_schema = 已发布快照
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             VARCHAR(120) NOT NULL,
  slug             VARCHAR(80) NOT NULL,
  draft_schema     JSONB,
  published_schema JSONB,
  published_at     TIMESTAMPTZ,
  status           VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

-- ------------------------------------------------------------
-- 发布记录表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS publish_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  schema      JSONB NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS 策略
-- ------------------------------------------------------------
-- 读取当前租户会话变量的辅助函数：
--   current_setting('app.current_tenant_id', true) 在变量未设置时返回空串
--   NULLIF 将其转为 NULL，避免类型比较错误
-- super_admin 通过设置 app.is_super_admin = 'on' 绕过 RLS
-- ============================================================

ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites            ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_records  ENABLE ROW LEVEL SECURITY;

-- users: 租户用户只能看本租户用户；超管看全部
CREATE POLICY tenant_isolation_users ON users
  FOR ALL
  USING (
    current_setting('app.is_super_admin', true) = 'on'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'on'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

-- templates: 本租户模板 + 全局模板可见
CREATE POLICY tenant_isolation_templates ON templates
  FOR ALL
  USING (
    current_setting('app.is_super_admin', true) = 'on'
    OR is_global
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'on'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

-- sites
CREATE POLICY tenant_isolation_sites ON sites
  FOR ALL
  USING (
    current_setting('app.is_super_admin', true) = 'on'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'on'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

-- publish_records
CREATE POLICY tenant_isolation_publish ON publish_records
  FOR ALL
  USING (
    current_setting('app.is_super_admin', true) = 'on'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'on'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

-- 索引
CREATE INDEX IF NOT EXISTS idx_sites_tenant     ON sites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_templates_tenant ON templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant     ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_publish_site     ON publish_records(site_id);
