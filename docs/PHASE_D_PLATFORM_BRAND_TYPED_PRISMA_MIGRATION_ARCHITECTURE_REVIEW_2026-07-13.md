# Phase D — Platform Brand Module Typed Prisma Migration Architecture Review

**Date:** 2026-07-13
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**HEAD:** `4b15b89` (Phase C4 complete)
**Phase C4:** COMPLETE — legacy Prisma client infrastructure decommissioned in brand-os
**Phase D:** Read-only architecture review — no files modified

---

## 1. Executive Conclusion

**Phase D is VIABLE with moderate complexity.** The platform app (`apps/platform`) has 10 files that directly access Brand Runtime tables. All access is through raw SQL via `$queryRaw`/`$executeRaw` — there is zero typed Prisma usage for Brand Runtime models in apps/platform.

**Key findings:**
- **10 Brand consumer files** across 8 module directories
- **~120 raw SQL statements** targeting Brand Runtime tables
- **3 context ownership violations** — Brand Runtime tables accessed through ERP Prisma Client
- **0 cross-database transactions** — no P0 transaction risk
- **0 SQL injection vectors** — parameterized queries used consistently
- **1 mixed-context file** (`brand/products/actions.ts`) that accesses both ERP and Brand DB
- **Publisher (Phase E) owns ~40 raw SQL statements** across 7 Brand tables

**Recommended approach:** Adapter-based migration (D1) → bulk consumer migration (D2-D3) → cleanup (D5). Publisher remains untouched until Phase E.

---

## 2. Current Database Client Topology

### 2.1 Client Sources

apps/platform currently has **two active Prisma client sources** and **one legacy helper**:

| # | Source | URL | Models | Used By |
|---|--------|-----|--------|---------|
| **ERP Client** | `import { prisma } from "@yunwu/db"` | `DATABASE_URL` (ERP US-East) | All 41 ERP models | All ERP modules + 4 Brand modules (incorrectly) |
| **Brand Helper** | `import { brandPrisma } from "@yunwu/db/brand"` | `BRAND_DATABASE_URL` (Brand Singapore) | Generic `PrismaClient` (no typed models) | 8 Brand module files + Publisher |
| **Platform Brand Gateway** | `import { brandGateway } from "@/modules/brand/shared/gateway"` | `BRAND_DATABASE_URL` | Unknown gateway abstraction | Underutilized |

### 2.2 Client Topology Diagram

```
apps/platform import map:

@yunwu/db                        @yunwu/db/brand              @yunwu/brand-db
└── prisma (ERP Client)          └── brandPrisma              └── (NOT USED YET)
    ├── DATABASE_URL                 ├── BRAND_DATABASE_URL
    ├── Typed: 41 ERP models         ├── Generic PrismaClient
    ├── Used by:                     ├── Used by:
    │   erp/modules/*                │   brand/products/actions.ts
    │   brand/media/* (correct)      │   brand/series/actions.ts
    │   brand/seo/* (VIOLATION)      │   brand/journal/actions.ts
    │   brand/settings/* (VIOLATION) │   brand/home/actions.ts
    │   brand/products (ERP part)    │   brand/banners/actions.ts
    │   settings/*                   │   brand/materials/actions.ts
    │   dashboard/*                  │   brand/products/actions.ts (Brand part)
    └── NOT connected to Brand DB    │   dashboard/actions.ts
                                     │   settings/system/actions.ts
                                     │   lib/publisher.ts
                                     └── Raw SQL only — no typed models
```

### 2.3 Context Ownership Violations

| File | Accesses (via `prisma` ERP client) | Should Use | Severity |
|------|-------------------------------------|------------|----------|
| `brand/seo/actions.ts` | `seo_configs` table (Brand Runtime) | `@yunwu/brand-db` | 🟡 P2 |
| `brand/settings/actions.ts` | `site_settings` table (Brand Runtime) | `@yunwu/brand-db` | 🟡 P2 |
| `brand/home/actions.ts` | `page_contents` table (Brand Runtime) via `prisma` raw SQL | `@yunwu/brand-db` | 🟡 P2 |

These violations do not cause data corruption because the ERP Prisma Client's `DATABASE_URL` resolves to the ERP DB, where these tables happen to also exist. However, this means SEO configs and site settings are being read/written in the ERP DB rather than the Brand DB — a data fragmentation risk.

---

## 3. Context Ownership Map

### 3.1 Brand-Owned Consumers (Phase D candidate)

| Module | Tables | Current Access | Production |
|--------|--------|---------------|------------|
| Brand Products | `products`, `series`, `product_skus`, `media_references`, `media_assets` | Raw SQL via both `brandPrisma` + `prisma` | ✅ Production runtime |
| Brand Series | `series` | Raw SQL via `brandPrisma` | ✅ Production runtime |
| Brand Journal | `journal_posts` | Raw SQL via `brandPrisma` | ✅ Production runtime |
| Brand Banners | `banners` | Raw SQL via `brandPrisma` | ✅ Production runtime |
| Brand Materials | `brand_materials`, `materials` | Raw SQL via both `brandPrisma` + `prisma` | ✅ Production runtime |
| Brand Home | `series`, `products`, `journal_posts`, `banners`, `page_contents` | Raw SQL via both `brandPrisma` + `prisma` | ✅ Production runtime |
| Brand SEO | `seo_configs` | Raw SQL via `prisma` (VIOLATION) | ✅ Production runtime |
| Brand Settings | `site_settings` | Raw SQL via `prisma` (VIOLATION) | ✅ Production runtime |
| Publisher | `content_versions`, `publish_jobs`, `seo_snapshots`, `products`, `series`, `journal_posts`, `banners`, `page_contents` | Raw SQL via `brandPrisma` | ✅ Production runtime |
| Dashboard | All Brand tables (counts) | Raw SQL via `brandPrisma` | ✅ Production runtime |

### 3.2 ERP-Owned Consumers (NOT in Phase D scope)

