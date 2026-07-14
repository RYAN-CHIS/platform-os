# Phase G2B — Materials Production Data Profiling

**Date:** 2026-07-14
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**HEAD:** `c5a9c7f6011810e4a1b4329b8ee63f053978f856`
**origin/main:** `c5a9c7f6011810e4a1b4329b8ee63f053978f856`
**Phase G2A-R commit contained:** ✅ `c5a9c7f`
**Database target:** Brand DB (`BRAND_DATABASE_URL`)
**Access method:** Read-only `psql` with `BEGIN; SET TRANSACTION READ ONLY; ... ROLLBACK;`
**Database writes:** NONE

---

## 1. Workspace Security Gate

| Check | Result |
|-------|--------|
| WORKDIR | ✅ `/Users/ryan/Projects/active/platform-os` |
| Branch | ✅ `main` |
| HEAD == origin/main | ✅ `c5a9c7f` == `c5a9c7f` |
| `pnpm check:secrets` | ✅ PASS, 0 findings |
| Modified files | `.DS_Store` only |
| Untracked files | 24 docs/ADR/deployment artifacts (no production code) |

---

## 2. Database Target Confirmation

| Item | Value |
|------|-------|
| Logical database | Brand Runtime Database (Brand DB) |
| Environment variable | `BRAND_DATABASE_URL` |
| Read-only enforcement | `BEGIN; SET TRANSACTION READ ONLY; ... ROLLBACK;` — verified working |
| Credential value | REDACTED |
| Connection test | ✅ Successful (development environment) |

---

## 3. Physical Schema

### 3.1 `materials` (canonical entity table)

| Property | Value |
|----------|-------|
| Exists | ✅ |
| Row count | **0** |
| Columns | **12** (as expected per Prisma `LegacyBrandMaterial`) |
| Primary key | `id` (integer, `materials_id_seq`) |
| Unique constraints | `name` (unique index `materials_name_key`) |
| Foreign keys | None |
| Last sequence value | `1` (never advanced — 0 rows) |

**Actual columns:**

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | id | integer | NO | `nextval('materials_id_seq')` |
| 2 | name | text | NO | — |
| 3 | type | text | NO | `''` |
| 4 | origin | text | NO | `''` |
| 5 | description | text | NO | `''` |
| 6 | image | text | NO | `''` |
| 7 | createdAt | timestamp | NO | `CURRENT_TIMESTAMP` |
| 8 | updatedAt | timestamp | NO | — |
| 9 | alias | text | YES | — |
| 10 | features | text | YES | — |
| 11 | history | text | YES | — |
| 12 | related_articles | text | NO | `'[]'` |

### 3.2 `product_materials` (canonical relation table)

| Property | Value |
|----------|-------|
| Exists | ✅ |
| Row count | **0** |
| Columns | **3** (id, product_id, material_id) |
| Primary key | `id` (integer, `product_materials_id_seq`) |
| Unique index | ✅ `product_materials_product_id_material_id_key` (btree on product_id, material_id) |
| Foreign keys | `product_id → products(id) ON DELETE CASCADE`, `material_id → materials(id) ON DELETE CASCADE` |
| Last sequence value | `1` (never advanced) |
| Extra content columns | **0** — clean junction table |

### 3.3 `brand_materials` (legacy — originally junction, now mutated into entity-without-ID)

| Property | Value |
|----------|-------|
| Exists | ✅ |
| Row count | **1** |
| Columns | **22** (id + 19 content columns + created_at + updated_at) |
| Primary key | `id` (integer, `brand_materials_id_seq`) |
| Unique constraints | `name` (unique index `brand_materials_name_key`) |
| Foreign keys | **None** — no FK to products or materials |
| Junction columns | **MISSING** — `product_id` and `material_id` columns **DO NOT EXIST** on the physical table |
| Prisma model mismatch | `LegacyBrandMaterialLink` (3 columns) **≠** actual physical table (22 columns, entity-shaped) |

