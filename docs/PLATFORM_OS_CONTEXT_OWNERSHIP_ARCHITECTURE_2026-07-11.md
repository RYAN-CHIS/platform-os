# Platform OS Context Ownership & Brand Runtime Target Architecture

**Date:** 2026-07-11
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**HEAD:** 8eff842
**Audit Mode:** Read-only — no files modified, no schema changes, no deployment

---

## Executive Conclusion

**The monorepo contains four distinct bounded contexts sharing two databases.** The current Prisma architecture (single canonical `schema.prisma` + three frozen copies) obscures this separation by making every model appear to belong to a single schema. The primary obstacle to Prisma convergence is NOT build resolution or import paths — it is the conflation of `products` (Brand Runtime table) with `ErpProduct` (ERP table mapped to a different `products` table in a different database).

**Recommended architecture: Two authoritative schemas, two Prisma packages, zero frozen copies.**

| Context | Schema Owner | Database | Prisma Package |
|---------|-------------|----------|---------------|
| **ERP OS** | `packages/db/schema.prisma` | `DATABASE_URL` (ERP DB) | `@yunwu/db` |
| **Brand Runtime** | New `packages/brand-db/schema.prisma` | `BRAND_DATABASE_URL` (Brand DB) | `@yunwu/brand-db` |
| **Product OS** | Logical layer on top of both | Aggregates from both | `@yunwu/db/fabric` |
| **Storefront** | Consumer only (yunwu-origin) | Reads from Brand DB via Product OS | `@prisma/client` (yunwu-origin) |

**`apps/web` is NOT the production storefront.** The production storefront is at `~/Projects/active/yunwu-origin` (separate repository, deployed independently to `www.yunwuorigin.com`). `apps/web` is a legacy in-monorepo web app that should be evaluated for removal or consolidation.

---

## A. Context Ownership Matrix

### A.1 Entity-Level Ownership

