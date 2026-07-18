# Phase E3 — Publisher Home Legacy Path Contract Review

**Date:** 2026-07-13
**WORKDIR:** `/Users/ryan/Projects/active/platform-os` @ `f80b46a`
**HEAD:** `f80b46a` (Phase E2B complete — emergency rollback)

---

## 1. Executive Conclusion

**REMOVE Home from the generic Publisher.** The Home Publisher path has no production consumer, references non-existent columns, and is dead code that would fail at runtime.

| Finding | Verdict |
|---------|---------|
| PageContent canonical model | 10 columns: includes `published` (boolean) — NO `status`, NO `published_at` |
| Publisher Home path reads | `SELECT status, published_at FROM page_contents` — columns DON'T EXIST |
| Publisher Home path writes | `UPDATE page_contents SET status = $1, published_at = ...` — would FAIL |
| Storefront Homepage | Reads `SiteSetting`, `Product`, `Series`, `JournalPost` — **does NOT read `page_contents`** |
| Home ordinary CRUD | ✅ Already migrated to typed `brandDb.pageContent.*` in Phase D2a |
| PageContent lifecycle | `published` boolean — sufficient. No workflow status needed. |

---

## 2. Home Runtime Inventory

### 2.1 Home Module Structure

| File | Role | Status |
|------|------|--------|
| `modules/brand/home/actions.ts` | Server actions: CRUD + Publisher wrappers | CRUD ✅ migrated (D2a). Publisher wrappers ⏳ (this review) |
| `app/(platform)/brand/home/client.tsx` | Client component | ✅ Uses typed CRUD |
| `app/(platform)/brand/home/page.tsx` | Server page | ✅ Reads typed CRUD |

### 2.2 Publisher Home Path

| Operation | Entry Function | Physical Table | Fields Read/Written | Current SQL | Runtime Result |
|-----------|---------------|----------------|---------------------|-------------|---------------|
| Read state | `readCurrentState("home")` | `page_contents` | `status`, `published_at` | `$queryRawUnsafe` | **Would fail** — columns don't exist |
| Write state | `persistTransition("home")` | `page_contents` | `status`, `published_at`, `updated_at` | `$executeRawUnsafe` | **Would fail** — `status` column doesn't exist |
| Submit review | `submitForReview("home")` | — | Delegates to Publisher | — | **Would fail** at persistTransition |
| Approve | `approveContent("home")` | — | Delegates to Publisher | — | **Would fail** at persistTransition |
| Reject | `rejectContent("home")` | — | Delegates to Publisher | — | **Would fail** at persistTransition |
| Publish | `publishNow("home")` | — | Delegates to Publisher | — | **Would fail** at persistTransition |
| Unpublish | `unpublishContent("home")` | — | Delegates to Publisher | — | **Would fail** at persistTransition |
| Schedule | `schedulePublish("home")` | — | Delegates to Publisher | — | **Would fail** at persistTransition |
| Archive | `archiveContent("home")` | — | Delegates to Publisher | — | **Would fail** at persistTransition |
| Rollback | `rollbackToVersion("home")` | `page_contents` | Via snapshot whitelist | — | **Phase E2B excluded Home** |
| Preview | `getPreviewContent("home")` | `page_contents` | `SELECT *` | `$queryRawUnsafe` | Would return data but `status`/`published_at` NULL |
| Status | `getContentStatus("home")` | — | Reads via `readCurrentState` | — | **Would fail** |

---

## 3. Canonical Schema Evidence

### 3.1 PageContent Model (Canonical)

```prisma
model PageContent {
  id         String   @id @default(cuid())
  pageKey    String   @map("page_key")
  sectionKey String   @map("section_key")
  title      String   @default("")
  content    String   @default("")
  image      String?
  sortOrder  Int      @default(0) @map("sort_order")
  published  Boolean  @default(true)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@unique([pageKey, sectionKey])
  @@map("page_contents")
}
```

**10 physical columns.** id, page_key, section_key, title, content, image, sort_order, published, created_at, updated_at.

**NO:** status, publish_status, published_at, archived, workflowState, version.

### 3.2 Physical DB Evidence

Source: `brand-db-schema-metadata-2026-07-11.json` (authoritative, read-only session):

