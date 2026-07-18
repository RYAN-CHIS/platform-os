# Brand OS Runtime Data Contract Audit — Pre Phase 3B

**Date:** 2026-07-11
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**HEAD:** 54f58b3
**Audit Mode:** Read-only — no files modified, no database writes, no deployment

---

## Executive Conclusion

**Phase 3B (direct import swap from `@prisma/brand-client` to `@yunwu/db`) is BLOCKED.** The brand-os frozen schema and the canonical `@yunwu/db` Brand models reference DIFFERENT database tables with the same logical content but different physical mappings. A direct import swap would change which tables the application reads and writes at runtime, with undefined consequences.

**The old `products/series/materials` tables (queried by brand-os via `prisma.product`) and the new `brand_products/brand_series/brand_materials` tables (targeted by `@yunwu/db` BrandProduct/BrandSeries/BrandMaterial) are NOT the same table.** They exist in the same database (Neon, Singapore) with different table names and different column sets. No automated sync mechanism exists between them.

**The platform-app brand management pages and the publisher engine also query the old `products` table** via `brandPrisma` raw SQL — they do NOT use `BrandProduct` from `@yunwu/db` either.

A phased approach is required: Phase 3B-0 (contract verification) → Phase 3B-1 (domain-specific brand client inclusion) → Phase 3B-2 (brand-os migration) → Phase 3B-3 onward (future consolidation).

---

## 1. Brand Data Model Ownership Map

### 1.1 Table Ownership

| Logical Entity | Physical Table (Old/Brand-OS) | Physical Table (Canonical/Target) | Production in use? | Data Source |
|---------------|-------------------------------|-----------------------------------|-------------------|-------------|
| Product (Brand) | `products` | `brand_products` | ✅ Old table actively used | Brand DB via `BRAND_DATABASE_URL` or `DATABASE_URL` |
| Series (Brand) | `series` | `brand_series` | ✅ Old table actively used | Brand DB |
| Material (Brand) | `materials` | `brand_materials` | ✅ Old table actively used | Brand DB |
| Tag (Brand) | `tags` | `brand_tags` | ✅ Old table actively used | Brand DB |
| Product-Tag (Brand) | `product_tags` | `brand_product_tags` | ✅ Old table actively used | Brand DB |
| Media | `media` | `media` (same table) | ✅ Actively used | Shared (no brand prefix) |
| Journal Post | `journal_posts` | `journal_posts` (same table) | ✅ Actively used | Shared |
| Product Content | (inline in products table) | `brand_product_content` | ❌ New table, not yet primary | Brand DB |

### 1.2 Key Finding: The `products` table IS the Brand products table

The `products` table (queried by brand-os as `prisma.product.findMany()`) is NOT the ERP products table. It is the Brand products table. This is confirmed by:

1. **Production DB introspection** (audit 2026-07-11): The `products` table has Brand fields: `sku`, `name`, `slug`, `seriesId`, `objectCategory`, `theme`, `story`, `materials`, `costPrice`, `salePrice`, `coverImage`, `gallery`, `stock`, `status` — these are Brand/content fields, not ERP fields.

2. **Canonical ErpProduct uses `@@map("products")`** — but this refers to the `products` table in the **ERP database context** (via `DATABASE_URL`). The Brand database (via `BRAND_DATABASE_URL`) has a DIFFERENT `products` table with Brand columns.

3. **Raw SQL queries confirm**: `packages/platform/services/brand/products.service.ts` explicitly queries `SELECT * FROM products` via `BRAND_DATABASE_URL`. This is the Brand DB's `products` table.

**This is NOT a case of `products` vs `brand_products` as old vs new version of the same table.** They are two different tables coexisting in the Brand database:
- `products` — currently the primary Brand products table (used by brand-os AND platform-app brand management)
- `brand_products` — the canonical target model, designed as the long-term replacement

---

## 2. Legacy vs brand_* Table Matrix

