# Phase G2C-2 — Materials Migration SQL and Backfill Contract

**Date:** 2026-07-14
**WORKDIR:** `/Users/ryan/Projects/active/platform-os` @ `3b2b298`
**Secrets Gate:** ✅ PASS (0 findings)

---

## 1. Executive Conclusion

**Migration design complete. 14 DDL statements + 1 backfill row. OpenClaw staging ready.**

| Metric | Value |
|--------|-------|
| DDL: `materials` ADD COLUMN | 13 |
| DDL: `product_materials` ADD COLUMN | 1 |
| Backfill rows | 1 (legacy brand_materials → materials) |
| Backfill DIRECT_COPY | 21 fields |
| Backfill DROP_AFTER_AUDIT | 1 (legacy id) |
| Target-only DEFAULT | 1 (erpMaterialId = null) |
| P0 risks | 0 |
| P1 risks | 1 (`111` slug/features may need manual cleanup) |

---

## 2. DDL Design

### 2.1 Materials — 13 ADD COLUMN

| Prisma Field | DB Column | PostgreSQL Type | Nullable | Default | DDL |
|-------------|-----------|----------------|----------|---------|-----|
| `slug` | `slug` | `TEXT` | NO | `''` | `ALTER TABLE materials ADD COLUMN IF NOT EXISTS slug TEXT NOT NULL DEFAULT '';` |
| `category` | `category` | `TEXT` | NO | `''` | `ALTER TABLE materials ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';` |
| `shortDesc` | `short_desc` | `TEXT` | YES | — | `ALTER TABLE materials ADD COLUMN IF NOT EXISTS short_desc TEXT;` |
| `story` | `story` | `TEXT` | YES | — | `ALTER TABLE materials ADD COLUMN IF NOT EXISTS story TEXT;` |
| `applicableProducts` | `applicable_products` | `TEXT` | YES | — | `ALTER TABLE materials ADD COLUMN IF NOT EXISTS applicable_products TEXT;` |
| `status` | `status` | `TEXT` | NO | `'DRAFT'` | `ALTER TABLE materials ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'DRAFT';` |
| `sortOrder` | `sort_order` | `INTEGER` | NO | `0` | `ALTER TABLE materials ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;` |
| `coverImage` | `cover_image` | `TEXT` | YES | — | `ALTER TABLE materials ADD COLUMN IF NOT EXISTS cover_image TEXT;` |
| `detailImages` | `detail_images` | `TEXT` | NO | `'[]'` | `ALTER TABLE materials ADD COLUMN IF NOT EXISTS detail_images TEXT NOT NULL DEFAULT '[]';` |
| `seoTitle` | `seo_title` | `TEXT` | YES | — | `ALTER TABLE materials ADD COLUMN IF NOT EXISTS seo_title TEXT;` |
| `seoDescription` | `seo_description` | `TEXT` | YES | — | `ALTER TABLE materials ADD COLUMN IF NOT EXISTS seo_description TEXT;` |
| `seoKeywords` | `seo_keywords` | `TEXT` | YES | — | `ALTER TABLE materials ADD COLUMN IF NOT EXISTS seo_keywords TEXT;` |
| `erpMaterialId` | `erp_material_id` | `INTEGER` | YES | — | `ALTER TABLE materials ADD COLUMN IF NOT EXISTS erp_material_id INTEGER;` |

### 2.2 Product Materials — 1 ADD COLUMN

| Prisma Field | DB Column | PostgreSQL Type | Nullable | Default | DDL |
|-------------|-----------|----------------|----------|---------|-----|
| `sortOrder` | `sort_order` | `INTEGER` | NO | `0` | `ALTER TABLE product_materials ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;` |

---

## 3. Nullable-First Strategy

**All columns are added at final nullability/default in one pass.** No subsequent tightening needed.

| Justification | Detail |
|---------------|--------|
| `materials` table has 0 rows | No production data to migrate for the table itself |
| Single legacy row on brand_materials | Migrated as part of backfill, not in-place DDL |
| Defaults are safe | `''` for strings, `0` for integers, `'DRAFT'` for status |
| No lock risk | `ADD COLUMN IF NOT EXISTS` with default on empty table is instant |

---

## 4. Backfill Design

### 4.1 Source → Target Mapping

| Source Column | Target Field | Decision | Count |
|-------------|-------------|----------|-------|
| 19 content columns | Same name on `materials` | DIRECT_COPY | 19 |
| created_at, updated_at | createdAt, updatedAt | DIRECT_COPY | 2 |
| id | *(dropped)* | DROP_AFTER_AUDIT | 1 |
| *(no source)* | erpMaterialId | DEFAULT null | 1 |

**Total: 21 DIRECT_COPY + 1 DROP + 1 DEFAULT = 22 source → 22 target (20 field + 2 system)**

### 4.2 ID Strategy

**Decision: GENERATE_NEW_ID**

| Aspect | Decision |
|--------|----------|
| Preserve legacy id? | **NO** — use materials autoincrement |
| Sequence adjustment? | `SELECT setval('materials_id_seq', (SELECT MAX(id) FROM materials))` if needed |
| Mapping metadata? | External log only (not in entity table) |
| Consumer uses legacy id? | **None** — product_materials empty, UI uses name/slug |

