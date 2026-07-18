# ADR-008 — Materials Entity, ERP Bridge, and Product Relation Contract

**Status:** ACCEPTED
**Date:** 2026-07-14
**Supersedes:** Phase G1 Materials Contract Review findings

---

## 1. Context

The platform's materials module operates on a table named `brand_materials` that was originally created as a 3-column product-material junction table. Runtime DDL (`ensureTable`/`ensureColumns`) has been adding ~20 content columns to this table on every request, conflating junction semantics with entity semantics.

The correct entity table (`materials`, mapped as `LegacyBrandMaterial`) has 12 columns but is missing 13 content fields that the UI requires. Two junction tables (`brand_materials` and `product_materials`) exist with identical 3-column structures.

This ADR resolves the 18-month-long naming accident and establishes a single canonical architecture.

---

## 2. Decision

### 2.1 Material Entity

| Aspect | Decision |
|--------|----------|
| Physical table | `materials` |
| Canonical model | `LegacyBrandMaterial` |
| Role | Brand-facing entity: narrative, media, craft, origin, SEO, and ERP bridge |
| Not responsible for | Product-specific usage, quantity, inventory, procurement, Publisher lifecycle |

### 2.2 Product–Material Relation

| Aspect | Decision |
|--------|----------|
| Physical table | `product_materials` |
| Canonical model | `LegacyProductMaterial` |
| Fields | id, productId, materialId, sortOrder (approved addition) |
| Uniqueness | `@@unique([productId, materialId])` — no duplicate pairs |
| Delete behavior | `onDelete: Cascade` on both foreign keys |

### 2.3 Legacy `brand_materials` Table

| Aspect | Decision |
|--------|----------|
| Status | **LEGACY_DUPLICATE_LINK — MIGRATION_SOURCE** |
| New writes | ❌ **Prohibited** after relation cutover |
| New content columns | ❌ **Prohibited** — no more `ALTER TABLE` |
| Entity usage | ❌ **Prohibited** — it is a junction, not an entity |
| Profiling | ✅ Permitted (Phase G2B, read-only) |
| Backfill source | ✅ Permitted (Phase G2C, to `product_materials`) |
| Retirement | Phase G2G — after data reconciliation |

### 2.4 ERP Bridge

| Aspect | Decision |
|--------|----------|
| Bridge field | `erpMaterialId Int?` on `LegacyBrandMaterial` |
| Uniqueness | **Not unique** — multiple Brand materials may reference same ERP material |
| Direction | ERP → Brand (read-only bridge) |
| Refresh policy | ERP refresh updates ONLY `erpMaterialId` reference. NEVER overwrites Brand narrative content. |
| ERP deletion | Brand entity survives. `erpMaterialId` becomes stale reference. |
| Brand without ERP | ✅ Permitted — ERP link is optional |

### 2.5 Runtime DDL

**Prohibited.** Schema evolution must go through Canonical Prisma Schema + approved migration. `ensureTable()` and `ensureColumns()` in `materials/actions.ts` must be removed after consumer migration.

### 2.6 Delete Semantics

| Scenario | Behavior |
|----------|----------|
| Material has product relations | ❌ **Hard delete blocked.** Set `status = 'ARCHIVED'`. |
| Material has no product relations | ✅ Hard delete permitted |
| ERP link exists | Not a blocker — it's a reference, not an ownership |
| Relation deleted | `onDelete: Cascade` cleans up product_materials. Entity unchanged. |

---

## 3. Thirteen Content Fields — Precise Contract

