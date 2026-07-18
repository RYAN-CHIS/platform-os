# Phase C — Brand OS Consumer Migration Architecture Review

**Date:** 2026-07-12
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**HEAD:** `a90c0d4` (Phase B commit)
**Phase B:** ✅ COMPLETE — `packages/brand-db`, `@yunwu/brand-db` established
**Phase C:** Read-only architecture review — no files modified

---

## 1. Executive Conclusion

**Phase C is VIABLE with one required architecture decision.** The Brand OS app (`apps/brand-os`) has exactly one runtime Prisma Client source, no raw SQL, no cross-database transactions, and a clean consumer topology. Migration to `@yunwu/brand-db` can be accomplished in 4 sub-phases with well-defined, low-risk steps.

**Primary challenges:**
1. **Model naming conflict** — 4 frozen schema model names differ from canonical names (Product → LegacyBrandProduct, etc.)
2. **Missing relations** — Tag, ProductTag, and JournalTag have no relations in the canonical schema (frozen schema has them)
3. **Frozen schema datasource uses DATABASE_URL** — an architectural error that migration inherently fixes by switching to BRAND_DATABASE_URL
4. **PublishStatus enum expansion** — frozen 2-value enum → canonical 6-value enum is compatible but widens the type

**Recommendation: Adapter-based migration (Phase C1) followed by phased consumer migration (Phase C2-C4).** Direct import swap is unsafe due to the model naming and missing relation issues.

---

## 2. Current Client Topology

### 2.1 Client Entry Points

| File | Import Source | Client | datasourceUrl | Used By |
|------|--------------|--------|---------------|---------|
| `src/lib/prisma.ts` | `@prisma/brand-client` | `new PrismaClient()` | Inherits from schema (`env("DATABASE_URL")`) | 11 production files |
| `src/lib/db.ts` | `@prisma/brand-client` | `new PrismaClient()` | Same | Not used by any production consumer (dead code?) |
| `seed.ts` | `@prisma/client` | `new PrismaClient()` | Inherits from default `env("DATABASE_URL")` | Dev-only seed script |

### 2.2 Consumer Map (Production Runtime)

| # | File | Import | Models Used | Operations | Relations Used |
|---|------|--------|-------------|------------|----------------|
| 1 | `src/lib/auth.ts` | `@/lib/prisma` | adminUser | findUnique | None |
| 2 | `src/lib/audit-log.ts` | `@/lib/prisma` | auditLog | create | None |
| 3 | `src/lib/actions/admin-actions.ts` | `@/lib/prisma` | product, series, material, journalPost, media, seoConfig, siteSetting, contactLead, adminUser | CRUD + findMany + upsert | `series` on product, None on others |
| 4 | `src/lib/actions/tag-actions.ts` | `@/lib/prisma` | tag, productTag, journalTag, journalPost | CRUD + findMany + createMany + deleteMany | `_count.productTags`, `_count.journalTags`, `productTags`, `journalTags` on Tag |
| 5 | `src/lib/actions/audit-actions.ts` | `@/lib/prisma` | auditLog, adminUser | findMany, count | None |
| 6 | `src/lib/actions/content-actions.ts` | `@/lib/prisma` | pageContent | CRUD + findMany | None |
| 7 | `src/app/api/products/route.ts` | `@/lib/prisma` | product | findMany, count, create, update | `series` nested include |
| 8 | `src/app/api/series/route.ts` | `@/lib/prisma` | series | findMany | `_count.products` |
| 9 | `src/app/api/posts/route.ts` | `@/lib/prisma` | journalPost | findMany, count, create | None |
| 10 | `src/app/api/materials/route.ts` | `@/lib/prisma` | material | findMany, count | None |
| 11 | `src/app/api/media/route.ts` | `@/lib/prisma` | media | findMany, count | None |
| 12 | `src/app/api/contact/route.ts` | `@/lib/prisma` | contactLead | findMany, count | None |
| 13 | `src/app/api/site-settings/route.ts` | `@/lib/prisma` | siteSetting | findMany | None |
| 14 | `src/app/admin/journal/[id]/page.tsx` | `@/lib/prisma` | journalPost | findUnique, update, delete | None |
| 15 | `src/app/admin/leads/page.tsx` | `@/lib/prisma` | contactLead | findMany | None |
| 16 | `src/app/admin/page.tsx` | `@/lib/prisma` | product, material, journalPost, contactLead | count, findMany | None |
| 17 | `src/app/admin/tags/page.tsx` | `@/lib/prisma` + `@prisma/brand-client` (TagType) | tag, journalPost | Indirect via tag-actions | `_count.productTags`, `_count.journalTags` |

### 2.3 Consumer Map (Non-Production)

| # | File | Import | Models | Reason Non-Production |
|---|------|--------|--------|----------------------|
| 1 | `seed.ts` | `@prisma/client` | journalPost | Dev-only seed with hardcoded paths. Uses wrong import package entirely. |

### 2.4 Current Client Lifecycle

```typescript
// apps/brand-os/src/lib/prisma.ts
import { PrismaClient } from "@prisma/brand-client";  // Locally generated client

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
//                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                     No explicit datasourceUrl — inherits from schema's env("DATABASE_URL")
//                     Creates HERE, at module import time (not lazy)

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Issues with current lifecycle:**
- Client is created at **module import time**, not lazily — first import triggers connection
- No explicit `datasourceUrl` — inherits from schema's `DATABASE_URL` (ERP DB — incorrect for Brand Runtime)
- Global singleton for dev hot-reload ✅
- No `$disconnect()` in request lifecycle — relies on Prisma's built-in connection pooling

---

## 3. Schema / Generator Topology

### 3.1 Current State

```
apps/brand-os/prisma/schema.prisma  (FROZEN — 16 models)
  └─ generator:  prisma-client-js
  └─ output:     ../node_modules/@prisma/brand-client
  └─ datasource: env("DATABASE_URL")         ← WRONG: should be BRAND_DATABASE_URL
  └─ postinstall: npx prisma generate        ← Generates @prisma/brand-client
  └─ consumers:  All src/ files via @/lib/prisma