| Entity | Current System | Current DB | Current Table | Current Prisma Model | Read Consumers | Write Consumers | Current Truth Source | Long-term Truth Source | Cross-system direct write allowed? | Sync needed? | Legacy? | Retirement Condition |
|--------|---------------|-----------|---------------|---------------------|----------------|----------------|---------------------|----------------------|-----------------------------------|-------------|---------|----------------------|
| **ERP Product** | ERP OS | ERP DB (`DATABASE_URL`) | `products` | `ErpProduct` | ERP modules, Product OS fabric | ERP modules | ERP DB | ERP DB | ❌ No other system | No (Product OS reads only) | ❌ No | N/A |
| **SKU** | ERP OS | ERP DB | `product_skus` | `ErpProductSku` | ERP modules | ERP modules | ERP DB | ERP DB | ❌ | No | ❌ No | N/A |
| **Inventory** | ERP OS | ERP DB | `erp_inventory_transactions` | `ErpInventoryTransaction` | ERP modules | ERP modules | ERP DB | ERP DB | ❌ | No | ❌ No | N/A |
| **BOM** | ERP OS | ERP DB | `erp_boms` | `ErpBom` | ERP modules | ERP modules | ERP DB | ERP DB | ❌ | No | ❌ No | N/A |
| **Purchase** | ERP OS | ERP DB | `erp_purchase_records` | `ErpPurchaseRecord` | ERP modules | ERP modules | ERP DB | ERP DB | ❌ | No | ❌ No | N/A |
| **ERP Order** | ERP OS | ERP DB | `erp_orders` | `ErpOrder` | ERP modules | ERP modules | ERP DB | ERP DB | ❌ | No | ❌ No | N/A |
| **ERP Customer** | ERP OS | ERP DB | `erp_customers` | `ErpCustomer` | ERP modules | ERP modules | ERP DB | ERP DB | ❌ | No | ❌ No | N/A |
| **ERP Work** | ERP OS | ERP DB | `erp_works` | `ErpWork` | ERP modules | ERP modules | ERP DB | ERP DB | ❌ | No | ❌ No | N/A |
| **ERP Material** | ERP OS | ERP DB | `erp_materials` | `ErpMaterial` | ERP modules | ERP modules | ERP DB | ERP DB | ❌ | No | ❌ No | N/A |
| **Brand Product** | Brand Runtime | Brand DB (`BRAND_DATABASE_URL`) | `products` | `LegacyBrandProduct` (frozen) | brand-os, Platform brand pages, Publisher, web | brand-os, Platform brand actions | Brand DB `products` | Brand DB `brand_products` | ⚠️ Platform brand pages write via raw SQL | Yes (future) | ✅ OLD TABLE | After data migration to `brand_products` |
| **Brand Series** | Brand Runtime | Brand DB | `series` | `LegacyBrandSeries` (frozen) | brand-os, Platform brand pages, web | brand-os, Platform brand actions | Brand DB `series` | Brand DB `brand_series` | ⚠️ Same | Yes (future) | ✅ OLD TABLE | After data migration |
| **Brand Material** | Brand Runtime | Brand DB | `materials` | `LegacyBrandMaterial` (frozen) | brand-os, Platform brand pages, yunwu-origin | brand-os, Platform brand actions | Brand DB `materials` | Brand DB `brand_materials` | ⚠️ Same | Yes (future) | ✅ OLD TABLE | After data migration |
| **Tag** | Brand Runtime | Brand DB | `tags` | `Tag` (frozen) | brand-os, Platform brand pages, web | brand-os, Platform brand actions | Brand DB `tags` | Brand DB `brand_tags` | ⚠️ Same | Yes (future) | ✅ OLD TABLE | After data migration |
| **Product-Tag** | Brand Runtime | Brand DB | `product_tags` | `ProductTag` (frozen) | brand-os, web | brand-os, Platform brand actions | Brand DB `product_tags` | Brand DB `brand_product_tags` | ⚠️ Same | Yes (future) | ✅ OLD TABLE | After data migration |
| **Media** | Shared | Brand DB | `media` | `ErpMediaAsset` (canonical), `Media` (frozen) | brand-os, Platform brand pages | Platform brand pages | Brand DB `media` | Brand DB `media` | ⚠️ Cross-context writes exist | No (shared table) | ⚠️ Partial | N/A |
| **Journal Post** | Brand Runtime | Brand DB | `journal_posts` | `JournalPost` | brand-os, Platform brand pages, yunwu-origin | Platform brand pages | Brand DB `journal_posts` | Brand DB `journal_posts` | ❌ Only Platform writes | No | ❌ No | N/A |
| **Banner** | Brand Runtime | Brand DB | `banners` | `ErpBanner` (canonical) | Platform brand pages, yunwu-origin | Platform brand pages | Brand DB `banners` | Brand DB `banners` | ❌ | No | ❌ No | N/A |
| **Publisher** | Brand Runtime | Brand DB | `products/series/journal_posts/banners` | Raw SQL (no Prisma model) | Platform brand pages | Publisher engine | Brand DB | Brand DB (via typed Prisma) | ❌ Only Publisher | No | ❌ No | After migration to typed Prisma |
| **Product OS Product** | Product OS (logical) | Aggregated | Logical (reads from both DBs) | `DomainProduct` (in-memory) | yunwu-origin storefront | None (read-only aggregation) | ERP DB + Brand DB | Data Fabric | ❌ Read-only | No | ❌ No | N/A |
| **Batch** | Product OS | Brand DB? | not yet created | not yet modeled | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| **Ritual** | Product OS | Brand DB? | not yet created | not yet modeled | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| **Cross Sell** | Product OS | Brand DB? | not yet created | not yet modeled | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| **Storefront Product View** | Storefront | N/A (logical) | N/A (API response) | `WebProductView` | yunwu-origin pages | None (read-only) | Product OS aggregation | Product OS | ❌ | No | ❌ No | N/A |

---

## B. Four System Boundaries

### B.1 ERP OS (Enterprise Resource Planning)

**Responsible for:**
- Product master data (codes, names, specifications)
- SKU management, pricing, costing
- Inventory (raw materials, finished goods)
- BOM (bill of materials)
- Purchasing, production planning
- Customer and order management (ERP orders)
- Media assets (upload, storage, categorization)