| Module | Tables | Current Client |
|--------|--------|---------------|
| ERP Products | `products` (ERP), `product_skus` | `@yunwu/db` (typed) |
| ERP Materials | `raw_materials` | `@yunwu/db` (typed) |
| ERP BOM | `erp_boms` | `@yunwu/db` (typed) |
| ERP Orders | `erp_orders`, `customers` | `@yunwu/db` (typed) |
| ERP Purchase | `erp_purchase_records` | `@yunwu/db` (typed) |
| ERP Production | `erp_production_records` | `@yunwu/db` (typed) |
| ERP Costs | `erp_product_costs` | `@yunwu/db` (typed) |
| ERP Inventory | `erp_inventory_transactions` | `@yunwu/db` (typed) |
| Brand Media | `media_assets` (ERP ErpMediaAsset) | `@yunwu/db` (typed) ✅ correct |

### 3.3 Product OS Aggregation (NOT in Phase D scope)

| Module | Pattern | Decision |
|--------|---------|----------|
| `packages/db/fabric/` | Reads from both ERP and Brand via respective clients | Keep as service layer |

### 3.4 Mixed-Context Files

| File | Brand Tables | ERP Tables | Complexity |
|------|-------------|------------|------------|
| `brand/products/actions.ts` | `products` (Brand), `series` (Brand) | `products` (ERP), `product_skus` (ERP) | 🟡 High — same table name `products` in both DBs |

---

## 4. Complete Brand Consumer Inventory

### 4.1 Brand Module Consumer Files

| # | File | Module | Current Import | Tables | Read/Write | Raw Count | Production |
|---|------|--------|---------------|--------|------------|-----------|------------|
| 1 | `modules/brand/products/actions.ts` | Products | `brandPrisma` + `prisma` | products, series, media_references, media_assets (ERP) | R/W | ~35 | ✅ Yes |
| 2 | `modules/brand/series/actions.ts` | Series | `brandPrisma` | series | R/W | ~15 | ✅ Yes |
| 3 | `modules/brand/journal/actions.ts` | Journal | `brandPrisma` | journal_posts | R/W | ~15 | ✅ Yes |
| 4 | `modules/brand/banners/actions.ts` | Banners | `brandPrisma` | banners | R/W | ~12 | ✅ Yes |
| 5 | `modules/brand/materials/actions.ts` | Materials | `brandPrisma` + `prisma` | brand_materials, materials | R/W | ~10 | ✅ Yes |
| 6 | `modules/brand/home/actions.ts` | Home | `brandPrisma` + `prisma` | series, products, journal_posts, banners, page_contents | R/W | ~10 | ✅ Yes |
| 7 | `modules/brand/seo/actions.ts` | SEO | `prisma` (ERP — VIOLATION) | seo_configs | R/W | ~5 | ✅ Yes |
| 8 | `modules/brand/settings/actions.ts` | Settings | `prisma` (ERP — VIOLATION) | site_settings | R/W | ~5 | ✅ Yes |
| 9 | `modules/brand/products/list.tsx` | Products UI | `brandPrisma` (via actions) | — | Read | 0 | ✅ Yes |
| 10 | `modules/brand/media/actions.ts` | Media | `prisma` (ERP — correct) | media_assets, media_references | R/W | ~3 | ✅ Yes |

### 4.2 Other Brand Consumers

| # | File | Module | Current Import | Tables | Raw Count | Production |
|---|------|--------|---------------|--------|-----------|------------|
| 11 | `lib/publisher.ts` | Publisher | `brandPrisma` | content_versions, publish_jobs, seo_snapshots, products, series, journal_posts, banners, page_contents | ~20 | ✅ Yes |
| 12 | `app/(platform)/brand/page.tsx` | Brand Dashboard | `brandPrisma` + `prisma` | products, series, journal_posts, banners, seo_configs, page_contents | ~12 | ✅ Yes |
| 13 | `modules/dashboard/actions.ts` | System Dashboard | `brandPrisma` + `prisma` | All Brand + ERP tables (counts) | ~8 | ✅ Yes |
| 14 | `modules/settings/system/actions.ts` | System Config | `brandPrisma`+ `prisma` | Brand products, journal_posts (counts) | ~3 | ✅ Yes |

### 4.3 Total by Category

| Category | Count |
|----------|-------|
| Brand Module Files (Phase D primary) | 8 files (items 1-8) |
| Brand Dashboard Page (Phase D) | 1 file (item 12) |
| Publisher (Phase E) | 1 file (item 11) |
| Dashboard/System (mix — partial Phase D) | 2 files (items 13-14) |
| Media (ERP-owned, correct — NOT Phase D) | 1 file (item 10) |

---

## 5. Complete Raw SQL Inventory

### 5.1 Summary by Brand Module

| Module | queryRaw | executeRaw | Prisma.sql | Unsafe | Total Statements |
|--------|----------|------------|------------|--------|-----------------|
| Brand Products | ~20 | ~5 | ~8 | ~15 (dynamic column) | ~35 |
| Brand Series | ~8 | ~3 | ~0 | ~8 | ~12 |
| Brand Journal | ~8 | ~2 | ~0 | ~8 | ~10 |
| Brand Banners | ~6 | ~4 | ~0 | ~6 | ~10 |
| Brand Materials | ~5 | ~5 | ~0 | ~5 | ~10 |
| Brand Home | ~6 | ~3 | ~0 | ~6 | ~10 |
| Brand SEO | ~2 | ~3 | ~0 | ~2 | ~5 |
| Brand Settings | ~2 | ~3 | ~0 | ~2 | ~5 |
| Publisher (Phase E) | ~10 | ~10 | ~0 | ~10 | ~20 |
| Dashboard/Brand | ~10 | ~0 | ~0 | ~10 | ~10 |
| **Total** | **~77** | **~38** | **~8** | **~72** | **~120** |

### 5.2 Raw SQL Patterns by Type

| Pattern | Count | Example | Typed Replacement |
|---------|-------|---------|------------------|
| Simple SELECT with params | ~40 | `SELECT * FROM products WHERE id = $1` | `brandDb.legacyBrandProduct.findUnique({ where: { id } })` |
| INSERT with RETURNING | ~15 | `INSERT INTO series (...) VALUES (...) RETURNING *` | `brandDb.legacyBrandSeries.create({ data })` |
| UPDATE with SET | ~20 | `UPDATE products SET ... WHERE id = $1` | `brandDb.legacyBrandProduct.update({ where: { id }, data })` |
| DELETE | ~8 | `DELETE FROM banners WHERE id = $1` | `brandDb.banner.delete({ where: { id } })` |
| COUNT queries | ~15 | `SELECT COUNT(*)::int FROM products` | `brandDb.legacyBrandProduct.count()` |
| Dynamic column upsert | ~8 | Dynamic INSERT/UPDATE with column list | Requires careful mapping — D2 |
| Sort order swap | ~4 | `UPDATE ... SET sort_order = $1 WHERE id = $2` | `brandDb.series.update({ where: { id }, data: { sortOrder } })` |
| Enum cast | ~6 | `'value'::"PublishStatus"` | Typed Prisma handles enums natively |
| JSON operations | ~2 | `JSON_BUILD_OBJECT(...)` | D3 — may retain as $queryRaw |
| CREATE TABLE IF NOT EXISTS | ~2 | `CREATE TABLE IF NOT EXISTS seo_configs (...)` | D4 — remove after Phase B migration |

