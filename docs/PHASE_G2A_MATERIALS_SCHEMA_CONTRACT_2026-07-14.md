# Phase G2A — Materials Schema Contract

**Date:** 2026-07-14
**WORKDIR:** `/Users/ryan/Projects/active/platform-os` @ `eb27ebe`
**ADR-008:** ACCEPTED
**Missing artifact cause:** File was never created during original G2A — ADR-008 and summary report existed but the detailed 13-field Schema Contract was not authored.

---

## 1. Executive Contract

This document is the authoritative 13-field Materials Schema Contract referenced by ADR-008 and Phase G1. It locks the exact field-level schema for `LegacyBrandMaterial` and `LegacyProductMaterial`, ownership boundaries, ERP refresh policy, delete semantics, and Phase G2B entry conditions.

**G2B readiness:** READY (0 BLOCKED_FIELDS)

---

## 2. Evidence Sources

| # | Source | Evidence Used |
|---|--------|---------------|
| 1 | `apps/platform/modules/brand/materials/actions.ts` | `BrandMaterialRow` interface (21 fields), `ensureColumns()` field list |
| 2 | `apps/platform/app/(platform)/brand/materials/client.tsx` | UI form fields: setField calls for every editable field |
| 3 | `packages/brand-db/schema.prisma` | `LegacyBrandMaterial` existing 12 fields |
| 4 | `docs/db-metadata/brand-db-schema-metadata-2026-07-11.json` | Physical column evidence for `materials` table |
| 5 | `docs/PHASE_G1_MATERIALS_CANONICAL_ENTITY_RELATION_REVIEW_2026-07-14.md` | Entity/relation table mapping, 13-field gap identification |
| 6 | `docs/adr/ADR-008-*` | Entity/relation boundary, ERP policy, delete semantics |

---

## 3. Material Entity Boundary

| Aspect | Boundary |
|--------|----------|
| Entity table | `materials` |
| Canonical model | `LegacyBrandMaterial` |
| Includes | Name, slug, classification, narrative, SEO, media, ERP bridge, status, ordering |
| Excludes | Product-specific usage, quantity, percentage, role, inventory, procurement, Publisher lifecycle |

---

## 4. Product–Material Relation Boundary

| Aspect | Boundary |
|--------|----------|
| Relation table | `product_materials` |
| Canonical model | `LegacyProductMaterial` |
| Includes | id, productId, materialId, sortOrder |
| Uniqueness | `@@unique([productId, materialId])` |
| Excludes | Entity content fields (slug, story, category, SEO, etc.) |

---

## 5. Exact Thirteen-Field Matrix

All 13 fields are **Material Entity** fields. None are Product–Material relation fields.

