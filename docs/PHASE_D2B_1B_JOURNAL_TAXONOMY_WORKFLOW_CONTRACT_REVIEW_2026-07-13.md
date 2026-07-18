# Phase D2b-1b — Journal Taxonomy and Workflow Contract Review

**Date:** 2026-07-13
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**HEAD:** `dcc0298` (Phase D2b-1a complete)

---

## 1. Executive Conclusion

**Journal typed migration can proceed in Phase D2b-1b with two documented decisions.**

| Area | Verdict |
|------|---------|
| **Category taxonomy** | Legacy UI values (ARTIFACT, BRAND, TRAVELER, OTHER) cause runtime DB errors — they are NOT in the `JournalCategory` PostgreSQL enum. Must map to canonical values (OBJECT, PHILOSOPHY, DONGHAI, MATERIAL). |
| **Workflow ownership** | Same as Product: Publisher is the exclusive owner of `status` transitions. Ordinary CRUD must not write `status` or `publishStatus`. |
| **Schema change** | **None required.** Canonical schema already matches physical DB. |
| **Data migration** | **None required.** No existing `journal_posts` rows can have non-enum category values (PostgreSQL enforces). |
| **New ADR** | **Not required.** Category mapping can be implemented as an application-layer lookup. ADR-001 and Product ownership precedent cover workflow. |

---

## 2. Current Journal Runtime Inventory

### 2.1 Files

| File | Role |
|------|------|
| `modules/brand/journal/actions.ts` | Server actions: CRUD + Publisher wrappers |
| `app/(platform)/brand/journal/client.tsx` | Client component: list, form, workflow buttons |
| `app/(platform)/brand/journal/page.tsx` | Server page: passes initial data to client |

### 2.2 Data Flow

```
UI form (client.tsx)
  → createPost / updatePost (actions.ts)
    → brandPrisma.$queryRawUnsafe INSERT/UPDATE (Raw SQL)
      → journal_posts (Brand DB)
```

Publisher wrappers (`submitPostForReview`, `approvePost`, etc.) delegate to `lib/publisher.ts`.

---

## 3. Canonical Schema Contract

```prisma
model JournalPost {
  id             String          @id @default(cuid())
  title          String
  slug           String          @unique
  excerpt        String?
  content        String
  coverImage     String?         @map("cover_image")
  category       JournalCategory     // ← PostgreSQL enum
  status         PublishStatus   @default(DRAFT)  // ← PostgreSQL enum
  seoTitle       String?         @map("seo_title")
  seoDescription String?         @map("seo_description")
  publishedAt    DateTime?       @map("published_at")
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")
  coverAlt       String?         @map("cover_alt")
  readingTime    Int?            @map("reading_time")
  sortOrder      Int             @default(0) @map("sort_order")
  legacyJournalTags LegacyJournalTag[]
}
```

### 3.1 Physical DB (Authoritative Metadata)

The `journal_posts` table has exactly these columns. No extra columns. No missing columns. **Canonical schema is accurate.**

The `status` column is `PublishStatus (enum)` — NOT a free-text CHECK column like `products.status`.

---

## 4. Category Taxonomy Conflict

### 4.1 The Canonical JournalCategory (PostgreSQL enum + all Prisma schemas)

```prisma
enum JournalCategory {
  OBJECT      // 器物
  MATERIAL    // 材料
  CRAFT       // 工艺
  DONGHAI     // 东海
  CREATION    // 创作
  PHILOSOPHY  // 哲思
}
```

### 4.2 The Platform UI Values

| UI Label | UI Value | Meaning |
|----------|----------|---------|
| 器物志 | `ARTIFACT` | Artifact chronicle |
| 品牌志 | `BRAND` | Brand chronicle |
| 同行者说 | `TRAVELER` | Fellow traveler stories |
| 工艺 | `CRAFT` | Craftsmanship |
| 其他 | `OTHER` | Miscellaneous |

### 4.3 Evidence of Runtime Failure

The `createPost` function (line 42-67) passes `category` directly to PostgreSQL:
```typescript
enriched = { ...data, id: ..., status: ..., updated_at: ... };
// If data.category = "ARTIFACT", the INSERT becomes:
// INSERT INTO journal_posts (..., category, ...) VALUES (..., 'ARTIFACT', ...)
// PostgreSQL rejects: 'ARTIFACT' is not in JournalCategory enum
```