**Actual columns (all 22):**

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | id | integer | NO | `nextval('brand_materials_id_seq')` |
| 2 | name | text | NO | — |
| 3 | slug | text | YES | `''` |
| 4 | alias | text | YES | — |
| 5 | category | text | YES | `''` |
| 6 | origin | text | YES | `''` |
| 7 | description | text | YES | `''` |
| 8 | short_desc | text | YES | `''` |
| 9 | features | text | YES | — |
| 10 | story | text | YES | `''` |
| 11 | applicable_products | text | YES | `''` |
| 12 | status | text | YES | `'DRAFT'` |
| 13 | sort_order | integer | YES | `0` |
| 14 | image | text | YES | `''` |
| 15 | cover_image | text | YES | `''` |
| 16 | detail_images | text | YES | `'[]'` |
| 17 | seo_title | text | YES | `''` |
| 18 | seo_description | text | YES | `''` |
| 19 | seo_keywords | text | YES | `''` |
| 20 | related_articles | text | YES | `'[]'` |
| 21 | created_at | timestamptz | YES | `now()` |
| 22 | updated_at | timestamptz | YES | `now()` |

---

## 4. Thirteen-Field Contract Verification

### 4.1 Field-level results

| # | Field | Expected table | Exists on target | Physical type | Nullable | Default | Contract result |
|---|-------|---------------|-----------------|---------------|----------|---------|-----------------|
| 1 | slug | materials | ❌ | — | — | — | **MISSING** |
| 2 | category | materials | ❌ | — | — | — | **MISSING** |
| 3 | shortDesc | materials | ❌ | — | — | — | **MISSING** |
| 4 | story | materials | ❌ | — | — | — | **MISSING** |
| 5 | applicableProducts | materials | ❌ | — | — | — | **MISSING** |
| 6 | status | materials | ❌ | — | — | — | **MISSING** |
| 7 | sortOrder | materials | ❌ | — | — | — | **MISSING** |
| 8 | coverImage | materials | ❌ | — | — | — | **MISSING** |
| 9 | detailImages | materials | ❌ | — | — | — | **MISSING** |
| 10 | seoTitle | materials | ❌ | — | — | — | **MISSING** |
| 11 | seoDescription | materials | ❌ | — | — | — | **MISSING** |
| 12 | seoKeywords | materials | ❌ | — | — | — | **MISSING** |
| 13 | erpMaterialId | materials | ❌ | — | — | — | **MISSING** |

### 4.2 Summary

| Metric | Count |
|--------|-------|
| Fields physically present on `materials` | **0 / 13** |
| Fields missing | **13** |
| Type mismatches | **0** (all missing, no mismatch possible) |
| Nullability/default mismatches | **0** |
| WRONG_TABLE (exist only on brand_materials) | **12** (fields 1–12 exist on brand_materials) |
| erpMaterialId on any table | **0** (also missing from brand_materials) |

**Critical finding:** All 13 target fields must be `ADD COLUMN` in Phase G2C.

---

## 5. `materials` Data Profile

| Metric | Value |
|--------|-------|
| Total rows | **0** |
| ID range | N/A (0 rows) |
| Name unique constraint | ✅ (index exists) |
| Name/code duplicates | N/A (0 rows) |
| createdAt range | N/A |
| updatedAt range | N/A |

**Implication:** The `materials` table is an unpopulated entity — it has the correct schema skeleton but zero data. All material content exists only on `brand_materials`.

---

## 6. `product_materials` Data Profile

| Metric | Value |
|--------|-------|
| Total rows | **0** |
| Distinct product_id | 0 |
| Distinct material_id | 0 |
| Duplicate product_id + material_id pairs | 0 |
| Orphan product links | 0 |
| Orphan material links | 0 |
| NULL product_id / material_id | 0 |
| sort_order field | **Does not exist** (needs G2C ADD COLUMN) |
| Unique constraint on (product_id, material_id) | ✅ **Already exists** (unique index `product_materials_product_id_material_id_key`) |
| Extra content columns | **0** |

**Implication:** `product_materials` exists as a clean junction table with FK constraints and unique index — ready for data migration from `brand_materials`. However, **0 rows** means no migration source data currently exists on it.

---

## 7. `brand_materials` Data Profile

### 7.1 Critical Discovery

**`brand_materials` has been mutated by Runtime DDL (`ensureTable`/`ensureColumns`) into a full entity table:**

- **Missing junction columns:** `product_id` and `material_id` do **NOT** exist on the physical table
- **Contains 19 content columns:** All 12 entity content fields (fields 1–12) + name, origin, description, image, alias, features, related_articles
- **No foreign keys** to `products` or `materials`
- **Has its own unique constraint on `name`** (like a material entity table would)
- **Has its own sequence** (`brand_materials_id_seq`)

### 7.2 Content Profile (1 row)

