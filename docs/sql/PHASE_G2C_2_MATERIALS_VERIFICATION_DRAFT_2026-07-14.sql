-- ============================================================================
-- Phase G2C-2 — Materials Post-Migration Verification DRAFT
-- READ-ONLY — Safe to run at any time
-- ============================================================================

-- 1. Schema: all 13 columns exist on materials
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'materials'
ORDER BY ordinal_position;

-- 2. Schema: sort_order exists on product_materials
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'product_materials' AND column_name = 'sort_order';

-- 3. Row count
SELECT 'materials' AS table_name, count(*) AS row_count FROM materials
UNION ALL
SELECT 'product_materials', count(*) FROM product_materials
UNION ALL
SELECT 'brand_materials', count(*) FROM brand_materials;

-- 4. Migrated row exists with correct status
SELECT id, name, slug, status, sort_order, created_at, updated_at
FROM materials
WHERE name = '白水晶';

-- 5. Status default check: DRAFT
SELECT count(*) AS not_draft
FROM materials
WHERE status IS DISTINCT FROM 'DRAFT';

-- 6. Required defaults: no nulls in NOT NULL columns
SELECT count(*) AS null_slug FROM materials WHERE slug IS NULL
UNION ALL
SELECT count(*) FROM materials WHERE category IS NULL
UNION ALL
SELECT count(*) FROM materials WHERE status IS NULL
UNION ALL
SELECT count(*) FROM materials WHERE sort_order IS NULL
UNION ALL
SELECT count(*) FROM materials WHERE image IS NULL
UNION ALL
SELECT count(*) FROM materials WHERE detail_images IS NULL;

-- 7. Legacy source row preserved (not deleted)
SELECT id, name, status, created_at
FROM brand_materials;

-- 8. product_materials unique constraint still exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'product_materials'
  AND indexdef LIKE '%unique%';

-- 9. No duplicate migration (only one row named 白水晶 in materials)
SELECT count(*) AS duplicate_names
FROM materials
WHERE name = '白水晶';
