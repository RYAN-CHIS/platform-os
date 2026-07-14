-- ============================================================================
-- Phase G2C-2 — Materials Backfill DRAFT
-- DESIGN ONLY — DO NOT EXECUTE ON PRODUCTION
-- ============================================================================
-- Maps the single legacy `brand_materials` row into the canonical `materials` entity.
-- Migration mapping: Phase G2B-2 §3 (all 21 DIRECT_COPY)
-- Status: DRAFT (overrides legacy PUBLISHED)
-- ID strategy: new autoincrement (legacy brand_materials.id is logged, not preserved)
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Verify source row exists exactly once
-- ============================================================================
-- If this returns 0 or >1, STOP. Do not proceed.
-- Expected: 1
-- SELECT count(*) AS source_count FROM brand_materials;

-- ============================================================================
-- Step 2: Verify target does not already contain migrated data
-- ============================================================================
-- If the same legacy id has already been migrated (detected via mapping marker),
-- skip backfill. For single-row manual migration, check by name or slug.
--
-- SELECT count(*) AS already_migrated
-- FROM materials
-- WHERE name = '白水晶';
-- Expected: 0

-- ============================================================================
-- Step 3: Insert legacy row into `materials` with new autoincrement ID
-- ============================================================================
-- All 21 DIRECT_COPY fields mapped. Status forced to DRAFT.
-- erpMaterialId = NULL (no source).

INSERT INTO materials (
    name,
    slug,
    category,
    origin,
    description,
    short_desc,
    features,
    story,
    applicable_products,
    status,
    sort_order,
    image,
    cover_image,
    detail_images,
    seo_title,
    seo_description,
    seo_keywords,
    related_articles,
    created_at,
    updated_at
)
SELECT
    bm.name,
    bm.slug,
    COALESCE(bm.category, ''),
    COALESCE(bm.origin, ''),
    COALESCE(bm.description, ''),
    bm.short_desc,
    bm.features,
    bm.story,
    bm.applicable_products,
    'DRAFT',                          -- forced DRAFT regardless of legacy status
    COALESCE(bm.sort_order, 0),
    COALESCE(bm.image, ''),
    bm.cover_image,
    COALESCE(bm.detail_images, '[]'),
    bm.seo_title,
    bm.seo_description,
    bm.seo_keywords,
    COALESCE(bm.related_articles, '[]'),
    bm.created_at,                    -- preserve original created_at
    NOW()                             -- fresh updated_at for migration timestamp
FROM brand_materials bm
WHERE bm.id = 1;                      -- single known legacy row

-- ============================================================================
-- Step 4: Record migration mapping (external log)
-- ============================================================================
-- Legacy ID: 1 → New ID: (retrieve via lastval() or RETURNING)
-- Table: brand_materials → materials
-- Migration date: (current)
-- Verified by: (operator)

COMMIT;

-- ============================================================================
-- Post-backfill verification (read-only)
-- ============================================================================
-- SELECT id, name, slug, status, created_at
-- FROM materials
-- WHERE name = '白水晶';
--
-- Expected: 1 row, status = 'DRAFT', id = new autoincrement value
