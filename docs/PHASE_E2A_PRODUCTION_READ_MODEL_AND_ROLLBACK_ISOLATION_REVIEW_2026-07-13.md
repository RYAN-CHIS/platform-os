# Phase E2A — Production Storefront Read Model and Rollback Isolation Review

**Date:** 2026-07-13
**Backend WORKDIR:** `/Users/ryan/Projects/active/platform-os` @ `7f3ad1e`
**Storefront WORKDIR:** `/Users/ryan/Projects/active/yunwu-origin` @ `bf8fe90`
**apps/web production relevance:** **NONE** — baseline-confirmed legacy copy, Phase F target.

---

## 1. Executive Conclusion

**CASE C — No stable live representation exists.** The production storefront reads current records directly from the Brand DB. Rollback MUST NOT reset status to DRAFT.

**Revised rollback contract: "Restore content fields only; preserve current publish state."** This eliminates the storefront visibility problem without requiring any storefront migration.

**Two ADRs required:**
- **ADR-005** — Published Read Model for Series (series list currently has NO status filter)
- **ADR-006** — Rollback Restoration Contract (content-field-only restore)

---

## 2. Audit Scope Correction

| Source | Production Relevance | Evidence |
|--------|---------------------|----------|
| `platform-os/apps/web` | **NONE** | Baseline §E.1: "apps/web is NOT the production storefront… legacy/in-monorepo copy" |
| `yunwu-origin` (@ bf8fe90) | **ONLY production storefront** | Baseline §2.3: "Deployment: www.yunwuorigin.com ✅" |

All conclusions in this report are based on yunwu-origin code evidence, not apps/web.

---

## 3. Production Storefront Baseline

| Property | Value |
|----------|-------|
| Storefront HEAD | `bf8fe90` — Banner data source unification |
| Database URL | `DATABASE_URL` → Same Brand DB (Singapore) that platform-os writes to |
| ERP Database | `ERP_DATABASE_URL` — read-only for commerce fields |
| Prisma Client | `@prisma/client` from storefront's own schema |
| Product OS | Active — `src/lib/product-os.ts` |

---

## 4. Public Route Consumer Matrix

| Route | Source Function | File | Table | Published Filter |
|-------|---------------|------|-------|-----------------|
| `/` homepage products | `getPublishedProducts()` | `src/lib/product-os.ts:96` | `products` | `status: 'PUBLISHED'` |
| `/` homepage series | `prisma.series.findMany()` | `src/app/page.tsx:51` | `series` | **None** |
| `/` homepage journal | `prisma.journalPost.findMany()` | `src/app/page.tsx:56` | `journal_posts` | `status: 'PUBLISHED'` |
| `/products` | `getPublishedProducts()` | `src/app/products/page.tsx` | `products` | `status: 'PUBLISHED'` |
| `/products/[slug]` PDP | `getPublishedProduct()` | `src/lib/product-os.ts:127` | `products` | `status: 'PUBLISHED'` |
| `/series` | `prisma.series.findMany()` | `src/app/series/page.tsx` | `series` | **None** |
| `/series/[slug]` | `prisma.series.findUnique()` | `src/app/series/[slug]/page.tsx:34` | `series` | **None** |
| `/journal` | `prisma.journalPost.findMany()` | `src/app/journal/page.tsx:41` | `journal_posts` | `status: 'PUBLISHED'` |
| `/journal/[slug]` | `prisma.journalPost.findFirst()` | `src/app/journal/[slug]/page.tsx:15` | `journal_posts` | `status: 'PUBLISHED'` |
| `/api/products` | `prisma.product.findMany()` | `src/app/api/products/route.ts:8` | `products` | `status: 'PUBLISHED'` |
| `/api/posts` | `prisma.journalPost.findMany()` | `src/app/api/posts/route.ts:12` | `journal_posts` | `status: 'PUBLISHED'` |
| `/api/cart` | `prisma.product.findMany()` | `src/app/api/cart/route.ts:11` | `products` | `status: 'PUBLISHED'` |
| Banners | `getPublishedBannersByPlacement()` | `src/lib/banners.ts:41` | `banners` | `status = 'PUBLISHED'` |
| Sitemap | `getPublishedProducts()` + direct Prisma | `src/app/sitemap.ts` | `products`, `series`, `journal_posts` | Products/Journal: `PUBLISHED`. Series: None |

---

## 5. Product OS Read Contract

**File:** `yunwu-origin/src/lib/product-os.ts`