```

### 3.2 Target State (Post-Phase C)

```
packages/brand-db/schema.prisma  (CANONICAL — 24 models)
  └─ generator:  prisma-client-js
  └─ output:     ./node_modules/@prisma/brand-client
  └─ datasource: env("BRAND_DATABASE_URL")   ← CORRECT
  └─ generate:   pnpm --filter @yunwu/brand-db prisma:generate
  └─ consumers:  apps/brand-os via @yunwu/brand-db (after Phase C)

apps/brand-os/prisma/schema.prisma  (remains frozen, no consumers after migration)
  └─ Phase H: delete
```

### 3.3 Key Architectural Fix

The current frozen schema connects to `DATABASE_URL` (ERP DB, US-East). Model names like `Product`, `Series`, `Material` on this datasource resolve to the ERP DB's `products`, `series`, `materials` tables — which is **incorrect** for Brand Runtime data. These same table names exist in Brand DB (Singapore) with different data.

**The migration to `@yunwu/brand-db` inherently fixes this** by switching the datasource to `BRAND_DATABASE_URL`.

---

## 4. Environment Contract

### 4.1 Current

| Variable | Required | Where Read | Fallback | Fail Behavior |
|----------|----------|-----------|----------|---------------|
| `DATABASE_URL` | Yes (incorrect) | Inherited from frozen schema | None in brand-os; `@yunwu/db/brand` has fallback to BRAND_DATABASE_URL (outside brand-os) | Schema generation fails |
| `DIRECT_DATABASE_URL` | Yes (incorrect) | Inherited from frozen schema | None | Schema generation fails |

### 4.2 Target (Post-Phase C)

| Variable | Required | Where Read | Fallback | Fail Behavior |
|----------|----------|-----------|----------|---------------|
| `BRAND_DATABASE_URL` | Yes | `packages/brand-db/index.ts` | **None** — fail closed with explicit error | `Error("BRAND_DATABASE_URL is required")` |
| `DATABASE_URL` | No longer needed | Not read by brand-os | N/A | N/A |

### 4.3 Security Improvement

- **Before:** Connects to ERP DB via `DATABASE_URL`, giving brand-os access to ERP data it shouldn't read
- **After:** Connects to Brand DB via `BRAND_DATABASE_URL`, respecting context boundary
- **Fail-closed:** Missing `BRAND_DATABASE_URL` throws immediately at first client access

---

## 5. Complete Consumer Inventory

(See Section 2.2 for full table. This section is a summary by model.)

### 5.1 Model Usage Frequency

| Model | Consumers | Read Ops | Write Ops |
|-------|-----------|----------|-----------|
| `product` / `LegacyBrandProduct` | 5 | findMany, count, findMany(select) | create, update |
| `series` / `LegacyBrandSeries` | 3 | findMany, findMany(include) | create, update |
| `material` / `LegacyBrandMaterial` | 2 | findMany, count | create, update, delete |
| `journalPost` | 5 | findMany, count, findUnique | create, update, delete |
| `contactLead` | 2 | findMany, count | None (read-only in brand-os) |
| `media` | 1 | findMany, count | create, delete |
| `siteSetting` | 1 | findMany | upsert, findUnique |
| `seoConfig` | 1 | findMany | upsert |
| `pageContent` | 1 | findMany, findUnique | create, update, delete |
| `tag` | 2 | findMany, findUnique | create, update, delete |
| `productTag` | 1 | None | createMany, deleteMany |
| `journalTag` | 1 | None | createMany, deleteMany |
| `adminUser` | 3 | findMany, findUnique | create, delete |
| `auditLog` | 2 | findMany, count | create |

### 5.2 Operations by Category

- **Read (17):** `findMany` (13), `count` (8), `findUnique` (4)
- **Write (16):** `create` (7), `update` (5), `delete` (4), `upsert` (2), `createMany` (2), `deleteMany` (2)
- **Raw SQL:** **None**
- **Transactions:** **None**

---

## 6. Model Compatibility Matrix

### 6.1 Model Name Mapping

| Frozen Name | Canonical Name | Compatible? | Code Impact |
|-------------|---------------|-------------|-------------|
| `Product` | `LegacyBrandProduct` | ❌ Name change | `prisma.product` → `prisma.legacyBrandProduct` |
| `Series` | `LegacyBrandSeries` | ❌ Name change | `prisma.series` → `prisma.legacyBrandSeries` |
| `Material` | `LegacyBrandMaterial` | ❌ Name change | `prisma.material` → `prisma.legacyBrandMaterial` |
| `ProductMaterial` | `LegacyProductMaterial` | ❌ Name change | `prisma.productMaterial` → `prisma.legacyProductMaterial` |
| `JournalTag` | `LegacyJournalTag` | ❌ Name change | `prisma.journalTag` → `prisma.legacyJournalTag` |
| `Tag` | `Tag` | ✅ Same | No change needed |
| `ProductTag` | `ProductTag` | ⚠️ Same name, no relations | `createMany`/`deleteMany` works; `include` breaks |
| `JournalPost` | `JournalPost` | ✅ Same | No change needed |
| `Media` | `Media` | ✅ Same | No change needed |
| `ContactLead` | `ContactLead` | ✅ Same | No change needed |
| `PageContent` | `PageContent` | ✅ Same | No change needed |
| `SeoConfig` | `SeoConfig` | ✅ Same | No change needed |
| `SiteSetting` | `SiteSetting` | ✅ Same | No change needed |
| `AdminUser` | `AdminUser` | ✅ Same | No change needed |
| `AuditLog` | `AuditLog` | ✅ Same | No change needed |
| `Order` | `LegacyOrder` | ❌ Name change | Not used in production consumers |
| `Banner` | `Banner` | ✅ Same | Not used in brand-os |

### 6.2 Field Compatibility

| Model | Frozen Field | Canonical Field | Compatible? |
|-------|-------------|----------------|-------------|
| `Product` | `status` (String) | `status` (String) | ✅ Same field, same type |
| `Product` | `publish_status` | `publishStatus` (PublishStatus) | ✅ Same field (camelCase→camelCase match) |
| `Product` | `series` (relation) | `series` (relation) | ✅ Same relation name |
| `Product` | `materialsRelation` | `materialLinks` (relation) | ❌ Renamed — must update if used (not currently used) |
| `Product` | `productTags` (relation) | **Missing** | ❌ Relation absent |
| `Series` | `products` (relation) | `products` (relation) | ✅ Same relation name |
| `Series` | `status` (String?) | `status` (String?) | ✅ Same field |
| `Tag` | `productTags` (relation) | **Missing** | ❌ Relation absent |
| `Tag` | `journalTags` (relation) | **Missing** | ❌ Relation absent |
| `ProductTag` | `product` (relation) | **Missing** | ❌ Relation absent |
| `ProductTag` | `tag` (relation) | **Missing** | ❌ Relation absent |
| `JournalTag` | `journal` (relation) | **Missing** | ❌ Relation absent |
| `JournalTag` | `tag` (relation) | **Missing** | ❌ Relation absent |

### 6.3 Enum Compatibility

| Enum | Frozen Values | Canonical Values | Compatible? |
|------|--------------|-----------------|-------------|
| `PublishStatus` | DRAFT, PUBLISHED (2) | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED (6) | ✅ Wider type is assignable — all frozen values exist in canonical |
| `ObjectCategory` | BRACELET, INCENSE, SEAL, CERAMIC, ENAMEL, SCHOLAR (6) | Same 6 values | ✅ Identical |
| `JournalCategory` | OBJECT, MATERIAL, CRAFT, DONGHAI, CREATION, PHILOSOPHY (6) | Same 6 values | ✅ Identical |
| `MediaCategory` | PRODUCT, BEADS, SEAL, INCENSE, PORCELAIN, WOODWORK, OTHER_OBJ, MATERIAL, BRAND, CRAFT, ARTICLE (11) | Same 11 values | ✅ Identical |
| `AdminRole` | SUPER_ADMIN, ADMIN, EDITOR, OPERATOR (4) | Same 4 values | ✅ Identical |
| `TagType` | SERIES, VALUE, MATERIAL, EMOTION, SCENE, OBJECT (6) | Same 6 values | ✅ Identical |

**PublishStatus note:** The frozen schema's 2-value enum was incomplete. No code in brand-os does exhaustive `switch` on PublishStatus values, so the 6-value expansion is fully backward-compatible.

### 6.4 Select/Include Compatibility

| Consumer | Query Pattern | Canonical Compat? | Notes |
|----------|--------------|-------------------|-------|
| `admin/page.tsx:39` | `select: { id, title, status, updatedAt }` ✅ | All fields exist in canonical `JournalPost` |
| `admin/page.tsx:44` | `select: { id, name, status, updatedAt }` ✅ | All fields exist in canonical `LegacyBrandProduct` |
| `api/products/route.ts:33` | `include: { series: { select: { name, slug } } }` ✅ | Relation `series` exists, fields `name`/`slug` exist |
| `api/series/route.ts:8` | `include: { _count: { select: { products } } }` ✅ | Relation `products` exists |
| `admin-actions.ts:163` | `include: { series: true }` ✅ | Relation `series` exists |
| `admin-actions.ts:172` | `select: { id, name }` ✅ | Fields exist |
| `tag-actions.ts:15` | `include: { _count: { select: { productTags, journalTags } } }` | ❌ Relations missing from canonical Tag |
| `tag-actions.ts:22` | `include: { productTags, journalTags }` | ❌ Relations missing from canonical Tag |
| `audit-actions.ts:48` | `select: { id, name, email }` ✅ | Fields exist in canonical AdminUser |

---

## 7. Runtime Lifecycle Analysis

### 7.1 Current Lifecycle (problematic)

```
Module import (@/lib/prisma or @/lib/db)
  → import { PrismaClient } from "@prisma/brand-client"
  → globalForPrisma.prisma ?? new PrismaClient()     ← Creates at import time
  → Client uses DATABASE_URL from schema              ← Wrong database!
  → First query triggers connection pool
