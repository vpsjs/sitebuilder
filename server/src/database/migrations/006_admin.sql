-- ============================================================
-- 006_admin.sql — 管理员后台所需的表结构扩展
-- 1) users 增加启用状态与登录时间
-- 2) 新建插件目录表 plugin_definitions（全局表，不做 RLS）
-- 3) 模板市场字段补索引
-- 说明：迁移由 Docker 首次启动执行；已有数据库需手动执行本文件。
-- ============================================================

-- ---------- 用户状态 ----------
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);

-- ---------- 插件目录（全局，无 tenant_id，豁免 RLS） ----------
CREATE TABLE IF NOT EXISTS plugin_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(80) NOT NULL UNIQUE,
  name          VARCHAR(120) NOT NULL,
  description   TEXT,
  category      VARCHAR(40) NOT NULL DEFAULT 'general',
  version       VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  author        VARCHAR(120),
  icon          VARCHAR(120),
  config_schema JSONB NOT NULL DEFAULT '[]',
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plugin_defs_category ON plugin_definitions(category);
CREATE INDEX IF NOT EXISTS idx_plugin_defs_enabled ON plugin_definitions(enabled);

-- ---------- 模板市场字段索引 ----------
CREATE INDEX IF NOT EXISTS idx_templates_public ON templates(is_public) WHERE is_public = true;

-- ---------- 审计日志索引（管理端高频查询） ----------
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ---------- 授权给应用角色 ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sitebuilder_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sitebuilder_app;