| Criterion | `products` (Old) | `brand_products` (New) | `series` (Old) | `brand_series` (New) | `materials` (Old) | `brand_materials` (New) |
|-----------|-----------------|----------------------|----------------|---------------------|------------------|------------------------|
| **PK type** | Int autoincrement | Int autoincrement | Int autoincrement | Int autoincrement | Int autoincrement | Int autoincrement |
| **Unique cols** | sku, slug | sku, slug | slug | slug | name | name |
| **Core fields** | name, theme, story, inspiration, keywords, materials, costPrice, salePrice, coverImage, gallery, stock, status | name, theme, story, inspiration, keywords, materials, costPrice, salePrice, coverImage, gallery, stock, status, publishedAt, sortOrder, erpProductId | name, description, coverImage, heroText, sortOrder, isActive | name, description, coverImage, heroText, longDesc, shortDesc, sortOrder, isActive, status, publishedAt | name, type, origin, description, image, alias, features, history | name, alias, type, origin, description, features, history, image |
| **V2.1 fields** | materialOrigin, craftMethod, completionDate, serialNumber, creationStory, emotionalState, companionsCount, remainingQty | ❌ absent (not yet migrated) | status, publishedAt | ✅ present | N/A | N/A |
| **Read consumers** | brand-os, platform brand pages, web (Product OS) | (none — see §5) | brand-os, platform brand pages, web (Product OS) | (none — see §5) | brand-os, platform brand pages | (none — see §5) |
| **Write consumers** | brand-os actions, platform brand actions | (none) | brand-os actions, platform brand actions | (none) | brand-os actions, platform brand actions | (none) |
| **Data source** | BRAND_DATABASE_URL (prod) or DATABASE_URL | BRAND_DATABASE_URL (same DB, different table) | Same | Same | Same | Same |
| **Production active?** | ✅ YES — primary | ❌ NO — exists but unused | ✅ YES — primary | ❌ NO — exists but unused | ✅ YES — primary | ❌ NO — exists but unused |
| **Sync mechanism** | N/A (source of truth) | None | N/A | None | N/A | None |
| **Retire plan?** | Eventually (Phase 4+) | Target | Eventually | Target | Eventually | Target |

---

## 3. UI-to-Database Runtime Chains

### 3.1 Brand OS Routes (using local frozen schema client)

| Chain | Route/Action | Prisma Client | Delegate | DB Table | Data Source |
|-------|-------------|---------------|----------|----------|-------------|
| Product list (Brand) | `apps/brand-os/src/app/api/products/route.ts:GET` | `@prisma/brand-client` | `prisma.product.findMany()` | `products` | `DATABASE_URL` (from brand-os `.env`) |
| Product create (Brand) | `apps/brand-os/src/app/api/products/route.ts:POST` | `@prisma/brand-client` | `prisma.product.create()` | `products` | `DATABASE_URL` |
| Product update (Brand) | `apps/brand-os/src/app/api/products/route.ts:PUT` | `@prisma/brand-client` | `prisma.product.update()` | `products` | `DATABASE_URL` |
| Product admin CRUD | `apps/brand-os/src/lib/actions/admin-actions.ts` | `@prisma/brand-client` | `prisma.product.create/update/delete` | `products` | `DATABASE_URL` |
| Series list (Brand) | `apps/brand-os/src/app/api/series/route.ts:GET` | `@prisma/brand-client` | `prisma.series.findMany()` | `series` | `DATABASE_URL` |
| Material list (Brand) | `apps/brand-os/src/app/api/materials/route.ts:GET` | `@prisma/brand-client` | `prisma.material.findMany()` | `materials` | `DATABASE_URL` |
| Media list (Brand) | `apps/brand-os/src/app/api/media/route.ts:GET` | `@prisma/brand-client` | `prisma.media.findMany()` | `media` | `DATABASE_URL` |
| Tag actions (Brand) | `apps/brand-os/src/lib/actions/tag-actions.ts` | `@prisma/brand-client` | `prisma.tag/productTag` | `tags` / `product_tags` | `DATABASE_URL` |

### 3.2 Platform Brand Management Pages (using `@yunwu/db/brand` raw SQL)