| # | UI/Payload Field | Canonical Prisma Field | DB Column | Prisma Type | Nullable | Default | Owner | Entity/Relation | Source Evidence |
|---|-----------------|----------------------|-----------|-------------|----------|---------|-------|----------------|----------------|
| 1 | `slug` | `slug` | `slug` | `String` | NO | `""` | BRAND_RUNTIME | MATERIAL_ENTITY | `client.tsx:66`, `actions.ts:ensureColumns:74` |
| 2 | `category` | `category` | `category` | `String` | NO | `""` | BRAND_RUNTIME | MATERIAL_ENTITY | `client.tsx:69`, `actions.ts:ensureColumns:75` |
| 3 | `short_desc` | `shortDesc` | `short_desc` | `String?` | YES | None | BRAND_RUNTIME | MATERIAL_ENTITY | `actions.ts:BrandMaterialRow:17`, `ensureColumns:76` |
| 4 | `story` | `story` | `story` | `String?` | YES | None | BRAND_RUNTIME | MATERIAL_ENTITY | `client.tsx:104`, `actions.ts:ensureColumns:77` |
| 5 | `applicableProducts` | `applicableProducts` | `applicable_products` | `String?` | YES | None | BRAND_RUNTIME | MATERIAL_ENTITY | `client.tsx:95`, `actions.ts:ensureColumns:78` |
| 6 | `status` | `status` | `status` | `String` | NO | `"DRAFT"` | BRAND_RUNTIME | MATERIAL_ENTITY | `client.tsx:72`, `actions.ts:ensureColumns:79` |
| 7 | `sortOrder` | `sortOrder` | `sort_order` | `Int` | NO | `0` | BRAND_RUNTIME | MATERIAL_ENTITY | `client.tsx:75`, `actions.ts:ensureColumns:80` |
| 8 | `coverImage` | `coverImage` | `cover_image` | `String?` | YES | None | BRAND_RUNTIME | MATERIAL_ENTITY | `client.tsx:112`, `actions.ts:ensureColumns:81` |
| 9 | `detailImages` | `detailImages` | `detail_images` | `String` | NO | `"[]"` | BRAND_RUNTIME | MATERIAL_ENTITY | `actions.ts:BrandMaterialRow:20`, `ensureColumns:82` |
| 10 | `seoTitle` | `seoTitle` | `seo_title` | `String?` | YES | None | BRAND_RUNTIME | MATERIAL_ENTITY | `client.tsx:119`, `actions.ts:ensureColumns:83` |
| 11 | `seoDescription` | `seoDescription` | `seo_description` | `String?` | YES | None | BRAND_RUNTIME | MATERIAL_ENTITY | `client.tsx:126`, `actions.ts:ensureColumns:84` |
| 12 | `seoKeywords` | `seoKeywords` | `seo_keywords` | `String?` | YES | None | BRAND_RUNTIME | MATERIAL_ENTITY | `client.tsx:122`, `actions.ts:ensureColumns:85` |
| 13 | `erp_material_id` | `erpMaterialId` | `erp_material_id` | `Int?` | YES | None | **ERP_OS (bridge)** | MATERIAL_ENTITY | `client.tsx:81`, `actions.ts:ensureColumns:86` |

### 5.1 Count Verification

| Metric | Value |
|--------|-------|
| Total fields documented | **13** |
| MATERIAL_ENTITY | 12 (fields 1–12) |
| ERP_OS bridge | 1 (field 13) |
| PRODUCT_MATERIAL_RELATION | 0 |
| DERIVED | 0 |
| DEPRECATED | 0 |
| UNKNOWN | 0 |
| BLOCKED_FIELD | **0** |

---

## 6. Field Ownership

| Domain | Fields | Owner |
|--------|--------|-------|
| Entity identity | name, slug | BRAND_RUNTIME |
| Classification | type (existing), category | BRAND_RUNTIME |
| Narrative | description, story, short_desc, features, history | BRAND_RUNTIME |
| Media | image, coverImage, detailImages | BRAND_RUNTIME |
| SEO | seoTitle, seoDescription, seoKeywords | BRAND_RUNTIME |
| Workflow | status (free-text, NOT PublishStatus) | BRAND_RUNTIME |
| Ordering | sortOrder | BRAND_RUNTIME |
| Applicability | applicableProducts | BRAND_RUNTIME |
| Reference only | erpMaterialId | **ERP_OS** (read-only bridge) |
| Auto | id, createdAt, updatedAt, relatedArticles | BRAND_RUNTIME |

---

## 7. ERP Refresh Policy

| Rule | Applies To | Policy |
|------|-----------|--------|
| ERP refresh writes | `erpMaterialId` ONLY | **ERP_REFRESH_ALLOWED** |
| Brand narrative overwritten? | story, description, short_desc | **ERP_REFRESH_FORBIDDEN** |
| Brand content overwritten? | coverImage, detailImages, slug | **ERP_REFRESH_FORBIDDEN** |
| Brand SEO overwritten? | seoTitle, seoDescription, seoKeywords | **ERP_REFRESH_FORBIDDEN** |
| Category overwritten? | category, type | **ERP_REFRESH_FORBIDDEN** |
| Status overwritten? | status | **ERP_REFRESH_FORBIDDEN** |
| sortOrder overwritten? | sortOrder | **ERP_REFRESH_FORBIDDEN** |

### 7.1 Bridge Behavior

