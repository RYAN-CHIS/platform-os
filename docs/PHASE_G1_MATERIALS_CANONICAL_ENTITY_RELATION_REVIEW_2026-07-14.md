# Phase G1 — Materials Canonical Entity and Relation Contract Review

**Date:** 2026-07-14
**WORKDIR:** `/Users/ryan/Projects/active/platform-os` @ `eb27ebe`
**Secrets Gate:** ✅ PASS (0 findings)

---

## 1. Executive Conclusion

**Materials requires ADR-008 and Phase G2A–G2F before typed Prisma migration.**

| Finding | Verdict |
|---------|---------|
| Entity table | `materials` (LegacyBrandMaterial) — correct, needs ~11 more content fields |
| Runtime DDL target | `brand_materials` — WRONG. This is a junction table (3 cols). Code creates ~20 content columns on it. |
| Canonical relation | `product_materials` (LegacyProductMaterial) — currently unused by platform |
| Legacy duplicate link | `brand_materials` (LegacyBrandMaterialLink) — dormant. Must merge before retirement. |
| Field gap | 11 UI-needed fields missing from LegacyBrandMaterial |

---

## 2. Physical Table Inventory

| Table | Metadata Columns | Role | Canonical Model | Status |
|-------|-----------------|------|-----------------|--------|
| `materials` | 12 (entity fields) | **Material entity** | `LegacyBrandMaterial` | ✅ Correct entity table |
| `brand_materials` | 3 (id, product_id, material_id) | Junction/link table | `LegacyBrandMaterialLink` | ⚠️ Was junction, extended by runtime DDL |
| `product_materials` | 3 (id, product_id, material_id) | Duplicate junction | `LegacyProductMaterial` | ⚠️ Unused by platform |
| Future `brand_materials` | (not yet created) | Planned future entity table | Not modeled | ⏳ Future Phase G target |

---

## 3. Canonical Model Inventory

| Model | Table | Fields | Semantic Role | Current Consumers |
|-------|-------|--------|---------------|-------------------|
| `LegacyBrandMaterial` | `materials` | 12 entity fields (id, name, type, origin, description, image, createdAt, updatedAt, alias, features, history, relatedArticles) | **Material entity** | ERP? brand-os seed? Not platform yet |
| `LegacyBrandMaterialLink` | `brand_materials` | 3 (id, productId, materialId) | Product–Material link (legacy name) | Dormant |
| `LegacyProductMaterial` | `product_materials` | 3 (id, productId, materialId) + FK relations | Product–Material link (active canonical) | Dormant in platform |
| `ErpMaterial` (ERP) | `raw_materials` | ~30 ERP fields | ERP material (procurement, inventory, cost) | `getErpMaterialsForSelect()` |

---

## 4. Material Entity Field Gap

### 4.1 Current LegacyBrandMaterial (12 fields)

| Field | Type | UI Uses? | Notes |
|-------|------|----------|-------|
| id | Int | ✅ | PK |
| name | String | ✅ | Title |
| type | String | ✅ | Used as fallback for category |
| origin | String | ✅ | Origin place |
| description | String | ✅ | Body text |
| image | String | ✅ | Main image |
| createdAt | DateTime | — | Auto |
| updatedAt | DateTime | — | Auto |
| alias | String? | ✅ | Alternate name |
| features | String? | ✅ | Key features |
| history | String? | ✅ | Used as fallback for story |
| relatedArticles | String | — | JSON array of related content IDs |

### 4.2 Fields Present in `BrandMaterialRow` but MISSING from LegacyBrandMaterial

| Field | Type in Row | UI Uses? | Target Owner | Should Add to LegacyBrandMaterial? |
|-------|------------|----------|-------------|-----------------------------------|
| slug | String | ✅ SEO/list | **Brand Runtime** | ✅ YES |
| category | String | ✅ Classification | **Brand Runtime** | ✅ YES (supersedes `type`) |
| short_desc | String? | ✅ Summary | **Brand Runtime** | ✅ YES |
| story | String? | ✅ Narrative | **Brand Runtime** | ✅ YES (supersedes `history`) |
| applicable_products | String? | ⚠️ UI unclear | **Brand Runtime** | ⚠️ Needs review |
| status | String | ✅ Workflow | **Brand Runtime** | ✅ YES (string status, NOT PublishStatus enum) |
| sort_order | number | ✅ Ordering | **Brand Runtime** | ✅ YES |
| cover_image | String? | ✅ Hero image | **Brand Runtime** | ✅ YES |
| detail_images | String? | ✅ Gallery | **Brand Runtime** | ✅ YES |
| seo_title | String? | ✅ SEO | **Brand Runtime** | ✅ YES |
| seo_description | String? | ✅ SEO | **Brand Runtime** | ✅ YES |
| seo_keywords | String? | ✅ SEO | **Brand Runtime** | ✅ YES |
| erp_material_id | Int? | ⚠️ Bridge | **ERP Bridge** | ✅ YES (needs unique? no — see below) |