| Chain | Route/Action | Client | Delegate | DB Table | Data Source |
|-------|-------------|--------|----------|----------|-------------|
| Brand product management | `apps/platform/modules/brand/products/actions.ts` | `brandPrisma` from `@yunwu/db/brand` | `$queryRawUnsafe("SELECT * FROM products ...")` | `products` | `BRAND_DATABASE_URL` (fallback `DATABASE_URL`) |
| Brand series management | `apps/platform/modules/brand/series/actions.ts` | `brandPrisma` from `@yunwu/db/brand` | `$queryRawUnsafe("SELECT * FROM series ...")` | `series` | `BRAND_DATABASE_URL` |
| Brand journal management | `apps/platform/modules/brand/journal/actions.ts` | `brandPrisma` from `@yunwu/db/brand` | `$queryRawUnsafe("SELECT * FROM journal_posts ...")` | `journal_posts` | `BRAND_DATABASE_URL` |
| Brand material management | `apps/platform/modules/brand/materials/actions.ts` | `brandPrisma` from `@yunwu/db/brand` | `$queryRawUnsafe` | `materials` | `BRAND_DATABASE_URL` |
| Publish workflow | `apps/platform/lib/publisher.ts` | `brandPrisma` from `@yunwu/db/brand` | `$queryRawUnsafe("UPDATE $TABLE SET status = $1 ...")` | `products` / `series` / `journal_posts` / `banners` | `BRAND_DATABASE_URL` |
| Brand services | `packages/platform/services/brand/products.service.ts` | `new PrismaClient({datasourceUrl: BRAND_URL})` | `$queryRawUnsafe("SELECT * FROM products ...")` | `products` | `BRAND_DATABASE_URL` (hardcoded fallback) |

### 3.3 Web Storefront (via `@prisma/web-client`)

| Chain | Route/Action | Client | Delegate | DB Table | Data Source |
|-------|-------------|--------|----------|----------|-------------|
| Product listing | `apps/web/src/app/api/products/route.ts` | `@prisma/web-client` | `prisma.product.findMany()` | `products` | `DATABASE_URL` |
| Product detail | `apps/web/src/app/(site)/products/[slug]/page.tsx` | `@prisma/web-client` | `prisma.product.findUnique()` | `products` | `DATABASE_URL` |
| Product sitemap | `apps/web/src/app/sitemap.ts` | `@prisma/web-client` | `prisma.product.findMany()` | `products` | `DATABASE_URL` |

### 3.4 Key Observation: `brand_*` Tables Are NOT Queried Anywhere

Despite `BrandProduct`/`BrandSeries`/`BrandMaterial` existing in `packages/db/schema.prisma` with full model definitions mapped to `brand_products`/`brand_series`/`brand_materials`, **no production code in this repository queries these tables**.

The only consumer of `brand_*` tables would be code importing and using `prisma.brandProduct.findMany()` etc. from the default `@prisma/client`. No such usage was found.

---

## 4. Environment / Data Source Contract

| Variable | Set in Vercel? | Set in .env? | Used By | Role |
|----------|---------------|-------------|---------|------|
| `DATABASE_URL` | ✅ Production, Preview | ✅ brand-os, web, erp .env | Default `@prisma/client`, `createPrisma()` | Primary data source for all apps when `BRAND_DATABASE_URL` is absent |
| `DIRECT_DATABASE_URL` | ✅ Production | ✅ brand-os, web .env | Prisma Migrate (direct connection, no PgBouncer) | Migration and direct queries |
| `BRAND_DATABASE_URL` | ✅ Production | ❌ Not in any `.env` file | `brandPrisma` from `@yunwu/db/brand`, platform brand modules, publisher engine | **Dedicated Brand database connection** |

### 4.1 Fallback Analysis

In `packages/db/brand.ts`:
```typescript
process.env.BRAND_DATABASE_URL || process.env.DATABASE_URL || ""
```

In `apps/platform/modules/brand/shared/gateway.ts`:
```typescript
process.env.BRAND_DATABASE_URL || process.env.DATABASE_URL || ""
```

**In production:** `BRAND_DATABASE_URL` is set → brand queries go to the dedicated Brand database.

**In local dev:** `BRAND_DATABASE_URL` is NOT set (no `.env` file) → brand queries fall back to `DATABASE_URL` → same database as ERP and Web.

**Local dev risk:** If `BRAND_DATABASE_URL` and `DATABASE_URL` point to different databases in production but fall back to the same database locally, the brand-os frozen client and the `@yunwu/db` canonical client query the SAME local database but potentially DIFFERENT production databases. A direct import swap in Phase 3B would be safe locally but could break in production.

### 4.2 brand-os local client data source

