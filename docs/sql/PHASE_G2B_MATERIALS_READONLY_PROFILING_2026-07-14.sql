-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE G2B — Materials Production Data Profiling (READ ONLY)
--
-- Target database: Brand DB (BRAND_DATABASE_URL)
-- Tables: materials, product_materials, brand_materials
--
-- WARNING: ALL queries are READ ONLY. Transaction is ROLLBACK only.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;
SET TRANSACTION READ ONLY;

-- ════════════════════════════════════════════════════════════
-- 1. PHYSICAL SCHEMA DISCOVERY
-- ════════════════════════════════════════════════════════════

-- 1A. materials
SELECT '=== SCHEMA: materials ===' AS info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns WHERE table_name = 'materials'
ORDER BY ordinal_position;

SELECT con.conname, con.contype, pg_get_constraintdef(con.oid)
FROM pg_catalog.pg_class rel
JOIN pg_catalog.pg_constraint con ON con.conrelid = rel.oid
WHERE rel.relname = 'materials'
ORDER BY con.contype, con.conname;

SELECT indexname, indexdef
FROM pg_indexes WHERE tablename = 'materials' ORDER BY indexname;

-- 1B. product_materials
SELECT '=== SCHEMA: product_materials ===' AS info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns WHERE table_name = 'product_materials'
ORDER BY ordinal_position;

SELECT con.conname, con.contype, pg_get_constraintdef(con.oid)
FROM pg_catalog.pg_class rel
JOIN pg_catalog.pg_constraint con ON con.conrelid = rel.oid
WHERE rel.relname = 'product_materials'
ORDER BY con.contype, con.conname;

SELECT indexname, indexdef
FROM pg_indexes WHERE tablename = 'product_materials' ORDER BY indexname;

-- 1C. brand_materials
SELECT '=== SCHEMA: brand_materials ===' AS info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns WHERE table_name = 'brand_materials'
ORDER BY ordinal_position;

SELECT con.conname, con.contype, pg_get_constraintdef(con.oid)
FROM pg_catalog.pg_class rel
JOIN pg_catalog.pg_constraint con ON con.conrelid = rel.oid
WHERE rel.relname = 'brand_materials'
ORDER BY con.contype, con.conname;

SELECT indexname, indexdef
FROM pg_indexes WHERE tablename = 'brand_materials' ORDER BY indexname;

-- ════════════════════════════════════════════════════════════
-- 2. ROW COUNTS
-- ════════════════════════════════════════════════════════════

SELECT '=== ROW COUNTS ===' AS info;
SELECT 'materials' AS tbl, COUNT(*)::bigint FROM materials
UNION ALL SELECT 'product_materials', COUNT(*)::bigint FROM product_materials
UNION ALL SELECT 'brand_materials', COUNT(*)::bigint FROM brand_materials;

-- ════════════════════════════════════════════════════════════
-- 3. MATERIALS TABLE PROFILE
-- ════════════════════════════════════════════════════════════

SELECT '=== MATERIALS PROFILE ===' AS info;
SELECT COUNT(*) AS total, MIN(id) AS min_id, MAX(id) AS max_id FROM materials;

-- Check if any of the 13 target columns already exist on materials
SELECT '13-field columns present on materials' AS info;
SELECT column_name FROM information_schema.columns
WHERE table_name = 'materials' AND column_name IN (
  'slug','category','short_desc','story','applicable_products',
  'status','sort_order','cover_image','detail_images',
  'seo_title','seo_description','seo_keywords','erp_material_id'
) ORDER BY column_name;

-- Sequence check
SELECT 'materials_id_seq' AS seq, last_value FROM materials_id_seq;

-- ════════════════════════════════════════════════════════════
-- 4. PRODUCT_MATERIALS PROFILE
-- ════════════════════════════════════════════════════════════

SELECT '=== PRODUCT_MATERIALS PROFILE ===' AS info;
SELECT COUNT(*) AS total,
       COUNT(DISTINCT product_id) AS distinct_product_ids,
       COUNT(DISTINCT material_id) AS distinct_material_ids
FROM product_materials;

-- Duplicate pairs
SELECT 'duplicate_pairs' AS check, COUNT(*) AS groups, SUM(cnt) AS rows
FROM (SELECT COUNT(*) AS cnt FROM product_materials GROUP BY product_id, material_id HAVING COUNT(*) > 1) d;

-- Orphans
SELECT 'orphan_products' AS check, COUNT(*) FROM product_materials pm
LEFT JOIN products p ON p.id = pm.product_id WHERE p.id IS NULL;