**NOT responsible for:**
- Brand storytelling, narrative content
- Product publication workflow
- Storefront display data
- SEO configuration
- Brand materials library
- Journal/blog content

**Database:** ERP DB via `DATABASE_URL`
**Schema authority:** `packages/db/schema.prisma`
**Prisma package:** `@yunwu/db`

### B.2 Brand Runtime

**Responsible for:**
- Brand product content (story, theme, inspiration, gallery)
- Brand series (curation, ordering, publication status)
- Brand materials library (materials with narrative content)
- Tags and product-tag associations
- Journal posts (brand storytelling)
- Banners (home page and section banners)
- Home page content blocks
- SEO configuration for brand content
- Publishing workflow (DRAFT → REVIEW → APPROVED → PUBLISHED)
- Content versioning and scheduling

**NOT responsible for:**
- ERP inventory and cost data
- SKU-level pricing and production
- Customer and order management
- Product OS aggregation logic

**Database:** Brand DB via `BRAND_DATABASE_URL`
**Schema authority:** New `packages/brand-db/schema.prisma` (to be created)
**Prisma package:** `@yunwu/brand-db` (to be created)

### B.3 Product OS

**Responsible for:**
- Unified product aggregation (combining ERP + Brand data)
- Storefront-facing product views (`WebProductView`)
- Cross-domain data resolution (resolving product from both databases)
- Batch, Ritual, Cross Sell product relationships (future)
- Product OS is a **logical/service layer**, not a database owner

**NOT responsible for:**
- Owning physical database tables
- Writing to ERP or Brand databases directly
- Managing inventory or costs
- Managing brand content

**Implementation:** Data Fabric layer (`packages/db/fabric/`) + Domain services
**Database:** None (reads from both, writes to neither)
**Schema authority:** None (models are in-memory `DomainProduct`)

### B.4 Storefront (yunwu-origin)

**Responsible for:**
- Public-facing website rendering
- Product browsing, search, filtering
- Series and material browsing
- Journal/blog reading
- Shopping cart and checkout
- SEO optimization and sitemap generation

**NOT responsible for:**
- Being the source of truth for any data
- Writing to any database (admin functions go through API routes)
- Managing brand content or inventory