**Total missing entity fields: 13.** All are content/SEO/workflow fields that belong on the material entity, NOT on a junction table.

---

## 5. ERP–Brand Ownership Boundary

| Domain | ERP-owned | Brand-owned |
|--------|-----------|-------------|
| Identity | code, erp ID reference | public name, slug, alias |
| Classification | procurement category | type, category, tags |
| Description | specification | narrative, story, features |
| Media | — | image, cover_image, detail_images |
| Commerce | supplier, unitCost, remaining | — |
| Status | LifecycleStatus | status (workflow) |
| Ordering | — | sort_order |
| SEO | — | seo_title, seo_description, seo_keywords |
| Relations | raw_materials ↔ erp_bom | productLinks |

**ERP refresh policy:** ERP refresh (`getErpMaterialsForSelect()`) is a READ-ONLY bridge. It must NOT write to Brand material entity fields. The `erp_material_id` field is a reference only — not an override trigger.

> `erp_material_id` is NOT unique in the Brand material context. Multiple Brand materials may reference the same ERP material for different narrative treatments.

---

## 6. Product–Material Relation Contract

**Canonical relation table: `product_materials` (LegacyProductMaterial).**

| Aspect | Decision |
|--------|----------|
| Canonical table | `product_materials` |
| Canonical model | `LegacyProductMaterial` |
| Fields needed | id, productId, materialId (minimal) |
| Sort order | NOT needed initially (products have their own sort) |
| Quantity/unit | NOT needed (materials are descriptive, not BOM) |
| Uniqueness | `@@unique([productId, materialId])` — already enforced ✅ |
| Delete behavior | `onDelete: Cascade` on both FKs (already in canonical) ✅ |
| `brand_materials` (LegacyBrandMaterialLink) | Legacy duplicate. Migrate data to `product_materials` before retirement. |

---

## 7. `brand_materials` vs `product_materials`

| Aspect | `brand_materials` | `product_materials` |
|--------|-------------------|---------------------|
| Physical role | Junction (3 cols) | Junction (3 cols) |
| Canonical model | `LegacyBrandMaterialLink` | `LegacyProductMaterial` |
| Has FK relations? | ❌ No | ✅ Yes (to LegacyBrandProduct, LegacyBrandMaterial) |
| Used by platform products? | ❌ Not in typed code | ❌ Not in typed code |
| Has runtime DDL? | ✅ **YES** — `ensureTable()` creates 20+ content cols | ❌ No |
| Data exists? | Unknown (no production check) | Unknown |
| Decision | **MIGRATE → `product_materials`, then retire** | **KEEP as canonical relation** |

**Plan:** Migrate any existing relation data from `brand_materials` to `product_materials`. Then `LegacyBrandMaterialLink` becomes a Phase H deletion target.

---

## 8. Runtime DDL Inventory

| Line | Statement | Target Table | Effect | Decision |
|------|-----------|-------------|--------|----------|
| actions.ts:38-63 | `CREATE TABLE IF NOT EXISTS brand_materials (...)` | `brand_materials` | Creates content table with same name as junction | **REMOVE** — replaced by typed Prisma |
| actions.ts:89-91 | `ALTER TABLE brand_materials ADD COLUMN IF NOT EXISTS ...` | `brand_materials` | Adds 13 content columns to junction table | **REMOVE** — replaced by canonical entity fields |

**Impact:** These DDL statements currently run on EVERY REQUEST (called from `listBrandMaterials`, `createBrandMaterial`). They target the WRONG table. They must be removed when the typed migration is complete.

**Cleanup concern:** If `brand_materials` was extended by runtime DDL in production, it may contain content columns in addition to its 3 junction columns. Phase G2B read-only profiling must verify this before the migration.

---

## 9. Architecture Options

### Option A: Add Fields to `materials`, Use `product_materials` as Relation (RECOMMENDED)

- Add 13 missing content fields to `LegacyBrandMaterial`
- Add `LegacyBrandMaterial` gains: slug, category, shortDesc, story, applicableProducts, status, sortOrder, coverImage, detailImages, seoTitle, seoDescription, seoKeywords, erpMaterialId
- Set `brand_materials` → migrate data to `product_materials`, then retire `LegacyBrandMaterialLink`
- Remove runtime DDL from actions.ts
- DDL required: `ALTER TABLE materials ADD COLUMN ...` for 13 fields