The DB `journal_posts.category` column is typed as `JournalCategory (enum)` — NOT a free-text field. Any value not in the 6-value enum causes a PostgreSQL error.

**Current UI production behavior:** Creating a journal post with any category except `CRAFT` triggers a PostgreSQL `invalid input value for enum JournalCategory` error. The `try/catch` in `createPost` silently returns `{ row: null, error: e.message }`.

### 4.4 Seed Data Validation

The seed data (`apps/brand-os/seed.ts`) uses **canonical** JournalCategory values (OBJECT, MATERIAL, CRAFT, DONGHAI, PHILOSOPHY) — proving that valid data exists in the DB with canonical values.

---

## 5. Category Options Considered

### Option A: UI-to-Canonical Mapping Table (RECOMMENDED)

Replace the legacy UI values with canonical values at the application layer:

| UI Label | UI Value | → | Canonical Value | Rationale |
|----------|----------|---|-----------------|-----------|
| 器物志 | `ARTIFACT` | → | `OBJECT` (器物) | Same Chinese root "器物" |
| 品牌志 | `BRAND` | → | `PHILOSOPHY` (哲思) | Brand philosophy/narrative (seed: 为什么允物不谈开运) |
| 同行者说 | `TRAVELER` | → | `DONGHAI` (东海) | Narrative/adventure content (seed: 东海寻珠记) |
| 工艺 | `CRAFT` | → | `CRAFT` (工艺) | **Exact match** |
| 其他 | `OTHER` | → | `MATERIAL` (材料) | Most general catch-all category |