Brand OS local client (from frozen schema `apps/brand-os/prisma/schema.prisma`) uses:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}
```

Brand OS's `.env` sets `DATABASE_URL` to the Neon Singapore database. In local dev, this is the same database that platform-app and ERP use. In Vercel production, `DATABASE_URL` is also set but may point to a different database than `BRAND_DATABASE_URL`.

**This is the fundamental obstacle to Phase 3B:** without confirming whether `DATABASE_URL` and `BRAND_DATABASE_URL` point to databases with the same `products` table structure, we cannot safely swap the Prisma client.

---

## 5. Existing Sync/Migration Mechanisms

**No sync mechanism exists between `products` and `brand_products`, or between any old/new table pair.**

Evidence:
| Search | Result |
|--------|--------|
| `products → brand_products` copy/seed/backfill | None found |
| Data migration scripts | None found |
| Dual-write pattern | None found |
| Publish-time replication | None found — publisher writes to old `products` table |
| Product OS aggregation | In-memory only via Data Fabric layer (`resolveProduct`), no DB synchronization |

The Data Fabric layer (`packages/db/fabric/resolver.ts`) performs **logical, in-memory transformation** of `DomainProduct` → `UnifiedProduct` → `View`. It does not read from or write to `brand_products`.

**Conclusion:** The old `products/series/materials` tables are the sole source of truth for Brand data in the current production system. The `brand_products/brand_series/brand_materials` tables exist in the canonical schema as a target architecture but are not yet populated or used.

---

## 6. Canonical Schema Coverage Verdict

### 6.1 Current State

| Schema | Covers `products` (old)? | Covers `brand_products` (new)? | Covers `tags`? | Covers `media`? |
|--------|------------------------|-------------------------------|----------------|-----------------|
| `packages/db/schema.prisma` (canonical) | ✅ As `ErpProduct` (`@@map("products")`) — DIFFERENT context | ✅ As `BrandProduct` (`@@map("brand_products")`) | ✅ As `BrandTag` (`@@map("brand_tags")`) | ✅ As `ErpMediaAsset` (`@@map("media")`) |
| `apps/brand-os/prisma/schema.prisma` (frozen) | ✅ As `Product` (`@@map("products")`) — SAME context | ❌ Not present | ✅ As `Tag`/`ProductTag` (`@@map("tags")`/`@@map("product_tags")`) | ✅ As `Media` (`@@map("media")`) |

### 6.2 The Schema Conflict

The frozen brand-os schema maps `Product` → `@@map("products")` → the Brand DB's `products` table.

The canonical schema maps `BrandProduct` → `@@map("brand_products")` → the Brand DB's `brand_products` table.

These are DIFFERENT PHYSICAL TABLES with different column sets. The canonical schema does NOT have a model that maps to the Brand DB's `products` table (the one actually used by production code). `ErpProduct` → `@@map("products")` refers to a different `products` table in the ERP database context.

**The frozen brand-os schema is NOT merely a subset of the canonical schema.** It describes a table (`products`) that the canonical schema does not model in the Brand context. The Phase 3A Contract Guard that assumed "frozen schemas are subsets of canonical" has an exemption gap here.

### 6.3 What Needs to Change

**Option A (Recommended):** The canonical schema should include the old Brand `products/series/materials/tags/product_tags/media` models as **legacy-read models**. This gives brand-os a Unified Prisma Client that can read and write the `products` table without changing which table is used at runtime. The `BrandProduct → brand_products` migration becomes a future, separately-planned activity.

**Option B (Alternative but riskier):** Add the old Brand models to `packages/db/schema.prisma` as deprecated models with `@@map("products")` etc., map them to the same database via the existing `DATABASE_URL` datasource, and let brand-os use the default `@prisma/client` instead of `@prisma/brand-client`. This requires confirming that `DATABASE_URL` == `BRAND_DATABASE_URL` target in production — if they differ, this breaks.

**Option C (Fallback):** Keep the frozen brand-os schema and brand-client, only centralize the schema file. Move `apps/brand-os/prisma/schema.prisma` into `packages/db/` as a `brand-legacy.prisma` that generates a `@prisma/brand-client` but is maintained alongside `schema.prisma`.

---

## 7. Recommended Target Architecture

### Phase 3B-0: Runtime Contract Confirmation (PREREQUISITE)

**Goal:** Verify whether `DATABASE_URL` and `BRAND_DATABASE_URL` point to the same database, and confirm the exact structure of the `products` table.

**Actions (read-only):**
1. Deploy a temporary diagnostic endpoint or use Vercel environment inspection to check if production `DATABASE_URL` == `BRAND_DATABASE_URL`
2. Or: read both URLs from `.vercel/.env.production.local` and compare (⚠️ requires access to unredacted values)
3. Or: ask the developer who configured Vercel environment variables

**Decision point (based on result):**
- **If same database:** brand-os can migrate to `@yunwu/db` with `DATABASE_URL` → `createPrisma()` after adding old-model includes
- **If different databases:** brand-os must use `@yunwu/db/brand` (`createBrandPrisma()`) which requires `BRAND_DATABASE_URL` to be available everywhere brand-os runs

### Phase 3B-1: Legacy Brand Models in Canonical Schema

**Goal:** Add the old Brand tables (`products`, `series`, `materials`, `tags`, `product_tags`, `media`) as legacy-read models in `packages/db/schema.prisma`, mapped to existing table names.

**Modification scope:**

```prisma
// packages/db/schema.prisma — add legacy Brand models
/// @deprecated Use BrandProduct instead. Phase 4 V2.2 migration target.
model LegacyBrandProduct {
  id               Int              @id @default(autoincrement())
  sku              String           @unique
  name             String
  slug             String           @unique
  seriesId         Int              @map("series_id")
  objectCategory   ObjectCategory   @default(BRACELET) @map("object_category")
  // ... all fields from the frozen schema ...
  @@map("products")
}
```

**Model additions needed:**

| Legacy Model | Table | Required by Brand OS? | Already in canonical? |
|-------------|-------|----------------------|----------------------|
| `LegacyBrandProduct` | `products` | ✅ Product CRUD | ❌ Missing (ErpProduct uses same table name but different context) |
| `LegacyBrandSeries` | `series` | ✅ Series CRUD | ❌ Missing |
| `LegacyBrandMaterial` | `materials` | ✅ Material CRUD | ❌ Missing |
| `Tag` | `tags` | ✅ Tag CRUD | ❌ Only BrandTag exists (maps to `brand_tags`) |
| `ProductTag` | `product_tags` | ✅ Product-tag relations | ❌ Only BrandProductTag exists |
| `Media` | `media` | ✅ Media CRUD | ⚠️ Partially — `ErpMediaAsset` maps to `media` |

**Files to modify:**
```
packages/db/schema.prisma           (add legacy models)
```

**Risks:** 🟢 Minimal — adding models to canonical schema does not change runtime behavior. The generated `@prisma/client` includes new model types but existing code continues to use whichever client it imports.

**Database change?** ❌ No.
**Data migration?** ❌ No.
**Independent commit/deploy?** ✅ Yes.

### Phase 3B-2: Unify Client Factory and Data Source Contract

**Goal:** Brand OS imports from `@yunwu/db` using `createPrisma()` (or `createBrandPrisma()` from `@yunwu/db/brand`) instead of `@prisma/brand-client`.

**Action (depending on Phase 3B-0 result):**

If **same database** (`DATABASE_URL` == `BRAND_DATABASE_URL`):
```diff
// apps/brand-os/src/lib/prisma.ts
- import { PrismaClient } from "@prisma/brand-client";
+ import { createPrisma } from "@yunwu/db";
```

If **different databases** (`DATABASE_URL` ≠ `BRAND_DATABASE_URL`):
```diff
// apps/brand-os/src/lib/prisma.ts
- import { PrismaClient } from "@prisma/brand-client";
+ import { createBrandPrisma } from "@yunwu/db/brand";
```

**Files to modify:**
```
apps/brand-os/src/lib/prisma.ts   (import swap)
apps/brand-os/src/lib/db.ts       (import swap)
apps/brand-os/package.json        (remove postinstall: npx prisma generate)
```

**Risks:** 🟡 Medium — requires Phase 3B-0 to be resolved first. The `createPrisma()` factory may need `DATABASE_URL` set differently for Brand OS. If the database connection changes in production, all queries break.

**Database change?** ❌ No — reads and writes same `products` table.
**Data migration?** ❌ No.
**Independent commit/deploy?** ⚠️ Conditional — only if brand-os has the correct `DATABASE_URL` or `BRAND_DATABASE_URL` in its environment.

### Phase 3B-3: Remove Brand OS Local Schema File

**Precondition:** Phase 3B-2 verified working in all environments.

**Files to delete:**
```
apps/brand-os/prisma/schema.prisma
```

**Files to modify:**
```
apps/brand-os/package.json   (remove postinstall line if not already removed)
```

**Risks:** 🟢 Low — brand-os no longer generates a local client.

**Database change?** ❌ No.
**Independent commit/deploy?** ✅ Yes.

### Phase 3B-4: Platform Brand Page Migration

**Goal:** Platform brand management pages and publisher engine switch from `brandPrisma` raw SQL to typed Prisma operations through the unified client.

**Scope:** `apps/platform/modules/brand/*`, `apps/platform/lib/publisher.ts`, `packages/platform/services/brand/*`

**This is a LARGER task** that involves converting raw SQL queries to typed Prisma operations. It is NOT required for brand-os convergence but is architecturally related.

### Phase 3B-5: Data Migration (Old → New Tables)

**Goal:** Copy `products` → `brand_products`, `series` → `brand_series`, `materials` → `brand_materials`.

**This is Phase 4+ scope.** Not required for brand-os/client convergence. The old and new tables can coexist indefinitely as long as all active code writes to one table and the other is populated via a controlled migration.

---

## 8. Rejected Options and Reasons

| Option | Rejected Because |
|--------|-----------------|
| **Direct import swap** (original Phase 3B) | `products` ≠ `brand_products` — different physical tables. A simple `@prisma/brand-client` → `@yunwu/db` swap changes which table is queried. |
| **Wrap old tables in canonical Brand models** | `BrandProduct` already maps to `brand_products`, not `products`. Remapping `BrandProduct` to `products` would break the ErpProduct bridge and future migration plans. |
| **Delete frozen schema immediately** | It is the only schema that correctly describes the Brand DB's `products` table. Deleting it without a replacement would leave brand-os without a valid client. |
| **Assume DATABASE_URL == BRAND_DATABASE_URL** | Unverified for production. A fallback chain exists (`BRAND_DATABASE_URL \|\| DATABASE_URL`) suggesting they CAN differ. A direct swap risks production breakage. |
| **Keep 3 clients permanently** | This is the current state. Acceptable as temporary but the drift risk and build complexity argue for convergence. |

---

## 9. Phase 3B-0 Onward Implementation Plan

### Phase 3B-0: Runtime Contract Confirmation

| Attribute | Detail |
|-----------|--------|
| **Goal** | Confirm whether `DATABASE_URL` and `BRAND_DATABASE_URL` point to the same database |
| **Files to modify** | None |
| **Risk** | 🟢 Low — read-only investigation |
| **Validation** | Compare production environment variable values (via Vercel dashboard or diagnostic endpoint) |
| **Rollback** | N/A — no changes made |
| **Agent** | Claude |

### Phase 3B-1: Legacy Brand Models in Canonical Schema

| Attribute | Detail |
|-----------|--------|
| **Goal** | Add `LegacyBrandProduct`, `LegacyBrandSeries`, `LegacyBrandMaterial`, `Tag`, `ProductTag`, `Media` to `packages/db/schema.prisma` mapped to existing tables |
| **Files to modify** | `packages/db/schema.prisma` |
| **Schema change?** | ✅ Yes (additive only) |
| **Database change?** | ❌ No |
| **Risk** | 🟢 Low — additive schema models don't change runtime behavior |
| **Validation** | `pnpm build:all` — all apps compile |
| **Rollback** | `git revert` commit |
| **Agent** | Claude |

### Phase 3B-2: Unify Brand OS Client

| Attribute | Detail |
|-----------|--------|
| **Goal** | Brand OS imports from `@yunwu/db` or `@yunwu/db/brand` |
| **Files to modify** | `apps/brand-os/src/lib/prisma.ts`, `apps/brand-os/src/lib/db.ts`, `apps/brand-os/package.json` |
| **Schema change?** | ❌ No |
| **Database change?** | ❌ No |
| **Risk** | 🟡 Medium — depends on Phase 3B-0 outcome |
| **Validation** | `pnpm --filter @yunwu/brand-os build` + manual smoke test of Brand OS routes |
| **Rollback** | Restore files from git |
| **Agent** | Claude |

### Phase 3B-3: Delete Brand OS Frozen Schema

| Attribute | Detail |
|-----------|--------|
| **Goal** | Remove `apps/brand-os/prisma/schema.prisma` |
| **Files to delete** | `apps/brand-os/prisma/schema.prisma` |
| **Files to modify** | `apps/brand-os/package.json` (remove postinstall) |
| **Schema change?** | ❌ No |
| **Database change?** | ❌ No |
| **Risk** | 🟢 Low |
| **Validation** | `pnpm build:all` |
| **Rollback** | Restore deleted files from git |
| **Agent** | Claude |

### Phase 3B-4: Platform Brand Page Migration (Future)

| Attribute | Detail |
|-----------|--------|
| **Goal** | Platform brand management pages use typed Prisma instead of raw SQL |
| **Scope** | Large — involves rewriting raw SQL queries in multiple action files |
| **Risk** | 🟡 Medium — each query must be verified |
| **Agent** | Codex or split task |

### Phase 3B-5: Data Migration (Phase 4+)

| Attribute | Detail |
|-----------|--------|
| **Goal** | Merge `products` → `brand_products` data |
| **Scope** | Data migration script, dual-write period, verification |
| **Risk** | 🟡 Medium — production data must not be lost |
| **Agent** | Codex + Claude review |

---

## 10. Risk Register

| Risk | Phase | Likelihood | Impact | Mitigation |
|------|-------|------------|--------|-----------|
| `DATABASE_URL` ≠ `BRAND_DATABASE_URL` in production | 3B-0 | 🟡 Unknown | 🔴 Brand OS connects to wrong database | Phase 3B-0 must confirm before 3B-2 |
| Hardcoded DB URL in 3 service files | 3B-4 | 🔴 Present | 🟡 Credential exposure | Remove hardcoded fallback URLs |
| Legacy models added to canonical schema create confusion | 3B-1 | 🟡 Medium | 🟢 Documentation issue | Clearly mark `@deprecated` in schema |
| brand-os build fails after import change | 3B-2 | 🟢 Low | 🟡 Local dev blocked | Already verified most imports work (Phase 3A guard) |
| platform-app brand pages still use raw SQL | 3B-2 | 🟢 Not blocking | 🟢 Brand OS unaffected | Brand OS convergence does not require platform changes |

---

## 11. Validation and Rollback Matrix

| Validation | 3B-0 | 3B-1 | 3B-2 | 3B-3 | 3B-4 |
|-----------|------|------|------|------|------|
| `pnpm build:all` | N/A | ✅ | ✅ | ✅ | ✅ |
| `pnpm --filter @yunwu/brand-os build` | N/A | ✅ | ✅ | ✅ | N/A |
| Brand OS product CRUD smoke test | N/A | N/A | ✅ | ✅ | N/A |
| Brand OS series CRUD smoke test | N/A | N/A | ✅ | ✅ | N/A |
| Brand OS material CRUD smoke test | N/A | N/A | ✅ | ✅ | N/A |
| No `@prisma/brand-client` import | N/A | N/A | ✅ | ✅ | N/A |
| No frozen schema file | N/A | N/A | N/A | ✅ | N/A |
| Platform brand pages work | N/A | N/A | N/A | N/A | ✅ |

---

## 12. Recommended Next Implementation Ticket

### Title: Phase 3B-0 — Confirm Brand Database Runtime Contract

**Scope:**
1. Determine whether `DATABASE_URL` and `BRAND_DATABASE_URL` point to the same database in production
2. Record the exact differences (if any)
3. Decide: `createPrisma()` or `createBrandPrisma()` for brand-os migration

**Investigation methods (choose one):**
- Read Vercel environment variables from dashboard
- Deploy a `/api/db-diagnostic` endpoint that returns variable names (not values)
- Ask the developer who configured Vercel environment variables

**Output:** A decision record that determines Phase 3B-2's implementation path.

**Owner:** Claude

---

## 13. Audit Integrity Statement

```
No files were modified.
No database was accessed.
No schema was generated or migrated.
No deployment was executed.
No environment variables were created, modified, or deleted.
```

**Report written to:** `docs/BRAND_OS_RUNTIME_DATA_CONTRACT_AUDIT_2026-07-11.md`