### 5.3 Brand DB Raw SQL (via brandPrisma — Phase D candidates)

Full inventory organized by module file. All use `brandPrisma.$queryRawUnsafe` or `brandPrisma.$executeRawUnsafe` with parameter binding.

#### Brand Products (`modules/brand/products/actions.ts`)

| ID | Line | SQL Pattern | Table | Op | Replacement | Category |
|----|------|------------|-------|----|-------------|----------|
| P-01 | 478 | `SELECT COUNT(*)::int as count FROM ${TABLE}` | products | R | `brandDb.legacyBrandProduct.count()` | D1 |
| P-02 | 479 | `SELECT COUNT(*)::int as count FROM series` | series | R | Separate query | D1 |
| P-03 | 480 | `SELECT COUNT(*)::int as count FROM journal_posts` | journal_posts | R | `brandDb.journalPost.count()` | D1 |
| P-04 | 502 | Dynamic SELECT with column whitelist | products | R | `brandDb.legacyBrandProduct.findMany()` | D2 |
| P-05 | 520 | ERP product query | products (ERP) | R | Keep `prisma` (ERP) | ERP |
| P-06 | 556-558 | Dynamic INSERT with Prisma.join | products | C | `brandDb.legacyBrandProduct.create()` | D2 |
| P-07 | 579 | `SELECT * FROM ${TABLE} WHERE id = $1::integer` | products | R | `brandDb.legacyBrandProduct.findUnique()` | D1 |
| P-08 | 583 | `SELECT * FROM ${TABLE} WHERE id = $1::integer` | products | R | D1 |
| P-09 | 600-604 | Dynamic UPDATE with Prisma.join | products | U | `brandDb.legacyBrandProduct.update()` | D2 |
| P-10 | 612-613 | Dynamic UPDATE (refresh) | products | U | D2 |
| P-11 | 642 | `SELECT * FROM ${TABLE} WHERE id = $1::integer` | products | R | D1 |
| P-12 | 645 | `DELETE FROM ${TABLE} WHERE id = $1::integer` | products | D | `brandDb.legacyBrandProduct.delete()` | D1 |
| P-13 | 663 | `SELECT * FROM ${TABLE} WHERE id = $1::integer` | products | R | D1 |
| P-14 | 670-692 | Sort order swap | products | U | D2 |
| P-15 | 447-472 | Type casting helpers (NULL::type, value::type) | — | Helper | D2 |
| P-16 | 281-322 | ERP media_references operations | media_references, media_assets (ERP) | R/W | Keep `prisma` | ERP |

#### Brand Series (`modules/brand/series/actions.ts`)

| ID | Line | SQL Pattern | Table | Op | Replacement |
|----|------|------------|-------|----|-------------|
| S-01 | 35 | Dynamic SELECT with column whitelist | series | R | `brandDb.legacyBrandSeries.findMany()` | D2 |
| S-02 | 49 | Dynamic INSERT | series | C | `brandDb.legacyBrandSeries.create()` | D2 |
| S-03 | 66 | `SELECT * FROM series WHERE id = $1` | series | R | `brandDb.legacyBrandSeries.findUnique()` | D1 |
| S-04 | 73 | Dynamic UPDATE | series | U | `brandDb.legacyBrandSeries.update()` | D2 |
| S-05 | 90 | `SELECT * FROM series WHERE id = $1` | series | R | D1 |
| S-06 | 93 | `DELETE FROM series WHERE id = $1` | series | D | `brandDb.legacyBrandSeries.delete()` | D1 |
| S-07 | 172 | `SELECT * FROM series WHERE id = $1` | series | R | D1 |
| S-08 | 174 | `UPDATE series SET is_active` | series | U | `brandDb.legacyBrandSeries.update()` | D1 |
| S-09 | 180-203 | Sort order swap | series | U | D2 |

#### Brand Journal (`modules/brand/journal/actions.ts`)

| ID | Line | SQL Pattern | Table | Op | Replacement |
|----|------|------------|-------|----|-------------|
| J-01 | 35 | Dynamic SELECT | journal_posts | R | `brandDb.journalPost.findMany()` | D2 |
| J-02 | 56 | Dynamic INSERT | journal_posts | C | `brandDb.journalPost.create()` | D2 |
| J-03 | 71 | `SELECT * FROM journal_posts WHERE id = $1` | journal_posts | R | D1 |
| J-04 | 78 | Dynamic UPDATE | journal_posts | U | D2 |
| J-05 | 93 | `SELECT * FROM journal_posts WHERE id = $1` | journal_posts | R | D1 |
| J-06 | 96 | `DELETE FROM journal_posts WHERE id = $1` | journal_posts | D | D1 |
| J-07 | 155-193 | SEO field query + publish status | journal_posts | R | D1 |
| J-08 | 219 | `SELECT * FROM journal_posts WHERE id = $1` | journal_posts | R | D1 |
| J-09 | 225-247 | Sort order swap | journal_posts | U | D2 |

#### Brand Banners (`modules/brand/banners/actions.ts`)