**Pros:** Clean entity model. Single relation table. Typed Prisma migration possible.
**Cons:** Requires Phase G2A (schema design) + G2C (DDL migration) before G2D (typed migration).

### Option B: Accept `brand_materials` as De Facto Entity Table

Rename `LegacyBrandMaterialLink` to a content entity model. Accept runtime-DDL-created columns.

**Verdict:** ❌ REJECTED — would cement a naming accident. `brand_materials` is a junction in DB metadata.

### Option C: Wait for Future `brand_materials` Entity Table

Phase B architecture planned a future `brand_materials` entity table. Wait for that.

**Verdict:** ❌ REJECTED — future table doesn't exist. No timeline. Current data needs a home.

---

## 10. Recommended Canonical Architecture

| Component | Decision |
|-----------|----------|
| **Entity table** | `materials` (LegacyBrandMaterial) — add 13 missing fields |
| **Relation table** | `product_materials` (LegacyProductMaterial) |
| **Legacy duplicate** | `brand_materials` (LegacyBrandMaterialLink) — migrate data, then delete |
| **ERP bridge** | `erpMaterialId` on LegacyBrandMaterial (not unique, reference only) |
| **Runtime DDL** | Remove after all consumers migrated |

---

## 11. Schema Change Requirements

| Change | DDL Required? | Migration Risk |
|--------|---------------|----------------|
| Add `slug` to `materials` | `ALTER TABLE materials ADD COLUMN slug TEXT` | 🟢 Low |
| Add `category` to `materials` | `ALTER TABLE materials ADD COLUMN category TEXT DEFAULT ''` | 🟢 Low |
| Add `short_desc` to `materials` | `ALTER TABLE materials ADD COLUMN short_desc TEXT` | 🟢 Low |
| Add `story` to `materials` | `ALTER TABLE materials ADD COLUMN story TEXT` | 🟢 Low |
| Add `applicable_products` to `materials` | `ALTER TABLE materials ADD COLUMN applicable_products TEXT DEFAULT ''` | 🟢 Low |
| Add `status` to `materials` | `ALTER TABLE materials ADD COLUMN status TEXT DEFAULT 'DRAFT'` | 🟢 Low |
| Add `sort_order` to `materials` | `ALTER TABLE materials ADD COLUMN sort_order INTEGER DEFAULT 0` | 🟢 Low |
| Add `cover_image` to `materials` | `ALTER TABLE materials ADD COLUMN cover_image TEXT` | 🟢 Low |
| Add `detail_images` to `materials` | `ALTER TABLE materials ADD COLUMN detail_images TEXT DEFAULT '[]'` | 🟢 Low |
| Add SEO fields to `materials` | 3x `ALTER TABLE` for seo_title, seo_description, seo_keywords | 🟢 Low |
| Add `erp_material_id` to `materials` | `ALTER TABLE materials ADD COLUMN erp_material_id INTEGER` | 🟢 Low |

**All DDL is additive (ALTER TABLE ADD COLUMN). No data backfill needed for nullable/new-default columns.**

---

## 12. Data Migration Requirements

| Step | Action | Risk |
|------|--------|------|
| G2B | Read-only profile of `materials`, `brand_materials`, `product_materials` | 🟢 Read-only |
| G2C | Migrate relation data from `brand_materials` → `product_materials` | 🟡 Duplicate check needed |
| G2C | Drop runtime-DDL-added content columns from `brand_materials` | 🟡 Data loss risk — ensure migrated first |
| G2C | Backfill `materials.slug` from `brand_materials.slug` if needed | 🟡 May need name→slug generation |

---

## 13. Delete/Archive Semantics

**Recommended: SOFT DELETE via `status = 'ARCHIVED'`.**

| Scenario | Behavior |
|----------|----------|
| Material has product relations | Set `status = 'ARCHIVED'`. Product detail shows "(材料已归档)" |
| Material has no product relations | Soft delete (status = ARCHIVED). Optionally hard delete after grace period. |
| ERP material deleted | Brand material stays. `erp_material_id` becomes stale reference. |
| Product deleted | Relation cascade-deletes via `onDelete: Cascade`. Material entity unchanged. |

**No hard delete for materials with existing product relations.** This matches the existing editorial expectation — materials exist independently of products.

---

## 14. ADR Decision

**ADR-008 REQUIRED.**

Title: **Materials Entity, ERP Bridge, and Product Relation Contract**