```

### 7.2 Target Lifecycle (via @yunwu/brand-db)

```
First access (@yunwu/brand-db brandDb proxy or getBrandDb())
  → import { PrismaClient } from "@prisma/brand-client"   ← Generated from canonical schema
  → getBrandDb() checks globalForBrandDb.__yunwuBrandDb   ← Lazy
  → createBrandDb() → new PrismaClient({ datasourceUrl }) ← Explicit BRAND_DATABASE_URL
  → brandDb proxy forwards to singleton                   ← Proxy-based lazy access
```

### 7.3 Key Differences

| Aspect | Current | Target |
|--------|---------|--------|
| Creation timing | Module import | First access (lazy) |
| datasourceUrl | Inherited from schema (`DATABASE_URL`) | Explicit (`BRAND_DATABASE_URL`) |
| Fail behavior | Connection timeout if wrong DB | `Error("BRAND_DATABASE_URL is required")` |
| Singleton | Manual globalThis | `globalThis.__yunwuBrandDb` |
| Hot-reload safe | ✅ `globalForPrisma` | ✅ `globalForBrandDb` |
| Proxy pattern | ❌ Direct access | ✅ `brandDb` proxy forwards properties |

---

## 8. Transaction Analysis

**No transactions found in apps/brand-os.** All database operations are single-statement:

- No `$transaction([...])` batch
- No interactive transactions
- No raw SQL transactions (BEGIN/COMMIT/ROLLBACK)
- No cross-database transaction assumptions

**Risk level: 🟢 LOW** — no transaction migration needed.

---

## 9. Raw SQL Inventory

**No raw SQL found in apps/brand-os.** Zero instances of:
- `$queryRaw` / `$queryRawUnsafe`
- `$executeRaw` / `$executeRawUnsafe`
- `Prisma.sql` / `Prisma.raw`
- Database function calls
- Hardcoded table/column names in SQL strings

**Risk level: 🟢 LOW** — all database access is through typed Prisma Client methods. Migration is about import paths and model names, not SQL translation.

---

## 10. Production vs Test / Script Classification

### 10.1 Production Consumers (17 files)

All files listed in Section 2.2 Consumer Map. These are:
- Route handlers (`src/app/api/*/route.ts`)
- Server components with data access (`src/app/admin/*/page.tsx`)
- Server actions (`src/lib/actions/*.ts`)
- Auth middleware (`src/lib/auth.ts`)
- Audit helpers (`src/lib/audit-log.ts`)

### 10.2 Non-Production Consumers (2 files)

| File | Reason | Should Migrate? |
|------|--------|-----------------|
| `seed.ts` | Dev-only seed script. Imports from `@prisma/client` (wrong package!). References local filesystem path. | Phase C3 (low priority) |
| `src/lib/series-id.test.ts` | No Prisma imports. Pure utility test. | No migration needed |

### 10.3 Dead Code (1 file)

| File | Reason |
|------|--------|
| `src/lib/db.ts` | Duplicate of `src/lib/prisma.ts`. Identical pattern. Not imported by any production consumer. | Should be removed in Phase C4 or H |

---

## 11. P0 / P1 / P2 Risks

### P0: Critical (must resolve before or during Phase C)

**None identified.** The migration has no P0 blockers:
- ✅ No raw SQL that could fail silently
- ✅ No cross-database transactions
- ✅ No Client Component importing Prisma Client
- ✅ No credential fallback chains in brand-os
- ✅ All database operations use typed Prisma methods

### P1: High (must include in Phase C plan)

| ID | File | Issue | Impact | Resolution |
|----|------|-------|--------|------------|
| C-P1-01 | `tag-actions.ts:15,22` | Tag model has no `productTags`/`journalTags` relations in canonical schema | `include: { _count: { select: { productTags, journalTags } } }` and `include: { productTags, journalTags }` will fail at TypeScript level | Either: (a) Add relations to canonical schema's Tag model, or (b) Replace with separate queries in adapter |
| C-P1-02 | `admin/tags/page.tsx:14` | TypeScript type references `_count.productTags` and `_count.journalTags` | Type error when switching to canonical Tag (no relations) | Update type or use mapped type from adapter |
| C-P1-03 | All consumers | 4 model names differ (Product→LegacyBrandProduct, Series→LegacyBrandSeries, Material→LegacyBrandMaterial, JournalTag→LegacyJournalTag) | All `prisma.product.*` calls must change to `prisma.legacyBrandProduct.*` | Naming adapter or bulk find-and-replace |
| C-P1-04 | `seed.ts` | Imports from `@prisma/client` (default) instead of `@prisma/brand-client` | Seed would break after Phase H when frozen schema is deleted | Migrate to `@yunwu/brand-db` in Phase C3 |
| C-P1-05 | `db.ts` | Duplicate client entry, identical to `prisma.ts` | Confusion, potential double client | Remove in Phase C4 |

### P2: Medium (can be deferred to later phases)

| ID | File | Issue | Resolution |
|----|------|-------|------------|
| C-P2-01 | Frozen schema `apps/brand-os/prisma/schema.prisma` | Datasource uses `DATABASE_URL` (incorrect for Brand Runtime) | Remove in Phase H. Migration to canonical fixes this implicitly. |
| C-P2-02 | `prisma.ts` | Client created at module import time (not lazy) | Phase C migration to `@yunwu/brand-db` inherently fixes this (lazy proxy) |
| C-P2-03 | `prisma.ts` | No explicit error for missing env var | Phase C migration fixes this (fail-closed in `brandDatabaseUrl()`) |
| C-P2-04 | `package.json` | Has `@yunwu/db` dependency but no code imports from it | Remove in Phase C4 |
| C-P2-05 | `package.json` | Has `pg` dependency but no direct pg usage | Remove in Phase C4 |
| C-P2-06 | Frozen schema `PublishStatus` | Only 2 values (DRAFT, PUBLISHED) — stale | Phase H deletion |
| C-P2-07 | All consumers | Frozen `PublishStatus` type is narrower than canonical 6-value enum | TypeScript widening is safe — no exhaustive switches found |

---

## 12. Recommended Migration Architecture

### 12.1 Recommendation: Adapter-Based Migration (Phase C1) + Bulk Import Swap (Phase C2)

**Chosen approach: Hybrid of Option A and Option B.**

| Aspect | Decision |
|--------|----------|
| **Primary mechanism** | Adapter module at `apps/brand-os/src/lib/brand-db-adapter.ts` |
| **Adapter internally uses** | `@yunwu/brand-db`'s `brandDb` proxy |
| **Adapter purpose** | Resolve naming incompatibilities (model names, missing relations) |
| **After adapter established** | Bulk rename imports from `@/lib/prisma` to `@/lib/brand-db-adapter` across all consumers |
| **Long-term** | Adapter can be inlined/deprecated after Phase H |

### 12.2 Why Not Pure Import Swap (Option A Alone)

Direct `@/lib/prisma` → `@yunwu/brand-db` swap is impossible because:
1. `prisma.product` → would need to become `brandDb.legacyBrandProduct` (different method name)
2. `include: { productTags: true }` on Tag — relation doesn't exist in canonical schema
3. Multiple consumers would need simultaneous changes

### 12.3 Why Not Pure Adapter (Option B Alone)

A full adapter that re-exports all methods under old names creates a long-term maintenance burden. Hybrid approach limits the adapter to:
- Re-exporting `brandDb` from `@yunwu/brand-db`
- Providing named re-exports for model access with old names
- Providing a compatibility layer for missing Tag relations

---

## 13. Recommended Adapter Contract

### 13.1 File

`apps/brand-os/src/lib/brand-db-adapter.ts`

### 13.2 Contract

```typescript
// ── Core client ──
export { brandDb, getBrandDb, createBrandDb } from "@yunwu/brand-db";
//   brandDb:     Proxy-based singleton, lazy initialization
//   getBrandDb(): Returns singleton, creates if not exists
//   createBrandDb(): Creates new instance (for scripts/seed)

// ── Model re-exports (for naming compatibility) ──
// Consumers currently use prisma.product → change to brandDb.legacyBrandProduct
// Adapter provides OLD names as aliases for migration convenience:

// Legacy names (Phase C2 consumers use these until Phase H)
export const product = brandDb.legacyBrandProduct;
export const series = brandDb.legacyBrandSeries;
export const material = brandDb.legacyBrandMaterial;
export const productMaterial = brandDb.legacyProductMaterial;
export const journalTag = brandDb.legacyJournalTag;

// Models with same names (no alias needed)
//   brandDb.journalPost      ← same as frozen prisma.journalPost
//   brandDb.tag              ← same as frozen prisma.tag
//   brandDb.productTag       ← same as frozen prisma.productTag
//   brandDb.media            ← same as frozen prisma.media
//   brandDb.contactLead      ← same as frozen prisma.contactLead
//   brandDb.pageContent      ← same as frozen prisma.pageContent
//   brandDb.seoConfig        ← same as frozen prisma.seoConfig
//   brandDb.siteSetting      ← same as frozen prisma.siteSetting
//   brandDb.adminUser        ← same as frozen prisma.adminUser
//   brandDb.auditLog         ← same as frozen prisma.auditLog

// ── Tag compatibility helpers (for missing relations) ──
// Consumers that need tag with productTags/journalTags counts must use
// separate queries instead of include. Adapter provides helper functions:
export async function getTagWithCounts(tagId: string) { ... }
export async function listTagsWithCounts() { ... }

// ── Type re-exports ──
export type {
  LegacyBrandProduct as Product,
  LegacyBrandSeries as Series,
  LegacyBrandMaterial as Material,
  JournalPost,
  Tag,
  Banner,
  Media,
  ContactLead,
  PageContent,
  SeoConfig,
  SiteSetting,
  AdminUser,
  AuditLog,
  PublishJob,
  ContentVersion,
  SeoSnapshot,
} from "@yunwu/brand-db";

// ── Enum re-exports ──
export {
  PublishStatus,
  ObjectCategory,
  JournalCategory,
  MediaCategory,
  AdminRole,
  TagType,
} from "@yunwu/brand-db";
```

### 13.3 Rules

| Rule | Enforcement |
|------|-------------|
| ✅ Adapter uses @yunwu/brand-db's `brandDb` proxy | Single source of truth |
| ✅ No second PrismaClient singleton | Only `brandDb` from @yunwu/brand-db |
| ✅ No DATABASE_URL fallback | `brandDatabaseUrl()` in brand-db fails closed |
| ✅ No direct `new PrismaClient()` in adapter | Consumers use `brandDb` or `getBrandDb()` |
| ✅ No Client Component usage | Server-only module (Next.js tree-shaking) |
| ✅ Types re-exported from canonical source | No duplicate type definitions |
| ✅ Helper functions for missing relations | Avoids polluting canonical schema with deprecated relations |

---

## 14. File-by-File Migration Order

### Phase C1: Adapter & Infrastructure

| # | File | Current Source | Target Source | Changes | Risk |
|---|------|---------------|---------------|---------|------|
| 1 | `packages/brand-db/schema.prisma` | — | Add relations back to Tag? | **Decision needed** (see Section 11, C-P1-01) | 🟡 P1 |
| 2 | `apps/brand-os/package.json` | — | Add `@yunwu/brand-db` dependency | `"@yunwu/brand-db": "workspace:*"` | 🟢 Low |
| 3 | `src/lib/brand-db-adapter.ts` | — | **CREATE** — adapter from `@yunwu/brand-db` | New file | 🟢 Low |
| 4 | `src/lib/prisma.ts` | `@prisma/brand-client` | Deprecate (keep as re-export of adapter) | Change implementation to re-export from adapter | 🟡 P1 |
| 5 | `src/lib/db.ts` | `@prisma/brand-client` | Remove or re-export from adapter | Delete file | 🟢 Low |

### Phase C2: Production Consumer Migration

| # | File | Current Import | Target Import | Changes | Risk |
|---|------|---------------|---------------|---------|------|
| 1 | `src/lib/auth.ts` | `@/lib/prisma` → `prisma.adminUser` | `@/lib/brand-db-adapter` → `brandDb.adminUser` | 1 import line + variable | 🟢 Low |
| 2 | `src/lib/audit-log.ts` | `@/lib/prisma` → `prisma.auditLog` | Same pattern | 1 import line | 🟢 Low |
| 3 | `src/lib/actions/admin-actions.ts` | `@/lib/prisma` → `prisma.product, series, material, etc.` | `brandDb.legacyBrandProduct, legacyBrandSeries, etc.` | Import + 4 model name changes + enum import change | 🟡 P1 |
| 4 | `src/lib/actions/tag-actions.ts` | `@/lib/prisma` → `prisma.tag, productTag, journalTag` | `brandDb.tag, productTag, legacyJournalTag` + separate count queries | Import + model name + query pattern | 🟡 P1 |
| 5 | `src/lib/actions/audit-actions.ts` | `@/lib/prisma` → `prisma.auditLog, adminUser` | `brandDb.auditLog, adminUser` | 1 import line | 🟢 Low |
| 6 | `src/lib/actions/content-actions.ts` | `@/lib/prisma` → `prisma.pageContent` | `brandDb.pageContent` | 1 import line | 🟢 Low |
| 7 | `src/app/api/products/route.ts` | `@/lib/prisma` → `prisma.product` | `brandDb.legacyBrandProduct` | Import + model name | 🟢 Low |
| 8 | `src/app/api/series/route.ts` | `@/lib/prisma` → `prisma.series` | `brandDb.legacyBrandSeries` | Import + model name | 🟢 Low |
| 9 | `src/app/api/posts/route.ts` | `@/lib/prisma` → `prisma.journalPost` | `brandDb.journalPost` | 1 import line | 🟢 Low |
| 10 | `src/app/api/materials/route.ts` | `@/lib/prisma` → `prisma.material` | `brandDb.legacyBrandMaterial` | Import + model name | 🟢 Low |
| 11 | `src/app/api/media/route.ts` | `@/lib/prisma` → `prisma.media` | `brandDb.media` | 1 import line | 🟢 Low |
| 12 | `src/app/api/contact/route.ts` | `@/lib/prisma` → `prisma.contactLead` | `brandDb.contactLead` | 1 import line | 🟢 Low |
| 13 | `src/app/api/site-settings/route.ts` | `@/lib/prisma` → `prisma.siteSetting` | `brandDb.siteSetting` | 1 import line | 🟢 Low |
| 14 | `src/app/admin/journal/[id]/page.tsx` | `@/lib/prisma` → `prisma.journalPost` | `brandDb.journalPost` | 1 import line | 🟢 Low |
| 15 | `src/app/admin/leads/page.tsx` | `@/lib/prisma` → `prisma.contactLead` | `brandDb.contactLead` | 1 import line | 🟢 Low |
| 16 | `src/app/admin/page.tsx` | `@/lib/prisma` → `prisma.product, material, journalPost, contactLead` | `brandDb.legacyBrandProduct, legacyBrandMaterial, journalPost, contactLead` | Import + 2 model name changes | 🟢 Low |
| 17 | `src/app/admin/tags/page.tsx` | `@/lib/prisma` + `@prisma/brand-client` | `@yunwu/brand-db` (TagType) | 2 import lines | 🟢 Low |
| 18 | `src/app/admin/tags/page.tsx` | `_count.productTags, journalTags` | Use adapter helper | Type reference change | 🟡 P1 |

### Phase C3: Non-Production Migration

| # | File | Current Source | Target Source | Changes | Risk |
|---|------|---------------|---------------|---------|------|
| 1 | `seed.ts` | `@prisma/client` | `@yunwu/brand-db` | Full rewrite of imports + client creation | 🟢 Low (non-production) |

### Phase C4: Cleanup

| # | File | Action | Risk |
|---|------|--------|------|
| 1 | `src/lib/db.ts` | Delete (dead code) | 🟢 Low |
| 2 | `src/lib/prisma.ts` | Remove or simplify to re-export from adapter | 🟢 Low |
| 3 | `package.json` → `@yunwu/db` | Remove unused dependency | 🟢 Low |
| 4 | `package.json` → `pg` | Remove unused dependency | 🟢 Low |
| 5 | `package.json` → `@prisma/client` | Remove (no longer directly used) | 🟢 Low |
| 6 | `package.json` → `prisma` (devDep) | Remove (no longer generates locally) | 🟢 Low |
| 7 | `package.json` → `postinstall` | Remove `npx prisma generate` | 🟢 Low |
| 8 | `prisma/schema.prisma` | Leave frozen for Phase H | 🟢 Low |

---

## 15. Phase C Subphase Proposal

### Phase C1: Adapter & Infrastructure (Estimated: ~30 min Codex time)

**Scope:**
1. Add `@yunwu/brand-db` dependency to `apps/brand-os/package.json`
2. Create `src/lib/brand-db-adapter.ts` with the contract defined in Section 13
3. Optionally add missing Tag relations to `packages/brand-db/schema.prisma` (requires ADR decision)
4. Run `pnpm install` to link workspace package
5. Run `pnpm --filter @yunwu/brand-db prisma:generate` to generate client
6. Run `pnpm --filter @yunwu/brand-db typecheck` to verify package

**Validation:**
- TypeScript check passes for adapter
- Brand DB client generation succeeds
- No existing consumers changed yet

### Phase C2: Production Consumer Migration (Estimated: ~45 min Codex time)

**Scope:**
1. Migrate all 17 production consumer files (Section 14, Phase C2 table)
2. Model name changes: product→legacyBrandProduct, series→legacyBrandSeries, material→legacyBrandMaterial, journalTag→legacyJournalTag
3. Tag relation queries: replace `include` with separate queries via adapter helpers
4. Enum imports: change `@prisma/brand-client` → `@yunwu/brand-db`

**Validation:**
- `pnpm --filter @yunwu/brand-os typecheck` ✅
- `pnpm --filter @yunwu/brand-os build` ✅
- No DATABASE_URL references remain

### Phase C3: Non-Production & Scripts (Estimated: ~15 min Codex time)

**Scope:**
1. Migrate `seed.ts` to use `@yunwu/brand-db`
2. Verify test file `series-id.test.ts` unchanged (no Prisma deps)

**Validation:**
- Seed compiles (cannot run without DB credentials)

### Phase C4: Cleanup & Deprecation (Estimated: ~10 min Codex time)

**Scope:**
1. Remove `db.ts` (dead duplicate)
2. Simplify `prisma.ts` (re-export from adapter)
3. Remove unused dependencies: `@yunwu/db`, `pg`, `@prisma/client`, `prisma`
4. Remove `postinstall` prisma generate
5. Verify `prisma/schema.prisma` is no longer referenced by any code

**Validation:**
- `pnpm --filter @yunwu/brand-os build` ✅
- Full `pnpm build:all` (or platform-app build) ✅
- No remaining imports from `@/lib/prisma` or `@prisma/brand-client`
- Contract Guard passes

---

## 16. Validation Plan

| # | Check | When | Command |
|---|-------|------|---------|
| 1 | Brand-db generate succeeds | C1 | `pnpm --filter @yunwu/brand-db prisma:generate` |
| 2 | Brand-db typecheck | C1 | `pnpm --filter @yunwu/brand-db typecheck` |
| 3 | Brand-os typecheck (adapter only) | C1 | `pnpm --filter @yunwu/brand-os typecheck` |
| 4 | Brand-os typecheck (all consumers) | C2 | `pnpm --filter @yunwu/brand-os typecheck` |
| 5 | Brand-os build | C2 | `pnpm --filter @yunwu/brand-os build` |
| 6 | Contract Guard check | C2, C4 | `pnpm check:prisma-contract` |
| 7 | No DATABASE_URL fallback grep | C4 | `grep -r "DATABASE_URL" apps/brand-os/src/ --include='*.ts' --include='*.tsx'` (should only appear in adapter comments) |
| 8 | No old generated client imports | C4 | `grep -r "@prisma/brand-client\|@prisma/client" apps/brand-os/src/ --include='*.ts'` (should be empty) |
| 9 | No Client Component Prisma import | C2 | Manual review of page files (all are Server Components ✅) |
| 10 | Git diff scope review | All | Only `apps/brand-os/`, `packages/brand-db/`, no unrelated files |

### Requirements for validation:

| Requirement | Value |
|-------------|-------|
| `BRAND_DATABASE_URL` needed for generate/typecheck | ✅ Yes — use placeholder `postgresql://nouser:nopass@localhost:5432/nodb?connect_timeout=1` with `timeout=1` to fail fast |
| Database write required? | ❌ No |
| Database connection required? | ❌ No (typecheck is schema-only) |
| Build without env vars? | ✅ `next build` requires `BRAND_DATABASE_URL` env var for Prisma generate at build time — but with placeholder, Prisma Client generation succeeds (it validates schema, not connectivity) |

---

## 17. Rollback Plan

| Phase | Rollback Command | Side Effects |
|-------|-----------------|--------------|
| Pre-Phase C | `git stash` or `git checkout -- apps/brand-os/` | None — adapter file not created yet |
| After C1 | `git revert <commit>` (or remove adapter file, revert package.json) | Restores old imports. No data impact. |
| After C2 | `git revert <commit>` | All consumer imports revert to `@/lib/prisma`. Frozen schema still generates old client. |
| After C3 | `git revert <commit>` | Seed script reverts. |
| After C4 | `git revert <commit>` | All changes reverted. Dependencies restored. Frozen schema still generates old client. |
| Any phase | `pnpm install && pnpm --filter @yunwu/brand-os build` | Full restore + build verification |

**Key rollback safety:** No database mutations occur in any Phase C subphase. Rollback is purely a code revert + rebuild.

---

## 18. Files That Must Remain Until Phase H

The following files cannot be deleted in Phase C and must remain until Phase H (Frozen Schema deletion):

| File | Reason It Must Remain |
|------|----------------------|
| `apps/brand-os/prisma/schema.prisma` | Required by `postinstall` for `@prisma/brand-client` generation until Phase C4 removes postinstall. Even then, keep for reference until Phase H. |
| `apps/brand-os/node_modules/@prisma/brand-client/` | Generated client — may be referenced during transition. Leave until all consumers confirmed migrated. |
| `src/lib/prisma.ts` | Keep as adapter re-export until Phase C4. Leave frozen until Phase H if any direct imports remain. |
| `package.json` → `prisma` devDep | Keep until Phase C4 removes `postinstall` |
| `package.json` → `@prisma/client` | Keep until Phase C4 verifies no direct imports |
| `@prisma/brand-client` (in generated output dir) | Generated output. CI may need it for builds. Remove only in Phase H after confirming all consumers use `@yunwu/brand-db`. |

---

## 19. Explicit Out-of-Scope List

The following are explicitly NOT in Phase C scope:

| Item | Belongs To |
|------|-----------|
| `apps/platform` brand module raw SQL migration | Phase D |
| Publisher state machine migration | Phase E |
| `apps/web` decommissioning | Phase F |
| Data migration from legacy tables to `brand_*` tables | Phase G |
| Frozen schema deletion | Phase H |
| `apps/brand-os/prisma/schema.prisma` deletion | Phase H |
| Storefront `yunwu-origin` migration | Separate (not in timeline) |
| `src/lib/db.ts` removal | Phase C4 (in-scope) |
| Adding relations to canonical Tag model | Either Phase C1 ADR decision or defer to Phase H |
| `PublishStatus` enum changes in database | Out of scope — no DB changes needed |
| Any database migration | Out of scope for entire architecture cleanup |
| Any deployment or Vercel configuration | Out of scope |

---

## 20. Minimal Codex Implementation Scope

For the first Codex implementation ticket, the recommended scope is:

### Phase C1 Only — Adapter & Infrastructure

**Files to create:**
- `apps/brand-os/src/lib/brand-db-adapter.ts`

**Files to modify:**
- `apps/brand-os/package.json` — add `@yunwu/brand-db` dependency
- `packages/brand-db/schema.prisma` — **if ADR decides to add Tag relations back**

**Validation:**
- `pnpm install` ✅
- `pnpm --filter @yunwu/brand-db prisma:generate` ✅
- `pnpm --filter @yunwu/brand-db typecheck` ✅
- `pnpm --filter @yunwu/brand-os typecheck` ✅ (adapter only — no consumers migrated yet)

**Not in scope:**
- Consumer migration (Phase C2)
- Seed migration (Phase C3)
- Cleanup (Phase C4)

---

## Architecture Questions — Answers

### 1. How many Brand Prisma Client sources exist in apps/brand-os?

**Two**, but only one is production-relevant:
1. `src/lib/prisma.ts` — imports from `@prisma/brand-client` (production, 17 consumers) ← **The real production entry**
2. `src/lib/db.ts` — imports from `@prisma/brand-client` (dead code, zero consumers)

### 2. Which is the real production runtime entry?

**`src/lib/prisma.ts`** imports from `@prisma/brand-client` (generated from `apps/brand-os/prisma/schema.prisma`).

### 3. Does brand-os have a private generated client?

**Yes** — `@prisma/brand-client` is generated locally via `postinstall: npx prisma generate` from `apps/brand-os/prisma/schema.prisma`. Output goes to `apps/brand-os/node_modules/@prisma/brand-client`.

### 4. Does the frozen schema participate in build/generate/runtime?

**Yes.** The `postinstall` script runs `npx prisma generate` on the frozen schema, producing `@prisma/brand-client`. Every production consumer imports from this client. The frozen schema is actively part of the build pipeline.

### 5. Can a single adapter layer handle the migration?

**Yes.** A single adapter (`src/lib/brand-db-adapter.ts`) that internally uses `@yunwu/brand-db`'s `brandDb` proxy can provide:
- Old model name aliases (`product` → `brandDb.legacyBrandProduct`)
- Tag relation compatibility helpers
- Enum re-exports with old type names
- All type exports from canonical source

### 6. Recommended migration approach?

**Hybrid: Adapter-first (C1) + Bulk consumer migration (C2).**

| Aspect | Decision |
|--------|----------|
| Direct import swap? | ❌ Unsafe — model naming conflicts and missing Tag relations |
| Pure adapter? | ⚠️ Creates maintenance debt if adapter is permanent |
| **Recommended** | **Adapter as bridge (C1) → migrate all consumers (C2) → remove adapter (Phase H)** |

Rationale:
- Adapter is created in C1 with zero consumer disruption
- All 17 consumers migrate simultaneously in C2 (batch — not incremental)
- After Phase H (frozen schema deletion), the adapter can be inlined or removed
- No need for long-term dual-client maintenance

### 7. How should `createBrandDb`, `brandDb`, and types be used?

| Export | Usage |
|--------|-------|
| `brandDb` (proxy) | **Primary** — all production consumers use this via adapter. Lazy singleton, safe for Serverless. |
| `getBrandDb()` | For scripts that need explicit initialization control (seed.ts) |
| `createBrandDb()` | For tests that need isolated instances |
| Type exports | Re-exported through adapter. Consumers import types from adapter, not directly from `@yunwu/brand-db`. |

### 8. Does brand-os need to keep its public API?

**No.** Brand OS is a Next.js app, not a library package. There's no public API to preserve. All consumers are internal to `apps/brand-os/`. Imports are from `@/lib/prisma` → changing to `@/lib/brand-db-adapter` is a single path change per file.

### 9. Model naming incompatibilities?

**Yes — 4 model names differ:**
- `product` → `legacyBrandProduct`
- `series` → `legacyBrandSeries`
- `material` → `legacyBrandMaterial`
- `journalTag` → `legacyJournalTag`

Also 4 relation differences (Tag, ProductTag, JournalTag relations missing in canonical).

### 10. Should Phase C be split into subphases?

**Yes — 4 subphases recommended:**

| Subphase | Tasks | Validation |
|----------|-------|------------|
| **C1** | Adapter + dependency + schema decision | `typecheck` adapter |
| **C2** | Migrate 17 production consumers | `build` brand-os |
| **C3** | Migrate seed.ts (non-production) | `compile` seed |
| **C4** | Remove dead code + unused deps + postinstall | `build` + contract guard |

### 11. Which files still cannot be deleted after Phase C?

All files listed in Section 18 must remain until Phase H:
- `apps/brand-os/prisma/schema.prisma`
- Generated `@prisma/brand-client` in node_modules
- `src/lib/prisma.ts` (may be simplified)
- `prisma` and `@prisma/client` in package.json dependencies

### 12. Which deletions must wait until Phase H?

- `apps/brand-os/prisma/schema.prisma` file deletion
- Complete removal of `@prisma/brand-client` from the monorepo
- Removal of `postinstall` script (Phase C4 can do this only if all consumers migrated)
- Final `src/lib/prisma.ts` and `src/lib/db.ts` deletion
- Cleanup of unused dependencies (`prisma`, `@prisma/client`, `pg`, `@yunwu/db`)
- Removal of `prisma/` directory

---

## Risk Register Summary

| ID | Severity | Description | Phase |
|----|----------|-------------|-------|
| C-P0-* | 🔴 P0 | **None found** | N/A |
| C-P1-01 | 🟡 P1 | Tag relations missing in canonical schema | C1 (decision needed) |
| C-P1-02 | 🟡 P1 | Tags page TypeScript type references missing relations | C2 |
| C-P1-03 | 🟡 P1 | 4 model names differ between frozen and canonical | C2 |
| C-P1-04 | 🟡 P1 | seed.ts imports from wrong package | C3 |
| C-P1-05 | 🟡 P1 | Dead code file `db.ts` causes confusion | C4 |
| C-P2-01 | 🟢 P2 | Frozen schema uses DATABASE_URL (incorrect) | H |
| C-P2-02 | 🟢 P2 | Non-lazy client creation (fixed by migration) | C2 (fixes itself) |
| C-P2-03 | 🟢 P2 | No explicit missing-env error (fixed by migration) | C2 (fixes itself) |
| C-P2-04 | 🟢 P2 | Unused @yunwu/db dependency | C4 |
| C-P2-05 | 🟢 P2 | Unused pg dependency | C4 |
| C-P2-06 | 🟢 P2 | Stale 2-value PublishStatus in frozen schema | H |

---

## Final Status

```
PHASE C ARCHITECTURE REVIEW COMPLETE — MINIMAL IMPLEMENTATION PLAN READY

Audit conclusion:     LOW-RISK MIGRATION — no P0 risks, 5 P1 risks, all manageable
Migration approach:   Adapter-based (C1) → batch consumer migration (C2) → scripts (C3) → cleanup (C4)
Repository decision:  Whether to add Tag relations to canonical schema OR use separate queries in adapter

P0 risks:    0
P1 risks:    5 (C-P1-01 through C-P1-05)
P2 risks:    6 (C-P2-01 through C-P2-06)

Production consumers:     17 files
Non-production consumers: 1 file (seed.ts) + 1 test file (no deps)

Adapter needed:          YES — for model naming + Tag relation compatibility
Direct import swap:      NO — unsafe due to model naming and missing relations
New ADR needed:          🟡 RECOMMENDED — ADR-002 for Tag relations in canonical schema

Phase C subphases:       C1 (infra) → C2 (consumers) → C3 (scripts) → C4 (cleanup)
Minimal first ticket:    Phase C1 only — adapter + dependency + Tag relation ADR decision
```