| ID | Line | SQL Pattern | Table | Op | Replacement |
|----|------|------------|-------|----|-------------|
| B-01 | 22 | Dynamic SELECT | banners | R | `brandDb.banner.findMany()` | D1 |
| B-02 | 30 | INSERT with RETURNING | banners | C | `brandDb.banner.create()` | D1 |
| B-03 | 48 | `SELECT * FROM banners WHERE id = $1` | banners | R | D1 |
| B-04 | 59 | Dynamic UPDATE | banners | U | `brandDb.banner.update()` | D1 |
| B-05 | 60 | `SELECT * FROM banners WHERE id = $1` | banners | R | D1 |
| B-06 | 69 | `SELECT * FROM banners WHERE id = $1` | banners | R | D1 |
| B-07 | 70 | `DELETE FROM banners WHERE id = $1` | banners | D | D1 |
| B-08 | 79 | Sort order reorder | banners | R | D2 |
| B-09 | 85-86 | Sort order swap | banners | U | D2 |
| B-10 | 97 | `SELECT * FROM banners WHERE id = $1` | banners | R | D1 |
| B-11 | 107 | `SELECT * FROM banners WHERE id = $1` | banners | R | D1 |

### 5.4 Context Ownership Violations (via `prisma` — must redirect to Brand DB)

| ID | File | Table | Current Client | Should Use | Risk | Action |
|----|------|-------|---------------|-------------|------|--------|
| V-01 | `brand/seo/actions.ts` | `seo_configs` | `prisma` (ERP) | `@yunwu/brand-db` | Data in wrong DB | D2 redirect |
| V-02 | `brand/settings/actions.ts` | `site_settings` | `prisma` (ERP) | `@yunwu/brand-db` | Data in wrong DB | D2 redirect |
| V-03 | `brand/home/actions.ts` | `page_contents` | `prisma` (ERP) | `@yunwu/brand-db` | Counts may be stale | D1 redirect |

### 5.5 Publisher Raw SQL (Phase E boundary)

List of tables accessed exclusively by Publisher. Not included in Phase D.

| Table | Operations | Owner |
|-------|-----------|-------|
| `content_versions` | INSERT, SELECT, version management | Phase E |
| `publish_jobs` | INSERT, UPDATE, scheduled polling | Phase E |
| `seo_snapshots` | INSERT, version management | Phase E |
| `products` | status transition (via `status` text column) | Phase E |
| `series` | status transition | Phase E |
| `journal_posts` | status transition (with PublishStatus CAST) | Phase E |
| `banners` | status transition | Phase E |
| `page_contents` | status transition | Phase E |

---

## 6. Typed Prisma Compatibility Matrix

### 6.1 Brand Runtime Models in Canonical Schema

| Canonical Model | Delegate Name | Table | Consumers in Platform | Typed Replaceable? |
|----------------|---------------|-------|----------------------|-------------------|
| `LegacyBrandProduct` | `legacyBrandProduct` | `products` | products/actions, series/actions, home/actions | ✅ Yes |
| `LegacyBrandSeries` | `legacyBrandSeries` | `series` | series/actions, products/actions, home/actions | ✅ Yes |
| `LegacyBrandMaterial` | `legacyBrandMaterial` | `materials` | materials/actions | ✅ Yes |
| `Banner` | `banner` | `banners` | banners/actions, home/actions | ✅ Yes |
| `JournalPost` | `journalPost` | `journal_posts` | journal/actions, home/actions, dashboard | ✅ Yes |
| `PageContent` | `pageContent` | `page_contents` | home/actions | ✅ Yes |
| `SeoConfig` | `seoConfig` | `seo_configs` | seo/actions | ✅ Yes |
| `SiteSetting` | `siteSetting` | `site_settings` | settings/actions | ✅ Yes |
| `Tag` | `tag` | `tags` | Not used in platform | ✅ Yes |
| `ProductTag` | `productTag` | `product_tags` | Not used in platform | ✅ Yes |
| `LegacyJournalTag` | `legacyJournalTag` | `journal_tags` | Not used in platform | ✅ Yes |
| `Media` | `media` | `media` | Not used in platform | ✅ N/A |
| `ContactLead` | `contactLead` | `contact_leads` | Not used in platform | ✅ N/A |
| `PublishJob` | `publishJob` | `publish_jobs` | Publisher (Phase E) | ✅ Yes (Phase E) |
| `ContentVersion` | `contentVersion` | `content_versions` | Publisher (Phase E) | ✅ Yes (Phase E) |
| `SeoSnapshot` | `seoSnapshot` | `seo_snapshots` | Publisher (Phase E) | ✅ Yes (Phase E) |
| `AdminUser` | `adminUser` | `admin_users` | Not used in platform | ✅ N/A |
| `AuditLog` | `auditLog` | `audit_logs` | Not used in platform | ✅ N/A |
| `LegacyBrandMaterialLink` | `legacyBrandMaterialLink` | `brand_materials` | materials/actions | ⚠️ D2 |
| `LegacyBrandProductContent` | `legacyBrandProductContent` | `brand_product_content` | Not used in platform | ✅ N/A |
| `LegacyProductMaterial` | `legacyProductMaterial` | `product_materials` | Not used in platform | ✅ N/A |
| `LegacyOrder` | `legacyOrder` | `orders` | Not used in platform | ✅ N/A |

### 6.2 Field Compatibility Notes

| Field | Raw SQL Usage | Canonical Type | Compatible? |
|-------|---------------|----------------|-------------|
| `products.status` | Text with CHECK values | `String @default("draft")` | ✅ Yes |
| `products.publish_status` | CAST as `"PublishStatus"` enum | `PublishStatus` enum (6 values) | ✅ Yes (ADR-001) |
| `products.companions_count` | `companions_count` column | `Int @default(0)` | ✅ Yes |
| `products.remaining_qty` | `remaining_qty` column | `Int?` | ✅ Yes |
| `products.erp_product_id` | `erp_product_id` column | `Int? @unique` | ✅ Yes |
| `series.status` | Text CHECK | `String? @default("DRAFT")` | ✅ Yes |
| `banners.status` | Free text | `String? @default("DRAFT")` | ✅ Yes |
| `journal_posts.status` | PublishStatus | `PublishStatus @default(DRAFT)` | ✅ Yes |

### 6.3 Dynamic Column Challenge

The Brand Products and Brand Series modules use dynamic column lists:

```typescript
// products/actions.ts — dynamic column whitelist
const PRODUCT_CREATE_FIELDS = ["sku", "name", "slug", "series_id", ...];
const sql = `INSERT INTO products (${cols}) VALUES (${placeholders}) RETURNING *`;
```

This pattern requires careful translation to typed Prisma. Each column/field mapping must be verified. This is the primary D2 complexity.

---

## 7. ERP / Brand Mixed-Context Files

### 7.1 Mixed-Context File Analysis