Must lock:
1. `materials` (LegacyBrandMaterial) is the sole entity table
2. `product_materials` (LegacyProductMaterial) is the sole relation table
3. `brand_materials` (LegacyBrandMaterialLink) is deprecated — migrate → retire
4. ERP refresh is read-only bridge; never overwrites Brand narrative fields
5. `erp_material_id` is non-unique reference
6. Runtime DDL is prohibited after migration
7. Delete = soft archive (status = 'ARCHIVED')
8. Phase G2 execution plan

---

## 15. Phase G2 Execution Plan

| Phase | Owner | Scope | DB Read? | DB Write? | Commit? |
|-------|-------|-------|----------|-----------|---------|
| **G2A** | Claude | ADR-008 + Canonical schema changes | ❌ | ❌ | ✅ |
| **G2B** | OpenClaw | Read-only data profiling of 3 tables | ✅ Read | ❌ | ❌ |
| **G2C** | OpenClaw/Codex | DDL + data migration + backfill | ✅ Read | ✅ Write | ✅ |
| **G2D** | Codex | Typed Prisma consumer migration | ❌ | ❌ | ✅ |
| **G2E** | Codex | Runtime DDL removal + cleanup | ❌ | ❌ | ✅ |
| **G2F** | Codex/Claude | LegacyBrandMaterialLink retirement (Phase H) | ❌ | ❌ | ✅ |

### G2A Scope (Next — Codex)

| File | Change |
|------|--------|
| `packages/brand-db/schema.prisma` | Add 13 fields to `LegacyBrandMaterial` |
| `docs/adr/ADR-008-MATERIALS-ENTITY-ERP-BRIDGE-AND-PRODUCT-RELATION-CONTRACT.md` | CREATE |

---

## Required Questions — Answers

| Question | Answer |
|----------|--------|
| Entity table | `materials` |
| Canonical entity model | `LegacyBrandMaterial` (needs 13 more fields) |
| Canonical relation table | `product_materials` (LegacyProductMaterial) |
| Legacy relation | `brand_materials` (LegacyBrandMaterialLink) — migrate → retire |
| 13 content fields | All belong on LegacyBrandMaterial as Brand Runtime entity content |
| ERP-owned fields | None on Brand entity. ERP bridge is read-only via `erp_material_id` |
| Brand-owned fields | All 13 content fields + existing 12 entity fields |
| ERP refresh policy | Read-only. Never overwrites Brand narrative fields. |
| Product relation uniqueness | `@@unique([productId, materialId])` — already in canonical ✅ |
| Material delete policy | Soft archive (status = 'ARCHIVED'). No hard delete with relations. |
| Runtime DDL | **MUST STOP** — replaced by typed Prisma + canonical schema |
| Schema change required | **YES** — 13 ADD COLUMN to `materials` |
| Migration required | **YES** — DDL (Phase G2C) |
| Data backfill required | **YES** — relation data `brand_materials` → `product_materials` |
| Data profiling required | **YES** — Phase G2B before any write |
| ADR required | **YES — ADR-008** |

---

```
PHASE G1 MATERIALS CONTRACT REVIEW COMPLETE

WORKDIR:                      /Users/ryan/Projects/active/platform-os
HEAD:                         eb27ebe
Materials entity table:       materials (LegacyBrandMaterial)
Canonical relation table:     product_materials (LegacyProductMaterial)
Legacy relation decision:     brand_materials → migrate data → retire (Phase H)
Thirteen content fields:      All belong on LegacyBrandMaterial (Phase G2A)
ERP refresh policy:           Read-only bridge. Never overwrites Brand narrative.
Product relation uniqueness:  ✅ @@unique([productId, materialId])
Material delete policy:       Soft archive (status = 'ARCHIVED')
Runtime DDL decision:         REMOVE after all consumers migrated
Schema change required:       YES (13 ADD COLUMN)
Migration required:           YES (DDL + data)
Data backfill required:       YES (brand_materials → product_materials)
Data profiling required:      YES (Phase G2B)
Storefront changes required:  NO
Product OS changes required:  NO
ADR required:                 YES — ADR-008
Report path:                  docs/PHASE_G1_MATERIALS_CANONICAL_ENTITY_RELATION_REVIEW_2026-07-14.md
Modified files:               NONE (read-only)
Database operations:          NONE
Commit SHA:                   NONE
Push:                         NOT EXECUTED
Codex readiness:              READY (G2A — ADR-008 + Schema change)
Next phase:                   Phase G2A — ADR-008 + LegacyBrandMaterial field additions
```