| # | UI/Payload Field | Canonical Prisma Field | DB Column | Prisma Type | Nullable | Default | Owner | ERP Refresh Overwrite? |
|---|-----------------|----------------------|-----------|-------------|----------|---------|-------|----------------------|
| 1 | slug | `slug` | `slug` | `String @default("")` | NO | `''` | BRAND_RUNTIME | ❌ Never |
| 2 | category | `category` | `category` | `String @default("")` | NO | `''` | BRAND_RUNTIME | ❌ Never |
| 3 | short_desc | `shortDesc` | `short_desc` | `String?` | YES | None | BRAND_RUNTIME | ❌ Never |
| 4 | story | `story` | `story` | `String?` | YES | None | BRAND_RUNTIME | ❌ Never |
| 5 | applicable_products | `applicableProducts` | `applicable_products` | `String?` | YES | None | BRAND_RUNTIME | ❌ Never |
| 6 | status | `status` | `status` | `String @default("DRAFT")` | NO | `'DRAFT'` | BRAND_RUNTIME | ❌ Never |
| 7 | sort_order | `sortOrder` | `sort_order` | `Int @default(0)` | NO | `0` | BRAND_RUNTIME | ❌ Never |
| 8 | cover_image | `coverImage` | `cover_image` | `String?` | YES | None | BRAND_RUNTIME | ❌ Never |
| 9 | detail_images | `detailImages` | `detail_images` | `String @default("[]")` | NO | `'[]'` | BRAND_RUNTIME | ❌ Never |
| 10 | seo_title | `seoTitle` | `seo_title` | `String?` | YES | None | BRAND_RUNTIME | ❌ Never |
| 11 | seo_description | `seoDescription` | `seo_description` | `String?` | YES | None | BRAND_RUNTIME | ❌ Never |
| 12 | seo_keywords | `seoKeywords` | `seo_keywords` | `String?` | YES | None | BRAND_RUNTIME | ❌ Never |
| 13 | erp_material_id | `erpMaterialId` | `erp_material_id` | `Int?` | YES | None | ERP_OS (bridge) | ✅ Read-only reference |

**All 13 fields are Material Entity fields.** None are Product–Material relation fields. None express "how a product uses this material."

### Existing Fields Retained (Not Replaced)

| Field | Status | Notes |
|-------|--------|-------|
| `type` | Kept | Coexists with `category` for backward compatibility |
| `history` | Kept | Coexists with `story` — different editorial intent |
| `alias` | Kept | Already in schema |
| `features` | Kept | Already in schema |
| `relatedArticles` | Kept | Already in schema |

---

## 4. Target Canonical Schema

### LegacyBrandMaterial (target)

```prisma
model LegacyBrandMaterial {
  /// Maps the existing database sequence/identity behavior; no DDL is added. See ADR-004.
  id                  Int                     @id @default(autoincrement())
  name                String                  @unique
  /// SEO-friendly identifier. NEW FIELD — Phase G2A.
  slug                String                  @default("")
  /// Brand-facing classification label. NEW FIELD — Phase G2A.
  category            String                  @default("")
  type                String                  @default("")
  origin              String                  @default("")
  description         String                  @default("")
  /// Short summary for cards/list views. NEW FIELD — Phase G2A.
  shortDesc           String?                 @map("short_desc")
  /// Brand narrative content. NEW FIELD — Phase G2A.
  story               String?
  /// Product applicability description. NEW FIELD — Phase G2A.
  applicableProducts  String?                 @map("applicable_products")
  /// Workflow state: free-text. Not PublishStatus. See ADR-001. NEW FIELD — Phase G2A.
  status              String                  @default("DRAFT")
  /// Display ordering within lists. NEW FIELD — Phase G2A.
  sortOrder           Int                     @default(0) @map("sort_order")
  image               String                  @default("")
  /// Hero/large image. NEW FIELD — Phase G2A.
  coverImage          String?                 @map("cover_image")
  /// JSON array of gallery image URLs. NEW FIELD — Phase G2A.
  detailImages        String                  @default("[]") @map("detail_images")
  created_at          DateTime                @default(now()) @map("created_at")
  /// SEO metadata. NEW FIELD — Phase G2A.
  seoTitle            String?                 @map("seo_title")
  /// SEO metadata. NEW FIELD — Phase G2A.
  seoDescription      String?                 @map("seo_description")
  /// SEO keywords string. NEW FIELD — Phase G2A.
  seoKeywords         String?                 @map("seo_keywords")
  /// Optional reference to ERP material. Not unique. NEW FIELD — Phase G2A.
  erpMaterialId       Int?                    @map("erp_material_id")
  createdAt           DateTime                @default(now()) @map("created_at")
  /// Prisma Client-maintained timestamp; not a database trigger. See ADR-004.
  updatedAt           DateTime                @updatedAt @map("updated_at")
  alias               String?
  features            String?
  history             String?
  relatedArticles     String                  @default("[]") @map("related_articles")
  productLinks        LegacyProductMaterial[]

  @@map("materials")
}
```