| Column | Type | Nullable | Default | In Metadata? |
|--------|------|----------|---------|-------------|
| `id` | text | NOT NULL | None | ✅ |
| `page_key` | text | NOT NULL | None | ✅ |
| `section_key` | text | NOT NULL | None | ✅ |
| `title` | text | NOT NULL | `''` | ✅ |
| `content` | text | NOT NULL | `''` | ✅ |
| `image` | text | YES | None | ✅ |
| `sort_order` | integer | NOT NULL | `0` | ✅ |
| `published` | boolean | NOT NULL | `true` | ✅ |
| `created_at` | timestamp | NOT NULL | `CURRENT_TIMESTAMP` | ✅ |
| `updated_at` | timestamp | NOT NULL | None | ✅ |
| `status` | — | — | — | ❌ **DOES NOT EXIST** |
| `published_at` | — | — | — | ❌ **DOES NOT EXIST** |

### 3.3 Cross-Reference: Yunwu-Origin Schema

```prisma
model page_contents {
  id          String   @id
  page_key    String
  section_key String
  title       String   @default("")
  content     String   @default("")
  image       String?
  sort_order  Int      @default(0)
  published   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime

  @@unique([page_key, section_key])
}
```

**Matches canonical schema.** 10 columns. No `status`, no `published_at`.

---

## 4. Production Consumer Matrix

| Consumer | Repository | Reads PageContent? | Data Source | Published Filter |
|----------|-----------|-------------------|-------------|-----------------|
| Storefront homepage | `yunwu-origin` | ❌ **NO** | SiteSetting, Product, Series, JournalPost | Products/Journal: `status: 'PUBLISHED'` |
| Storefront *any route* | `yunwu-origin` | ❌ **NO** | — | — |
| Platform Home admin | `platform-os` | ✅ YES | `brandDb.pageContent.*` (typed) | `published` boolean |
| Platform Brand Home page | `platform-os` | ✅ YES | `brandDb.legacyBrandProduct.count()` etc. | N/A (counts) |
| apps/web (legacy) | `platform-os` | ⚠️ Legacy | — | N/A (Phase F) |

**The production storefront does NOT consume `page_contents` data.** The homepage is built from `SiteSetting` (hero text, brand narrative) and references to other published content (products, journal, series). PageContent sections are NOT displayed on the public homepage.

---

## 5. Publisher Home Path Impact Assessment

| Question | Answer | Evidence |
|----------|--------|----------|
| Does Publisher Home path work? | ❌ **Would fail at runtime** | Writes to non-existent `status` column |
| Does storefront consume PageContent? | ❌ No | `grep -rn 'page_contents' yunwu-origin/src/` = empty |
| Does any consumer depend on Publisher Home path? | ❌ No | No consumer reads `page_contents.status` or `page_contents.published_at` |
| Does removing Home from Publisher break anything? | ❌ No | Ordinary CRUD already uses typed `brandDb.pageContent.*` with `published` boolean |
| Is `published` boolean sufficient? | ✅ Yes | PageContent sections toggled by `published` field. No workflow needed. |

---

## 6. Options Considered

### Option A: Remove Home from Generic Publisher (RECOMMENDED)

- Delete Home from `PUBLISHER_CONTENT_REGISTRY`
- Remove `case "home"` from `readCurrentState()` and `persistTransition()`
- Keep Publisher wrapper functions in `home/actions.ts` as thin wrappers → typed PageContent `published` boolean toggle
- Deprecate wrapper functions; encourage direct `brandDb.pageContent.update()` for the `published` field

**Pros:**
- Eliminates dead code that would fail at runtime
- No consumer impact (no one consumes PageContent status)
- Ordinary CRUD already migrated — works correctly with `published` boolean
- Reduces Publisher complexity

**Cons:**
- None — the path is a maintenance liability with no production value

### Option B: Keep Legacy Path Frozen

- Keep Home in registry as `legacy-raw`
- No new development
- Wait for Phase G to remove

**Verdict:** ❌ Keeps dead code that would crash at runtime if called. No benefit.

### Option C: Model Physical Status Fields

- Add `status` and `published_at` to `page_contents` table via DDL
- Declare in Canonical Schema
- Update Publisher Home path to work correctly