| File | Brand Operations | ERP Operations | Separation Strategy |
|------|-----------------|----------------|-------------------|
| `brand/products/actions.ts` | `brandPrisma` Read/write `products`, `series` | `prisma` Read ERP `products`, `product_skus`, `media_assets` | Split into two sections. Keep ERP on `prisma`. Migrate Brand to `brandDb` |
| `brand/home/actions.ts` | `brandPrisma` Counts `products`, `series`, `journal_posts`, `banners` | `prisma` (ERP violation) Read `page_contents` | Migrate Brand counts to `brandDb`. Redirect `page_contents` to `brandDb` |
| `brand/materials/actions.ts` | `brandPrisma` CRUD `brand_materials` | `prisma` Read `materials` (unused old table?) | Migrate to `brandDb` |

### 7.2 The `products` Name Collision

Both ERP DB and Brand DB have a `products` table:
- **ERP DB:** `ErpProduct → @@map("products")` — ERP product master
- **Brand DB:** `LegacyBrandProduct → @@map("products")` — Brand product content

The `brand/products/actions.ts` file imports both clients and uses:
- `brandPrisma` to access Brand's `products` table (Brand DB)
- `prisma` to access ERP's `products` table (ERP DB, same table name!)

After migration:
- Brand operations → `brandDb.legacyBrandProduct`
- ERP operations → `prisma.erpProduct` (stays as-is)

The model name distinction (`legacyBrandProduct` vs `erpProduct`) eliminates the ambiguity.

---

## 8. Transaction Audit

### 8.1 Transaction Usage

| Type | Count | Locations |
|------|-------|-----------|
| `prisma.$transaction([...])` | 0 | — |
| Interactive `$transaction` | 0 | — |
| Raw SQL `BEGIN`/`COMMIT` | 0 | — |
| Cross-database transaction assumption | 0 | — |

**No transactions found in any brand module. No cross-database transaction risk.**

### 8.2 Audit Log Exception

The audit module (`lib/audit.ts`) writes to the ERP `audit_logs` table using `prisma` (ERP client). This is called by brand modules after brand operations. This is NOT a cross-database transaction — each operation is a separate statement, not wrapped in a transaction.

---

## 9. Publisher Boundary

### 9.1 Phase E Boundary List

The following files and functions are EXCLUDED from Phase D and reserved for Phase E:

| File | Functions | Reason |
|------|-----------|--------|
| `lib/publisher.ts` | ALL (transitionStatus, createVersion, rollbackToVersion, schedulePublish, processScheduledPublish, generatePreviewToken, publishNow, submitForReview, approveContent, rejectContent, archiveContent, unpublishContent) | Publisher state machine + status mapping |
| `brand/products/actions.ts` | `transitionStatus` calls, `publishNow`, `submitForReview`, `approveContent`, `rejectContent` | Delegates to Publisher |
| `brand/series/actions.ts` | `publishNow`, `schedulePublish`, `unpublishContent`, `archiveContent` | Delegates to Publisher |
| `brand/journal/actions.ts` | `submitForReview`, `approveContent`, `rejectContent`, `publishNow`, `schedulePublish`, `unpublishContent`, `archiveContent` | Delegates to Publisher |
| `brand/banners/actions.ts` | `transitionStatus` calls directly | Publisher dependency |
| `brand/home/actions.ts` | `publishNow`, `schedulePublish`, `unpublishContent` | Publisher dependency |

### 9.2 Publisher Status Cast Risks

The Publisher performs:
```typescript
CAST($1 AS "PublishStatus")  // line 258 — fails for IN_REVIEW, SCHEDULED, REJECTED
```

This is a known P0 issue documented in ADR-001. It is a Phase E concern, not Phase D.

### 9.3 Phase D Must NOT Modify

The following are explicitly prohibited from Phase D changes:

- `lib/publisher.ts` — entire file
- Publisher delegate calls in brand modules (transitionStatus, publishNow, etc.)
- Any CAST to `"PublishStatus"` in raw SQL
- Any `publish_jobs`, `content_versions`, `seo_snapshots` table access
- Status transition logic of any kind

---

## 10. D1–D5 Migration Classification

### 10.1 Classification Counts

| Category | Count | Definition |
|----------|-------|------------|
| **D1** — Direct Typed Migration | ~70 | Simple CRUD replacements, no logic changes |
| **D2** — With Local Refactor | ~25 | Dynamic column lists, sort order, casting helpers |
| **D3** — Raw SQL Retained | ~5 | JSON aggregation, CREATE TABLE IF NOT EXISTS |
| **D4** — Defer to Phase E | ~20 | Publisher-only operations |
| **D5** — Architecture Decision Needed | 0 | No cross-context transactions or unclear ownership |

### 10.2 D1 Candidates (Simple Replacement)

These are straightforward findMany/findUnique/create/update/delete replacements:

| Module | D1 Statements | Pattern |
|--------|--------------|---------|
| Brand Products | ~15 | Simple SELECT/INSERT/UPDATE/DELETE with parameter binding |
| Brand Series | ~8 | Simple CRUD |
| Brand Journal | ~8 | Simple CRUD |
| Brand Banners | ~8 | Simple CRUD |
| Brand Home | ~5 | Simple COUNT queries |
| Brand SEO | ~2 | Simple read/write |
| Brand Settings | ~2 | Simple read/write |
| Brand Materials | ~5 | Simple CRUD |

### 10.3 D2 Candidates (Need Refactor)

| Module | D2 Statements | Challenge |
|--------|--------------|-----------|
| Brand Products | ~10 | Dynamic column INSERT/UPDATE with whitelist. Sort order swap. Type casting helpers. |
| Brand Series | ~4 | Dynamic column INSERT/UPDATE. Sort order swap. |
| Brand Journal | ~4 | Dynamic column INSERT/UPDATE. Sort order swap. |
| Brand Banners | ~2 | Sort order swap |
| Brand Materials | ~2 | Dynamic column handling |

### 10.4 D3 Candidates (Raw SQL Retained)

| ID | File | SQL | Reason to Retain |
|----|------|-----|------------------|
| D3-01 | `brand/products/actions.ts` | Dynamic INSERT/UPDATE with column whitelist | Could convert to typed, but the dynamic nature maps to optional fields in create/update. D2 technically, but if any field mapping is unclear, retain temporarily. |
| D3-02 | `brand/products/actions.ts` | Type casting helpers (`sqlValue`, `sqlNullForColumn`) | These are utility functions for the dynamic SQL. If dynamic SQL is retained, helpers stay. If migration happens, they're deleted. |

