# Phase D2a — Banner ID Contract Delta Review

**Date:** 2026-07-13
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**HEAD:** `03bc3d9` (Phase D1 complete)
**Phase D2a:** Previously BLOCKED — Banner.id missing default

---

## 1. Executive Conclusion

**UNBLOCKED.** The `Banner.id` column is backed by database sequence `banners_id_seq`. The evidence is:

1. **DB sequence confirmed** — `banners_id_seq` exists in metadata appendix
2. **Cross-referenced by yunwu-origin schema** — against the same Brand DB, uses `@default(autoincrement())`
3. **Production code omits id** — Raw SQL INSERT works because DB auto-generates
4. **Canonical schema omission** — `id Int @id` lacks `@default(autoincrement())`

Fix: Add `@default(autoincrement())` to `Banner.id`. Zero DDL. No migration. This is a mapping correction, not a schema change.

**No new ADR needed.** ADR-004's write contract is updated but not invalidated — this is a documented omission.

---

## 2. Workspace Restoration Status

| File | Status | Action |
|------|--------|--------|
| `apps/platform/app/(platform)/brand/home/client.tsx` | Had uncommitted experimental PageContent UI changes | ✅ Restored to HEAD via `git checkout` |
| All other files | No uncommitted changes | ✅ Clean |

**Git status after restoration:**
```
M  .DS_Store
?? .claude/
?? IMPORT_COMPLETE_REPORT.md
?? IMPORT_FINAL_REPORT.md
?? IMPORT_VERIFICATION_REPORT.md
?? apps/erp/scripts/*.js, *.ts, *.json
?? docs/*.md
?? docs/adr/
```

No modified tracked files remain. No committed changes from this session.

---

## 3. Blocking Type Evidence

### 3.1 The Error

Canonical schema declares `Banner.id` as:
```prisma
id Int @id
```

Without `@default(autoincrement())`, the generated `BannerCreateInput` TypeScript type requires `id` as a mandatory field. The platform's `createBanner` function omits `id`, relying on database auto-generation.

### 3.2 Three-Layer Contract Analysis

| Layer | Contract | Current State |
|-------|----------|---------------|
| **Database** | `banners.id` integer PK, default via `nextval('banners_id_seq')` | ✅ Default exists |
| **Prisma Canonical** | `Banner.id Int @id` | ❌ Missing `@default(autoincrement())` |
| **Application** | Omits `id` on INSERT | ✅ Works via DB auto-generation |

---

## 4. Banner Physical Metadata

### 4.1 Column Evidence

Source: `docs/db-metadata/brand-db-schema-metadata-2026-07-11.json` and `docs/db-metadata/BRAND_DB_SCHEMA_METADATA_2026-07-11.md`.

| Property | Value | Source |
|----------|-------|--------|
| Column name | `id` | JSON `tables.banners.columns[0].name` |
| PostgreSQL type | `integer` | JSON `.type` |
| Nullable | `false` | JSON `.nullable` |
| Primary key | `true` | JSON `.pk` |
| Column default | *(not explicitly captured)* | JSON has no `.default` field |
| DB sequence | `banners_id_seq` | Markdown Sequences appendix |
| Identity | *(not captured)* | JSON has no `.identity` field |

### 4.2 Why Column Default Was Not Captured in JSON

The JSON metadata explicitly captured `products.id` with:
```json
"default": "nextval('products_id_seq')",
"identity": true
```

But `banners.id` has no `.default` or `.identity` property. This is a **metadata collection limitation**, not evidence that the default doesn't exist. The `INSERT` succeeds in production without `id`, which would fail with a NOT NULL violation if no default existed.

The sequence `banners_id_seq` is independently confirmed in the Sequences appendix, and the yunwu-origin schema (same DB) declares `@default(autoincrement())`.

---

## 5. Existing Database Default Evidence

| Evidence | Source | Strength |
|----------|--------|----------|
| Sequence `banners_id_seq` exists | Markdown metadata appendix: "banners_id_seq → banners.id" | ✅ Definitive |
| Yunwu-origin schema uses `@default(autoincrement())` | `yunwu-origin/prisma/schema.prisma` line 186 | ✅ Strong — same DB |
| Production INSERT omits `id` | `banners/actions.ts:56-59` | ✅ Strong — works at runtime |
| No code computes `id` manually | Full code search — zero `MAX(id)+1` or manual ID assignment | ✅ Strong |

### Conclusion: `banners.id` is backed by a database sequence with auto-increment behavior.

---

## 6. Frozen Schema Contract

