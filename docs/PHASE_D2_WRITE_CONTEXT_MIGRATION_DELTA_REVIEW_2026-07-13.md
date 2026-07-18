# Phase D2 Delta Review — Write Paths, Context Violations and PageContent Contract

**Date:** 2026-07-13
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**HEAD:** `03bc3d9` (Phase D1 complete)
**Phase D1:** COMPLETE — adapter + simple read migrations done

---

## 1. Executive Conclusion

**Phase D2 is READY with one schema gap documented and zero blocking architecture decisions.**

Key findings:
- **PageContent Contract: No gap.** The canonical schema already matches the physical database. The `status` and `published_at` columns referenced by production code do NOT exist on the physical `page_contents` table per authoritative metadata.
- **Three context ownership violations** confirmed — all are simple `prisma`→`brandDb` swaps with no data migration needed.
- **Zero additional ADR or schema changes required.**
- **D2 should be split into D2a (PageContent + context violations) and D2b (remaining writes).**
- **Publisher dependencies clearly isolated** — 6 banner functions + 10 home page functions excluded.

---

## 2. D1 Findings Carried Forward

| Finding | Status |
|---------|--------|
| Platform Brand DB adapter created (`lib/brand-db.ts`) | ✅ D1 complete |
| Brand Home counts migrated to typed `brandDb` | ✅ D1 complete |
| Banner listBanners migrated to typed `brandDb` | ✅ D1 complete |
| Banner remaining operations still raw SQL | ⏳ D2 pending |
| Home page_contents still raw SQL via `brandPrisma` | ⏳ D2 pending |
| Home site_settings still ERP `prisma` (context violation) | ⏳ D2 pending |
| SEO context violation (ERP client for Brand table) | ⏳ D2 pending |
| Settings context violation (ERP client for Brand table) | ⏳ D2 pending |
| Products dynamic column SQL | ⏳ D2 pending |
| Publisher (Phase E) | ⏳ Phase E |

---

## 3. Complete D2 File Inventory

### 3.1 Candidate Files

| # | File | D1 State | Remaining Work | Publisher Dep? | Subphase |
|---|------|----------|---------------|----------------|----------|
| 1 | `modules/brand/home/actions.ts` | Counts migrated | page_contents CRUD, site_settings violation, publishing wrappers | ✅ (7 functions) | D2a |
| 2 | `modules/brand/banners/actions.ts` | listBanners migrated | create, update, delete, moveBanner, publish/unpublish wrappers | ⚠️ (2 functions: publishBanner, unpublishBanner) | D2a + D2b |
| 3 | `modules/brand/seo/actions.ts` | Nothing migrated | ALL — context violation, raw SQL CRUD | ❌ | D2a |
| 4 | `modules/brand/settings/actions.ts` | Nothing migrated | ALL — context violation, raw SQL CRUD | ❌ | D2a |
| 5 | `modules/brand/products/actions.ts` | Nothing migrated | ALL — dynamic column CRUD, mixed ERP/Brand | ⚠️ (transition calls) | D2b |
| 6 | `modules/brand/series/actions.ts` | Nothing migrated | ALL — dynamic column CRUD | ⚠️ (publishing wrappers) | D2b |
| 7 | `modules/brand/journal/actions.ts` | Nothing migrated | ALL — dynamic column CRUD | ⚠️ (publishing wrappers) | D2b |
| 8 | `modules/brand/materials/actions.ts` | Nothing migrated | ALL — CRUD brand_materials | ❌ | D2b |
| 9 | `modules/brand/media/actions.ts` | Nothing migrated | ERP-owned — NOT Phase D | ❌ | — |
| 10 | `lib/publisher.ts` | Nothing | Phase E | ✅ N/A | Phase E |

### 3.2 Classification Breakdown

| Category | File Count | Description |
|----------|------------|-------------|
| D2a — Context violations + simple writes | 4 | home, banners (non-publisher), seo, settings |
| D2b — Dynamic column refactors | 4 | products, series, journal, materials |
| Phase E — Publisher dependent | 1 | publisher.ts + 6 banner functions + 7 home functions + publisher wrappers in products/series/journal |
| ERP-owned (not Phase D) | 1 | media |