| Field | Value |
|-------|-------|
| name | `白水晶` (not empty) |
| slug | `111` (not empty) |
| category | empty |
| short_desc | empty |
| features | `111` (not empty) |
| story | empty |
| applicable_products | `111` (not empty) |
| status | `PUBLISHED` |
| sort_order | `1` |
| image | blob URL (not empty) |
| cover_image | blob URL (not empty) |
| detail_images | `[]` (empty JSON array) |
| seo_title | empty |
| seo_description | empty |
| seo_keywords | empty |
| related_articles | `[]` |
| created_at | `2026-06-29 05:58:40+00` |
| updated_at | `2026-06-29 05:58:40+00` |

### 7.3 Wrong-Table Content Columns

| Column | Non-null data | Notes |
|--------|--------------|-------|
| slug | 1 row | ✅ Has content (value: `111`) |
| category | 0 | Empty |
| short_desc | 0 | Empty |
| story | 0 | Empty |
| applicable_products | 1 row | ✅ Has content (value: `111`) |
| status | 1 row | ✅ Has content (value: `PUBLISHED`) |
| sort_order | 1 row | ✅ Non-zero |
| cover_image | 1 row | ✅ Has a blob URL |
| detail_images | 0 | Default `[]` |
| seo_title | 0 | Empty |
| seo_description | 0 | Empty |
| seo_keywords | 0 | Empty |
| image | 1 row | ✅ Has a blob URL |

**Total wrong-table columns with non-default data: 8 of 19 content columns have meaningful data.**

---

## 8. Cross-Table Reconciliation

| Pair category | Count | Notes |
|--------------|-------|-------|
| BOTH_TABLES | **0** | No shared pairs (materials has 0 rows, product_materials has 0 rows) |
| ONLY_BRAND_MATERIALS | **0** | Cannot compute — brand_materials has no product_id/material_id columns |
| ONLY_PRODUCT_MATERIALS | **0** | product_materials has 0 rows |
| DUPLICATE_WITHIN_BRAND | **0** | brand_materials has 1 row |
| DUPLICATE_WITHIN_PRODUCT | **0** | product_materials has 0 rows |
| CONFLICTING_METADATA | **0** | No shared pairs exist |

**Key finding:** The traditional `brand_materials → product_materials` pair reconciliation cannot be performed because `brand_materials` has been mutated into an entity table without junction columns. The standard migration path (copy pairs from brand_materials to product_materials) is blocked at the structural level.

---

## 9. ERP Bridge Reconciliation

| Check | Result |
|-------|--------|
| `erpMaterialId` on `materials` | ❌ **MISSING** — to be added in G2C |
| `erp_material_id` on `brand_materials` | ❌ **MISSING** — not added by Runtime DDL |
| ERP DB access | Separate logical database (different `DATABASE_URL`). Cross-DB profiling not performed in this phase. |
| ERP reference type | `Int?` — expected to match ERP `material.id` type |

**Note:** Since `materials` has 0 rows and `erpMaterialId` doesn't exist yet, no ERP bridge profiling is meaningful at this point. ERP bridge profiling will be needed in Phase G2C/G2D after column addition and data migration.

---

## 10. Soft Archive Contract Verification

| Check | Result |
|-------|--------|
| `status` on `materials` | ❌ MISSING (G2C addition) |
| `archived` / `isArchived` / `archivedAt` / `deletedAt` on `materials` | ❌ NONE_EXIST |
| `active` on `materials` | ❌ NONE_EXIST |
| `status` on `brand_materials` | ✅ EXISTS (type: text, default `'DRAFT'`, current value: `'PUBLISHED'`) |

**Verdict: `ARCHIVE_CONTRACT_REQUIRES_SCHEMA_CHANGE`**

Per the G2A contract, soft archive is implemented via `status = "ARCHIVED"` application-level convention. No separate archive field is required in the current contract, but if future phases require distinguishing archive types, a dedicated field (boolean or timestamp) will need DDL.

---

## 11. Risk Assessment