In practice, all D3-identified statements can be handled as D2 after adding proper type mappings. No statement strictly requires raw SQL.

### 10.5 D4 — Publisher (Phase E)

All 20 Publisher statements deferred to Phase E.

---

## 11. P0 / P1 / P2 Risks

### P0: Critical

| ID | File | Risk | Status |
|----|------|------|--------|
| P0-01 | — | Cross-database transaction assumption | ✅ **None found** |
| P0-02 | — | DATABASE_URL / BRAND_DATABASE_URL confusion | ✅ **No fallback chains** |
| P0-03 | — | SQL injection via user input | ✅ **All raw SQL uses parameterized queries** |
| P0-04 | — | Client Component imports Prisma Client | ✅ **All DB access is in Server Actions** |
| P0-05 | `lib/publisher.ts:258` | CAST non-enum value as PublishStatus | 🔴 **KNOWN — Phase E only** |
| **Total P0** | | | **0 within Phase D scope** |

### P1: High

| ID | File | Risk | Phase D? |
|----|------|------|----------|
| P1-01 | `brand/seo/actions.ts` | SEO data written to ERP DB instead of Brand DB (context ownership violation) | ✅ D2 |
| P1-02 | `brand/settings/actions.ts` | Site settings written to ERP DB instead of Brand DB (context ownership violation) | ✅ D2 |
| P1-03 | `brand/products/actions.ts` | Dynamic column INSERT bypasses typed model validation | ✅ D2 |
| P1-04 | All brand modules | `brandPrisma` from `@yunwu/db/brand` is a legacy helper with no typed models — any schema drift causes runtime errors | ✅ D1-D2 |
| P1-05 | All brand modules | Result type `any[]` from raw SQL — no compile-time type safety | ✅ D1-D2 |
| **Total P1** | | | **5 within Phase D scope** |

### P2: Medium

| ID | File | Risk | Phase D? |
|----|------|------|----------|
| P2-01 | `brand/products/actions.ts` | Hardcoded table name `products` — ambiguity between Brand and ERP tables | ✅ D2 |
| P2-02 | `brand/home/actions.ts` | Uses `prisma` (ERP) for `page_contents` queries | ✅ D1 |
| P2-03 | `brand/materials/actions.ts` | Accesses both `materials` and `brand_materials` — unclear legacy | ✅ D2 |
| P2-04 | `brand/media/actions.ts` | Mixed typing — raw SQL with `$queryRaw` + typed `erpMediaAsset` | ❌ Not Phase D (ERP-owned) |
| P2-05 | Module index | `modules/brand/shared/gateway.ts` exists but is underutilized | ✅ D5 (deprecate) |
| **Total P2** | | | **3 within Phase D scope** |

---

## 12. Recommended Platform Brand Adapter

### 12.1 Decision: Create Platform-Level Brand Adapter

**File path:** `apps/platform/lib/brand-db.ts`

**Design:**

```typescript
// apps/platform/lib/brand-db.ts
// Platform Brand Runtime database adapter.
// Reuses @yunwu/brand-db's singleton brandDb proxy.
// Applications must NOT create their own PrismaClient instances.

import { brandDb, getBrandDb, createBrandDb } from "@yunwu/brand-db";

export { brandDb, getBrandDb, createBrandDb };

// Re-export types and enums needed by platform consumers
export type {
  LegacyBrandProduct,
  LegacyBrandSeries,
  LegacyBrandMaterial,
  Banner,
  JournalPost,
  PageContent,
  SeoConfig,
  SiteSetting,
  // ... other needed types
} from "@yunwu/brand-db";

export {
  PublishStatus,
  ObjectCategory,
  JournalCategory,
  // ... other needed enums
} from "@yunwu/brand-db";

// Platform-specific helpers can be added here as needed
```

### 12.2 Rules

| Rule | Enforcement |
|------|-------------|
| ✅ Reuses `@yunwu/brand-db`'s singleton | No second PrismaClient lifecycle |
| ✅ Fail-closed on missing BRAND_DATABASE_URL | Inherited from `brandDb` proxy |
| ✅ Lazy initialization | Inherited from `getBrandDb()` |
| ✅ HOT-reload safe | globalThis singleton |
| ❌ No `new PrismaClient()` in platform | Prevented by not exporting PrismaClient constructor |
| ❌ No `@yunwu/brand-db` scattered imports | All platform brand consumers must use this adapter |
| ❌ No `@yunwu/db/brand` legacy imports | Deprecated — all brand operations migrate to this adapter |

### 12.3 Naming Convention

| Variable | Client | Database |
|----------|--------|----------|
| `prisma` (from `@yunwu/db`) | ERP Prisma Client | ERP DB (DATABASE_URL) |
| `brandDb` (from adapter) | Brand Prisma Client | Brand DB (BRAND_DATABASE_URL) |

**Files that use `prisma` must NOT access Brand Runtime tables.**
**Files that use `brandDb` must NOT access ERP tables.**

The only exception is `brand/products/actions.ts` which legitimately accesses both. This file must explicitly use both `prisma` (for ERP) and `brandDb` (for Brand) with clear section separation.

### 12.4 Raw SQL via brandDb

When raw SQL must be retained (D3), it must:
- Use `brandDb.$queryRaw` (not `$queryRawUnsafe`) with `Prisma.sql` template literals
- Use parameterized queries exclusively
- Define explicit result types (not `any[]`)
- Be wrapped in a function with a typed return

---

## 13. Raw SQL Retention Contract

### 13.1 Permitted Raw SQL

| Allowed? | Pattern | Restriction |
|----------|---------|-------------|
| ✅ Yes | `brandDb.$queryRaw(Prisma.sql'...')` | Must use Prisma.sql template, not string interpolation |
| ✅ Yes | `brandDb.$queryRawUnsafe` | Only for dynamic column queries that cannot use Prisma.sql |
| ❌ No | `${userInput}` in SQL string | Must use parameter binding `$1`, `$2` |
| ❌ No | `any[]` result type | Must define typed return |
| ❌ No | `CREATE TABLE` | Should never be needed after Phase B migration |
| ❌ No | Direct `pg` / `Pool` / `Client` | Must always go through brandDb |

