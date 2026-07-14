-- ============================================================================
-- Phase G2C-2 — Materials Rollback DRAFT
-- DESIGN ONLY — DO NOT EXECUTE ON PRODUCTION
-- ============================================================================
-- Two rollback scenarios:
--   Pre-consumer-cutover (Phase G2D not started):
--     Safe to drop columns and delete data.
--   Post-consumer-cutover (Phase G2D+):
--     Must NOT drop columns. Only delete backfill data.
-- ============================================================================

-- ============================================================================
-- SCENARIO A: Pre-consumer-cutover rollback
-- ============================================================================
-- Use only if no application code has been deployed that reads the new columns.

BEGIN;

-- Remove backfilled row
DELETE FROM materials WHERE name = '白水晶';

-- Drop columns from product_materials
ALTER TABLE product_materials DROP COLUMN IF EXISTS sort_order;

-- Drop columns from materials (13 columns)
ALTER TABLE materials DROP COLUMN IF EXISTS slug;
ALTER TABLE materials DROP COLUMN IF EXISTS category;
ALTER TABLE materials DROP COLUMN IF EXISTS short_desc;
ALTER TABLE materials DROP COLUMN IF EXISTS story;
ALTER TABLE materials DROP COLUMN IF EXISTS applicable_products;
ALTER TABLE materials DROP COLUMN IF EXISTS status;
ALTER TABLE materials DROP COLUMN IF EXISTS sort_order;
ALTER TABLE materials DROP COLUMN IF EXISTS cover_image;
ALTER TABLE materials DROP COLUMN IF EXISTS detail_images;
ALTER TABLE materials DROP COLUMN IF EXISTS seo_title;
ALTER TABLE materials DROP COLUMN IF EXISTS seo_description;
ALTER TABLE materials DROP COLUMN IF EXISTS seo_keywords;
ALTER TABLE materials DROP COLUMN IF EXISTS erp_material_id;

COMMIT;

-- ============================================================================
-- SCENARIO B: Post-consumer-cutover rollback
-- ============================================================================
-- Application code expects the new columns. Only remove data, NOT columns.

BEGIN;

-- Remove backfilled row only
DELETE FROM materials WHERE name = '白水晶';

-- Note: columns remain in the table for application compatibility.
-- The 13 columns and sort_order become effectively nullable/default-only
-- until a future cleanup phase.

COMMIT;

-- ============================================================================
-- Pre-rollback verification (run BEFORE either scenario)
-- ============================================================================
-- SELECT count(*) AS rows_to_remove FROM materials WHERE name = '白水晶';
-- Expected: 1
--
-- SELECT count(*) AS product_materials_impacted
-- FROM product_materials
-- WHERE material_id IN (SELECT id FROM materials WHERE name = '白水晶');
-- Expected: 0 (no relations in current production)
