# Phase E2 — Rollback Snapshot Restoration and Home Status Contract Review

**Date:** 2026-07-13
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**HEAD:** `7f3ad1e` (Phase E1 complete)

---

## 1. Executive Conclusion

**Phase E2 is VIABLE with one required ADR.**

| Area | Status |
|------|--------|
| Publish snapshot | Non-blocking best-effort — KEEP with observability improvement |
| Rollback | Constrained raw restore — REQUIRES ADR-005 to formalize contract |
| Home | Already fully migrated to typed `brandDb`. No remaining Raw SQL for page_contents. |
| ADR required | **YES — ADR-005: Publisher Rollback and Version Restoration Contract** |

---

## 2. E1 Follow-up Commit Analysis

### 2.1 Snapshot Creation Location

`transitionStatus()` at `publisher.ts:290-294` — AFTER the Brand transaction completes:

```
1. brandDb.$transaction ───────────→ read current state
   ├─ persistTransition              → update live table
   └─ persistPublishJob              → create/cancel/complete publish_jobs
2. (outside transaction) ──────────→ getPreviewContent → createVersion snapshot
3. (outside transaction) ──────────→ createAuditLog
```

### 2.2 Snapshot Details

| Aspect | Current Behavior |
|--------|-----------------|
| When | After `$transaction`, before audit log |
| What | `SELECT * FROM live_table WHERE id = $1` (full row) |
| Version | `aggregate({ _max: { version } }) + 1` |
| Status | `PublishStatus.PUBLISHED` |
| Failure | `catch {}` — **silent** |
| Blocks publish? | ❌ No — non-blocking |
| Audit on failure? | ❌ No |

### 2.3 Gap to Close

| Gap | Current | E2 Target |
|-----|---------|-----------|
| Error observability | Silent `catch {}` | `console.error` at minimum |
| Audit on failure | Not written | Optional Phase G |

---

## 3. content_versions Canonical Contract

| Field | Prisma | Physical | Required | Producer | Consumer |
|-------|--------|----------|----------|----------|----------|
| `id` | `String @id @default(dbgenerated("gen_random_uuid()"))` | `id` (text PK) | Auto | Prisma | All |
| `contentType` | `String @map("content_type")` | `content_type` | Yes | Publisher | Version lookup |
| `contentId` | `String @map("content_id")` | `content_id` | Yes | Publisher | Version lookup |
| `version` | `Int @default(1)` | `version` | Auto | Publisher | Ordering, rollback |
| `snapshot` | `Json @default("{}")` | `snapshot` (jsonb) | Yes | Publisher | Rollback source |
| `status` | `String? @default("PUBLISHED")` | `status` | No | Publisher | Display only |
| `createdBy` | `Int? @default(1)` | `created_by` | No | Static | Audit |
| `createdAt` | `DateTime? @default(now()) @db.Timestamptz(6)` | `created_at` | Auto | Database | Ordering |

**Unique:** `(contentType, contentId, version)`. **Index:** `(contentType, contentId)`, `(createdAt)`.

### Snapshot Payload

The snapshot is the full live table row via `SELECT *` at publish time. For each content type:

| Content Type | Snapshot Captures |
|-------------|-------------------|
| Products | ALL columns: id, sku, name, slug, series_id, theme, story, materials, cost_price, sale_price, cover_image, gallery, stock, **status**, **publish_status**, **published_at**, inspiration, keywords, life_stage, suitable_for, erp_product_id, sort_order, material_origin, craft_method, completion_date, serial_number, creation_story, emotional_state, companions_count, remaining_qty, product_type |
| Journal | ALL columns: id, title, slug, excerpt, content, cover_image, cover_alt, reading_time, category, **status**, seo_title, seo_description, **published_at** |
| Banners | ALL columns: id, title, subtitle, btn_text, image_url, mobile_image_url, link_url, position, sort_order, **status**, start_at, end_at, **published_at** |
| Series | ALL columns: id, slug, name, description, coverImage, heroText, **status**, **published_at**, is_active, long_desc, short_desc, sort_order |
| Home/PageContent | ALL columns: id, page_key, section_key, title, content, image, sort_order, **published** (boolean) |

---

## 4. Rollback Current Behavior Analysis

### 4.1 Code Path

`rollbackToVersion()` at `publisher.ts:344-361`:

```
1. Find content_version by (contentType, contentId, targetVersion)
2. Filter snapshot fields — EXCLUDES: id, created_at, updated_at, createdAt, updatedAt
3. Dynamic UPDATE live_table via $executeRawUnsafe
4. createAuditLog for ROLLBACK
5. ⚠️ NO new content_version created
6. ⚠️ NO publish_job cleanup
7. ⚠️ NO preview token invalidation
8. ⚠️ status/publishStatus/published_at ARE restored (not in exclusion list!)
```

### 4.2 Risk: Status Is Restored

The exclusion list is `["id", "created_at", "updated_at", "createdAt", "updatedAt"]`. **`status`, `publishStatus`, `publish_status`, and `published_at` are NOT excluded.** This means rolling back to a historical version overwrites:
- **Product:** `status` and `publish_status` to their values at publish time → bypasses Publisher state machine
- **Journal:** `status` to the publish-time enum value → bypasses Publisher
- **Series/Banner:** `status` to the publish-time value → bypasses Publisher

This directly contradicts E1's established contract that the Publisher is the exclusive owner of status transitions.

### 4.3 Rollback Matrix

| Aspect | Current Behavior | Required by ADR-005 |
|--------|-----------------|---------------------|
| Source | `content_versions.snapshot` (JSON) | ✅ Same |
| Fields restored | All except id, created_at, updated_at | Must exclude status/ownership fields |
| Status restored? | **YES — risk** | ❌ Must NOT restore `status`, `publishStatus`, `publish_status` |
| New version created? | **NO** | Should create new snapshot after restore |
| publish_jobs cleanup? | **NO** | Should cancel pending jobs |
| Preview token invalidation? | **NO** | Should invalidate |
| Audit log? | **YES** | ✅ Required |
| Relations restored? | **NO** (not in snapshot) | ❌ Cannot restore — documented limitation |
| Cross-content-type check? | **NO** (relies on contentType filter) | ✅ Required |

---

## 5. Rollback Formal Semantics

### Recommended: Restore as New Draft (Option A)

| Aspect | Decision |
|--------|----------|
| **User-facing meaning** | "Restore content from a historical publish snapshot as a new DRAFT" |
| **Auto-publish?** | **NO** — restored content does NOT automatically go live |
| **Resulting Product.status** | DRAFT (schema default — Publisher writes) |
| **Resulting Product.publishStatus** | DRAFT (Publisher writes) |
| **Resulting Journal.status** | DRAFT (Publisher writes via @default) |
| **Resulting Series.status** | DRAFT (Publisher writes) |
| **Resulting Banner.status** | DRAFT (Publisher writes) |
| **Resulting Home published** | `false` (boolean — PageContent default) |
| **Live table updated?** | ✅ YES — content fields restored, status reset to DRAFT |
| **New content_version created?** | ✅ YES — captures the "restored as DRAFT" state |
| **Historical versions immutable?** | ✅ YES — NEVER modify existing versions |
| **Pending publish_jobs?** | ✅ Cancelled |
| **Preview tokens?** | ✅ Invalidated |
| **AuditLog written?** | ✅ YES |
| **Rejection metadata preserved?** | ✅ YES (audit trail only) |
| **Rollback from ARCHIVED allowed?** | ✅ YES |
| **Tags/relations restored?** | ❌ NO — snapshot doesn't capture these. Documented limitation. |
| **Media links restored?** | ❌ NO — snapshot captures URLs but not media_references |

---

## 6. Snapshot Restore Whitelist

### 6.1 Products

| Restorable | NOT Restorable |
|------------|----------------|
| sku, name, slug, series_id | `id` (PK, filtered) |
| theme, story, materials | `created_at`, `updated_at` (filtered) |
| cost_price, sale_price | **`status`** (Publisher-owned) |
| cover_image, gallery, stock | **`publish_status`** (Publisher-owned) |
| inspiration, keywords | **`published_at`** (Publisher-managed) |
| life_stage, suitable_for | `updated_at` (filtered) |
| erp_product_id | Product relations (not in snapshot) |
| sort_order | Tags/media (not in snapshot) |
| material_origin, craft_method | |
| completion_date, serial_number | |
| creation_story, emotional_state | |
| companions_count, remaining_qty | |
| product_type | |

### 6.2 Journal

| Restorable | NOT Restorable |
|------------|----------------|
| title, slug, excerpt, content | `id` (PK, filtered) |
| cover_image, cover_alt | `created_at`, `updated_at` (filtered) |
| reading_time, category | **`status`** (Publisher-owned) |
| seo_title, seo_description | **`published_at`** (Publisher-managed) |
| sort_order | Tags (not in snapshot) |