| Scenario | Behavior |
|----------|----------|
| Brand material with no ERP link | `erpMaterialId = null`. All Brand content self-managed. |
| Brand material linked to ERP | `erpMaterialId` set. No Brand content is auto-filled from ERP. |
| ERP material deleted | Brand entity survives. `erpMaterialId` becomes stale. |
| Multiple Brand → one ERP | ✅ Permitted (`erpMaterialId` is NOT unique) |
| One Brand → multiple ERP | ❌ Not supported (single integer reference) |

---

## 8. Soft Archive / Delete Contract

| Scenario | Behavior |
|----------|----------|
| Has product relations | **HARD DELETE BLOCKED.** Set `status = "ARCHIVED"`. |
| No product relations | Hard delete permitted. |
| ERP link present | Not a blocker (reference only). |

**Soft archive field:** `status` (field 6 in the 13-field contract). No separate `archivedAt` or `isArchived` Boolean. The `status` field value `"ARCHIVED"` signals archival state.

**Note:** Current canonical schema does NOT have a separate `archived` boolean or `archivedAt` timestamp. The `status = "ARCHIVED"` convention is application-level. A dedicated archive field (Boolean or timestamp) may be added in a future phase if the application logic requires distinguishing "archived due to content decision" from "archived due to product relation block."

---

## 9. No Relation Fields in Entity

Verified: None of the 13 fields have Product–Material relation semantics.

| Suspect Field | Check | Verdict |
|--------------|-------|---------|
| `applicable_products` | Free-text product applicability description, not a product ID or FK | ✅ Entity field |
| `sort_order` | Ordering within material list, not within a product's material list | ✅ Entity field |
| `status` | Material workflow state | ✅ Entity field |
| `category` | Material classification | ✅ Entity field |

None of the following relation-type fields exist in the 13:
`quantity`, `usageQuantity`, `percentage`, `productRole`, `usageNote`, `productSpecificNote`, `relationSortOrder`, `primaryMaterial`, `productUnit`, `productId`

---

## 10. Target LegacyBrandMaterial Prisma Draft

```prisma
model LegacyBrandMaterial {
  /// Maps the existing database sequence/identity behavior; no DDL is added. See ADR-004.
  id                  Int                     @id @default(autoincrement())
  name                String                  @unique
  /// NEW — Phase G2A. SEO-friendly identifier for public URLs.
  slug                String                  @default("")
  /// NEW — Phase G2A. Brand-facing classification label (supersedes `type`).
  category            String                  @default("")
  /// Legacy classification — coexists with category for backward compatibility.
  type                String                  @default("")
  origin              String                  @default("")
  description         String                  @default("")
  /// NEW — Phase G2A. Short summary for card/list views.
  shortDesc           String?                 @map("short_desc")
  /// NEW — Phase G2A. Brand narrative / cultural context.
  story               String?
  /// NEW — Phase G2A. Free-text description of crafts this material suits.
  applicableProducts  String?                 @map("applicable_products")
  /// NEW — Phase G2A. Free-text workflow state (not PublishStatus). ADR-001 §7.3.
  status              String                  @default("DRAFT")
  /// NEW — Phase G2A. Display ordering within material lists.
  sortOrder           Int                     @default(0) @map("sort_order")
  image               String                  @default("")
  /// NEW — Phase G2A. Hero/large-format cover image (distinct from list `image`).
  coverImage          String?                 @map("cover_image")
  /// NEW — Phase G2A. JSON array of gallery image URLs.
  detailImages        String                  @default("[]") @map("detail_images")
  /// NEW — Phase G2A. SEO <title> override.
  seoTitle            String?                 @map("seo_title")
  /// NEW — Phase G2A. SEO <meta name="description">.
  seoDescription      String?                 @map("seo_description")
  /// NEW — Phase G2A. Comma-separated SEO keywords.
  seoKeywords         String?                 @map("seo_keywords")
  /// NEW — Phase G2A. Optional reference to ERP material. NOT unique.
  erpMaterialId       Int?                    @map("erp_material_id")
  createdAt           DateTime                @default(now()) @map("created_at")
  updatedAt           DateTime                @updatedAt @map("updated_at")
  alias               String?
  features            String?
  history             String?
  relatedArticles     String                  @default("[]") @map("related_articles")
  productLinks        LegacyProductMaterial[]

  @@map("materials")
}
```

### 10.1 Target LegacyProductMaterial Prisma Draft

