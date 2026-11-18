-- ============================================================
-- 007_site_status.sql — 站点禁用与有效期
-- ============================================================

ALTER TABLE sites ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS disabled_reason TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sites_disabled ON sites(disabled);
CREATE INDEX IF NOT EXISTS idx_sites_expires ON sites(expires_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sitebuilder_app;