| Aspect | Current Behavior |
|--------|-----------------|
| Reads from | `prisma` → `DATABASE_URL` → **same Brand DB** as platform-os |
| Filters by | `status: 'PUBLISHED'` — **text column** (`products.status`), NOT `publish_status` enum |
| Live table? | ❌ **No** — reads current `products` table directly |
| Published projection? | ❌ **No** |
| Cache/snapshot? | ❌ **No** |
| API call to platform? | ❌ **No** — direct Prisma query to shared DB |
| ERP fallback for commerce fields | ✅ Yes — `fetchErpCommerceFields()` for price/stock when `erp_product_id` is set |
| Used by | PDP, product listing, sitemap, homepage, cart API |

### Key Finding

The `ProductSku.publishStatus` field (line 182) is mapped as `publishStatus: product.status` — it reads from `products.status` (text), NOT `products.publish_status` (enum). The storefront has no awareness of the PublishStatus enum.

---

## 6. Platform Publisher Live Representation Matrix

| Content Type | Current Table | Live Table? | Publish Effect | Unpublish Effect | Storefront Consumer |
|-------------|--------------|-------------|----------------|-------------------|-------------------|
| **Product** | `products` | **NONE** (no separate live table) | `status→PUBLISHED`, `publishStatus→PUBLISHED`, `publishedAt→now()` | `status→DRAFT`, `publishStatus→UNPUBLISHED` | ✅ `products` table, `status: 'PUBLISHED'` |
| **Series** | `series` | **NONE** | `status→PUBLISHED`, `isActive→true` | `status→UNPUBLISHED`, `isActive→false` | ✅ `series` table, **NO status filter** |
| **Journal** | `journal_posts` | **NONE** | `status→PUBLISHED` | `status→UNPUBLISHED` | ✅ `journal_posts` table, `status: 'PUBLISHED'` |
| **Banner** | `banners` | **NONE** | `status→PUBLISHED` (via Publisher) | `status→DRAFT` (via Publisher) | ✅ `banners` table, `status = 'PUBLISHED'` |
| **Home** | `page_contents` | **NONE** | Not consumed by storefront | N/A | ❌ Not consumed |

**content_versions** (`CREATE TABLE ...`) stores historical publish snapshots. It is NOT a live table — it is an append-only version history used exclusively for rollback (`rollbackToVersion`).

---

## 7. Risk Verification

| # | Question | Answer | Evidence |
|---|----------|--------|----------|
| 1 | Product DRAFT → disappears from storefront? | **YES** | `product-os.ts:96` filters `status: 'PUBLISHED'` |
| 2 | PDP reads current table? | **YES** | `product-os.ts:127` — no live table | 
| 3 | Product listing same source as PDP? | **YES** | Both use `product-os.ts` |
| 4 | Series reads current record? | **YES** | `series/page.tsx` — direct Prisma |
| 5 | Journal has public consumer? | **YES** | `journal/[slug]/page.tsx` — `status: 'PUBLISHED'` |
| 6 | Journal DRAFT → disappears? | **YES** | Journal pages filter by `status: 'PUBLISHED'` |
| 7 | Banner live representation? | **NONE** | `banners.ts:41` — raw SQL on same table |
| 8 | Storefront bypasses platform Brand DB? | **NO** | Uses same DB via `DATABASE_URL` |
| 9 | Storefront has own product DB copy? | **NO** | `prisma.ts` connects to same Brand DB |
| 10 | Publisher live table consumed? | **NONE EXISTS** | All storefront reads hit current records |

---

## 8. Architecture Case Classification

**FINAL: CASE C — No Stable Live Representation**

| Criterion | Status |
|-----------|--------|
| Publisher maintains live table? | ❌ No |
| Storefront reads live table? | ❌ No (reads current records) |
| Content survives DRAFT? | ❌ No (disappears from public routes) |
| Rollback to DRAFT safe? | ❌ No (unpublishes content) |
| Storefront migration needed for rollback? | ❌ No (revised contract avoids this) |

---

## 9. Options Considered

### Option A: Restore as New DRAFT (Original plan) — REJECTED

Would unpublish all restored content. Storefront reads current records — DRAFT status removes products/journal from public.

### Option B: Storefront switches to published projection — REJECTED for E2

Would require building a new published read layer AND migrating all storefront routes. Out of scope for current phase.

### Option C: Backend Published Read API — REJECTED for E2

New API layer changes the architecture from direct DB read to service call. Adds latency, caching, authentication complexity.