### LegacyProductMaterial (target — add sortOrder)

```prisma
model LegacyProductMaterial {
  id         Int                 @id
  productId  Int                 @map("product_id")
  materialId Int                 @map("material_id")
  /// Display order within a product's material list. NEW FIELD — Phase G2A.
  sortOrder   Int                 @default(0) @map("sort_order")
  product    LegacyBrandProduct  @relation(fields: [productId], references: [id], onDelete: Cascade, onUpdate: Cascade)
  material   LegacyBrandMaterial @relation(fields: [materialId], references: [id], onDelete: Cascade, onUpdate: Cascade)

  @@unique([productId, materialId])
  @@map("product_materials")
}
```

---

## 5. Schema Change Classification

| Change | Classification | Migration? | Backfill? | Profiling? |
|--------|---------------|------------|-----------|------------|
| `slug` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN` | ❌ No | ✅ Verify |
| `category` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN` | ❌ No | ✅ Verify |
| `shortDesc` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN` | ❌ No | ✅ Verify |
| `story` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN` | ❌ No | ✅ Verify |
| `applicableProducts` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN` | ❌ No | ✅ Verify |
| `status` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN` | ❌ No | ✅ Verify |
| `sortOrder` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN` | ❌ No | ✅ Verify |
| `coverImage` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN` | ❌ No | ✅ Verify |
| `detailImages` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN` | ❌ No | ✅ Verify |
| `seoTitle` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN` | ❌ No | ✅ Verify |
| `seoDescription` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN` | ❌ No | ✅ Verify |
| `seoKeywords` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN` | ❌ No | ✅ Verify |
| `erpMaterialId` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN` | ❌ No | ✅ Verify |
| `sortOrder` on LegacyProductMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE product_materials ADD COLUMN` | ❌ No | ✅ Verify |
| `@@unique` on LegacyProductMaterial | **INDEX_OR_CONSTRAINT** | Already exists ✅ | N/A | ✅ Verify |

---

## 6. Phase G2 Execution Plan

| Phase | Owner | Scope | DB Read? | DB Write? | Commit? |
|-------|-------|-------|----------|-----------|---------|
| **G2A** | Claude | ADR-008 + schema contract + field contract | ❌ | ❌ | ✅ Docs |
| **G2B** | OpenClaw/Codex | Read-only data profiling (3 tables) | ✅ Read | ❌ | ❌ |
| **G2C** | Codex/Claude | Canonical schema + `materials` DDL design | ❌ | ❌ | ✅ Schema |
| **G2D** | OpenClaw/Codex | Staging: DDL + backfill `brand_materials→product_materials` | ✅ | ✅ Stage | ✅ |
| **G2E** | Codex | Typed Prisma consumer migration + Runtime DDL removal | ❌ | ❌ | ✅ |
| **G2F** | Codex/Claude | LegacyBrandMaterialLink retirement (Phase H collab) | ❌ | ❌ | ✅ |

---

## 7. Guard Rules

| ID | Check | Verified By |
|----|-------|-------------|
| G-MAT-01 | Materials entity delegate is `LegacyBrandMaterial` | Static code review |
| G-MAT-02 | Product–Material relation is `LegacyProductMaterial` | Static code review |
| G-MAT-03 | `brand_materials` not written after cutover | Static search |
| G-MAT-04 | No Runtime DDL (`ensureTable`/`ensureColumns`) in materials module | Static search |
| G-MAT-05 | ERP refresh only updates approved fields | Code review |
| G-MAT-06 | `@@unique([productId, materialId])` enforced | Schema validation |
| G-MAT-07 | Relation fields NOT added to `LegacyBrandMaterial` | Schema review |
| G-MAT-08 | Material delete blocked when product relations exist | Unit test |

---

## 8. Consequences

### Positive

1. Single canonical entity table (`materials`) with all content fields
2. Single canonical relation table (`product_materials`) with unique constraint
3. Legacy naming accident resolved — `brand_materials` retired
4. Runtime DDL eliminated
5. Typed Prisma migration enabled

### Negative

1. 13 `ALTER TABLE ADD COLUMN` statements required on `materials` table
2. Relation data must be migrated from `brand_materials` to `product_materials`
3. `brand_materials` table remains in database until Phase G2G

---

```
ACCEPTED
```
