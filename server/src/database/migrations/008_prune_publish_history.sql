-- ============================================================
-- 发布历史裁剪：每个站点仅保留最新的 3 个版本
-- ------------------------------------------------------------
-- 与应用层 PublishService.pruneHistory 保持一致（KEEP_VERSIONS=3）。
-- 按 site_id 分区、version 倒序，删除第 4 条及更早的记录。
-- 使用 ROW_NUMBER 窗口函数，安全且可重复执行（幂等）。
-- ============================================================

DELETE FROM publish_records
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY site_id ORDER BY version DESC, created_at DESC
    ) AS rn
    FROM publish_records
  ) ranked
  WHERE rn > 3
);