### Option D: Independent Published Projection Tables — REJECTED for E2

Requires new tables, publish-time double-writes, backfill, and storefront migration. Phase G territory.

### Option E: Rollback Restores as PUBLISHED — REJECTED

Bypasses editorial review. Content fields from old snapshot go directly live. Violates "new draft" principle.

### OPTION F: Content-Field-Only Restore (RECOMMENDED)

| Aspect | Decision |
|--------|----------|
| Content fields restored? | ✅ YES — title, body, images, SEO, etc. |
| Status/PublishStatus restored? | ❌ **NO** — preserved as-is |
| PublishedAt restored? | ❌ **NO** — preserved as-is |
| Storefront visibility? | ✅ **Unaffected** — status stays PUBLISHED |
| Storefront migration? | ❌ **NOT required** |
| Schema change? | ❌ **NOT required** |
| Data backfill? | ❌ **NOT required** |

---

## 10. Recommended Rollback Contract

**"Restore content fields only; preserve current publish state."**

| Content Type | Status After Rollback | Storefront Visible? | New Version? | Audit? |
|-------------|----------------------|-------------------|--------------|--------|
| **Product** | Unchanged (stays PUBLISHED) | ✅ Yes | ✅ RESTORED | ✅ |
| **Journal** | Unchanged (stays PUBLISHED) | ✅ Yes | ✅ RESTORED | ✅ |
| **Series** | Unchanged (no status filter anyway) | ✅ Yes | ✅ RESTORED | ✅ |
| **Banner** | Unchanged (stays PUBLISHED) | ✅ Yes | ✅ RESTORED | ✅ |
| **Home/PageContent** | Unchanged | N/A | ✅ RESTORED | ✅ |

### Content Field Whitelist

**Products:** sku, name, slug, seriesId, theme, story, materials, costPrice, salePrice, coverImage, gallery, stock, inspiration, keywords, lifeStage, suitableFor, sortOrder, materialOrigin, craftMethod, completionDate, serialNumber, creationStory, emotionalState, companionsCount, remainingQty, productType

**NOT restored:** id, status, publishStatus, publishedAt, createdAt, updatedAt, erpProductId

**Journal:** title, slug, excerpt, content, coverImage, coverAlt, readingTime, category, seoTitle, seoDescription, sortOrder

**NOT restored:** id, status, publishedAt, createdAt, updatedAt

**Series:** slug, name, description, coverImage, heroText, longDesc, shortDesc, sortOrder

**NOT restored:** id, status, publishedAt, createdAt, updatedAt, isActive

**Banners:** title, subtitle, btnText, imageUrl, mobileImageUrl, linkUrl, position, sortOrder, startAt, endAt

**NOT restored:** id, status, publishedAt, createdAt, updatedAt

---

## 11. Storefront Migration Requirement

**NONE for the revised rollback contract.** The content-field-only restore does not change any status field, so the storefront's `status: 'PUBLISHED'` filters continue to show the content.

**However, an independent observation**: The storefront series listing has NO status filter. Series that have never been published (status = DRAFT) appear on the series listing page. This is a pre-existing concern, not caused by rollback.

---

## 12. Series Filter Gap (Independent Finding)

The series listing page at `src/app/series/page.tsx` and homepage at `src/app/page.tsx:51` read series WITHOUT a `status` or `is_active` filter:

```typescript
// Series list — NO status filter
const series = await prisma.series.findMany({ orderBy: { sortOrder: 'asc' } });
```

This means:
- DRAFT series appear on the public series list
- ARCHIVED series appear on the public series list
- UNPUBLISHED series appear on the public series list

**This is NOT caused by rollback.** This is a pre-existing storefront issue. However, it means rollback for series has NO visibility impact regardless of status change.

**Recommended:** ADR-005 should document this gap but Phase E2B should NOT block on it.

---

## 13. Schema / Data Backfill Requirement

**NONE.** No schema changes, no data backfill required for the revised rollback contract.

---

## 14. Safe Deployment Sequence

| Step | Action | Impact |
|------|--------|--------|
| 1 | Implement rollback field whitelist in `publisher.ts` | No functional change — rollback currently unused or broken |
| 2 | Deploy to platform-os | Rollback now restores content-only |
| 3 | Verify published content unchanged | Storefront shows same products/journal |
| 4 | Remove old rollback raw SQL path | Cleanup |
| 5 | Enable rollback UI | Users restore content without unpublishing |

No storefront deployment required. No coordinated release needed.

---