### 13.2 Migration Path

Each retained raw SQL must have:
1. A comment explaining why typed Prisma cannot express it
2. An explicit typed result interface
3. A reference to a future Phase to revisit

---

## 14. Import and Naming Rules

### 14.1 Import Rules (Phase D target state)

| ✅ Allowed | ❌ Forbidden |
|-----------|-------------|
| `import { brandDb } from "@/lib/brand-db"` | `import { brandPrisma } from "@yunwu/db/brand"` |
| `import { prisma } from "@yunwu/db"` (ERP only) | `import { prisma } from "@yunwu/db"` for Brand tables |
| `import { Prisma } from "@prisma/client"` (ERP only) | `import { PrismaClient } from "@prisma/client"` |
| `import { brandDb } from "@/lib/brand-db"` with `$queryRaw` | `import { brandPrisma } from "@yunwu/db/brand"` |

### 14.2 Variable Naming

| Context | Variable | Example |
|---------|----------|---------|
| ERP operations | `prisma` | `prisma.erpProduct.findMany()` |
| Brand operations | `brandDb` | `brandDb.legacyBrandProduct.findMany()` |
| Mixed file (brand/products) | Both | `brandDb` for Brand, `prisma` for ERP |

---

## 15. Recommended Phase D Subphases

### Phase D1: Adapter + Low-Risk Read Migrations

**Scope:**
1. Create `apps/platform/lib/brand-db.ts` adapter
2. Add `@yunwu/brand-db` to `apps/platform/package.json`
3. D1 migrations: Convert simple COUNT queries and SELECT queries to typed `brandDb`
4. Files: `brand/home/actions.ts` (counts), `brand/banners/actions.ts` (simple reads)
5. Verify: `pnpm typecheck`, `pnpm build`

**Risk:** 🟢 Low — read-only changes, no write path modification
**Estimated:** ~20 min Codex time

### Phase D2: Write Path Migrations + Dynamic SQL

**Scope:**
1. D2 migrations: Convert CRUD operations to typed `brandDb`
2. Files: `brand/products/actions.ts`, `brand/series/actions.ts`, `brand/journal/actions.ts`, `brand/banners/actions.ts`, `brand/materials/actions.ts`
3. Handle dynamic column INSERT/UPDATE patterns
4. Redirect context ownership violations (SEO, Settings → `brandDb`)
5. Handle sort order swap patterns

**Risk:** 🟡 Medium — write paths must preserve column-level accuracy
**Estimated:** ~60 min Codex time

### Phase D3: Remaining Brand Consumers

**Scope:**
1. Migrate `brand/dashboard/actions.ts` Brand counts
2. Migrate `app/(platform)/brand/page.tsx` Brand counts
3. Migrate `settings/system/actions.ts` Brand counts

**Risk:** 🟢 Low — read-only, simple replacements
**Estimated:** ~15 min Codex time

### Phase D4: Deprecate Legacy Helper

**Scope:**
1. Update `brand/seo/actions.ts` — remove CREATE TABLE IF NOT EXISTS (Brand DB already has the table)
2. Remove all `import { brandPrisma } from "@yunwu/db/brand"` — replace with `brandDb` from adapter
3. Verify no remaining usage of legacy `@yunwu/db/brand` in platform
4. Update Contract Guard to detect legacy Brand helper imports in platform

**Risk:** 🟡 Medium — must ensure no dangling references
**Estimated:** ~15 min Codex time

### Phase D5 (Deferred): SEO/Settings Data Reconciliation

**Scope (Phase G or separate):**
1. Audit whether `seo_configs` and `site_settings` data exists in both ERP DB and Brand DB
2. Consolidate to Brand DB as authoritative source
3. Remove from ERP schema if confirmed

**Risk:** 🟢 Low — data audit only
**Estimated:** Not in Phase D scope

---

## 16. File-by-File Migration Order

| Order | File | D# | Current Client | Target Client | Changes | Risk |
|-------|------|-----|---------------|---------------|---------|------|
| D1-1 | `lib/brand-db.ts` | D1 | — | **CREATE** | New adapter file | 🟢 |
| D1-2 | `package.json` | D1 | — | Add `@yunwu/brand-db` | 1 line | 🟢 |
| D1-3 | `brand/home/actions.ts` | D1 | `brandPrisma` + `prisma` | `brandDb` | ~8 COUNT queries → typed | 🟢 |
| D1-4 | `brand/banners/actions.ts` | D1 | `brandPrisma` | `brandDb` | ~6 simple queries | 🟢 |
| D2-1 | `brand/banners/actions.ts` | D2 | `brandPrisma` | `brandDb` | ~4 write CRUD + sort order | 🟡 |
| D2-2 | `brand/series/actions.ts` | D2 | `brandPrisma` | `brandDb` | ~15 queries, dynamic INSERT/UPDATE | 🟡 |
| D2-3 | `brand/journal/actions.ts` | D2 | `brandPrisma` | `brandDb` | ~15 queries, dynamic INSERT/UPDATE | 🟡 |
| D2-4 | `brand/materials/actions.ts` | D2 | `brandPrisma` + `prisma` | `brandDb` | ~10 queries | 🟡 |
| D2-5 | `brand/products/actions.ts` (Brand part) | D2 | `brandPrisma` | `brandDb` | ~25 queries, dynamic columns | 🟡 |
| D2-6 | `brand/seo/actions.ts` | D2 | `prisma` (ERP violation) | `brandDb` | ~5 queries, context ownership fix | 🟡 |
| D2-7 | `brand/settings/actions.ts` | D2 | `prisma` (ERP violation) | `brandDb` | ~5 queries, context ownership fix | 🟡 |
| D3-1 | `app/(platform)/brand/page.tsx` | D3 | `brandPrisma` + `prisma` | `brandDb` | ~12 COUNT queries | 🟢 |
| D3-2 | `modules/dashboard/actions.ts` | D3 | `brandPrisma` | `brandDb` | ~5 Brand COUNT queries | 🟢 |
| D3-3 | `modules/settings/system/actions.ts` | D3 | `brandPrisma` | `brandDb` | ~3 Brand COUNT queries | 🟢 |
| D4-1 | `modules/brand/index.ts` | D4 | — | Cleanup if needed | Remove dead references | 🟢 |