**Verdict:** ❌ Unjustified — no consumer needs these fields. `published` boolean is sufficient. DDL out of scope.

---

## 7. Recommended Contract

**Option A — Remove Home from Generic Publisher.**

| Aspect | Decision |
|--------|----------|
| Home in Publisher registry? | **REMOVED** — `home` entry deleted |
| `readCurrentState("home")` | **DELETED** |
| `persistTransition("home")` | **DELETED** |
| Publisher wrapper functions? | **REMOVED** — `submitHomeForReview`, `approveHome`, `rejectHome`, `publishHomeNow`, `scheduleHomePublish`, `unpublishHome`, `archiveHome`, `rollbackHome`, `getHomeStatus`, `getHomeVersions` all deleted from `home/actions.ts` |
| PageContent lifecycle | `published` boolean — sufficient. No PublishStatus, no workflow. |
| PageContent UI for publish | Typed `brandDb.pageContent.update({ where: { id }, data: { published: true/false } })` |
| content_versions for Home? | **REMOVED** — no snapshot creation needed. Ordinary CRUD handles PageContent. |

---

## 8. Specific Changes Required

### 8.1 Publisher Registry

```typescript
// DELETE from PUBLISHER_CONTENT_REGISTRY:
home: {
  physicalTable: "page_contents", idKind: "string", persistenceKind: "legacy-raw",
  workflowStatusField: "status", persistenceStatusField: null, publishedAtField: "publishedAt",
  ...
}
```

### 8.2 Publisher Functions

```typescript
// DELETE case "home" from readCurrentState() — lines 216-218
// DELETE case "home" from persistTransition() — lines 243-247
// No other Publisher function needs Home-specific code
```

### 8.3 Home Actions — Delete Publisher Wrappers

| Function | Action |
|----------|--------|
| `submitHomeForReview` | DELETE |
| `approveHome` | DELETE |
| `rejectHome` | DELETE |
| `publishHomeNow` | DELETE |
| `scheduleHomePublish` | DELETE |
| `unpublishHome` | DELETE |
| `archiveHome` | DELETE |
| `homeRollback` | DELETE |
| `getHomeVersions` | DELETE |
| `getHomePreviewToken` | DELETE |
| `getHomeStatus` | DELETE |

### 8.4 Home Client — Remove Workflow Buttons

The Home client (`client.tsx`) currently has workflow action buttons (submitForReview, approve, reject, etc.) for PageContent rows. These are removed. Only the `published` boolean toggle remains.

### 8.5 Rollback Contract

| Aspect | Decision |
|--------|----------|
| Home rollback supported? | **NO** — removed from registry |
| Existing Home content_versions? | Orphaned but harmless — not consumed |
| content_version creation for PageContent? | **NO** — ordinary CRUD is sufficient. Not a publish event. |

### 8.6 Guardian Change

```typescript
// G-HOME-PUB-01: Home not in PUBLISHER_CONTENT_REGISTRY
// G-HOME-PUB-02: PageContent.published not cast as PublishStatus
// G-HOME-PUB-03: No Runtime DDL in home/actions.ts
// G-HOME-PUB-04: Home Publisher wrappers deleted
```

---

## 9. ADR Decision

**NO NEW ADR REQUIRED.**

Rationale:
- Removing dead code does not require an architecture decision
- The `published` boolean lifecycle is already established in the canonical schema
- ADR-003 and ADR-004 cover PageContent's schema contracts
- No new data model, no lifecycle change, no consumer migration
- Decision documented in baseline and Phase E3 report

---

## 10. Phase E3 Codex Scope