## 15. ADR Decision

| ADR | Title | Status | File |
|-----|-------|--------|------|
| **ADR-005** | Series Public Read Model Gap | **Not required for E2** — pre-existing issue, document in baseline | N/A |
| **ADR-006** | Publisher Rollback Restoration Contract | **Required** | `docs/adr/ADR-006-PUBLISHER-ROLLBACK-RESTORATION-CONTRACT.md` |

---

## 16. Phase E2B Codex Scope

| # | File | Change |
|---|------|--------|
| 1 | `apps/platform/lib/publisher.ts` | `rollbackToVersion()` — replace current key-exclusion filter with per-content-type field whitelist. Exclude status/publishStatus/publishedAt. Create new RESTORED version. Cancel pending publish_jobs. Write AuditLog. |
| 2 | `scripts/check-publisher-contract.mjs` | Add G-ROLLBACK-* rules |
| 3 | `scripts/check-publisher-contract.test.mjs` | Add rollback field whitelist tests |
| 4 | `docs/YUNWU_MASTER_BASELINE.md` | Update with E2A findings |

### Functions to Keep Untouched

| Function | Reason |
|----------|--------|
| `transitionStatus()` | Already correct — E1 completed |
| All Publisher wrappers in brand modules | Phase E boundary |
| `processPublishJobs()` | Already correct — E1 completed |
| `createVersion()` / `getVersions()` | Already correct |

---

## 17. Deferred Scope

| Item | Reason |
|------|--------|
| Series filter gap | Pre-existing. Not caused by rollback. Independent storefront fix. |
| Published read model / live table | Phase G — if current-record-based read model needs decoupling |
| Storefront read model migration | Not needed for rollback. Future if performance/coupling demands it. |

---

## 18. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Content-only rollback may feel incomplete to editors | Medium | Document explicitly: "Content restored; publish state unchanged" |
| Series page shows unpublished series | Low | Pre-existing issue, not caused by E2 |
| Legacy raw SQL `rollbackToVersion` may break on unknown snapshot shapes | Medium | Per-content-type whitelist rejects unknown fields |

---

## 19. Forbidden Actions

| Action | Reason |
|--------|--------|
| Modify `yunwu-origin` code | Storefront read model NOT changing — no migration needed |
| Modify `apps/web` as production fix | apps/web is legacy Phase F target |
| Set Product/Journal status to DRAFT during rollback | Would unpublish content from storefront |
| Modify schema, add migration, or DDL | Not needed for content-field-only restore |
| Deploy without verifying existing published routes | Must confirm storefront unaffected |

---

## Required Questions — Answers

| Question | Answer |
|----------|--------|
| Product public read source | `products` table, `status: 'PUBLISHED'` — `yunwu-origin/src/lib/product-os.ts:96` |
| Journal public read source | `journal_posts` table, `status: 'PUBLISHED'` — `src/app/journal/page.tsx:41` |
| Series public read source | `series` table, **NO status filter** — `src/app/series/page.tsx` |
| Banner public read source | `banners` table, `status = 'PUBLISHED'` — `src/lib/banners.ts:41` |
| Existing live representation | **NONE** — all reads hit current records directly |
| Storefront migration required | **NO** |
| Product OS change required | **NO** |
| Schema change required | **NO** |
| Data backfill required | **NO** |

---

```
PHASE E2A PRODUCTION READ MODEL REVIEW COMPLETE

Backend WORKDIR:              /Users/ryan/Projects/active/platform-os
Backend HEAD:                 7f3ad1e
Storefront WORKDIR:           /Users/ryan/Projects/active/yunwu-origin
Storefront HEAD:              bf8fe90
apps/web production relevance: NONE
Architecture case:            C — No stable live representation
Product rollback impact:      Content-only restore → NO visibility change
Journal rollback impact:      Content-only restore → NO visibility change
Series rollback impact:       No impact (no status filter already)
Banner rollback impact:       Content-only restore → NO visibility change
Recommended rollback:         "Restore content fields, preserve publish state"
ADR required:                 YES — ADR-006 (Rollback Restoration)
Report path:                  docs/PHASE_E2A_PRODUCTION_READ_MODEL_AND_ROLLBACK_ISOLATION_REVIEW_2026-07-13.md
Modified files:               NONE
Database operations:          NONE
Commit SHA:                   NONE
Push:                         NOT EXECUTED
Codex readiness:              READY
Next phase:                   Phase E2B — Implement rollbackToVersion content-only restore
```
