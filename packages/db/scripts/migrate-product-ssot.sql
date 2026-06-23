-- ═══════════════════════════════════════════════════════
-- WO-P4A: Product SSOT Migration
-- Target: Brand Database (Neon Singapore)
-- ═══════════════════════════════════════════════════════

-- Phase 1: Create Brand Product Content Extension table
CREATE TABLE IF NOT EXISTS brand_product_content (
  id              SERIAL PRIMARY KEY,
  product_id      INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  story           TEXT NOT NULL DEFAULT '',
  gallery         TEXT NOT NULL DEFAULT '[]',
  presentation    TEXT NOT NULL DEFAULT '',
  seo_title       VARCHAR(255),
  seo_description TEXT,
  highlights      TEXT DEFAULT '[]',
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Phase 2: Migrate Brand product display data → brand_product_content
INSERT INTO brand_product_content (product_id, story, gallery, presentation)
SELECT id, story, gallery, '' FROM products
ON CONFLICT (product_id) DO NOTHING;

-- Phase 3: Add ERP bridge field to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS erp_product_id INTEGER UNIQUE;

-- Phase 4: Verify migration
-- SELECT COUNT(*) FROM brand_product_content;  -- should equal products row count

-- Phase 5: (Future WO-P4B) Drop display-only columns from products
-- ALTER TABLE products DROP COLUMN story;
-- ALTER TABLE products DROP COLUMN gallery;
-- (Deferred to avoid breaking existing Brand OS code)