**Repository:** `~/Projects/active/yunwu-origin` (separate repo)
**Deployment:** `www.yunwuorigin.com` (separate Vercel project)
**Database access:** Reads from Brand DB via `DATABASE_URL` (yunwu-origin's own env)
**Product OS integration:** Via `src/lib/product-os.ts` (read-only facade)

### B.5 Boundary Rules — Explicit Prohibitions

| Rule | Rationale | Current Violations? |
|------|-----------|-------------------|
| ❌ Storefront MUST NOT be product truth source | Storefront renders data, doesn't own it | ✅ Compliant |
| ❌ Brand Runtime MUST NOT manage ERP inventory/cost | Different bounded contexts | ✅ Compliant |
| ❌ ERP OS MUST NOT manage brand stories/publication | Different bounded contexts | ✅ Compliant |
| ❌ Product OS MUST NOT own database writes | It's a read-only aggregation layer | ✅ Compliant |
| ❌ Different databases MUST NOT share a Prisma Client | `@yunwu/db` default client should not access Brand DB | ⚠️ Currently shares default `@prisma/client` output directory |
| ❌ Platform Brand pages MUST NOT use raw SQL for brand operations | Raw SQL bypasses Prisma type safety and schema migration | **❌ VIOLATED** — brand actions use `brandPrisma.$queryRawUnsafe` |

---

## C. Brand Runtime Client Architecture

### C.1 Options Comparison

#### Option A: New `@yunwu/brand-db` package (RECOMMENDED)

| Attribute | Detail |
|-----------|--------|
| **Schema file** | `packages/brand-db/schema.prisma` |
| **Client output** | `packages/brand-db/node_modules/@prisma/brand-client` |
| **Generator** | `prisma generate --schema=packages/brand-db/schema.prisma` |
| **Package name** | `@yunwu/brand-db` |
| **Data source** | `BRAND_DATABASE_URL` only — no fallback |
| **Exports** | `createBrandDb()`, `getBrandDb()`, all Brand model types |
| **Migration owner** | `pnpm --filter @yunwu/brand-db db:push` |

**Benefits:**
1. Clean physical separation — Brand DB has its own package, just like a microservice
2. No risk of ERP models leaking into Brand queries (and vice versa)
3. `BRAND_DATABASE_URL` is the only data source — no fallback chain
4. Each package can be built and deployed independently
5. Both brand-os and platform brand modules import from the same package
6. Clear migration ownership

**Risks:**
- New package adds monorepo weight
- Must add to CI/CD pipeline
- Two `prisma generate` calls instead of one

#### Option B: `@yunwu/db/brand-runtime` sub-entry

| Attribute | Detail |
|-----------|--------|
| **Schema file** | `packages/db/brand-runtime.schema.prisma` |
| **Client output** | `packages/db/node_modules/@prisma/brand-runtime-client` |
| **Data source** | `BRAND_DATABASE_URL` |
| **Exports** | Via `@yunwu/db/brand-runtime` |

**Why not recommended:** Keeps Brand schema inside `packages/db`, which creates ambiguity about which schema manages which database. The ERP schema (`schema.prisma`) and Brand schema (`brand-runtime.schema.prisma`) in the same package would require careful export isolation.

#### Option C: Keep frozen schema, centralize location only

| Attribute | Detail |
|-----------|--------|
| **Schema file** | `apps/brand-os/prisma/schema.prisma` (current) |
| **Client output** | `node_modules/@prisma/brand-client` |

**Why not recommended:** Keeps the schema inside an app instead of a package. Other consumers (platform brand modules, publisher) would need to import from an app's generated client, which violates monorepo conventions.

#### Option D: Extract to `packages/platform/brand-db`

**Why not recommended:** `packages/platform/` contains platform-specific services, not reusable packages.
The Brand DB is consumed by both `apps/brand-os` and `apps/platform` — it belongs in packages/ directly.

### C.2 Recommended: Option A (`@yunwu/brand-db`)

```
packages/brand-db/
├── package.json              # name: "@yunwu/brand-db"
├── schema.prisma             # Brand Runtime models only (no ERP models)
├── index.ts                  # exports: createBrandDb(), getBrandDb(), brandDb
├── tsconfig.json
```

**Schema contents:** Exactly the old Brand tables as Prisma models:
- `LegacyBrandProduct` → `@@map("products")`
- `LegacyBrandSeries` → `@@map("series")`
- `LegacyBrandMaterial` → `@@map("materials")`
- `Tag` → `@@map("tags")`
- `ProductTag` → `@@map("product_tags")`
- `Media` → `@@map("media")`
- `JournalPost` → `@@map("journal_posts")`
- `Banner` → `@@map("banners")`
- `ContactLead` → `@@map("contact_leads")`
- `PageContent` → `@@map("page_contents")`
- `SeoConfig` → `@@map("seo_configs")`
- `SiteSetting` → `@@map("site_settings")`
- `PublishJob` → `@@map("publish_jobs")`
- `ContentVersion` → `@@map("content_versions")`
- `SeoSnapshot` → `@@map("seo_snapshots")`
- Plus future models (Batch, Ritual, CrossSell)

Also add the **target models** (`BrandProduct → brand_products`, etc.) here, so that both old and new tables coexist in the same schema. This allows gradual migration at the application level without schema changes.

**Client factory pattern** (same as `packages/db/brand.ts`):
```typescript
// packages/brand-db/index.ts
export function createBrandDb() { ... }
export function getBrandDb() { ... }
export const brandDb = ...;  // proxy-based singleton
```

**Migration ownership:** `pnpm --filter @yunwu/brand-db db:push` (for development) and `prisma migrate` (for production).

### C.3 Consumer Mapping

| Consumer | Current Pattern | Target Pattern |
|----------|----------------|----------------|
| **apps/brand-os** | `@prisma/brand-client` (local generate) | `@yunwu/brand-db` (package import) |
| **Platform brand modules** | Raw SQL via `brandPrisma` from `@yunwu/db/brand` | Typed Prisma via `@yunwu/brand-db` |
| **Publisher** | Raw SQL via `brandPrisma` | Typed Prisma via `@yunwu/brand-db` |
| **packages/platform/services/brand** | Raw SQL with hardcoded URL | `@yunwu/brand-db` |

---

## D. Schema Authority Model

### D.1 Principle: One schema per database

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT (to be replaced)                  │
│                                                             │
│  packages/db/schema.prisma  ← "canonical" for everything    │
│       │ models: ERP(16) + Brand(9) + Shared(16) = 41       │
│       │ datasource: DATABASE_URL (ERP DB)                   │
│       │ ⚠️ Brand models mapped to brand_* tables —          │
│       │   but these point to Brand DB via BRAND_DATABASE_URL │
│       │ ⚠️ ErpProduct → @@map("products") conflicts with    │
│       │   Brand Runtime's products table (different DBs!)    │
│       ↓                                                      │
│  @yunwu/db  (generates default @prisma/client)               │
│       ↓                                                      │
│  apps read from @yunwu/db BUT:                               │
│  Brand apps should NOT read ERP models                       │
│  ERP apps should NOT read Brand models                       │
└─────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────┐
│                    TARGET ARCHITECTURE                       │
│                                                             │
│  packages/db/schema.prisma   packages/brand-db/schema.prisma │
│  ─────────────────────────   ─────────────────────────────   │
│  datasource: DATABASE_URL    datasource: BRAND_DATABASE_URL  │
│  Models: ERP(16) + Shared    Models: Brand Runtime (15+)     │
│  Generates: @prisma/client   Generates: @prisma/brand-client │
│       │                            │                         │
│       ▼                            ▼                         │
│  @yunwu/db                   @yunwu/brand-db                 │
│  ├── createPrisma()          ├── createBrandDb()             │
│  ├── domain services         ├── brandDb (proxy singleton)   │
│  ├── fabric (Product OS)     └── ALL Brand model types       │
│  └── control/enforce                                         │
│       │                            │                         │
│       ▼                            ▼                         │
│  ERP OS apps                 Brand Runtime apps              │
│  ┌──────────────┐            ┌─────────────────────┐        │
│  │ apps/platform │            │ apps/brand-os        │        │
│  │ (ERP section) │            │ platform brand pages │        │
│  │ apps/erp      │            │ publisher engine     │        │
│  └──────────────┘            └─────────────────────┘        │
│                                                             │
│  Product OS (Data Fabric) reads from BOTH:                  │
│  ┌──────────────────────────────────────────────────┐       │
│  │ @yunwu/db/fabric — resolveProduct(), etc.        │       │
│  │ Reads: ERP DB (via @yunwu/db) + Brand DB         │       │
│  │        (via @yunwu/brand-db)                     │       │
│  │ Consumers: yunwu-origin storefront               │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### D.2 Migration Ownership

| Schema | Dev Migration | Production Migration | Generate Trigger | CI Responsibility |
|--------|--------------|---------------------|-----------------|-------------------|
| `packages/db/schema.prisma` | `pnpm --filter @yunwu/db db:push` | `pnpm --filter @yunwu/db db:migrate` (future) | `postinstall` in `@yunwu/db` | `pnpm build:all` |
| `packages/brand-db/schema.prisma` | `pnpm --filter @yunwu/brand-db db:push` | `pnpm --filter @yunwu/brand-db db:migrate` (future) | `postinstall` in `@yunwu/brand-db` | `pnpm build:all` |

### D.3 Phase 3A Contract Guard Adjustment

The current guard assumes all frozen schemas are subsets of `packages/db/schema.prisma`. This is incorrect — the Brand Runtime `products` table (accessed by brand-os) is NOT modeled in the canonical schema as a Brand-table model. `ErpProduct → @@map("products")` refers to a different database's `products` table.

**Adjustment needed:** The guard should check per-context:
- ERP models → must exist in `packages/db/schema.prisma`
- Brand models → must exist in `packages/brand-db/schema.prisma` (once created)
- If neither, the model is unowned and should be flagged

### D.4 Preventing Drift

| Mechanism | How |
|-----------|-----|
| **Shared types** | `packages/db` and `packages/brand-db` can share a `@yunwu/types` package for enums like `ObjectCategory`, `PublishStatus`, `TagType` |
| **CI check** | CI builds both packages — drift in one doesn't block the other |
| **Convergence map** | The CONVERGENCE-MAP.md tracks which old tables map to which new tables, ensuring eventual convergence isn't forgotten |

---

## E. Web & Storefront Judgment

### E.1 Which is the production storefront?

| Property | `apps/web` (in monorepo) | `yunwu-origin` (separate repo) |
|----------|------------------------|-------------------------------|
| **Repository** | This monorepo (`platform-os`) | `~/Projects/active/yunwu-origin` |
| **Deployment** | Not independently deployed (vercel.json was misleading) | `www.yunwuorigin.com` ✅ |
| **Database** | Reads `products` via `@prisma/web-client` | Reads `products` via its own Prisma client |
| **Pages** | Minimal — `(site)`, `api` | Full storefront — products, series, materials, journal, cart, checkout |
| **Status** | **Legacy/in-monorepo copy** | **Production storefront** |

### E.2 Recommendation

**`apps/web` should be decommissioned.** It is a duplicate of the real storefront (`yunwu-origin`) inside the monorepo. Keeping it causes:
1. Confusion about which app is the real storefront
2. Duplicate Prisma Client maintenance (`@prisma/web-client`)
3. A misleading root `vercel.json` that references `@yunwu/web` as if it were a production deployment
4. Divergent code paths — fixes applied to `yunwu-origin` may not reach `apps/web`, and vice versa

**Recommended action (Phase F):**
1. Verify `yunwu-origin` covers all functionality that `apps/web` provides
2. Remove `apps/web` from the monorepo
3. Remove `@yunwu/web` from root `vercel.json`
4. Remove `@prisma/web-client` and its frozen schema

**Until decommissioned:**
- `apps/web` should not be considered production-critical
- Its build may fail without blocking platform-app, brand-os, or erp builds
- `@prisma/web-client` is a maintenance liability

---

## F. Implementation Phases

### Phase A: Baseline & Context Ownership Solidification

| Attribute | Detail |
|-----------|--------|
| **Goal** | Document the context ownership matrix and boundary rules in YUNWU_MASTER_BASELINE.md |
| **Files to modify** | `docs/YUNWU_MASTER_BASELINE.md` (documentation only) |
| **Database change?** | ❌ No |
| **Deploy?** | ❌ No |
| **Risk** | 🟢 None |
| **Validation** | Review and approve baseline doc |
| **Rollback** | `git revert` |
| **Agent** | Claude |

### Phase B: Brand Runtime Canonical Schema/package Creation

| Attribute | Detail |
|-----------|--------|
| **Goal** | Create `packages/brand-db/` with its own `schema.prisma`, `index.ts`, and build pipeline |
| **Files to create** | `packages/brand-db/package.json`, `packages/brand-db/schema.prisma`, `packages/brand-db/index.ts`, `packages/brand-db/tsconfig.json` |
| **Files to modify** | `pnpm-workspace.yaml` (add brand-db to workspace) |
| **Schema content** | All Brand Runtime models (old tables + target brand_* tables) |
| **Generator output** | `packages/brand-db/node_modules/@prisma/brand-client` |
| **Database change?** | ❌ No (models added, no migration run) |
| **Deploy?** | ❌ No |
| **Risk** | 🟢 Low — new package, no consumers yet |
| **Validation** | `pnpm install`, `pnpm --filter @yunwu/brand-db generate`, `pnpm build:all` |
| **Rollback** | Remove package, revert pnpm-workspace.yaml |
| **Agent** | Claude |

### Phase C: Brand OS Migration to `@yunwu/brand-db`

| Attribute | Detail |
|-----------|--------|
| **Goal** | `apps/brand-os` imports from `@yunwu/brand-db` instead of local frozen client |
| **Files to modify** | `apps/brand-os/src/lib/prisma.ts`, `apps/brand-os/src/lib/db.ts`, `apps/brand-os/package.json` |
| **Files to delete (later)** | `apps/brand-os/prisma/schema.prisma` (Phase H) |
| **Database change?** | ❌ No — reads/writes same `products` table |
| **Deploy?** | ⚠️ Yes — brand-os is independently buildable |
| **Risk** | 🟡 Medium — import path change, type name differences |
| **Validation** | `pnpm --filter @yunwu/brand-os build` + smoke test CRUD routes |
| **Rollback** | Restore old import paths from git |
| **Agent** | Claude |

### Phase D: Platform Brand Module Migration

| Attribute | Detail |
|-----------|--------|
| **Goal** | Platform brand modules switch from raw SQL to typed Prisma via `@yunwu/brand-db` |
| **Files to modify** | `apps/platform/modules/brand/*/actions.ts`, `apps/platform/modules/brand/shared/gateway.ts` |
| **Database change?** | ❌ No |
| **Deploy?** | ⚠️ Yes — platform-app is production |
| **Risk** | 🟡 Medium — 10+ action files with raw SQL patterns. Each query must be carefully translated. |
| **Validation** | `pnpm --filter @yunwu/platform-app build` + manual smoke test of brand management pages |
| **Rollback** | Restore old action files from git |
| **Agent** | Codex (bulk work) + Claude (review) |

### Phase E: Publisher Migration

| Attribute | Detail |
|-----------|--------|
| **Goal** | Publisher engine (`apps/platform/lib/publisher.ts`) uses typed Prisma via `@yunwu/brand-db` instead of raw SQL |
| **Files to modify** | `apps/platform/lib/publisher.ts` |
| **Database change?** | ❌ No |
| **Deploy?** | ⚠️ Yes — publisher is production-critical |
| **Risk** | 🟡 Medium — publisher is complex with raw SQL state machine |
| **Validation** | `pnpm build` + review publisher routes in test |
| **Rollback** | Restore from git |
| **Agent** | Claude |

### Phase F: Web/Storefront Cleanup

| Attribute | Detail |
|-----------|--------|
| **Goal** | Decommission or freeze `apps/web` |
| **Files to delete** | `apps/web/` (entire directory, after confirming yunwu-origin parity) |
| **Files to modify** | Root `vercel.json` (remove `@yunwu/web` reference) |
| **Database change?** | ❌ No |
| **Deploy?** | ⚠️ Only vercel.json change |
| **Risk** | 🟡 Medium — must confirm yunwu-origin covers all web functionality |
| **Validation** | Full `pnpm build:all` without web; verify yunwu-origin builds independently |
| **Rollback** | Restore `apps/web/` and vercel.json from git |
| **Agent** | Claude |

### Phase G: Old Table → `brand_*` Data Migration Design

| Attribute | Detail |
|-----------|--------|
| **Goal** | Design (but do not execute) the data migration from old tables to `brand_*` tables |
| **Scope** | Migration script design, dual-write period specification, rollback plan |
| **Database change?** | ❌ No (design only) |
| **Deploy?** | ❌ No |
| **Risk** | 🟢 Low — design only |
| **Validation** | Review migration plan |
| **Agent** | Claude |

### Phase H: Legacy Schema and Client Deletion

| Attribute | Detail |
|-----------|--------|
| **Goal** | Delete all frozen schemas and their associated generated clients |
| **Files to delete** | `apps/brand-os/prisma/schema.prisma`, `apps/web/prisma/schema.prisma`, `apps/erp/prisma/schema.prisma` |
| **Files to modify** | All `package.json` files with `postinstall: npx prisma generate` |
| **Precondition** | All apps have migrated to `@yunwu/db` or `@yunwu/brand-db` |
| **Database change?** | ❌ No |
| **Deploy?** | ⚠️ Yes |
| **Risk** | 🟢 Low — only removes unused files |
| **Validation** | `pnpm install && pnpm build:all` |
| **Rollback** | Restore deleted files from git |
| **Agent** | Claude |

---

## G. Risk Register

| Risk | Phase | Likelihood | Impact | Mitigation |
|------|-------|------------|--------|-----------|
| `@yunwu/brand-db` schema drifts from actual Brand DB | B | 🟡 Medium | 🔴 Runtime P2022 errors | Run `prisma db pull` against Brand DB before finalizing schema |
| Brand OS type names differ between old client and new package | C | 🟡 Medium | 🟡 Build-time TS errors | Use type re-exports or migration types |
| Platform brand module raw SQL translation is incorrect | D | 🟡 Medium | 🔴 Brand management broken in production | Compare query results before/after; deploy with feature flag or canary |
| Publisher state machine relies on raw SQL edge cases | E | 🟡 Medium | 🔴 Published content state corrupted | Write integration tests for all state transitions before migration |
| `apps/web` has functionality not in yunwu-origin | F | 🟢 Low | 🟡 User-facing regression | Audit `apps/web` routes against yunwu-origin before deletion |
| `packages/db` still has Brand models mapped to `brand_*` that now belong in `@yunwu/brand-db` | B | 🟢 Low | 🟢 Documentation inconsistency | Keep models in both with cross-reference comments; remove from `packages/db` when migration is complete |
| Hardcoded DB URLs in 3 service files | D | 🔴 Present | 🟡 Credential leak | Remove during Phase D; replace with `@yunwu/brand-db` |

---

## H. Validation and Rollback Plan

| Validation | A | B | C | D | E | F | G | H |
|-----------|---|---|---|---|---|---|---|---|
| `pnpm install` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| `pnpm build:all` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| `pnpm --filter @yunwu/brand-db generate` | N/A | ✅ | ✅ | ✅ | ✅ | N/A | N/A | ✅ |
| Brand OS product CRUD | N/A | N/A | ✅ | ✅ | ✅ | N/A | N/A | ✅ |
| Brand OS series CRUD | N/A | N/A | ✅ | ✅ | ✅ | N/A | N/A | ✅ |
| Platform brand pages work | N/A | N/A | N/A | ✅ | ✅ | N/A | N/A | ✅ |
| Publisher state transition test | N/A | N/A | N/A | N/A | ✅ | N/A | N/A | ✅ |
| yunwu-origin builds independently | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | N/A |
| No frozen schema files | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ |
| No `@prisma/brand-client` / `@prisma/web-client` imports | N/A | N/A | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |

**Rollback for any phase:** `git revert <phase-commit> && pnpm install && pnpm build:all`

---

## I. Recommended First Implementation Ticket

### Title: Phase B — Create `@yunwu/brand-db` package with Brand Runtime schema and client

**Scope:**
1. Create `packages/brand-db/` directory structure
2. Write `schema.prisma` containing all Brand Runtime models (old tables as Legacy* + target brand_* models)
3. Write `index.ts` with `createBrandDb()`, `getBrandDb()` following the same pattern as `packages/db/brand.ts`
4. Add `@yunwu/brand-db` to `pnpm-workspace.yaml`
5. Verify `pnpm --filter @yunwu/brand-db generate` generates a valid client
6. Verify `pnpm build:all` succeeds (no consumers yet, so no build failures expected)

**Explicitly NOT in scope:**
- Migration of any app to the new package (Phase C onward)
- Deletion of any frozen schema (Phase H)
- Changes to `packages/db/schema.prisma`
- Database migration or data changes

**Files to create:**
```
packages/brand-db/package.json
packages/brand-db/schema.prisma
packages/brand-db/index.ts
packages/brand-db/tsconfig.json
```

**Files to modify:**
```
pnpm-workspace.yaml
```

**Owner:** Claude

---

## J. Summary

```
CONTEXT OWNERSHIP MODEL:
ESTABLISHED — 4 bounded contexts, 2 databases, 2 canonical schemas, 0 frozen copies (target).

BRAND RUNTIME CLIENT:
@yunwu/brand-db (new package) — Option A, recommended.

SCHEMA AUTHORITY:
One authoritative schema per database, not one schema for the entire monorepo.

WEB/STOREFRONT:
apps/web is legacy; yunwu-origin is the production storefront.

NEXT ACTION:
Phase B — Create @yunwu/brand-db package.

FILE COUNT TOUCHED (entire program):
~20 files created (packages/brand-db/)
~40 files modified (import paths, action files)
~4 files deleted (frozen schemas)
~1 directory deleted (apps/web/, if decommissioned)

No database changes required for any phase except G (data migration design).
```

---

**This audit was read-only. No files were modified. No database was accessed. No deployment was executed.**