### 6.3 Series

| Restorable | NOT Restorable |
|------------|----------------|
| slug, name, description | `id` (filtered) |
| coverImage, heroText | `created_at`, `updated_at` (filtered) |
| is_active | **`status`** (Publisher-owned) |
| long_desc, short_desc | **`published_at`** (Publisher-managed) |
| sort_order | Products relation |

### 6.4 Banners

| Restorable | NOT Restorable |
|------------|----------------|
| title, subtitle, btn_text | `id` (filtered) |
| image_url, mobile_image_url | `created_at`, `updated_at` (filtered) |
| link_url, position | **`status`** (Publisher-owned) |
| sort_order, start_at, end_at | **`published_at`** (Publisher-managed) |

### 6.5 Home (PageContent)

| Restorable | NOT Restorable |
|------------|----------------|
| page_key, section_key | `id` (filtered) |
| title, content, image | `created_at`, `updated_at` (filtered) |
| sort_order | |
| **`published` (boolean)** | **RESTORABLE** — this is a content field, not a Publisher status |

Note: `published` is the correct boolean column. It was previously part of the revert-target status fix.

---

## 7. Home Status Contract

### 7.1 Current State

Home has been fully migrated to typed `brandDb`. All remaining code at `home/actions.ts`:

| Function | Current API | Target | Status |
|----------|-------------|--------|--------|
| `getBrandStats()` | `brandDb.legacyBrandProduct.count()` etc. | Typed Prisma | ✅ DONE |
| `getPageContents()` | `brandDb.pageContent.findMany()` | Typed Prisma | ✅ DONE |
| `createPageContent()` | `brandDb.pageContent.create()` | Typed Prisma | ✅ DONE |
| `updatePageContent()` | `brandDb.pageContent.update({ where: { id }, data })` | Typed Prisma | ✅ DONE |
| `deletePageContent()` | `brandDb.pageContent.delete({ where: { id } })` | Typed Prisma | ✅ DONE |
| `getSiteSettings()` | `brandDb.siteSetting.findMany()` | Typed Prisma | ✅ DONE |
| `updateSiteSetting()` | `brandDb.siteSetting.upsert()` | Typed Prisma | ✅ DONE |
| Publisher wrappers | `transitionStatus("home", ...)` | Publisher | ⏳ Phase E |

### 7.2 PageContent Contract

`page_contents` has **10 physical columns**: id, page_key, section_key, title, content, image, sort_order, published, created_at, updated_at.

**No `status` column. No `published_at` column.** The `published` boolean IS the authoritative visibility field.

### 7.3 Home View Model

Home does NOT need a new view model. All current stats are typed Prisma `.count()` queries. The `PageContentRow` type is already explicitly typed.

### 7.4 Publisher Home Path (`legacy-raw`)

The Publisher's home entry in the content registry is marked `persistenceKind: "legacy-raw"` because `page_contents` has no `status` or `published_at` columns. The Publisher's `persistTransition("home", ...)` writes to non-existent columns — this is a **documented limitation** that requires a Phase E3 decision (not E2). For E2, the home path remains as-is.

---

## 8. Context Ownership

| Operation | Owner | Notes |
|-----------|-------|-------|
| Version snapshot creation | **Publisher** | publish-time side effect |
| Version reading | **Publisher / Version Service** | `getVersions()` |
| Rollback execution | **Publisher** | `rollbackToVersion()` |
| Restored content fields | **Version Service** | From snapshot JSON |
| Status after rollback | **Publisher** | Reset to DRAFT — Publisher manages |
| publish_jobs cleanup | **Publisher** | Cancel pending jobs |
| Audit log for rollback | **Publisher** | Audit service |
| Preview token invalidation | **Publisher** | Token service |
| Live table (content) | **Publisher rollback** | Write restored fields |
| Live table (status) | **Publisher only** | NOT written by rollback |
| Home stats | **Home read** | Brand Runtime counts |
| PageContent CRUD | **Home module** | Typed Prisma |
| PageContent published boolean | **Home module** | Content field, not workflow status |

---

## 9. Guard Requirements

### Rollback Guards (G-ROLLBACK-*)

