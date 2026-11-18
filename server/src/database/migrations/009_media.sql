-- ============================================================
-- 009_media.sql — 媒体库（用户上传的图片/视频）
-- ============================================================

CREATE TABLE IF NOT EXISTS media_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'image',        -- image | video
  size          BIGINT NOT NULL DEFAULT 0,            -- 字节
  bucket        TEXT NOT NULL DEFAULT 'sites',
  object_key    TEXT NOT NULL,
  url           TEXT NOT NULL,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS：租户隔离，超管可跨租户
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_media ON media_assets;
CREATE POLICY tenant_isolation_media ON media_assets
  FOR ALL
  USING (
    current_setting('app.is_super_admin', true) = 'on'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'on'
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

CREATE INDEX IF NOT EXISTS idx_media_tenant ON media_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_kind ON media_assets(kind);
CREATE INDEX IF NOT EXISTS idx_media_created ON media_assets(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON media_assets TO sitebuilder_app;