---

## 17. Validation Plan

| # | Check | Phase | Method |
|---|-------|-------|--------|
| 1 | Brand-db generate succeeds | D1 | `pnpm --filter @yunwu/brand-db prisma:generate` |
| 2 | Platform typecheck (adapter only) | D1 | `pnpm typecheck` |
| 3 | All D1 consumers typecheck | D1 | `pnpm typecheck` |
| 4 | All D2 consumers typecheck | D2 | `pnpm typecheck` |
| 5 | Platform build | D2 | `pnpm build` (platform-app) |
| 6 | No remaining `@yunwu/db/brand` imports | D4 | `grep -r "@yunwu/db/brand" apps/platform/` |
| 7 | No remaining `brandPrisma` references | D4 | `grep -r "brandPrisma" apps/platform/` |
| 8 | No DATABASE_URL fallback in brand modules | D4 | Static search |
| 9 | No Client Component Prisma import | D1-D4 | Manual review |
| 10 | Contract Guard updates | D4 | Guard tests pass |
| 11 | Publisher file unchanged | D1-D4 | `git diff lib/publisher.ts` = empty |

### Build Requirements

| Requirement | Value |
|-------------|-------|
| `BRAND_DATABASE_URL` for generate | ✅ Placeholder with `connect_timeout=1` — no real connection |
| Database write? | ❌ No |
| Database read? | ❌ No |
| Deploy? | ❌ No |

---

## 18. Rollback Plan

| Phase | Rollback | Impact |
|-------|----------|--------|
| D1 | `git revert` | Adapter removed, simple queries revert to raw SQL |
| D2 | `git revert` | All CRUD operations revert to raw SQL |
| D3 | `git revert` | Count queries revert |
| D4 | `git revert` | Legacy import guard removed |
| Any | `pnpm install && pnpm build` | Full restore |

---

## 19. Explicit Out-of-Scope List

| Item | Belongs To |
|------|-----------|
| Publisher state machine (`lib/publisher.ts`) | Phase E |
| Status mapping (IN_REVIEW, SCHEDULED, REJECTED) | Phase E |
| PublishJob / ContentVersion / SeoSnapshot migration | Phase E |
| ERP module migration | Never (ERP stays on @yunwu/db) |
| Brand media (`modules/brand/media/`) | Not Phase D — correct ERP ownership |
| Product OS fabric layer | Phase F/G |
| `brand_products` / `brand_series` data migration | Phase G |
| Frozen schema deletion | Phase H |
| Storefront repository | Separate |
| Database migration of any kind | Never in architecture cleanup |
| Data reconciliation (SEO/Settings dual DB) | Phase G |

---

## 20. Minimal Codex Scope for First Implementation Step

### Phase D1 Only

**Files to create:**
- `apps/platform/lib/brand-db.ts` — adapter

**Files to modify:**
- `apps/platform/package.json` — add `@yunwu/brand-db: "workspace:*"`

**Files to migrate:**
- `apps/platform/modules/brand/home/actions.ts` — simple COUNT queries to typed
- `apps/platform/modules/brand/banners/actions.ts` — simple queries to typed

**Validation:**
- `pnpm install` ✅
- `pnpm --filter @yunwu/brand-db prisma:generate` ✅
- `pnpm typecheck` ✅
- `pnpm build` (platform-app) ✅

**Not in scope:**
- Dynamic column INSERT/UPDATE (D2)
- Context ownership violations (D2)
- SEO/Settings migration (D2)
- Legacy helper removal (D4)
- Publisher (Phase E)

---

## Required Questions — Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Brand DB production consumers in apps/platform | **8 primary** (brand modules) + **3 secondary** (dashboard, brand page, system settings) = **10 files** total |
| 2 | Brand Raw SQL total | **~120 statements** across all brand consumers |
| 3 | D1 — Direct Typed Migration | **~70 statements** (simple CRUD + COUNT queries) |
| 4 | D2 — With Local Refactor | **~25 statements** (dynamic columns, sort order, casting helpers) |
| 5 | D3 — Raw SQL Retained | **~5 statements** (potentially zero — all can be migrated to typed with refactoring) |
| 6 | D4 — Phase E Publisher | **~20 statements** (`publisher.ts` content) |
| 7 | New ADR needed | **0** — ADR-001 through ADR-004 cover all architectural decisions needed |
| 8 | Cross-ERP/Brand transactions | **0** — no transaction usage found |
| 9 | Wrong datasource usage | **3 files** — SEO, Settings, Home use `prisma` (ERP) for Brand tables |
| 10 | SQL injection risk | **0** — all queries use parameterized bindings |
| 11 | Client Component DB import | **0** — all DB access in Server Components/Server Actions |
| 12 | Platform Brand Adapter needed | **YES** — `apps/platform/lib/brand-db.ts` |
| 13 | Direct import swap possible? | **YES** for most — the legacy `brandPrisma` from `@yunwu/db/brand` is a generic `PrismaClient` with no typed models, so switching to `brandDb` from the adapter is a drop-in replacement at the import level |
| 14 | Recommended Phase D subphases | **D1→D2→D3→D4** (4 subphases, Publisher excluded) |
| 15 | First Codex scope | **Phase D1** — adapter + low-risk read migrations |

---

## Final Status

```
PHASE D ARCHITECTURE REVIEW COMPLETE — MINIMAL IMPLEMENTATION PLAN READY

Audit conclusion:    LOW-COMPLEXITY MIGRATION — 0 P0, 5 P1, 3 P2 (within Phase D scope)
Brand DB consumers:  10 files across platform
Raw SQL statements:  ~120 total (~70 D1, ~25 D2, ~5 D3, ~20 D4/Phase E)
Cross-DB transactions: 0 (none)
Context violations:    3 (SEO, Settings, Home — ERP client used for Brand tables)
New ADR needed:        0 (ADR-001 through ADR-004 cover all)
Adapter recommended:   YES — apps/platform/lib/brand-db.ts
Publisher excluded:    YES — lib/publisher.ts is Phase E boundary

Phase D1:    Create adapter + migrate simple reads        (~20 min Codex)
Phase D2:    Migrate write paths + fix context violations (~60 min Codex)
Phase D3:    Remaining brand consumers                    (~15 min Codex)
Phase D4:    Deprecate legacy brand helper                (~15 min Codex)
```