| ID | Check | Type |
|----|-------|------|
| G-ROLLBACK-01 | Target version must belong to same contentType + contentId | Unit test |
| G-ROLLBACK-02 | Snapshot restore must use field whitelist (not JSON spread) | Static code review |
| G-ROLLBACK-03 | Must NOT restore `status`, `publishStatus`, `publish_status`, `publishedAt` | Static code review |
| G-ROLLBACK-04 | Historical versions must never be modified | Code review |
| G-ROLLBACK-05 | Rollback must write AuditLog | Static code |
| G-ROLLBACK-06 | Rollback must cancel pending publish_jobs | Code review |
| G-ROLLBACK-07 | Rollback must reset status to DRAFT (schema default) | Unit test |
| G-ROLLBACK-08 | Unsupported content types must fail closed | Unit test |
| G-ROLLBACK-09 | Unknown/incomplete snapshot version must fail closed | Unit test |
| G-ROLLBACK-10 | Rollback must NOT auto-publish or update live table | Code review |

### Snapshot Guards (G-SNAPSHOT-*)

| ID | Check | Type |
|----|-------|------|
| G-SNAPSHOT-01 | Publish snapshot payload uses typed row, not arbitrary SELECT * | Code review |
| G-SNAPSHOT-02 | Snapshot failure must be observable (console.error, not silent catch) | Static code |
| G-SNAPSHOT-03 | Snapshot contentType must be from registry | Unit test |
| G-SNAPSHOT-04 | Snapshot failure must not block publish | Integration test |

### Home Guards (G-HOME-*)

| ID | Check | Type |
|----|-------|------|
| G-HOME-01 | Home must not read non-existent DB fields | Static code review |
| G-HOME-02 | Home must not write lifecycle status | Static code review |
| G-HOME-03 | Home summary must come from Canonical projection | Code review |
| G-HOME-04 | PageContent `published` boolean not treated as PublishStatus | Code review |
| G-HOME-05 | No Runtime DDL in home module | Static search |
| G-HOME-06 | No unsafe SQL in home module | Static search |

---

## 10. ADR-005: Publisher Rollback and Version Restoration Contract

### 10.1 Title

**ADR-005 — Publisher Rollback and Version Restoration Contract**

### 10.2 Decision (Recommended)

**ACCEPTED — Restore as New Draft**

| Aspect | Decision |
|--------|----------|
| User-facing meaning | "Restore from a historical publish snapshot as a new DRAFT" |
| Auto-publish? | **NO** |
| Resulting status | DRAFT for all content types |
| New version created? | **YES** — captures the restored-as-DRAFT state |
| Historical versions | **Immutable** — never modify |
| Snapshot restore | Field whitelist per content type |
| publish_jobs | Pending jobs **cancelled** |
| Preview tokens | **Invalidated** |
| Audit log | **Written** with ROLLBACK action |
| Relations/media/tags | **Not restored** — documented limitation |
| Rollback from ARCHIVED | **Allowed** |
| Status/PublishStatus restored? | **NO** — excluded from whitelist |

### 10.3 Codex Implementation Scope

**Files to modify:**
1. `apps/platform/lib/publisher.ts` — `rollbackToVersion()` field whitelist + status handling + publish_job cleanup

**Rollback function changes:**
```
1. Find content_version by (contentType, contentId, targetVersion)
2. Validate: contentType in PUBLISHER_CONTENT_REGISTRY
3. Validate: version exists and snapshot is valid → fail closed
4. Apply field whitelist per contentType (NOT the current exclusion-only filter)
5. Dynamic UPDATE live table with whitelisted fields ONLY
6. Reset status via Publisher-compatible default:
   - Product: status = "draft", publishStatus = DRAFT
   - Journal: skip status (schema default @default(DRAFT))
   - Series/Banner: status = "DRAFT"
   - Home: published = false
7. Cancel pending publish_jobs for (contentType, contentId)
8. Create new content_version with status "RESTORED"
9. Create AuditLog with ROLLBACK action + version info
10. Return success + restoredVersion
```

**Files to KEEP untouched:**
- `lib/publisher.ts` — only `rollbackToVersion()` modified
- All Publisher wrappers in brand modules — Phase E boundary
- Home actions — already migrated to typed Prisma
- Schema files — no change needed

---

## 11. TypeScript Baseline

Current errors at `7f3ad1e`: unchanged from E1 baseline. No E2-related errors.

---

## 12. Remaining Phase E3 Work

