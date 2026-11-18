-- ---------- 全局组件（header/footer 等可复用区块） ----------
-- 借鉴 templates 的"全局/租户"二元语义：tenant_id 为 null 且 is_global=true 表示全局共享。
-- node 存单个 DslNode（不是整页 PageSchema），用于改一次全站同步。
CREATE TABLE IF NOT EXISTS global_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(120) NOT NULL,
  category    VARCHAR(60),
  description TEXT,
  cover       TEXT,
  node        JSONB NOT NULL,
  is_global   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_blocks_tenant ON global_blocks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_global_blocks_global ON global_blocks(is_global) WHERE is_global = true;

-- 加入 RLS 表数组：租户只能读自己的 + 全局的
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['global_blocks'])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation_%I ON %I USING (
        current_setting('app.is_super_admin', true) = 'on'
        OR is_global = true
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      ) WITH CHECK (
        current_setting('app.is_super_admin', true) = 'on'
        OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
      )
    $f$, t, t);
  END LOOP;
END $$;