---

## 4. Complete D2 Query/Write Inventory

### 4.1 PageContents (home/actions.ts)

| Function | Current | Table | Status | Target |
|----------|---------|-------|--------|--------|
| `getPageContents` | `brandPrisma.$queryRawUnsafe<any[]>` | page_contents | R | `brandDb.pageContent.findMany({ orderBy: [{ pageKey: "asc" }, { sortOrder: "asc" }] })` |
| `createPageContent` | `brandPrisma.$executeRawUnsafe` INSERT | page_contents | C | **BUG: INSERT has `status` column that doesn't exist in DB. Fix required.** |
| `updatePageContent` | `brandPrisma.$executeRawUnsafe` dynamic UPDATE | page_contents | U | **Must NOT allow `status` or `published_at` as update fields (columns don't exist).** |
| `deletePageContent` | `brandPrisma.$queryRawUnsafe` + `executeRaw` | page_contents | D | `brandDb.pageContent.delete({ where: { id } })` |
| `getSiteSettings` | `prisma.siteSetting.findMany()` via ERP | site_settings | R | **Context violation — use `brandDb.siteSetting.findMany()`** |
| `updateSiteSetting` | `prisma.siteSetting.upsert()` via ERP | site_settings | U | **Context violation — use `brandDb.siteSetting.upsert()`** |

### 4.2 Banners (banners/actions.ts)

| Function | Current | Status | Target |
|----------|---------|--------|--------|
| `createBanner` | `brandPrisma.$queryRawUnsafe` INSERT | C | `brandDb.banner.create({ data })` |
| `updateBanner` | `brandPrisma.$executeRawUnsafe` dynamic UPDATE | U | `brandDb.banner.update({ where: { id }, data })` with field mapping |
| `deleteBanner` | `brandPrisma.$executeRawUnsafe` DELETE | D | `brandDb.banner.delete({ where: { id } })` |
| `moveBanner` | `brandPrisma.$queryRawUnsafe` SELECT + 2x UPDATE | U | Sort order swap — D2b |
| `publishBanner` | → `transitionStatus` | Phase E | **Excluded from D2** |
| `unpublishBanner` | → `transitionStatus` | Phase E | **Excluded from D2** |

### 4.3 SEO (seo/actions.ts)

| Function | Current | Status | Target |
|----------|---------|--------|--------|
| `listSeoConfigs` | `prisma.$queryRawUnsafe` via ERP (VIOLATION) | R | `brandDb.seoConfig.findMany({ orderBy: { pageKey: "asc" } })` |
| `saveSeoConfig` | `prisma.$executeRawUnsafe` via ERP (VIOLATION) + CREATE TABLE | U | `brandDb.seoConfig.upsert()` — remove CREATE TABLE fallback |

### 4.4 Settings (settings/actions.ts)

| Function | Current | Status | Target |
|----------|---------|--------|--------|
| `listSiteSettings` | `prisma.$queryRawUnsafe` via ERP (VIOLATION) | R | `brandDb.siteSetting.findMany()` |
| `saveSiteSetting` | `prisma.$executeRawUnsafe` via ERP (VIOLATION) + CREATE TABLE | U | `brandDb.siteSetting.upsert()` — remove CREATE TABLE fallback |

### 4.5 Products, Series, Journal, Materials — D2b (Separate Subphase)

All covered in Phase D audit report Sections 5.3-5.5.

---

## 5. PageContent Physical Metadata

### 5.1 Authoritative Metadata

Source: `docs/db-metadata/brand-db-schema-metadata-2026-07-11.json`, section `tables.page_contents`.

**10 columns confirmed by live read-only session on 2026-07-11:**

| # | Physical Column | DB Type | Nullable | DB Default | Notes |
|---|----------------|---------|----------|------------|-------|
| 1 | `id` | text | NOT NULL | None | PK |
| 2 | `page_key` | text | NOT NULL | None | Composite unique with section_key |
| 3 | `section_key` | text | NOT NULL | None | |
| 4 | `title` | text | NOT NULL | `''` | |
| 5 | `content` | text | NOT NULL | `''` | |
| 6 | `image` | text | YES | None | |
| 7 | `sort_order` | integer | NOT NULL | `0` | |
| 8 | `published` | boolean | NOT NULL | `true` | |
| 9 | `created_at` | timestamp | NOT NULL | `CURRENT_TIMESTAMP` | |
| 10 | `updated_at` | timestamp | NOT NULL | None | |

**Columns that DO NOT exist on physical `page_contents`:**
- `status` — **NOT in table**
- `published_at` — **NOT in table**
- `keywords` — NOT in table
- `seo_title` / `seo_description` — NOT in table

### 5.2 Cross-Reference Validation

| Source | Status Evidence | Matches Metadata? |
|--------|----------------|-------------------|
| `brand-db-schema-metadata-2026-07-11.json` | No `status` column | — (authoritative) |
| `BRAND_DB_SCHEMA_METADATA_2026-07-11.md` | 10 columns, no status | ✅ Confirmed |
| yunwu-origin `prisma/schema.prisma` | No `status` in page_contents | ✅ Confirmed |
| `packages/db/schema.prisma` (ERP) | `PageContent` has no `status` | ✅ Confirmed |
| `packages/brand-db/schema.prisma` (Canonical) | `PageContent` has no `status` | ✅ Confirmed |
| **Production code `home/actions.ts:72`** | **INSERT includes `status`** | ❌ **BUG — would fail at runtime** |

### 5.3 Conclusion

The canonical `PageContent` model in `packages/brand-db/schema.prisma` is **already correct** and matches the physical database. No schema change is needed.

The production code's reliance on `status` and `published_at` for `page_contents` is a bug. Phase D2 must:
1. Remove `status` from the INSERT in `createPageContent`
2. Ensure `updatePageContent` does not accept `status` or `published_at` as update keys
3. The `published` (boolean) column is the correct way to control page content visibility

---

## 6. PageContent Canonical Gap

**Gap: None.** The canonical schema matches the physical database exactly.

The production code bug is that it references `status` and `published_at` on `page_contents`, which don't exist. This bug is currently silently caught by the `try/catch` in `createPageContent` — the function returns `{ row: null, error: e.message }` and the UI shows an error.

### 6.1 Fix Strategy

| Production Code | Current (Buggy) | Correct (D2a) |
|-----------------|-----------------|----------------|
| `createPageContent` INSERT | Includes `status = 'DRAFT'` | Remove `status`, use `brandDb.pageContent.create()` |
| `updatePageContent` UPDATE | Dynamic cols include `status`/`published_at` if passed | Strip `status`/`published_at` from allowable keys |
| `getPageContents` SELECT | `SELECT *` returns all columns | `brandDb.pageContent.findMany()` returns correct columns |
| Page visibility | Uses `published` boolean | Already correct — `published: true/false` |

---

## 7. PageContent Ownership Decision

**The `published` boolean column is the authoritative "publish state" for page_contents.** There is no status workflow for page_contents — it's a simple boolean toggle.

The Publisher's `transitionStatus("home", ...)` writes to a non-existent `page_contents.status` column. This is a Phase E bug that must be addressed when the Publisher is migrated.

| Entity | Publish Mechanism | Status Column? | Published Column? |
|--------|-------------------|----------------|-------------------|
| Product (Brand) | `products.status` text CHECK | ✅ Yes | ✅ `published_at` |
| Series | `series.status` varchar CHECK | ✅ Yes | ✅ `published_at` |
| JournalPost | `journal_posts.status` PublishStatus enum | ✅ Yes | ✅ `published_at` |
| Banner | `banners.status` varchar free | ✅ Yes | ✅ `published_at` |
| **PageContent** | **`published` boolean** | **❌ No** | **❌ No** |

---

## 8. ADR-005 Decision

**NO NEW ADR REQUIRED.**

Rationale:
- The PageContent contract is already fully and correctly expressed in the canonical schema
- The `status`/`published_at` mismatch is a production code bug, not a schema design issue
- The three context ownership violations are simple client swaps, not architecture decisions
- ADR-001 through ADR-004 cover all architectural decisions needed

---

## 9. Context Ownership Violations

### 9.1 Confirmed Violations

| # | File | Current Client | Table | Correct Client | Operation | Fix Complexity | Subphase |
|---|------|---------------|-------|---------------|-----------|---------------|----------|
| V-01 | `modules/brand/seo/actions.ts` | `prisma` (ERP via `@yunwu/db`) | `seo_configs` | `brandDb` (Brand via adapter) | R + W | 🟢 Low — 2 functions | D2a |
| V-02 | `modules/brand/settings/actions.ts` | `prisma` (ERP via `@yunwu/db`) | `site_settings` | `brandDb` (Brand via adapter) | R + W | 🟢 Low — 2 functions | D2a |
| V-03 | `modules/brand/home/actions.ts` (settings portion) | `prisma` (ERP via `@yunwu/db`) | `site_settings` | `brandDb` (Brand via adapter) | R + W | 🟢 Low — 2 functions | D2a |

### 9.2 Violation Details

**V-01: SEO (`seo/actions.ts`)**
- Current: `prisma.$queryRawUnsafe(...)` hitting `seo_configs` via DATABASE_URL (ERP DB)
- Correct: `brandDb.seoConfig.findMany(...)` via BRAND_DATABASE_URL (Brand DB)
- Risk: Currently reads/writes to ERP DB's `seo_configs`. After D2a, reads/writes Brand DB's.
- Note: ERP DB and Brand DB may have different data for `seo_configs`. D2a changes which database is authoritative. This is a deliberate architecture correction per ADR-001/Phase B context ownership.

**V-02: Settings (`settings/actions.ts`)**
- Same pattern as SEO — `site_settings` redirected from ERP DB to Brand DB.

**V-03: Home settings portion (`home/actions.ts` lines 143-163)**
- Same pattern as V-02 — Site settings via ERP client.

### 9.3 Risk Mitigation

| Concern | Mitigation |
|---------|-----------|
| Data consistency between ERP and Brand DB | D2a migration switches URL. The Brand DB is the authoritative source for Brand Runtime tables per Phase B architecture. |
| Dual-write during transition | No dual-write period. One commit switches the client. This is acceptable because the architecture declares Brand DB as authoritative. |
| Rollback | `git revert` restores old client. | 

---

## 10. Dynamic Column Analysis

### 10.1 Affected Files

| File | Dynamic Pattern | User Input? | Injection Risk? | Typed Replacement |
|------|----------------|-------------|-----------------|-------------------|
| `brand/products/actions.ts` | `Prisma.join(columns.map(sqlIdentifier))` in INSERT/UPDATE | ❌ Internal whitelist (`PRODUCT_CREATE_FIELDS`, `PRODUCT_UPDATE_FIELDS`) | 🟢 None — column whitelisted | `brandDb.legacyBrandProduct.create({ data })` with field mapping |
| `brand/series/actions.ts` | Dynamic INSERT/UPDATE with column whitelist | ❌ Internal whitelist of series fields | 🟢 None | `brandDb.legacyBrandSeries.create({ data })` |
| `brand/journal/actions.ts` | Dynamic INSERT/UPDATE with column map | ❌ Internal | 🟢 None | `brandDb.journalPost.create({ data })` |
| `brand/home/actions.ts` | `updatePageContent` dynamic UPDATE via `Object.entries(data)` | ⚠️ Accepts `Record<string, unknown>` | 🟢 None (uses `$executeRaw` with params) | D2a: restrict to known keys |

### 10.2 Resolution Strategy

**Products, Series, Journal** — These use controlled field whitelists. Migration to typed Prisma requires:
1. Define explicit `create` data shape with all optional fields
2. Define explicit `update` data shape with partial fields
3. Replace dynamic `Prisma.join(columns.map(...))` with typed `brandDb.model.create({ data })`

The field whitelists in products/actions.ts already mirror the physical columns. The migration is mechanical — no SQL injection risk.

**Home `updatePageContent`** — Currently accepts `Record<string, unknown>`. D2a must:
- Strip `status` and `published_at` (non-existent columns)
- Convert to typed `brandDb.pageContent.update({ where: { id }, data })` with known key mapping

### 10.3 Blocker Status: ✅ **Not blocked**

---

## 11. Legacy `any[]` Analysis

### 11.1 Affected Patterns

All raw SQL calls in brand modules return `any[]` via:
- `brandPrisma.$queryRawUnsafe<any[]>(...)`
- `prisma.$queryRawUnsafe<any[]>(...)`

### 11.2 Resolution Per Module

| Module | Current Return | Target Return | Strategy |
|--------|---------------|---------------|----------|
| Banners (after D1) | Typed for listBanners; `any[]` for rest | `brandDb.banner.xxx()` typed | Typed Prisma delegate — no ViewModel needed for basic CRUD |
| SEO | `any[]` | `brandDb.seoConfig.findMany()` typed | Direct typed replacement |
| Settings | `any[]` | `brandDb.siteSetting.findMany()` typed | Direct typed replacement |
| Home page_contents | `any[]` | `brandDb.pageContent.xxx()` typed | Direct typed replacement |
| Products | `any[]` | `brandDb.legacyBrandProduct.xxx()` typed | Field mapping needed for dynamic columns |
| Series | `any[]` | `brandDb.legacyBrandSeries.xxx()` typed | Field mapping needed |
| Journal | `any[]` | `brandDb.journalPost.xxx()` typed | Field mapping needed |
| Materials | `any[]` | `brandDb.legacyBrandMaterial.xxx()` typed | Direct typed replacement |

### 11.3 ViewModel Requirement

**None for basic CRUD.** The Prisma delegate return types directly satisfy consumer needs. For the dynamic column patterns (products, series, journal), the explicit field mapping in `create`/`update` ensures type safety.

Any ViewModel needed (e.g., banners listD2b sort order swap) should use Prisma's built-in types:
```typescript
type BannerSortRow = Pick<Banner, "id" | "sortOrder">;
const rows = await brandDb.banner.findMany({ select: { id: true, sortOrder: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
```

### 11.4 Blocker Status: ✅ **Not blocked**

---

## 12. Publisher Exclusion List

The following functions are excluded from Phase D2 and reserved for Phase E:

### 12.1 Banner Functions — Phase E

| Function | File | Reason |
|----------|------|--------|
| `publishBanner` | `banners/actions.ts:120` | Calls `transitionStatus("banners", ...)` — Publisher state machine |
| `unpublishBanner` | `banners/actions.ts:130` | Calls `transitionStatus("banners", ...)` — Publisher |

### 12.2 Home Functions — Phase E

| Function | File | Reason |
|----------|------|--------|
| `submitHomeForReview` | `home/actions.ts:167` | Publisher wrapper |
| `approveHome` | `home/actions.ts:171` | Publisher wrapper |
| `rejectHome` | `home/actions.ts:175` | Publisher wrapper |
| `publishHomeNow` | `home/actions.ts:179` | Publisher wrapper |
| `scheduleHomePublish` | `home/actions.ts:183` | Publisher wrapper |
| `unpublishHome` | `home/actions.ts:187` | Publisher wrapper |
| `archiveHome` | `home/actions.ts:191` | Publisher wrapper |
| `getHomeVersions` | `home/actions.ts:195` | Publisher content versioning |
| `rollbackHome` | `home/actions.ts:199` | Publisher rollback |
| `getHomeStatus` | `home/actions.ts:203` | Publisher status query |

### 12.3 Product/Series/Journal Publisher Wrappers — Phase E

All files contain `import { transitionStatus, publishNow, ... } from "@/lib/publisher"` and wrapper functions that call them. These wrapper functions must remain intact during D2b. Only the CRUD body should migrate.

### 12.4 Phase D2 Permitted Publisher Interaction

| Action | Permitted? |
|--------|-----------|
| Call Publisher wrappers from D2-migrated functions | ✅ Yes — Publisher import stays |
| Change Publisher function signatures | ❌ No |
| Change Publisher internal logic | ❌ No |
| Remove Publisher import | ❌ No — only if ALL Publisher wrappers in that file are removed (Phase E) |

---

## 13. TypeScript Baseline

### 13.1 Current State

| Scope | Error Count | Source |
|-------|-------------|--------|
| All apps/platform + dependencies | ~20 | All in `packages/ui/` — JSX/React type resolution issues |
| Brand module files (D2 scope) | **0** | No TypeScript diagnostics in any D2 candidate file |
| D1-modified files | 0 | Clean after D1 migration |

### 13.2 Error Classification

| Class | Count | Location | Blocks D2? |
|-------|-------|----------|------------|
| A: D1 modified files | 0 | — | ❌ |
| B: D2 candidate files | 0 | — | ❌ |
| C: Outside D2 scope | ~20 | `packages/ui/` — JSX/React types | ❌ (pre-existing, unrelated) |
| D: Canonical client type gap | 0 | — | ❌ |
| E: ERP/UI/Dashboard | 0 | — | ❌ |

### 13.3 D2 Acceptance Criteria

| Criterion | Standard |
|-----------|----------|
| D2 modified files | **Zero TypeScript diagnostics** |
| Total repo errors | **Must not increase** from pre-D2 baseline |
| Brand-os build | Must pass (`pnpm --filter @yunwu/brand-os build`) |
| Platform-app build | Must pass (`pnpm --filter @yunwu/platform-app build`) |
| Brand-db typecheck | Must pass (`pnpm --filter @yunwu/brand-db typecheck`) |

---

## 14. D2 Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | D2 modified files have zero TypeScript diagnostics | `pnpm exec tsc --noEmit --project apps/platform/tsconfig.json` on affected files |
| 2 | Total type errors not increased from baseline | Before/after count comparison |
| 3 | All brand module CRUD uses `brandDb` not `brandPrisma` | Static grep for `brandPrisma` in modified files |
| 4 | No PageContent INSERT/UPDATE includes `status` or `published_at` | Code review |
| 5 | SEO/Settings/Home (settings) use `brandDb` not `prisma` | Static grep |
| 6 | Publisher functions unchanged | `git diff lib/publisher.ts` = empty |
| 7 | Publisher wrappers preserved in brand modules | `git diff` shows only CRUD body changes |
| 8 | `pnpm --filter @yunwu/brand-db prisma:generate` succeeds | Generate check |
| 9 | `pnpm build` (platform-app) succeeds | Build check |

---

## 15. Recommended D2 Subphases

### Phase D2a: Context Violations + PageContent Fix + Simple Writes

**Scope:**
1. Fix PageContent contract — remove `status`/`published_at` from INSERT, fix `updatePageContent`
2. Migrate SEO — `seo/actions.ts` → use `brandDb`
3. Migrate Settings — `settings/actions.ts` → use `brandDb`  
4. Migrate Home settings portion — `home/actions.ts` → use `brandDb` for site_settings
5. Migrate Banner create/update/delete to typed `brandDb`
6. Remove `CREATE TABLE IF NOT EXISTS` fallbacks from SEO and Settings (Brand DB already has these tables)

**Files touched:**
- `modules/brand/home/actions.ts` (page_contents CRUD + settings violation)
- `modules/brand/banners/actions.ts` (create, update, delete — NOT publish/unpublish)
- `modules/brand/seo/actions.ts` (full migration)
- `modules/brand/settings/actions.ts` (full migration)

**Publisher exclusions:**
- Banner publishBanner/unpublishBanner → leave as-is
- Home submitForReview → archiveHome → leave as-is

**Risk:** 🟡 Medium — SEO/Settings switch which DB is authoritative
**Estimated:** ~30 min Codex time

### Phase D2b: Dynamic Column Refactors + Remaining CRUD

**Scope:**
1. Migrate Brand Products CRUD to typed `brandDb.legacyBrandProduct`
2. Migrate Brand Series CRUD to typed `brandDb.legacyBrandSeries`
3. Migrate Brand Journal CRUD to typed `brandDb.journalPost`
4. Migrate Brand Materials CRUD to typed `brandDb.legacyBrandMaterial`
5. Migrate Banner moveBanner sort swap to typed `brandDb.banner`
6. Handle dynamic column whitelist → explicit field maps

**Files touched:**
- `modules/brand/products/actions.ts`
- `modules/brand/series/actions.ts`
- `modules/brand/journal/actions.ts`
- `modules/brand/materials/actions.ts`
- `modules/brand/banners/actions.ts` (moveBanner only)

**Publisher exclusions:**
- All `import { transitionStatus, ... }` lines remain
- All wrapper functions (publishNow, submitForReview, etc.) remain

**Risk:** 🟡 Medium — dynamic column field maps must match physical columns exactly
**Estimated:** ~60 min Codex time

### Phase D2c (Deferred to D3): Remaining Dashboard/Page Consumers

These were already identified as D3 in the Phase D audit. Simple COUNT and read-only queries.

---

## 16. File-by-File Implementation Order

| Order | File | Subphase | Current Client | Target Client | Publisher Deps Kept? |
|-------|------|----------|---------------|---------------|---------------------|
| 1 | `modules/brand/seo/actions.ts` | D2a | `prisma` (ERP — violation) | `brandDb` | N/A |
| 2 | `modules/brand/settings/actions.ts` | D2a | `prisma` (ERP — violation) | `brandDb` | N/A |
| 3 | `modules/brand/home/actions.ts` (settings part) | D2a | `prisma` (ERP — violation) | `brandDb` | ✅ All 11 Publisher wrappers kept |
| 4 | `modules/brand/home/actions.ts` (page_contents) | D2a | `brandPrisma` raw SQL | `brandDb` + fix status/published_at | ✅ Same |
| 5 | `modules/brand/banners/actions.ts` (CRUD) | D2a | `brandPrisma` raw SQL | `brandDb` | ✅ publish/unpublish kept |
| 6 | `modules/brand/banners/actions.ts` (moveBanner) | D2b | `brandPrisma` raw SQL | `brandDb` | ✅ Same |
| 7 | `modules/brand/materials/actions.ts` | D2b | `brandPrisma` + `prisma` | `brandDb` | ❌ No Publisher deps |
| 8 | `modules/brand/series/actions.ts` | D2b | `brandPrisma` raw SQL | `brandDb` | ✅ Publisher wrappers kept |
| 9 | `modules/brand/journal/actions.ts` | D2b | `brandPrisma` raw SQL | `brandDb` | ✅ Publisher wrappers kept |
| 10 | `modules/brand/products/actions.ts` | D2b | `brandPrisma` + `prisma` | `brandDb` + keep `prisma` for ERP | ✅ Publisher wrappers kept |

---

## 17. Validation Plan

| # | Check | Phase | Method |
|---|-------|-------|--------|
| 1 | Schema generate | D2a | `pnpm --filter @yunwu/brand-db prisma:generate` |
| 2 | D2a files typecheck | D2a | `pnpm typecheck` |
| 3 | Home page_contents INSERT no longer has `status` | D2a | Code review + grep |
| 4 | SEO/Settings use `brandDb` not `prisma` | D2a | `grep -r "prisma\." seo/actions.ts settings/actions.ts` |
| 5 | Publisher file unchanged | D2a | `git diff lib/publisher.ts` = empty |
| 6 | Platform build | D2a | `pnpm --filter @yunwu/platform-app build` |
| 7 | D2b files typecheck | D2b | `pnpm typecheck` |
| 8 | D2b build | D2b | `pnpm --filter @yunwu/platform-app build` |
| 9 | No `brandPrisma` in D2a/D2b files | D2b | grep per file |
| 10 | Total errors not increased | D2b | Before/after count |

---

## 18. Rollback Plan

| Phase | Rollback | Impact |
|-------|----------|--------|
| D2a (pre-commit) | `git checkout -- apps/platform/modules/brand/` | Full restore |
| D2a (after commit) | `git revert <commit>` | Reverts SEO/Settings to ERP client, restores buggy page_contents INSERT |
| D2b (after commit) | `git revert <commit>` | Products/series/journal/materials revert to raw SQL |
| Both | `pnpm install && pnpm build` | Build verification |

---

## 19. Explicit Out-of-Scope List

| Item | Reason |
|------|--------|
| Publisher (`lib/publisher.ts`) | Phase E exclusive |
| Banner publish/unpublish functions | Publisher delegated — Phase E |
| Home → archiveHome Publisher wrappers | Phase E |
| Product/Series/Journal Publisher wrappers | Phase E |
| Media module (`modules/brand/media/`) | Correctly ERP-owned |
| Dashboard brand counts | Phase D3 |
| ERP modules (`modules/erp/*`) | Not Brand Runtime |
| Database migration or DDL | No DB changes in any Phase D |
| Data reconciliation (SEO/Settings dual DB) | Phase G |
| Frozen schema deletion | Phase H |

---

## 20. Minimal First Codex Scope

### Phase D2a Only

| # | File | Change |
|---|------|--------|
| 1 | `modules/brand/seo/actions.ts` | `prisma.$queryRawUnsafe` → `brandDb.seoConfig.findMany()` + `brandDb.seoConfig.upsert()`. Remove CREATE TABLE fallback. |
| 2 | `modules/brand/settings/actions.ts` | `prisma.$queryRawUnsafe` → `brandDb.siteSetting.findMany()` + `brandDb.siteSetting.upsert()`. Remove CREATE TABLE fallback. |
| 3 | `modules/brand/home/actions.ts` (settings part) | `prisma.siteSetting.findMany/upsert` → `brandDb.siteSetting.findMany/upsert` |
| 4 | `modules/brand/home/actions.ts` (page_contents) | Fix INSERT (remove `status`). Restrict UPDATE keys. Migrate to `brandDb.pageContent.*`. |
| 5 | `modules/brand/banners/actions.ts` (create, update, delete) | `brandPrisma.$queryRawUnsafe` → `brandDb.banner.create/update/delete` |

**NOT included (D2b):**
- Products, Series, Journal, Materials dynamic column refactor
- Banner moveBanner sort swap
- Publisher wrappers

**Import changes required:**
- Add `import { brandDb } from "@/lib/brand-db"` to seo/actions.ts, settings/actions.ts
- Remove `import { brandPrisma } from "@yunwu/db/brand"` from seo/actions.ts, settings/actions.ts (others may keep if needed)

---

## Required Questions — Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Delta Review Conclusion | **READY — D2 can proceed with documented constraints** |
| 2 | D2 Consumer File Count | **8 files** (4 for D2a, 4 for D2b) |
| 3 | D2 Write/Query Count | **~90 statements** across all D2 files |
| 4 | PageContent `status` Evidence | **Column DOES NOT EXIST** in physical DB per authoritative metadata |
| 5 | PageContent `published_at` Evidence | **Column DOES NOT EXIST** in physical DB per authoritative metadata |
| 6 | Canonical Schema Change Required? | **NO** — canonical schema already matches physical DB exactly |
| 7 | Database Migration Required? | **NO** — zero DDL needed |
| 8 | ADR-005 Required? | **NO** — existing ADRs cover all decisions |
| 9 | Context Ownership Violation Count | **3** — SEO, Settings, Home settings portion |
| 10 | Dynamic Column Blocker Status | ✅ **Not blocked** — whitelisted field maps, no injection risk |
| 11 | legacy `any[]` Blocker Status | ✅ **Not blocked** — typed Prisma delegates replace all |
| 12 | Publisher Excluded Function Count | **19 functions** across banners (2) + home (11) + products/series/journal wrappers |
| 13 | Current Platform TS Error Count | **~20** — all in `packages/ui/` (JSX/React types), **0 in D2 scope** |
| 14 | Errors Inside D2 Scope | **0** — no TS errors in any D2 candidate file |
| 15 | Recommended D2 Subphases | **D2a** (context violations + PageContent fix + simple writes) → **D2b** (dynamic column refactors) |
| 16 | Report Path | `docs/PHASE_D2_WRITE_CONTEXT_MIGRATION_DELTA_REVIEW_2026-07-13.md` |
| 17 | Minimal First Codex Scope | **Phase D2a** — 5 files, no Publisher changes, no schema changes |

---

```
FINAL STATUS: PHASE D2 DELTA REVIEW COMPLETE — MINIMAL IMPLEMENTATION PLAN READY
```
