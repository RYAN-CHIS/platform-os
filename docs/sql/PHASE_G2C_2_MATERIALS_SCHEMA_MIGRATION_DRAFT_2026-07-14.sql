-- ============================================================================
-- Phase G2C-2 — Materials Schema Migration DRAFT
-- DESIGN ONLY — DO NOT EXECUTE ON PRODUCTION
-- Target: Brand DB (BRAND_DATABASE_URL)
-- ============================================================================
-- Prerequisites:
--   1. Backup taken
--   2. Staging environment confirmed
--   3. Read-only verification of current state completed
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Add 13 columns to `materials` (canonical entity table)
-- ============================================================================
-- Note: All columns are nullable or have defaults. Table has 0 rows.
-- No index, FK, or CHECK constraints are added in this migration.

ALTER TABLE materials ADD COLUMN IF NOT EXISTS slug          TEXT        NOT NULL DEFAULT '';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS category      TEXT        NOT NULL DEFAULT '';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS short_desc    TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS story         TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS applicable_products TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS status        TEXT        NOT NULL DEFAULT 'DRAFT';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS sort_order    INTEGER     NOT NULL DEFAULT 0;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS cover_image   TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS detail_images TEXT        NOT NULL DEFAULT '[]';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS seo_title     TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS seo_keywords  TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS erp_material_id INTEGER;

-- ============================================================================
-- Step 2: Add `sort_order` to `product_materials` (canonical relation table)
-- ============================================================================

ALTER TABLE product_materials ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

COMMIT;

-- ============================================================================
-- Verification queries (run after migration, before backfill)
-- ============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'materials'
-- ORDER BY ordinal_position;
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'product_materials'
-- ORDER BY ordinal_position;
--
-- SELECT count(*) AS materials_columns_added
-- FROM information_schema.columns
-- WHERE table_name = 'materials'
--   AND column_name IN (
--     'slug', 'category', 'short_desc', 'story', 'applicable_products',
--     'status', 'sort_order', 'cover_image', 'detail_images',
--     'seo_title', 'seo_description', 'seo_keywords', 'erp_material_id'
--   );