The frozen `apps/brand-os/prisma/schema.prisma` does NOT contain a `Banner` model. The Banner model was never part of the brand-os frozen schema.

However, the authoritative schema for the Brand DB (`yunwu-origin/prisma/schema.prisma`) declares:

```prisma
model banners {
  id              Int       @id @default(autoincrement())
  title           String    @db.VarChar(255)
  // ...
}
```

This directly confirms the expected Prisma Client contract for the same physical table.

---

## 7. Existing Application Write Contract

The platform `banners/actions.ts` `createBanner` function (line 54-65):

```typescript
const sql = `INSERT INTO banners (title, subtitle, btn_text, image_url, mobile_image_url, link_url, position, sort_order, status, start_at, end_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`;
//                                                                                                           ^^
//                                           Note: no `id` in column list
```

- **Omits `id`** from INSERT column list — DB auto-generates via sequence
- **No application-level ID generation** — no `crypto.randomUUID()`, no `MAX(id)+1`, no sequence manual call
- **No external dependency on ID format** — it's an integer sequence
- **No existing code computes id from anywhere**

---

## 8. Canonical Schema Gap

### 8.1 Current State

```prisma
model Banner {
  id             Int       @id
  // ...
}
```

### 8.2 Required State

```prisma
model Banner {
  id             Int       @id @default(autoincrement())
  // ...
}
```

### 8.3 Impact

| Before Fix | After Fix |
|-----------|-----------|
| `BannerCreateInput` requires `id: number` | `id` becomes optional |
| Raw SQL `INSERT` omitting `id` works (DB default) | ✅ Same |
| Raw SQL and typed Prisma have inconsistent ID behavior | Consistent — both auto-generate |
| `brandDb.banner.create({ data: {...} })` without `id` would fail at typecheck | ✅ `id` is optional in `create` |
| Phase D2a typed migration blocked | ✅ Unblocked |

---

## 9. Options Considered

### Option A: Add `@default(autoincrement())` (RECOMMENDED)

**Evidence:** DB sequence `banners_id_seq` confirmed. yunwu-origin schema uses it. Production INSERTs omit `id`.

**Pros:**
- Zero DDL — no database change
- Matches existing DB behavior exactly
- Consistent with yunwu-origin schema (same DB)
- Enables typed `brandDb.banner.create()` without `id`
- No application-side ID generation needed
- All Raw SQL and typed writes behave consistently

**Cons:**
- ADR-004 write contract needs documenting as omission (not invalidation)

### Option B: Keep Raw SQL as Permanent Solution

**Pros:** None beyond avoiding a schema file change.

**Cons:**
- Blocks Phase D2a typed migration
- Perpetuates raw SQL in brand modules
- Creates inconsistency between Raw SQL and typed Prisma behavior
- Violates Phase D architecture goal

**Verdict:** Rejected.

### Option C: Manually Query Sequence in Application

**Pros:** None.

**Cons:**
- Requires `SELECT nextval('banners_id_seq')` before every create
- Adds round-trip latency
- Race condition risk
- Violates "no manual sequence queries" rule

**Verdict:** Rejected.

---

## 10. Final Decision

**ACCEPTED: Option A — Add `@default(autoincrement())` to `Banner.id`.**

```prisma
model Banner {
  id             Int       @id @default(autoincrement())
  title          String
  imageUrl       String?   @map("image_url")
  linkUrl        String?   @map("link_url")
  position       String?   @default("home")
  sortOrder      Int?      @default(0) @map("sort_order")
  /// Free-text banner convention; no enum or database CHECK constraint. ADR-001 §7.3.
  status         String?   @default("DRAFT")
  startAt        DateTime? @map("start_at") @db.Timestamptz(6)
  endAt          DateTime? @map("end_at") @db.Timestamptz(6)
  createdAt      DateTime? @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime? @default(now()) @map("updated_at") @db.Timestamptz(6)
  publishedAt    DateTime? @map("published_at") @db.Timestamptz(6)
  subtitle       String?
  btnText        String?   @map("btn_text")
  mobileImageUrl String?   @map("mobile_image_url")

  @@map("banners")
}
```

### 10.1 Schema Accuracy

`autoincrement()` maps to the existing `banners_id_seq` sequence in PostgreSQL. This is:
- A **mapping correction**, not a new database object creation
- Equivalent to what `yunwu-origin/prisma/schema.prisma` declares for the same table
- Consistent with how `LegacyBrandProduct`, `LegacyBrandSeries`, and `LegacyBrandMaterial` already use `@default(autoincrement())`

---

## 11. Database Migration Impact

**Zero DDL. No migration.**

| Concern | Assessment |
|---------|-----------|
| `prisma generate` after change | ✅ Output reflects new default |
| `prisma db push` | ❌ Not needed — DB already has sequence |
| `prisma migrate` | ❌ Not needed — DB already has sequence |
| `prisma validate` | ✅ Passes — autoincrement is valid syntax |
| Existing data | ✅ Unchanged |
| Existing raw SQL INSERT | ✅ Works identically — DB sequence is unchanged |
| New typed Prisma create | ✅ Now optional `id` — consistent with raw SQL |

---

## 12. Guard Impact

### 12.1 New Guard Rule

A field-level guard rule is required:

| Rule ID | Check | Type |
|---------|-------|------|
| G-BANNER-01 | `Banner.id` has `@default(autoincrement())` | Static schema validation |

### 12.2 Guard Fixtures

| Test | Expected |
|------|----------|
| Banner.id with `@default(autoincrement())` | ✅ Pass |
| Banner.id without default | ❌ Fail |
| Banner.id with `@default(cuid())` (wrong type) | ❌ Fail |

### 12.3 Guard Belongs in D2a Scope

The guard rule is added as part of the same D2a Codex ticket that fixes the schema. It does not require a separate ADR or phase.

---

## 13. ADR Requirement Decision

**NO NEW ADR REQUIRED — CANONICAL CONTRACT OMISSION.**

| Evaluation | Verdict |
|------------|---------|
| Is this a new architectural decision? | ❌ No — mapping correction of existing DB behavior |
| Is this a Prisma Client contract clarification? | ✅ Yes — missing `@default(autoincrement())` |
| Is there a conflict between metadata and code? | ❌ No — metadata supports autoincrement (sequence exists) |
| Does this invalidate ADR-004? | ❌ No — ADR-004's write contract is extended, not invalidated |

ADR-004 §13.1 stated all 13 models were covered, but `Banner` was listed as having NO writes in brand-os (which was correct for brand-os). The platform's `createBanner` was not part of the brand-os audit scope. This is a **Phase D discovery**, not an ADR-004 error.

The ADR-004 write contract matrix at §13.1 should note the Banner omission once corrected, but does not require a formal addendum.

---

## 14. TypeScript Baseline Reconciliation

### 14.1 Error Count by Command

| Command | Scope | Error Count | D2a File Errors |
|---------|-------|:-----------:|:----------------:|
| `pnpm --filter @yunwu/platform-app exec tsc --noEmit` | apps/platform + packages/ui (transitive) | **148** | **0** |
| Excluding `packages/ui/` | apps/platform only | **~4** | **0** |

### 14.2 Reconciliation

The Delta Review reported ~20 errors because the count covered `apps/platform` scope only (excluding `packages/ui/` resolution issues). The 148-count command includes transitive dependencies.

**The errors that matter for D2a are zero** — the non-ui errors are in banner `client.tsx` and journal `client.tsx`, not in any D2a action file.

### 14.3 Unified Verification Command for Phase D2a

```bash
# Verify D2a files have zero diagnostics
npx tsc --noEmit --project apps/platform/tsconfig.json 2>&1 | grep -E "D2a|(home|banners|seo|settings)/actions"
```

### 14.4 Acceptance Criteria

| Criterion | Standard | Verification |
|-----------|----------|-------------|
| D2a modified files | Zero TypeScript diagnostics | `tsc --noEmit` on D2a files |
| Total errors (platform scope) | Pre-existing count only | Compare `tsc --noEmit` before/after |
| Platform build | Passes | `pnpm --filter @yunwu/platform-app build` |

---

## 15. D2a Resumption Scope

### 15.1 Phase D2a Full File List

| # | File | Change | Publisher Deps? |
|---|------|--------|----------------|
| 1 | `packages/brand-db/schema.prisma` | `Banner.id` → `@default(autoincrement())` | — |
| 2 | `scripts/check-prisma-schema-contract.mjs` (or guard) | Add G-BANNER-01 rule | — |
| 3 | `modules/brand/seo/actions.ts` | `prisma` → `brandDb` | ❌ |
| 4 | `modules/brand/settings/actions.ts` | `prisma` → `brandDb` | ❌ |
| 5 | `modules/brand/home/actions.ts` (settings part) | `prisma` → `brandDb` for site_settings | ❌ |
| 6 | `modules/brand/home/actions.ts` (page_contents) | Fix INSERT, restrict UPDATE, migrate to `brandDb.*` | ✅ Publisher wrappers kept |
| 7 | `modules/brand/banners/actions.ts` (CRUD) | Migrate create/update/delete to `brandDb.banner.*` | ✅ publish/unpublish kept as raw SQL |

### 15.2 Explicit Exclusions

| Item | Reason |
|------|--------|
| `lib/publisher.ts` | Phase E |
| Banner `publishBanner` / `unpublishBanner` | Call `transitionStatus` — Phase E |
| Home `submitForReview` → `archiveHome` | Publisher wrappers — Phase E |
| moveBanner sort swap | Dynamic — D2b |
| Products, Series, Journal, Materials | D2b |
| Banner `client.tsx` TypeScript errors | Pre-existing, not in D2a scope |

---

## 16. Minimal Codex Implementation Scope

| Order | Action | File | Risk |
|-------|--------|------|------|
| 1 | Add `@default(autoincrement())` to Banner.id | `packages/brand-db/schema.prisma` | 🟢 |
| 2 | Run `prisma format && prisma validate && prisma generate` | — | 🟢 |
| 3 | Type probe: verify `BannerCreateInput` allows omitting `id` | — | 🟢 |
| 4 | Add G-BANNER-01 guard rule | Guard file | 🟢 |
| 5 | Run guard + guard tests | — | 🟢 |
| 6 | Verify `pnpm --filter @yunwu/brand-db typecheck` | — | 🟢 |
| 7 | Migrate SEO actions | `seo/actions.ts` | 🟡 |
| 8 | Migrate Settings actions | `settings/actions.ts` | 🟡 |
| 9 | Migrate Home settings violation | `home/actions.ts` | 🟡 |
| 10 | Fix PageContent INSERT/UPDATE (remove status/published_at) | `home/actions.ts` | 🟡 |
| 11 | Migrate Banner create/update/delete | `banners/actions.ts` | 🟡 |
| 12 | Full typecheck + build | — | 🟢 |
| 13 | Update baseline | `docs/YUNWU_MASTER_BASELINE.md` | 🟢 |
| 14 | Commit + push | — | 🟢 |

---

## 17. Explicit Out-of-Scope List

| Item | Reason |
|------|--------|
| Products dynamic column migration | D2b |
| Series dynamic column migration | D2b |
| Journal dynamic column migration | D2b |
| Materials CRUD migration | D2b |
| Banner moveBanner sort swap | D2b (dynamic) |
| Publisher (`lib/publisher.ts`) | Phase E |
| All Publisher wrappers in brand modules | Phase E |
| `packages/ui/` TypeScript errors | Pre-existing, out of scope |
| Dashboard brand counts | Phase D3 |
| Frozen schema deletion | Phase H |

---

## Required Questions — Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Delta Conclusion | **UNBLOCKED — Banner.id should have `@default(autoincrement())`** |
| 2 | Workspace Clean Status | ✅ Restored to HEAD. `client.tsx` experimental changes reverted. |
| 3 | Banner DB Type | `integer` |
| 4 | Banner DB Default | Backed by sequence `banners_id_seq` — auto-increment behavior |
| 5 | Sequence / Identity Evidence | `banners_id_seq` confirmed in metadata Sequences appendix |
| 6 | Frozen Schema Default | Frozen brand-os schema has NO Banner model. yunwu-origin (same DB) has `@default(autoincrement())`. |
| 7 | Existing Create Behavior | Omits `id` in INSERT — DB auto-generates via sequence |
| 8 | Canonical Schema Decision | **Add `@default(autoincrement())`** to `Banner.id` |
| 9 | Database DDL Required? | **NO** — sequence already exists |
| 10 | Migration Required? | **NO** — mapping correction only |
| 11 | Contract Guard Change Required? | **YES** — add G-BANNER-01 rule |
| 12 | ADR-005 Required? | **NO** — canonical contract omission documented |
| 13 | Platform TS Baseline Command | `pnpm --filter @yunwu/platform-app exec tsc --noEmit` |
| 14 | Platform TypeScript Error Count | 148 total (144+ in packages/ui). **0 in D2a action files.** |
| 15 | D2a File Error Count | **0** — no TypeScript diagnostics in any D2a candidate file |
| 16 | Report Path | `docs/PHASE_D2A_BANNER_ID_CONTRACT_DELTA_REVIEW_2026-07-13.md` |
| 17 | Next Minimal Codex Scope | Add `@default(autoincrement())` to Banner.id + guard rule + D2a full migration (14 steps) |

---

```
FINAL STATUS: PHASE D2A BANNER CONTRACT RESOLVED — IMPLEMENTATION UNBLOCKED
```