| Item | Status |
|------|--------|
| Home Publisher `legacy-raw` path resolution | Documented limitation — `page_contents` has no status columns. Requires E3 architecture decision. |
| PageContent `published` boolean → PublishStatus integration | Deferred — current `legacy-raw` works within constraints |
| Snapshot retry/compensation | Phase G |
| Publisher `persistTransition("home")` fix | Phase E3 — needs decision on adding status columns to page_contents or deprecating Publisher for Home |

---

## Required Questions — Answers

| Question | Answer |
|----------|--------|
| Publish snapshot contract | Non-blocking best-effort after-transaction side effect |
| Snapshot failure behavior | `catch {}` → must add `console.error` for observability |
| Rollback formal meaning | "Restore from a historical publish snapshot as a new DRAFT" |
| Rollback resulting status | DRAFT for all content types |
| Auto-publish after rollback | **NO** |
| New version created | **YES** — captures restored-as-DRAFT state |
| Historical versions immutable | **YES** — never modify existing versions |
| Restore whitelist | Per-content-type field lists (Sections 6.1-6.5). **Excludes** status, publishStatus, publishedAt, id, createdAt, updatedAt |
| Live table behavior | Content fields restored, status reset to DRAFT, publishedAt cleared |
| Publish job behavior | Pending jobs cancelled |
| Audit log behavior | ROLLBACK action written with version info |
| Preview token behavior | Invalidated (not yet implemented) |
| Supported content types | products, series, journal, banners, home |
| Unsupported content types | Materials (deferred), ERP (not Brand) |
| Schema change required | **NO** |
| Data migration required | **NO** |
| Home invalid fields | **None remaining** — all page_contents operations use correct columns. Publisher's home path (legacy-raw) writes to non-existent status/published_at columns — documented. |
| Home canonical projection | `PageContentRow` with `published` boolean. No PublishStatus needed. |
| Home typed readiness | ✅ **Already fully migrated** to typed `brandDb` |
| Remaining Raw SQL in Home | **None** — Publisher wrappers use `transitionStatus("home", ...)` which is Phase E |
| ADR required | **YES — ADR-005: Publisher Rollback and Version Restoration Contract** |
| ADR path | `docs/adr/ADR-005-PUBLISHER-ROLLBACK-AND-VERSION-RESTORATION.md` (draft below) |
| Report path | `docs/PHASE_E2_ROLLBACK_AND_HOME_STATUS_CONTRACT_REVIEW_2026-07-13.md` |
| Modified files | NONE (read-only) |
| Database operations | NONE |
| Commit SHA | NONE |
| Push | NOT EXECUTED |
| Codex readiness | **READY** — rollbackToVersion whitelist + tests |
| Remaining Phase E3 work | Home Publisher `legacy-raw` path resolution |

---

```
PHASE E2 CONTRACT REVIEW COMPLETE

WORKDIR:                      /Users/ryan/Projects/active/platform-os
HEAD:                         7f3ad1e
Publish snapshot contract:    Non-blocking best-effort after-transaction
Snapshot failure behavior:    Silent catch → must add console.error
Rollback formal meaning:      "Restore as new DRAFT"
Rollback resulting status:    DRAFT for all content types
Auto-publish after rollback:  NO
New version created:          YES
Historical versions immutable: YES
Restore whitelist:            Per-content-type field lists, excluding status/ownership fields
Live table behavior:          Content restored, status reset to DRAFT
Publish job behavior:         Cancelled
Audit log behavior:           ROLLBACK action with version info
Preview token behavior:       Invalidated
Supported content types:      products, series, journal, banners, home
Unsupported content types:    Materials, ERP
Schema change required:       NO
Data migration required:      NO
Home invalid fields:          None remaining (typed Prisma)
Home canonical projection:    PageContentRow with published boolean
Home typed migration:         ✅ Complete
Remaining Home Raw SQL:       None (Publisher wrappers = Phase E)
ADR required:                 YES — ADR-005
ADR path:                     docs/adr/ADR-005-PUBLISHER-ROLLBACK-AND-VERSION-RESTORATION.md
Report path:                  docs/PHASE_E2_ROLLBACK_AND_HOME_STATUS_CONTRACT_REVIEW_2026-07-13.md
Modified files:               NONE
Database operations:          NONE
Commit SHA:                   NONE
Push:                         NOT EXECUTED
Codex readiness:              READY — rollbackToVersion whitelist + tests
Remaining Phase E3 work:      Home Publisher legacy-raw path resolution
```