### 4.3 Status

Legacy value `PUBLISHED` → **overridden to `DRAFT`**. The migrated row starts in draft workflow.

### 4.4 Idempotency

| Check | Implementation |
|-------|---------------|
| Source row uniqueness | `SELECT count(*) FROM brand_materials` must be 1 |
| Target already migrated | `SELECT count(*) FROM materials WHERE name = '白水晶'` must be 0 |
| Column existence | `ADD COLUMN IF NOT EXISTS` for all DDL |
| Re-execution safety | INSERT will fail if name unique constraint is violated (but `materials` is currently empty and migration source row will be removed) |

---

## 5. Transaction Strategy

**Recommended: Option C — Schema DDL and data backfill in separate transactions.**

| Reason | Detail |
|--------|--------|
| DDL cannot be rolled back in PostgreSQL | Once committed, DDL is permanent |
| Backfill is idempotent | INSERT with pre-check can be retried |
| Separation reduces lock duration | DDL committed first, data migrated after |
| Pre-consumer-cutover rollback | DDL can be reversed with DROP COLUMN |
| Post-consumer-cutover rollback | Only data DELETE, columns preserved |

---

## 6. Verification Queries

See `docs/sql/PHASE_G2C_2_MATERIALS_VERIFICATION_DRAFT_2026-07-14.sql`.

| Check | Expected |
|-------|----------|
| 13 columns exist on materials | 13 rows in information_schema |
| sort_order exists on product_materials | 1 row |
| materials row count | 1 |
| Migrated row status | 'DRAFT' |
| No nulls in NOT NULL columns | 0 |
| Legacy source preserved | 1 row in brand_materials |

---

## 7. Rollback Strategy

See `docs/sql/PHASE_G2C_2_MATERIALS_ROLLBACK_DRAFT_2026-07-14.sql`.

| Scenario | Action | When |
|----------|--------|------|
| Pre-cutover | `DELETE` backfill + `DROP COLUMN` 14 columns | Before G2D code deployment |
| Post-cutover | `DELETE` backfill only (keep columns) | After G2D but before G2F |

---

## 8. Wrong-Table DROP Policy

`brand_materials` columns are **NOT dropped** in this phase.

| Condition | Timing |
|-----------|--------|
| Consumer references = 0 | G2E (after typed migration) |
| Backfill reconciliation | G2E |
| Runtime DDL removed | G2E |
| Observation period | 2 weeks minimum |
| DROP | G2G |

---

## 9. Risk Assessment

| ID | Priority | Risk | Staging Blocker? | Production Blocker? |
|----|----------|------|-----------------|---------------------|
| R01 | P1 | Legacy slug value `111` is non-descriptive (not unique, not SEO-friendly) | ❌ | ❌ |
| R02 | P1 | Legacy features/applicable_products values `111` are test-like | ❌ | ❌ |
| R03 | P0 | `ADD COLUMN IF NOT EXISTS` on empty table — no lock risk | ❌ | ❌ |
| R04 | P2 | `erpMaterialId` has no source data — stays null | ❌ | ❌ |

**No P0 production blockers.**

---

## 10. OpenClaw Staging Readiness

| Requirement | Status |
|-------------|--------|
| Migration SQL drafted | ✅ `docs/sql/PHASE_G2C_2_MATERIALS_SCHEMA_MIGRATION_DRAFT_2026-07-14.sql` |
| Backfill SQL drafted | ✅ `docs/sql/PHASE_G2C_2_MATERIALS_BACKFILL_DRAFT_2026-07-14.sql` |
| Verification SQL drafted | ✅ `docs/sql/PHASE_G2C_2_MATERIALS_VERIFICATION_DRAFT_2026-07-14.sql` |
| Rollback SQL drafted | ✅ `docs/sql/PHASE_G2C_2_MATERIALS_ROLLBACK_DRAFT_2026-07-14.sql` |
| ID strategy locked | ✅ GENERATE_NEW_ID |
| Legacy row migration confirmed | ✅ MIGRATE_AS_DRAFT (status = DRAFT) |
| Backup plan | ✅ Pre-migration backup required |
| Staging Brand DB confirmed | ⏳ — before execution |

**OPENCLAW STAGING READINESS: READY**

---

## Required Questions

| Question | Answer |
|----------|--------|
| G1/ADR working-tree status | ✅ All committed, no uncommitted modifications |
| DDL columns | 13 (materials) + 1 (product_materials) |
| Backfill source | `brand_materials` (1 row) |
| Backfill target | `materials` |
| Legacy columns reconciled | 22 (19 content + 2 timestamps + 1 id) |
| Direct-copy | 21 |
| Dropped | 1 (id) |
| Target-only defaults | 1 (erpMaterialId) |
| ID strategy | GENERATE_NEW_ID |
| Sequence strategy | `setval` only if needed after backfill |
| Target status | DRAFT |
| Transaction strategy | Separate DDL + backfill |
| Idempotency strategy | Pre-check + source exclusivity |
| brand_materials drop timing | Phase G2G |
| Migration format | Hand-written SQL (not Prisma migration) |
| P0 risks | 0 |
| P1 risks | 2 (legacy `111` values — non-blocking) |
| Manual confirmations | 1 (single legacy row applicability) |