| # | File | Change |
|---|------|--------|
| 1 | `apps/platform/lib/publisher.ts` | Delete Home from `PUBLISHER_CONTENT_REGISTRY`. Delete `case "home"` from `readCurrentState()`. Delete `case "home"` from `persistTransition()`. |
| 2 | `apps/platform/modules/brand/home/actions.ts` | Delete all Publisher wrapper functions (submitHomeForReview, approveHome, rejectHome, publishHomeNow, scheduleHomePublish, unpublishHome, archiveHome, getHomeVersions, rollbackHome, getHomePreviewToken, getHomeStatus). Keep ordinary CRUD (getPageContents, createPageContent, updatePageContent, deletePageContent). Keep site settings (getSiteSettings, updateSiteSetting). Keep getBrandStats. |
| 3 | `apps/platform/app/(platform)/brand/home/client.tsx` | Remove workflow action buttons (submitReview, approve, reject, schedule, publishNow, unpublish, archive, versions, rollback). Keep `published` boolean toggle. |
| 4 | `scripts/check-publisher-contract.mjs` | Add G-HOME-PUB-* rules. Remove Home from wrapper checks. |
| 5 | `scripts/check-publisher-contract.test.mjs` | Update tests |
| 6 | `docs/YUNWU_MASTER_BASELINE.md` | Record Phase E3 completion |

---

## 11. Deferred Scope

| Item | Reason |
|------|--------|
| content_versions for PageContent | Not needed — ordinary CRUD, not publish events |
| PageContent schedule | No demand. `published` boolean can be set by cron if needed later |
| PageContent review workflow | Over-engineering for simple section toggle |
| Phase F/G storefront read model | Separate scope |

---

## 12. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| PageContent `published` boolean disappears on storefront | 🟢 None | Storefront doesn't read PageContent |
| Editor expects workflow buttons | 🟢 Low | `published` boolean toggle replaces them |
| existing content_versions for Home orphaned | 🟢 None | Not consumed. Can be ignored. |
| Wrapper functions imported elsewhere | 🟢 Low | Check imports — only imported by `home/actions.ts` |

---

## Required Questions — Answers

| Question | Answer |
|----------|--------|
| Home canonical model | `PageContent` — 10 columns, `published` boolean |
| Home publishing unit | Individual PageContent section |
| Canonical lifecycle source | `published` boolean |
| Generic Publisher membership | **REMOVE** — delete from registry |
| PageContent published Boolean role | **Sole lifecycle field** — no status, no workflow |
| Review/approve required | **NO** — simple boolean toggle |
| Schedule required | **NO** — no demand. Can be added later via cron. |
| Archive required | **NO** — delete or set `published: false` |
| Rollback required | **NO** — not a publish event |
| Production consumer | **NONE** — storefront doesn't read PageContent |
| Invalid/unmodeled fields | `status`, `published_at` — written by Publisher but don't exist in DB |
| Typed Prisma readiness | ✅ **Already complete** — Phase D2a migrated all CRUD |
| Raw SQL to delete | 2 statements in Publisher (`readCurrentState` "home", `persistTransition` "home") |
| Raw SQL to retain | **NONE** — all PageContent operations typed |
| Schema change required | **NO** |
| Migration required | **NO** |
| Storefront changes required | **NO** |
| Data backfill required | **NO** |
| ADR required | **NO** |
| Report path | `docs/PHASE_E3_HOME_PUBLISHER_CONTRACT_REVIEW_2026-07-13.md` |

---

```
PHASE E3 HOME PUBLISHER CONTRACT REVIEW COMPLETE

WORKDIR:                      /Users/ryan/Projects/active/platform-os
HEAD:                         f80b46a
Home canonical model:         PageContent (10 columns, published boolean)
Home publishing unit:         Individual section
Canonical lifecycle source:   `published` Boolean
Generic Publisher membership: REMOVE
PageContent published role:   Sole lifecycle field
Review/approve required:      NO
Schedule required:            NO
Archive required:             NO
Rollback required:            NO
Production consumer:          NONE — storefront does not read PageContent
Invalid/unmodeled fields:     status, published_at (don't exist in DB)
Typed Prisma readiness:       ✅ Complete (all CRUD migrated D2a)
Raw SQL to delete:            2 statements in publisher.ts (readCurrentState home, persistTransition home)
Raw SQL to retain:            None
Schema change required:       NO
Migration required:           NO
Storefront changes required:  NO
Data backfill required:       NO
ADR required:                 NO
Report path:                  docs/PHASE_E3_HOME_PUBLISHER_CONTRACT_REVIEW_2026-07-13.md
Modified files:               NONE (read-only audit)
Database operations:          NONE
Commit SHA:                   NONE
Push:                         NOT EXECUTED
Codex readiness:              READY
Next phase:                   Phase E3 Codex — Remove Home from Publisher + delete wrappers
```