**Pros:**
- No schema change
- No data migration (DB already enforces canonical values)
- UI labels stay unchanged (user-facing Chinese names don't change)
- Only the internal value submitted to the server action changes
- Fixes the current runtime bug (category create was broken)

**Cons:**
- `TRAVELER → DONGHAI` is a conceptual stretch. DONGHAI specifically means "East Sea" (a place), while TRAVELER means customer stories.
- `OTHER → MATERIAL` loses "other" semantics. If truly uncategorizable content exists, a different canonical mapping may be needed.

**Verdict: ✅ RECOMMENDED with TRAVELER noted as approximation.**

### Option B: UI Direct Migration to Canonical Taxonomy

Change the UI dropdown to directly use canonical values:

```typescript
const CATEGORY_OPTIONS = [
  { label: "器物", value: "OBJECT" },
  { label: "材料", value: "MATERIAL" },
  { label: "工艺", value: "CRAFT" },
  { label: "东海", value: "DONGHAI" },
  { label: "创作", value: "CREATION" },
  { label: "哲思", value: "PHILOSOPHY" },
];
```

**Pros:**
- Direct DB compatibility — no mapping layer needed
- Aligns UI with canonical taxonomy

**Cons:**
- Changes user-facing category names (may interrupt editorial workflow)
- Loses brand-specific labels (器物志 → 器物, 品牌志 → 哲思)
- `CREATION` and `PHILOSOPHY` may be unfamiliar to editors

**Verdict:** Better as a post-migration refinement after the typed migration is complete.

### Option C: Compatibility Layer + Future ADR

Keep the current raw SQL with category as-is. Document the category as a known bug.

**Verdict:** ❌ Leaves production code broken (category create fails for 4/5 UI values).

---

## 6. Recommended Category Contract

**ACCEPTED: Option A — Application-layer mapping.**

### 6.1 Mapping Table

```typescript
const CATEGORY_MAP: Record<string, JournalCategory> = {
  ARTIFACT: JournalCategory.OBJECT,
  BRAND: JournalCategory.PHILOSOPHY,
  TRAVELER: JournalCategory.DONGHAI,
  CRAFT: JournalCategory.CRAFT,
  OTHER: JournalCategory.MATERIAL,
};
```

### 6.2 Implementation

In `createPost` and `updatePost` in `journal/actions.ts`:
```typescript
const category = CATEGORY_MAP[data.category as string] || JournalCategory.OBJECT;
```

The UI dropdown values stay the same (labels unchanged), but the internal value submitted is the canonical enum value.

### 6.3 No Schema Change

| Aspect | Status |
|--------|--------|
| `JournalCategory` enum | ✅ Correct — 6 canonical values |
| `JournalPost.category` field | ✅ Correct — uses enum |
| Canonical schema | ✅ Already matches DB |

---

## 7. Workflow and PublishStatus Analysis

### 7.1 Journal Status Model

`journal_posts.status` is `PublishStatus (enum)` — a PostgreSQL enum, not free text.

This is **different from `products.status`** which is a text CHECK constraint.

| Product `status` (text) | Journal `status` (enum) |
|-------------------------|-------------------------|
| Accepts 7 workflow values (DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED) | Accepts ONLY 6 enum values (DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED) |
| Flexible — all workflow values fit | Rigid — IN_REVIEW, SCHEDULED, REJECTED cause CAST errors |

**The Publisher's `transitionStatus("journal", ...)` performs `CAST($1 AS "PublishStatus")` (line 258 of publisher.ts). This operation fails for IN_REVIEW, SCHEDULED, and REJECTED because these values are NOT in the PublishStatus enum.**

This is the same P0 bug identified in ADR-001 Section 14.1 (file `publisher.ts:258`).

### 7.2 Current Writes to Journal Status

| Function | Writes `status`? | Writes `publishStatus`? | Current Values |
|----------|-----------------|------------------------|----------------|
| `createPost` | ✅ Yes (line 46-51) | ❌ No (field doesn't exist in journal_posts) | Any of 7 workflow values (but fails for non-enum) |
| `updatePost` | ✅ Yes (via dynamic spread of data) | ❌ No | Any value submitted from UI |
| `togglePostStatus` | ✅ Via Publisher | ❌ Via Publisher | All 7 Publisher transition values |
| `submitPostForReview` | ✅ Via Publisher (IN_REVIEW) | ❌ | IN_REVIEW → CAST fails |
| `approvePost` | ✅ Via Publisher (APPROVED) | ❌ | APPROVED ✅ |
| `rejectPost` | ✅ Via Publisher (REJECTED) | ❌ | REJECTED → CAST fails |
| `publishPostNow` | ✅ Via Publisher (PUBLISHED) | ❌ | PUBLISHED ✅ |
| `unpublishPost` | ✅ Via Publisher (DRAFT) | ❌ | DRAFT ✅ |

### 7.3 Critical Difference from Product

Unlike `products` which has TWO status columns (text `status` + enum `publish_status`), `journal_posts` has only ONE status column (`status` as PublishStatus enum). There is no separate `publish_status` column.

This means:
- Journal cannot have a "workflow-only" status column
- Journal's single `status` column is a PublishStatus enum that rejects IN_REVIEW, SCHEDULED, REJECTED
- The Publisher's `transitionStatus` for journals is BROKEN for 3 of 7 workflow states
- This must be fixed in Phase E, NOT Phase D2b

---

## 8. Publisher Boundary

### 8.1 Journal Publisher Path

The Publisher (`lib/publisher.ts`) treats "journal" as a special case:
```typescript
if (contentType === "journal") {
  // Uses CAST($1 AS "PublishStatus") — FAILS for IN_REVIEW, SCHEDULED, REJECTED
}
```

### 8.2 Phase E Dependency

| Publisher Function | Journal Status | Phase |
|-------------------|---------------|-------|
| `transitionStatus` | ❌ Broken for IN_REVIEW, SCHEDULED, REJECTED | Phase E |
| `submitForReview` → IN_REVIEW | ❌ CAST fails → runtime error | Phase E |
| `rejectContent` → REJECTED | ❌ CAST fails → runtime error | Phase E |
| `approveContent` → APPROVED | ✅ Works | Phase E |
| `publishNow` → PUBLISHED | ✅ Works | Phase E |
| `schedulePublish` → SCHEDULED | ❌ CAST fails → runtime error | Phase E |
| `unpublishContent` → DRAFT | ✅ Works | Phase E |
| `archiveContent` → ARCHIVED | ✅ Works | Phase E |

**Phase D2b must keep all Publisher wrappers untouched.** The journal Publisher wrappers are currently non-functional for 3/7 workflow states. They cannot be used reliably until Phase E.

---

## 9. Ordinary CRUD Boundary

### 9.1 Current State

`createPost` currently allows `status` to be set (line 44-46):
```typescript
const rawStatus = String(data.status || "DRAFT").toUpperCase();
```

`updatePost` currently allows `status` to be updated via dynamic UPDATE (line 74):
```typescript
const enriched = { ...data, updated_at: new Date().toISOString() };
```

### 9.2 Decision

Following the Product ownership precedent (ADR-001 + D2b-1a):

| Operation | `status` write allowed? | `publishStatus` write allowed? | Owner |
|-----------|----------------------|-----------------------------|-------|
| `createPost` | ✅ Only DRAFT | ❌ Not a field on journal_posts | Schema default |
| `updatePost` (normal fields) | ❌ **Not allowed** | ❌ Not a field on journal_posts | Publisher |
| `togglePostStatus` | ✅ Via Publisher | ❌ | Publisher (Phase E) |
| Publisher wrappers | ✅ All | ❌ | Publisher (Phase E) |

### 9.3 Implementation

- `createPost`: Remove `status` from dynamic data spread. Rely on schema default `@default(DRAFT)`.
- `updatePost`: Strip `status` from data before UPDATE. Publisher wrappers are the exclusive status transition path.

### 9.4 UI Form

The journal edit form currently has a `status` field (part of the generic `Record<string, unknown>` form submission). This must be removed. Workflow transitions are handled by discrete action buttons (submitReview, approve, reject, publish, etc.).

---

## 10. Typed Prisma Migration Readiness

### 10.1 Consumer Readiness

| Function | Raw SQL | Typed `brandDb.journalPost.*` | Blocked By |
|----------|---------|-------------------------------|------------|
| `listPosts` | `SELECT * FROM ${TABLE} ...` | `findMany({ orderBy: ... })` | ✅ Ready |
| `createPost` | `INSERT INTO ... RETURNING *` | `create({ data: ... })` with category mapping | ✅ Ready (with category fix) |
| `updatePost` | Dynamic UPDATE | `update({ where: { id }, data })` with field stripping | ✅ Ready |
| `deletePost` | `DELETE FROM ...` | `delete({ where: { id } })` | ✅ Ready |
| `movePost` | Sort swap (2x UPDATE) | `update({ where: { id }, data: { sortOrder } })` | ✅ Ready |
| `savePostSeoSnapshot` | SELECT + createSeoSnapshot | `findUnique({ where: { id } })` + snapshot | ✅ Ready |
| `updatePostSeo` | UPDATE journal_posts + createSeoSnapshot | `update()` + snapshot | ✅ Ready |
| `togglePostStatus` | → `transitionStatus` | → Publisher | ⏳ Phase E |
| All Publisher wrappers | → `lib/publisher.ts` | → Phase E | ⏳ Phase E |

### 10.2 Migration Summary

| Category | Count | Functions |
|----------|-------|-----------|
| ✅ Migrate in D2b-1b | 7 | listPosts, createPost, updatePost, deletePost, movePost, savePostSeoSnapshot, updatePostSeo |
| ⏳ Publisher wrappers (Phase E) | 8 | submitPostForReview, approvePost, rejectPost, publishPostNow, schedulePost, unpublishPost, archivePost, togglePostStatus |
| ⏳ Publisher utilities | 3 | getPostVersions, rollbackPost, getPostPreviewToken |

---

## 11. Schema / Data Migration Requirements

| Item | Required? |
|------|-----------|
| Canonical schema change | **NO** — `JournalPost` already matches DB exactly |
| `JournalCategory` enum change | **NO** — 6 canonical values correct |
| `PublishStatus` enum change | **NO** — 6 values correct per ADR-001 |
| Data DDL | **NO** — zero DDL needed |
| Data migration | **NO** — DB already enforces canonical category values via enum |
| New columns | **NO** |

---

## 12. Guard Requirements

| Rule ID | Check | Type | Phase |
|---------|-------|------|-------|
| G-JOURNAL-01 | `updatePost` does not write `status` | Static code (grep) | D2b |
| G-JOURNAL-02 | `createPost` uses category mapping table | Static code | D2b |
| G-JOURNAL-03 | UI form does not submit `status` field | Code review | D2b |
| G-JOURNAL-04 | Publisher wrappers remain untouched | `git diff` check | D2b |
| G-JOURNAL-05 | No raw SQL `CREATE TABLE` / `ALTER TABLE` in journal module | Static search | D2b |
| G-JOURNAL-06 | Journal `status` is NEVER written directly by non-Publisher code | Static search | D2b |

---

## 13. Phase D2b-1b Codex Scope

### 13.1 Files to Modify

| # | File | Changes |
|---|------|---------|
| 1 | `modules/brand/journal/actions.ts` | Add category mapping. Remove `status` from create/update. Strip `status` from UPDATE data. Migrate 7 functions to typed `brandDb.journalPost.*`. Keep Publisher wrappers. |
| 2 | `app/(platform)/brand/journal/client.tsx` | Remove `status` from form submission. Category dropdown stays (values mapped internally). |

### 13.2 Import Changes

| Current | Target |
|---------|--------|
| `import { brandPrisma } from "@yunwu/db/brand"` | `import { brandDb } from "@/lib/brand-db"` |
| `import { createCrudAudit, createStatusAudit, createAuditLog } from "@/lib/audit"` | Keep audit imports |

### 13.3 Category Mapping

```typescript
import { JournalCategory } from "@yunwu/brand-db";
const CATEGORY_MAP: Record<string, JournalCategory> = {
  ARTIFACT: JournalCategory.OBJECT,
  BRAND: JournalCategory.PHILOSOPHY,
  TRAVELER: JournalCategory.DONGHAI,
  CRAFT: JournalCategory.CRAFT,
  OTHER: JournalCategory.MATERIAL,
};
```

### 13.4 Publisher Functions to KEEP (not modify)

| Function | Reason |
|----------|--------|
| `submitPostForReview` | Phase E — CAST failure for IN_REVIEW |
| `approvePost` | Phase E — Publisher boundary |
| `rejectPost` | Phase E — CAST failure for REJECTED |
| `publishPostNow` | Phase E — Publisher boundary |
| `schedulePost` | Phase E — CAST failure for SCHEDULED |
| `unpublishPost` | Phase E — Publisher boundary |
| `archivePost` | Phase E — Publisher boundary |
| `togglePostStatus` | Phase E — Publisher boundary |
| `getPostVersions` | Phase E — Publisher content versioning |
| `rollbackPost` | Phase E — Publisher rollback |
| `getPostPreviewToken` | Phase E — Publisher preview |
| `getPostStatus` | Phase E — Publisher status query |

---

## 14. Deferred Scope

| Item | Deferred To | Reason |
|------|-------------|--------|
| Publisher journal status enum mapping | Phase E | CAST failure for IN_REVIEW, SCHEDULED, REJECTED |
| REPLACE UI category labels with canonical names | Post-D2b refinement | Optional UX improvement, not a migration blocker |
| Historical data check for invalid categories | Phase G | DB enum prevents invalid values; no migration needed |
| Category `TRAVELER → DONGHAI` semantic review | ADR-005 or later | Needs product/content team input |

---

## 15. Risks

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | `TRAVELER → DONGHAI` mapping may not match editorial intent | 🟡 P2 | Documented as approximation; can remap without data loss |
| R2 | `OTHER → MATERIAL` forces uncategorized content into a specific bucket | 🟢 P3 | Remap to most general category |
| R3 | Publisher wrappers kept unchanged — CAST failures remain | 🔴 P0 | Phase E dependency documented; not introduced by D2b |
| R4 | UI form currently submits `status` — must be removed | 🟡 P1 | Explicit guard rule G-JOURNAL-01 |

---

## 16. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | `createPost` accepts `ARTIFACT`, `BRAND`, `TRAVELER`, `CRAFT`, `OTHER` and maps to canonical values | Typecheck + code review |
| 2 | `createPost` does NOT write `status` explicitly | Code review |
| 3 | `updatePost` does NOT write `status` | Code review |
| 4 | UI form does not submit `status` field | Code review |
| 5 | All 7 D2b-1b functions typecheck | `pnpm typecheck` |
| 6 | Platform build passes | `pnpm --filter @yunwu/platform-app build` |
| 7 | Publisher wrappers unchanged | `git diff lib/publisher.ts = empty` |
| 8 | Total type errors not increased | Baseline compare |
| 9 | Category mapping has no `any` casts | Code review |
| 10 | `brandPrisma` not used in journal module (replaced by `brandDb`) | `grep -c brandPrisma journal/actions.ts = 0` |

---

## 18. Forbidden Actions

| Action | Reason |
|--------|--------|
| Modify `lib/publisher.ts` | Phase E exclusive |
| Modify `JournalCategory` enum in canonical schema | Not needed — 6 values are correct |
| Modify `PublishStatus` enum | Not needed — 6 values are correct per ADR-001 |
| Add DDL to `journal_posts` table | Not needed — schema matches DB |
| Change UI category labels | Optional — not required for migration |
| Add new canonical enum value | Not justified by evidence |
| Remove category mapping fallback | Could break UI category selection |

---

## Required Questions — Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Canonical JournalCategory? | `OBJECT, MATERIAL, CRAFT, DONGHAI, CREATION, PHILOSOPHY` (6 values) |
| 2 | Legacy UI taxonomy retained? | Values retained, but mapped to canonical at application layer |
| 3 | Each legacy category's fate | ARTIFACT→OBJECT, BRAND→PHILOSOPHY, TRAVELER→DONGHAI, CRAFT→CRAFT, OTHER→MATERIAL |
| 4 | New ADR needed? | **NO** — application-layer mapping; no schema/enum change |
| 5 | Journal `status` meaning? | PublishStatus enum (persistence lifecycle) — same as products.publishStatus |
| 6 | Journal `publishStatus` meaning? | **Not a separate field** — journal has only ONE status column (PublishStatus enum) |
| 7 | Create allowed to init DRAFT? | ✅ Only DRAFT via schema default |
| 8 | Update should reject status? | ✅ Yes — Publisher exclusive owner |
| 9 | UI remove status dropdown? | ✅ Yes — same as Product decision |
| 10 | Publisher exclusive transition owner? | ✅ Yes |
| 11 | Journal schedule persistence? | `publish_jobs` — same as other content types |
| 12 | REJECTED persistence for journal? | Cannot be written to PublishStatus enum (no REJECTED value). Must use metadata/audit log. Phase E. |
| 13 | Typed migration before Phase E? | ✅ **Yes** — 7 CRUD functions migratable independently of Publisher fixes |
| 14 | Codex-modifiable files? | `journal/actions.ts`, `journal/client.tsx` |
| 15 | Publisher zero-diff files? | `lib/publisher.ts` |
| 16 | Data migration needed? | **NO** |
| 17 | Schema change needed? | **NO** |
| 18 | Enum change allowed now? | **NO** — not needed |
| 19 | D2b-1b min scope? | 7 functions to typed CRUD + category mapping + status stripping |
| 20 | Deferred content? | Publisher wrappers (Phase E), UI category label rename (post-D2b) |

---

```
PHASE D2B-1B JOURNAL CONTRACT REVIEW COMPLETE

WORKDIR:                      /Users/ryan/Projects/active/platform-os
HEAD:                         dcc0298
Journal Canonical model:      JournalPost → @@map("journal_posts")
Canonical category contract:  OBJECT, MATERIAL, CRAFT, DONGHAI, CREATION, PHILOSOPHY
Legacy category decision:     Application-layer mapping (ARTIFACT→OBJECT, BRAND→PHILOSOPHY, TRAVELER→DONGHAI, CRAFT→CRAFT, OTHER→MATERIAL)
Workflow state owner:         Publisher (exclusive)
PublishStatus owner:          Publisher (exclusive — single status column, no separate publishStatus field)
Ordinary CRUD readiness:      7/10 functions migratable (3 Publisher wrappers deferred)
Schema change required:       NO
Data migration required:      NO
Publisher changes in Phase D: NO (Phase E only)
Phase E dependency:           Publisher CAST fix for IN_REVIEW/SCHEDULED/REJECTED on journal path
Recommended guard set:        G-JOURNAL-01 through G-JOURNAL-06
Report path:                  docs/PHASE_D2B_1B_JOURNAL_TAXONOMY_WORKFLOW_CONTRACT_REVIEW_2026-07-13.md
ADR path:                     NONE — no new ADR required
Modified files:               NONE (read-only audit)
Database operations:          NONE
Commit SHA:                   NONE
Push:                         NOT EXECUTED
Next Codex scope:             D2b-1b — Journal typed migration + category mapping + status stripping
```