SELECT 'orphan_materials' AS check, COUNT(*) FROM product_materials pm
LEFT JOIN materials m ON m.id = pm.material_id WHERE m.id IS NULL;

-- Unique index exists
SELECT 'unique_idx_exists' AS check,
       EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'product_materials' AND indexname = 'product_materials_product_id_material_id_key');

-- Extra columns beyond 3
SELECT 'extra_columns' AS check, COUNT(*) FROM information_schema.columns
WHERE table_name = 'product_materials' AND column_name NOT IN ('id','product_id','material_id');

SELECT 'product_materials_id_seq' AS seq, last_value FROM product_materials_id_seq;

-- ════════════════════════════════════════════════════════════
-- 5. BRAND_MATERIALS PROFILE
-- ════════════════════════════════════════════════════════════

SELECT '=== BRAND_MATERIALS PROFILE ===' AS info;
-- Junction columns? (Critical: brand_materials was supposed to be junction but got mutated)
SELECT 'product_id_column_exists' AS check,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brand_materials' AND column_name = 'product_id');

SELECT 'material_id_column_exists' AS check,
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'brand_materials' AND column_name = 'material_id');

SELECT 'total_content_columns' AS check, COUNT(*) FROM information_schema.columns
WHERE table_name = 'brand_materials' AND column_name NOT IN ('id','product_id','material_id','created_at','updated_at');

-- Wrong-table content columns (19 of them)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'brand_materials' AND column_name NOT IN ('id','product_id','material_id','created_at','updated_at')
ORDER BY ordinal_position;

-- Non-null content counts
SELECT 'non_empty_name' AS field, COUNT(*) FROM brand_materials WHERE COALESCE(name,'') != ''
UNION ALL SELECT 'non_empty_slug', COUNT(*) FROM brand_materials WHERE COALESCE(slug,'') != ''
UNION ALL SELECT 'non_empty_category', COUNT(*) FROM brand_materials WHERE COALESCE(category,'') != ''
UNION ALL SELECT 'non_empty_short_desc', COUNT(*) FROM brand_materials WHERE COALESCE(short_desc,'') != ''
UNION ALL SELECT 'non_empty_features', COUNT(*) FROM brand_materials WHERE COALESCE(features,'') != ''
UNION ALL SELECT 'non_empty_story', COUNT(*) FROM brand_materials WHERE COALESCE(story,'') != ''
UNION ALL SELECT 'non_empty_applicable_products', COUNT(*) FROM brand_materials WHERE COALESCE(applicable_products,'') != ''
UNION ALL SELECT 'non_empty_status', COUNT(*) FROM brand_materials WHERE COALESCE(status,'') != ''
UNION ALL SELECT 'non_zero_sort_order', COUNT(*) FROM brand_materials WHERE COALESCE(sort_order,0) != 0
UNION ALL SELECT 'non_empty_image', COUNT(*) FROM brand_materials WHERE COALESCE(image,'') != ''
UNION ALL SELECT 'non_empty_cover_image', COUNT(*) FROM brand_materials WHERE COALESCE(cover_image,'') != ''
UNION ALL SELECT 'non_default_detail_images', COUNT(*) FROM brand_materials WHERE COALESCE(detail_images,'') NOT IN ('','[]')
UNION ALL SELECT 'non_empty_seo_title', COUNT(*) FROM brand_materials WHERE COALESCE(seo_title,'') != ''
UNION ALL SELECT 'non_empty_seo_description', COUNT(*) FROM brand_materials WHERE COALESCE(seo_description,'') != ''
UNION ALL SELECT 'non_empty_seo_keywords', COUNT(*) FROM brand_materials WHERE COALESCE(seo_keywords,'') != '';

-- Timestamp range
SELECT MIN(created_at) AS min_created, MAX(created_at) AS max_created,
       MIN(updated_at) AS min_updated, MAX(updated_at) AS max_updated
FROM brand_materials;

SELECT 'brand_materials_id_seq' AS seq, last_value FROM brand_materials_id_seq;

-- ════════════════════════════════════════════════════════════
-- 6. PRODUCT COUNT (cross-reference context)
-- ════════════════════════════════════════════════════════════

SELECT '=== PRODUCTS CONTEXT ===' AS info;
SELECT COUNT(*) AS total_products FROM products;
SELECT id, name::text FROM products ORDER BY id;

-- ════════════════════════════════════════════════════════════
-- FINAL: ROLLBACK — NO CHANGES MADE
-- ════════════════════════════════════════════════════════════

ROLLBACK;