```prisma
model LegacyProductMaterial {
  id         Int                 @id
  productId  Int                 @map("product_id")
  materialId Int                 @map("material_id")
  /// NEW — Phase G2A. Display ordering within a product's material list.
  sortOrder   Int                 @default(0) @map("sort_order")
  product    LegacyBrandProduct  @relation(fields: [productId], references: [id], onDelete: Cascade, onUpdate: Cascade)
  material   LegacyBrandMaterial @relation(fields: [materialId], references: [id], onDelete: Cascade, onUpdate: Cascade)

  @@unique([productId, materialId])
  @@map("product_materials")
}
```

---

## 11. Schema Change Classification

| Change | Class | DDL | Backfill | Profiling Needed |
|--------|-------|-----|----------|-----------------|
| `slug` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN slug TEXT DEFAULT ''` | ❌ No | ✅ Verify |
| `category` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN category TEXT DEFAULT ''` | ❌ No | ✅ Verify |
| `shortDesc` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN short_desc TEXT` | ❌ No | ✅ Verify |
| `story` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN story TEXT` | ❌ No | ✅ Verify |
| `applicableProducts` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN applicable_products TEXT` | ❌ No | ✅ Verify |
| `status` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN status TEXT DEFAULT 'DRAFT'` | ❌ No | ✅ Verify |
| `sortOrder` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN sort_order INTEGER DEFAULT 0` | ❌ No | ✅ Verify |
| `coverImage` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN cover_image TEXT` | ❌ No | ✅ Verify |
| `detailImages` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN detail_images TEXT DEFAULT '[]'` | ❌ No | ✅ Verify |
| `seoTitle` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN seo_title TEXT` | ❌ No | ✅ Verify |
| `seoDescription` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN seo_description TEXT` | ❌ No | ✅ Verify |
| `seoKeywords` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN seo_keywords TEXT` | ❌ No | ✅ Verify |
| `erpMaterialId` on LegacyBrandMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE materials ADD COLUMN erp_material_id INTEGER` | ❌ No | ✅ Verify |
| `sortOrder` on LegacyProductMaterial | **SCHEMA_AND_MIGRATION** | `ALTER TABLE product_materials ADD COLUMN sort_order INTEGER DEFAULT 0` | ❌ No | ✅ Verify |

**Total:** 14 `SCHEMA_AND_MIGRATION` (13 entity + 1 relation). No `SCHEMA_ONLY_DECLARATION`, no `INDEX_OR_CONSTRAINT`.

---

## 12. Migration and Backfill Expectations

| Item | Expectation |
|------|-------------|
| DDL execution | Phase G2C — ALL ADD COLUMN are additive, nullable or have defaults |
| Data backfill | **NOT required** for entity fields (all new columns are nullable or have defaults) |
| Relation backfill | Phase G2D — `brand_materials` → `product_materials` data migration |
| Duplicate handling | G2B profiling will identify duplicate `(product_id, material_id)` pairs |
| `brand_materials` cleanup | Post-migration: drop runtime-DDL-added columns, then retire table |

---

## 13. Production Profiling Queries Required (Phase G2B)

| Query | Table | Purpose |
|-------|-------|---------|
| `SELECT COUNT(*) FROM materials` | materials | Row count |
| `SELECT COUNT(*) FROM brand_materials` | brand_materials | Row count |
| `SELECT COUNT(*) FROM product_materials` | product_materials | Row count |
| `SELECT COUNT(DISTINCT name) FROM materials` | materials | Name uniqueness |
| `SELECT erp_material_id, COUNT(*) FROM materials WHERE erp_material_id IS NOT NULL GROUP BY erp_material_id HAVING COUNT(*) > 1` | materials | ERP link duplicates |
| `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'materials'` | materials | Actual DDL columns |
| `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'brand_materials'` | brand_materials | Runtime DDL-created columns |
| `SELECT product_id, material_id, COUNT(*) FROM brand_materials GROUP BY product_id, material_id HAVING COUNT(*) > 1` | brand_materials | Duplicate pairs |
| `SELECT b.product_id, b.material_id FROM brand_materials b LEFT JOIN product_materials p ON b.product_id = p.product_id AND b.material_id = p.material_id WHERE p.product_id IS NULL` | cross-table | Unmigrated relations |

---

## 14. Runtime DDL Transition Policy

| Phase | Action |
|-------|--------|
| G2A (current) | Policy set: Runtime DDL prohibited |
| G2B | Profiling only — no DDL change |
| G2C | Schema DDL executed on `materials` table |
| G2E | `ensureTable()` / `ensureColumns()` removed from actions.ts |
| G2F | Runtime DDL guard added |

---

## 15. Guards Required

| ID | Check | Type |
|----|-------|------|
| G-MAT-01 | Materials entity delegate = `LegacyBrandMaterial` | Static code |
| G-MAT-02 | Relation delegate = `LegacyProductMaterial` | Static code |
| G-MAT-03 | `brand_materials` not written by platform code after cutover | Static search |
| G-MAT-04 | No `ensureTable`/`ensureColumns` in materials module | Static search |
| G-MAT-05 | `erpMaterialId` not unique | Schema validation |
| G-MAT-06 | `@@unique([productId, materialId])` enforced | Schema validation |
| G-MAT-07 | No relation fields in LegacyBrandMaterial | Schema review |
| G-MAT-08 | Delete blocked when product relations exist | Unit test |
| G-MAT-09 | ERP refresh only writes `erpMaterialId` | Code review |
| G-MAT-10 | `status` is String, NOT PublishStatus | Schema validation |

---

## 16. G2B Entry Conditions

| Condition | Status |
|-----------|--------|
| ADR-008 accepted | ✅ ACCEPTED |
| 13 fields exactly documented | ✅ 13 fields, all named, typed, owned |
| 0 BLOCKED_FIELDS | ✅ |
| All DB column names have evidence | ✅ (actions.ts ensureColumns + UI) |
| All Prisma types have evidence | ✅ (ensureColumns SQL types + UI input expectations) |
| All nullability/defaults have evidence | ✅ (ensureColumns SQL defaults) |
| Entity/relation boundary clear | ✅ |
| ERP refresh policy defined | ✅ |
| Delete/archive contract defined | ✅ |
| ADR-008 consistent with contract | ✅ |
| G2A contract document exists | ✅ This document |
| Secrets gate PASS | ✅ 0 findings |

**G2B READINESS: READY**

---

## 17. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `materials` table may already have some of these columns via previous migrations | 🟢 Low | G2B profiling will confirm actual schema |
| `brand_materials` may have content data that needs deduplication before migration | 🟡 Medium | G2B profiling + G2C migration script |
| `status = "ARCHIVED"` may conflict with existing DRAFT/IN_REVIEW/APPROVED values | 🟡 Medium | Document as free-text — not PublishStatus |

---

## 18. Forbidden Actions

| Action | Reason |
|--------|--------|
| Connect production database before G2B approval | Phase G2B requires explicit approval |
| Execute DDL before Phase G2C | Schema must be designed first |
| Remove `ensureTable`/`ensureColumns` before consumer migration | Would break existing write path |
| Make `erpMaterialId` unique | Multiple Brand materials may reference same ERP material |
| Add `PublishStatus` to materials | Materials is not a Publisher content type |
| Add quantity/percentage to LegacyBrandMaterial | These are relation fields, not entity fields |
| Enter G2B before this contract is committed | G2B profiling requires documented field expectations |

---

## Required Questions — Answers

| Question | Answer |
|----------|--------|
| Missing artifact cause | File never created during original G2A |
| Recovery source | ADR-008 field table + ensureColumns() + UI client.tsx + BrandMaterialRow |
| Thirteen fields found | **13** (slug, category, shortDesc, story, applicableProducts, status, sortOrder, coverImage, detailImages, seoTitle, seoDescription, seoKeywords, erpMaterialId) |
| Blocked fields | **0** |
| Entity-owned | 12 |
| Relation-owned | 0 |
| ERP-owned (bridge) | 1 (erpMaterialId) |
| Brand-owned | 12 |
| Archive field | `status = "ARCHIVED"` (application-level convention) |
| Delete policy | Hard delete blocked when relations exist → soft archive via status |
| G2B readiness | **READY** |