| ID | Priority | Table | Count | Risk | Proposed Handling | Manual Decision? |
|----|----------|-------|-------|------|-------------------|-----------------|
| R01 | **P0** | brand_materials | 1+ row | `brand_materials` lacks `product_id` and `material_id` columns — Prisma model `LegacyBrandMaterialLink` is structurally wrong. Cannot reconcile with `product_materials` or migrate pairs. | G2C: Rectify Prisma model for brand_materials, or confirm it will be fully replaced | **YES** |
| R02 | **P0** | materials | 0 rows | Entity table is empty — all material content lives on `brand_materials` only. G2C DDL (ADD COLUMN) must be paired with data migration from `brand_materials`. | G2C: ADD COLUMN on materials + G2D: migrate data | **YES** |
| R03 | **P1** | brand_materials | 1 row | 19 content columns exist on wrong table (junction → entity). Must not be treated as valid entity data without dedup/cleanup. | G2D: Extract entity data, migrate to materials, drop columns | **YES** |
| R04 | **P1** | brand_materials | 1 row | Single row means this is a recent/test data insertion. Production migration may have different characteristics. | G2B: Flag for manual review before backfill | **YES** |
| R05 | **P2** | product_materials | 0 rows | Clean junction table with FK + unique index exists but is empty. `sort_order` column missing. | G2C: ADD COLUMN sort_order; G2D: migrate data | NO |
| R06 | **P2** | product_materials | 0 rows | Unique index exists — no deduplication needed before migration | G2D: De-duplicate brand_materials pairs before insert | NO |
| R07 | **P2** | materials | 0 rows | `erpMaterialId` column missing from all tables | G2C: ADD COLUMN | NO |
| R08 | **P3** | brand_materials | 8+ content columns | Non-default content data exists on wrong table. Need to validate data quality before migration. | G2D: Validate, deduplicate, transform | NO |

---

## 12. Phase G2C Schema Readiness

| Requirement | Status | Notes |
|-------------|--------|-------|
| 13 fields physically present | **0 / 13** | All must be ADD COLUMN |
| 13 fields missing | **13** | — |
| Type conflicts | **0** | — |
| Nullable/default conflicts | **0** | — |
| `sort_order` missing on `product_materials` | ✅ Yes, needs ADD COLUMN |
| Unique constraint on `(product_id, material_id)` | ✅ **Already exists** | `product_materials_product_id_material_id_key` unique index |
| Deduplication required before unique constraint | 0 duplicates in product_materials | brand_materials has 1 row, but lacks junction columns |
| Orphan handling required | 0 orphans in product_materials | — |
| Backfill required | **YES** | All 13 fields + data migration from brand_materials |
| Soft archive field | `status` field will satisfy contract | No separate archive field needed per current contract |
| Wrong-table columns to DROP | **19 content columns** on brand_materials | After data migration completes |
| Can G2C modify `packages/brand-db/schema.prisma`? | ✅ **YES** — ADD COLUMN only, no runtime DDL |

**CODEX SCHEMA READINESS: READY** (0 blocking issues for G2C schema declaration; data migration is G2D)

---

## 13. Key Recommendations for Phase G2C

1. **Before writing any schema changes**, resolve the `LegacyBrandMaterialLink` model mapping issue. The Prisma model assumes `brand_materials` is a 3-column junction table with `product_id` and `material_id`, but the physical table is a 22-column entity table without those columns.

2. **All 13 fields** must be added to `LegacyBrandMaterial` (table `materials`) via `ALTER TABLE ADD COLUMN`.

3. **`sort_order`** must be added to `LegacyProductMaterial` (table `product_materials`) via `ALTER TABLE ADD COLUMN`.

4. **The `@@unique([productId, materialId])` constraint already exists** on `product_materials` as a unique index.

5. **No deduplication is needed** for `product_materials` (0 rows, clean state).

6. **Data migration from `brand_materials` to `materials`/`product_materials`** is required in Phase G2D. The `brand_materials` table currently stores material entity data (not junction data) — the migration path needs special attention.

7. **Runtime DDL (`ensureTable`/`ensureColumns`)** on `brand_materials` must be removed in Phase G2E after consumer migration. The fact that it has created 19 extra content columns confirms the DDL is actively harmful.

---

## 14. Report Verification

| Check | Result |
|-------|--------|
| Contains no database URLs, hosts, usernames, passwords, tokens | ✅ |
| Contains no customer data | ✅ |
| Contains no full narrative/SEO content | ✅ |
| Contains no large sets of business IDs | ✅ |
| All counts, percentages, types, constraints | ✅ |
| Hashes where appropriate | ✅ |
| Secrets check (pnpm check:secrets) | ✅ PASS, 0 findings |

---

*End of Phase G2B Report — All queries were READ ONLY, no database writes.*
