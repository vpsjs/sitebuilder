-- ============================================================
-- 专用应用数据库角色
-- ------------------------------------------------------------
-- 表 owner（sitebuilder）是 superuser，会绕过 RLS。
-- 应用必须使用非 owner、非 superuser 的角色连接，RLS 才真正生效。
-- FORCE ROW LEVEL SECURITY 让 owner 也受 RLS 约束（双保险）。
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sitebuilder_app') THEN
    CREATE ROLE sitebuilder_app LOGIN PASSWORD 'sitebuilder_app_dev';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO sitebuilder_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sitebuilder_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sitebuilder_app;

-- 让表 owner 也受 RLS 约束（防止误用 owner 连接绕过隔离）
ALTER TABLE users           FORCE ROW LEVEL SECURITY;
ALTER TABLE templates       FORCE ROW LEVEL SECURITY;
ALTER TABLE sites           FORCE ROW LEVEL SECURITY;
ALTER TABLE publish_records FORCE ROW LEVEL SECURITY;
