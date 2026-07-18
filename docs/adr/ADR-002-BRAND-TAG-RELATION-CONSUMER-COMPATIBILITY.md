# ADR-002: Brand Tag Relation Consumer Compatibility Contract

**Status:** ACCEPTED

**Date:** 2026-07-12

**Author:** Phase C Architecture Review

---

## 1. Context

Phase C Architecture Review (`docs/PHASE_C_BRAND_OS_CONSUMER_MIGRATION_ARCHITECTURE_REVIEW_2026-07-12.md`) identified that two production consumers in `apps/brand-os` depend on Prisma relations on the `Tag` model:

- `Tag.productTags` — accessed via `include` and `_count` in `tag-actions.ts:15,22`
- `Tag.journalTags` — accessed via `include` and `_count` in `tag-actions.ts:15,22`
- `_count.productTags` / `_count.journalTags` — type-referenced in `tags/page.tsx:14`

The current canonical Brand Runtime schema (`packages/brand-db/schema.prisma`) does not expose these reverse relations on `Tag`, `ProductTag`, or `LegacyJournalTag`. This creates a compatibility gap that must be resolved before Phase C consumer migration can proceed.

### The Core Question

Should the canonical schema expose Prisma relation fields for `product_tags` and `journal_tags` join tables, given that:

- The join table columns exist in the database (`product_id`, `tag_id`, `journal_id`)
- No database-level foreign key constraints exist on these columns
- Referential integrity is maintained at the application level
- Two production consumers depend on typed relations for queries and counts

---

## 2. Database Facts

Source: `docs/db-metadata/BRAND_DB_SCHEMA_METADATA_2026-07-11.md` and `docs/db-metadata/brand-db-schema-metadata-2026-07-11.json`, collected via read-only PostgreSQL session.

### 2.1 `tags` Table

| Column | Type | Nullable | PK | Unique |
|--------|------|----------|----|--------|
| `id` | text | NOT NULL | ✅ | — |
| `name` | text | NOT NULL | — | ✅ |
| `slug` | text | NOT NULL | — | ✅ |
| `description` | text | YES | — | — |
| `type` | TagType (enum) | NOT NULL | — | — |
| `created_at` | timestamp | NOT NULL | — | — |

No table-level references from other tables via FK.

### 2.2 `product_tags` Table

| Column | Type | Nullable | PK |
|--------|------|----------|----|
| `id` | text | NOT NULL | ✅ |
| `product_id` | integer | NOT NULL | — |
| `tag_id` | text | NOT NULL | — |

**Unique constraint:** `(product_id, tag_id)` composite unique.

**Foreign key constraints: NONE.** The metadata report states explicitly (Section 7, Constraint Findings):

> "Notable: `product_tags` has NO explicit foreign key constraint on `product_id` or `tag_id` — only a unique index on (product_id, tag_id). Referential integrity is handled at application level."

**No FK on `product_id` → `products.id`:** Application-level integrity only.
**No FK on `tag_id` → `tags.id`:** Application-level integrity only.

### 2.3 `journal_tags` Table

| Column | Type | Nullable | PK |
|--------|------|----------|----|
| `id` | text | NOT NULL | ✅ |
| `journal_id` | text | NOT NULL | — |
| `tag_id` | text | NOT NULL | — |

**Foreign key constraints: NONE confirmed.** The metadata report lists no FK constraints for `journal_tags`. No unique constraint beyond the PK.

### 2.4 Summary of Relation Evidence

| Relationship | Columns Exist | FK Constraint | Referential Integrity |
|-------------|---------------|---------------|----------------------|
| `product_tags.product_id` → `products.id` | ✅ Yes | ❌ None | Application-level |
| `product_tags.tag_id` → `tags.id` | ✅ Yes | ❌ None | Application-level |
| `journal_tags.journal_id` → `journal_posts.id` | ✅ Yes | ❌ None | Application-level |
| `journal_tags.tag_id` → `tags.id` | ✅ Yes | ❌ None | Application-level |

---

## 3. Current Consumer Dependency

### 3.1 `tag-actions.ts` (server action)

```typescript
// Line 12-16: getTags — uses _count.include
return prisma.tag.findMany({
  where,
  orderBy: { name: "asc" },
  include: { _count: { select: { productTags: true, journalTags: true } } },
});

// Line 19-24: getTag — uses relation include
return prisma.tag.findUnique({
  where: { id },
  include: { productTags: true, journalTags: true },
});

// Line 67-72: updateProductTags — uses ProductTag write (no relation needed)
await prisma.productTag.deleteMany({ where: { productId } });
await prisma.productTag.createMany({ data: tagIds.map(t => ({ productId, tagId: t })) });

// Line 81-88: updateJournalTags — uses LegacyJournalTag write (no relation needed)
await prisma.journalTag.deleteMany({ where: { journalId } });
await prisma.journalTag.createMany({ data: tagIds.map(t => ({ journalId, tagId: t })) });
```

### 3.2 `tags/page.tsx` (client component)

```typescript
// Line 8-15: Hand-written type that expects _count
type Tag = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: TagType;
  _count?: { productTags: number; journalTags: number };
};
```

### 3.3 Consumer Requirements Summary

| Consumer | Requires | Without Relations |
|----------|----------|-------------------|
| `getTags()` | `include: { _count: { select: { productTags, journalTags } } }` | Cannot use Prisma `_count` — must run 2 extra queries per tag list |
| `getTag(id)` | `include: { productTags: true, journalTags: true }` | Cannot use Prisma `include` — must run 2 separate queries |
| `updateProductTags()` | `productTag.deleteMany/createMany` | ✅ Works without relations (scalar fields only) |
| `updateJournalTags()` | `journalTag.deleteMany/createMany` | ✅ Works without relations (scalar fields only) |
| `tags/page.tsx` type | `_count.productTags`, `_count.journalTags` | Type must change or adapter must provide |

---

## 4. Options Considered

### 4.1 Option A: Add Complete Two-Sided Relations to Canonical Schema

**Approach:**
- Add `Tag.productTags ProductTag[]` and `Tag.journalTags LegacyJournalTag[]` reverse relations
- Add `ProductTag.product LegacyBrandProduct @relation(...)` and `ProductTag.tag Tag @relation(...)` forward relations
- Add `LegacyJournalTag.journal JournalPost @relation(...)` and `LegacyJournalTag.tag Tag @relation(...)` forward relations
- Use `onDelete: NoAction` (default) — no cascade semantics since DB has no FK constraints
- Add Prisma comments documenting that referential integrity is application-level

**Pros:**
- ✅ Restores full consumer compatibility — `include`, `_count`, and `createMany` all work
- ✅ No database migration required — purely a Prisma declaration change
- ✅ Accurately documents logical column relationships even without FK enforcement
- ✅ 2 consumers see zero query restructuring in Phase C2
- ✅ Prisma generates correct JOIN SQL from declared relations regardless of FK existence
- ✅ Eliminates "orphan model" problem (bare join tables with no connections)
- ✅ No change to: table count (22), context ownership, database ownership
- ✅ Contract Guard can verify relations exist

**Cons:**
- ❌ Schema declares relations that have no database-level FK enforcement
- ❌ Potential for future readers to assume FK constraints exist
- ❌ Prisma `onDelete: Cascade` from frozen schema is wrong — must explicitly use NoAction

### 4.2 Option B: Keep Canonical Schema Bare, Consumers Use Separate Queries

**Approach:**
- `Tag` model stays relation-free in canonical schema
- Adapter provides helper functions: `getTagWithCounts()`, `listTagsWithCounts()`
- Consumers restructure to use helper functions instead of Prisma `include`/`_count`

**Pros:**
- ✅ Canonical schema only contains FK-backed relations (not applicable here since no FKs exist)
- ✅ No risk of misleading future readers about FK constraints
- ✅ Adapter boundary is clear — no Prisma delegate simulation

**Cons:**
- ❌ `getTags()` would need 2 extra COUNT queries per tag list (N+1 risk for any consumer iterating results)
- ❌ `getTag(id)` would need 2 extra `findMany` queries
- ❌ TypeScript hand-types in `tags/page.tsx` must change or adapter must re-shape
- ❌ Phase C2 migration scope increases — more files to change, more testing
- ❌ Sets precedent that logical column relationships don't belong in canonical schema

### 4.3 Option C: Adapter Simulates Prisma `include`/`_count`

**Approach:**
- Adapter wraps `brandDb.tag` delegate to intercept `include` and `_count` calls
- Adds hand-rolled query logic to simulate Prisma relation behavior

**Pros:**
- ✅ Canonical schema stays pure
- ✅ Consumer query syntax stays identical

**Cons:**
- ❌❌ Requires wrapping Prisma delegate — extremely complex, fragile, and type-unsafe
- ❌❌ Prisma delegate is not designed for proxying — `include`/`_count` are SDK-level, not runtime-overridable
- ❌❌ Would break on Prisma Client version upgrades
- ❌❌ Cannot maintain type safety for arbitrary `include`/`select` shapes
- **This option is rejected as infeasible** for the stated reason: Adapter cannot simulate Prisma delegate with type safety.

---

## 5. Decision

**ACCEPTED: Option A — Add complete two-sided relations to the canonical schema.**

The canonical schema will add:

1. `Tag.productTags ProductTag[]` — reverse relation
2. `Tag.journalTags LegacyJournalTag[]` — reverse relation
3. `ProductTag.product LegacyBrandProduct @relation(fields: [productId], references: [id])` — forward relation
4. `ProductTag.tag Tag @relation(fields: [tagId], references: [id])` — forward relation
5. `LegacyJournalTag.journal JournalPost @relation(fields: [journalId], references: [id])` — forward relation
6. `LegacyJournalTag.tag Tag @relation(fields: [tagId], references: [id])` — forward relation

**All relations use `onDelete: NoAction` (Prisma default, explicit for clarity).**

**Prisma comments document that referential integrity is application-level, not database-level.**

---

## 6. Detailed Rationale

### 6.1 Prisma Relations Do Not Require FK Constraints

Prisma generates correct JOIN SQL from declared relations even when no FK constraint exists at the database level. The columns exist, the types match, and the logical relationship is well-known. Prisma does not validate FK existence at generation time.

### 6.2 No Database Migration Required

This change is purely a `.prisma` file modification. It:
- Adds no new columns or tables
- Creates no new FK constraints
- Alters no indexes
- Requires no `prisma db push`, `prisma migrate`, or `ALTER TABLE`
- The `prisma generate` output changes (client now exposes relation methods), but the database schema is **untouched**

### 6.3 Database Ownership Is Unchanged

All models (`Tag`, `ProductTag`, `LegacyJournalTag`, `LegacyBrandProduct`, `JournalPost`) are already in the Brand Runtime schema, targeting `BRAND_DATABASE_URL`. Adding relations does not cross context boundaries, reference ERP tables, or introduce `brand_*` target tables.

### 6.4 Consumer Risk Reduction

Two production consumers that would otherwise require significant restructuring (2 extra queries each, N+1 mitigation, type changes) instead require **zero query changes** in Phase C2. The migration becomes:
- Import path change: `@/lib/prisma` → adapter
- Model name change: `tag` → `tag` (same!), `productTag` → `productTag` (same!), `journalTag` → `legacyJournalTag`
- Relation names: `productTags` → `productTags` (same!), `journalTags` → `journalTags` (same!)

### 6.5 Application-Level Referential Integrity Is Documented

The frozen schema used `onDelete: Cascade`, which is misleading since there are no FK constraints to cascade. The canonical schema uses `onDelete: NoAction` with a comment:

```prisma
/// Referential integrity is maintained at application level.
/// Database has no FK constraint between product_tags.tag_id and tags.id.
```

This accurately documents the reality without implying DB-level enforcement.

### 6.6 Precedent Alignment

The canonical schema already exposes relations that have FK backing:
- `LegacyBrandProduct.series → LegacyBrandSeries` (FK exists on `products.series_id`)
- `LegacyProductMaterial.product → LegacyBrandProduct` (FK exists)
- `LegacyProductMaterial.material → LegacyBrandMaterial` (FK exists)

Adding Tag relations that have column-level but not FK-level backing is a reasonable extension of the same pattern — the columns exist, the relationship is known, and consumers benefit.

---

## 7. Canonical Schema Contract

### 7.1 Exact Schema Changes

#### Tag model (add reverse relations)

```prisma
model Tag {
  id          String             @id
  name        String             @unique
  slug        String             @unique
  description String?
  type        TagType
  createdAt   DateTime           @default(now()) @map("created_at")
  /// Reverse relation for product_tags join table.
  /// Referential integrity is application-level; no DB FK constraint exists.
  productTags ProductTag[]
  /// Reverse relation for journal_tags join table.
  /// Referential integrity is application-level; no DB FK constraint exists.
  journalTags LegacyJournalTag[]

  @@map("tags")
}
```

#### ProductTag model (add forward relations)

```prisma
model ProductTag {
  id        String             @id
  productId Int                @map("product_id")
  tagId     String             @map("tag_id")
  /// Forward relation to product. No DB FK constraint; app-level integrity.
  product   LegacyBrandProduct @relation(fields: [productId], references: [id])
  /// Forward relation to tag. No DB FK constraint; app-level integrity.
  tag       Tag                @relation(fields: [tagId], references: [id])

  @@unique([productId, tagId])
  @@map("product_tags")
}
```

#### LegacyJournalTag model (add forward relations)

```prisma
model LegacyJournalTag {
  id        String       @id
  journalId String       @map("journal_id")
  tagId     String       @map("tag_id")
  /// Forward relation to journal post. No DB FK constraint; app-level integrity.
  journal   JournalPost  @relation(fields: [journalId], references: [id])
  /// Forward relation to tag. No DB FK constraint; app-level integrity.
  tag       Tag          @relation(fields: [tagId], references: [id])

  @@map("journal_tags")
}
```

### 7.2 What This Does NOT Change

| Aspect | Unchanged |
|--------|-----------|
| Physical table count | Still 22 tables |
| Table ownership | All in Brand Runtime, same DB |
| datasource | `BRAND_DATABASE_URL` only |
| Column definitions | No column changes |
| FK constraints | None added (still application-level) |
| Indexes | None added or removed |
| Enum values | Unchanged |
| model `@@map()` directives | Unchanged (`product_tags`, `journal_tags`, `tags`) |
| `brand_*` target tables | None introduced |
| ERP context boundary | Not crossed |
| Generator output path | `./node_modules/@prisma/brand-client` |

### 7.3 What This Changes

| Aspect | Changed |
|--------|---------|
| Prisma Client API | Tag now exposes `productTags`, `journalTags` relation methods |
| Prisma Client API | ProductTag now exposes `product`, `tag` relation methods |
| Prisma Client API | LegacyJournalTag now exposes `journal`, `tag` relation methods |
| Generated TypeScript types | Relation types included in generated client |

---

## 8. Adapter Responsibility Boundary

With Option A, the adapter's responsibility is **minimized**:

| Responsibility | Adapter? | Detail |
|---------------|----------|--------|
| Client lifecycle | ✅ Yes | Uses `@yunwu/brand-db`'s `brandDb` proxy singleton |
| Import compatibility | ✅ Yes | Provides single import location for all consumers |
| Model name compatibility | ✅ Yes | Consumer uses `brandDb.legacyBrandProduct` etc. (adapter re-exports these) |
| Tag `include`/`_count` | ❌ **No** | Canonical schema now has relations — consumer code uses them directly |
| Enum re-exports | ✅ Yes | Re-exports `PublishStatus`, `TagType`, etc. from `@yunwu/brand-db` |
| Type re-exports | ✅ Yes | Re-exports model types with old names as aliases |
| Query shape transformation | ❌ **No** | Prisma handles joins natively via declared relations |
| Prisma delegate simulation | ❌ **No** | Not needed — canonical schema has the relations |

This means the adapter is a **thin re-export layer** — it handles import routing and naming compatibility but does NOT simulate or proxy any Prisma SDK behavior.

---

## 9. Consumer Migration Impact

### 9.1 Tag Consumers (Phase C2)

**`tag-actions.ts`** — Zero query logic changes:

| Line | Before (frozen) | After (canonical + adapter) |
|------|-----------------|----------------------------|
| 12 | `prisma.tag.findMany({ include: { _count: { select: { productTags: true, journalTags: true } } })` | `brandDb.tag.findMany({ include: { _count: { select: { productTags: true, journalTags: true } } })` |
| 20 | `prisma.tag.findUnique({ include: { productTags: true, journalTags: true } })` | `brandDb.tag.findUnique({ include: { productTags: true, journalTags: true } })` |
| 67 | `prisma.productTag.deleteMany(...)` | `brandDb.productTag.deleteMany(...)` |
| 69 | `prisma.productTag.createMany(...)` | `brandDb.productTag.createMany(...)` |
| 81 | `prisma.journalTag.deleteMany(...)` | `brandDb.legacyJournalTag.deleteMany(...)` |
| 83 | `prisma.journalTag.createMany(...)` | `brandDb.legacyJournalTag.createMany(...)` |

Only model name changes (`productTag` stays same, `journalTag` → `legacyJournalTag`). No query restructuring.

**`tags/page.tsx`** — Type reference stays compatible:
```typescript
import { TagType } from "@yunwu/brand-db";  // ← same enum, different package
```

The hand-written `_count` type may need adjustment if the generated `Tag` type now includes `productTags` relation (which changes the type shape). But since the page uses `_count?: { productTags: number; journalTags: number }` as an optional property (manually typed), it won't conflict with the generated type's `productTags: ProductTag[]` field — they're different properties. The `_count` field comes from Prisma's `include: { _count: ... }` which returns a separate shape via TypeScript mapping.

### 9.2 Non-Tag Consumers (Phase C2)

All other consumers use models whose relation status is unchanged. They see:
- Import path change only (`@/lib/prisma` → adapter)
- ~4 model name changes (product, series, material, journalTag — all documented in Phase C review)

### 9.3 No Query Logic Changes for Any Consumer

With Option A, **zero** production consumers require query restructuring. All changes are at the import/model-name level. This dramatically reduces migration risk.

---

## 10. Contract Guard Impact

### 10.1 New Guard Rules

The Prisma Contract Guard must be extended with the following rules:

| Rule | Check | Phase |
|------|-------|-------|
| Tag has `productTags` relation | `model Tag` contains `productTags ProductTag[]` | C1 |
| Tag has `journalTags` relation | `model Tag` contains `journalTags LegacyJournalTag[]` | C1 |
| ProductTag has forward relations | `model ProductTag` contains `product` and `tag` relation fields | C1 |
| LegacyJournalTag has forward relations | `model LegacyJournalTag` contains `journal` and `tag` relation fields | C1 |
| Relations use NoAction | All `@relation` directives on these models use `onDelete: NoAction` or omit onDelete entirely | C1 |
| No onDelete Cascade | No `onDelete: Cascade` exists on ProductTag or LegacyJournalTag | C1 |

### 10.2 Guard Test Updates

| Test | What It Verifies | Phase |
|------|-----------------|-------|
| Tag relations exist | Guard rule + typecheck | C1 |
| Relations compile correctly | `pnpm --filter @yunwu/brand-db typecheck` | C1 |
| Consumer queries typecheck | `pnpm --filter @yunwu/brand-os typecheck` with adapter | C2 |

### 10.3 Drift Prevention

Once added, Contract Guard ensures these relations cannot be accidentally removed or altered. This is an improvement over the current state where the frozen schema has relations but the canonical schema does not — a drift that Phase C review explicitly flagged as a migration blocker.

---

## 11. Testing Impact

### 11.1 Direct Testing

| Test | Scope | Phase |
|------|-------|-------|
| Schema validation | `prisma validate` on canonical schema | C1 |
| Client generation | `prisma generate` produces relation methods | C1 |
| TypeScript compilation | Adapter + consumer code compiles with new types | C2 |
| Guard tests | New guard rules pass | C1 |

### 11.2 No Additional Integration Tests Required

Since:
- Relations are Prisma-level declarations
- No database schema changes
- No FK constraints or cascade behavior
- Consumer query shape is identical

No database-level integration tests are required for this change alone.

### 11.3 Existing Tests

`apps/brand-os/src/lib/series-id.test.ts` — Zero impact (pure utility, no Prisma).

---

## 12. Database Migration Impact

**No database migration is required.** Zero DDL changes. Zero data changes.

This is a purely declarative change to a `.prisma` file. The `prisma generate` output changes, but the database is untouched.

---

## 13. Security Impact

| Concern | Assessment |
|---------|-----------|
| Credential exposure | None — relations don't involve env vars |
| Context boundary crossing | None — all models in Brand Runtime schema |
| Data exfiltration risk | None — relations don't change access patterns |
| New attack surface | None — Prisma Client API extension only |

**No security impact.**

---

## 14. Rollback Strategy

| Time | Action |
|------|--------|
| Before C1 commit | `git checkout -- packages/brand-db/schema.prisma` |
| After C1, before C2 | `git revert <C1-commit>` — removes relations, adapter remains as shim |
| After C2 | `git revert <C2-commit>` — consumers revert to old imports, frozen schema still generates client |
| Any phase | `pnpm install && pnpm --filter @yunwu/brand-db prisma:generate` restores working state |

**Key rollback safety:** No database state changes at any point. All rollbacks are code-only.

---

## 15. Consequences

### Positive

1. **Phase C2 migration is simpler** — 2 consumer files need zero query restructuring. The migration is purely import path + model name changes.
2. **Non-Tag consumers unaffected** — No relation changes for any other model.
3. **Canonical schema completeness** — All logical column relationships are now expressed in Prisma.
4. **Guard prevents drift** — Once added, relations cannot be accidentally removed.
5. **No DB migration needed** — Zero DDL, zero data, zero FK changes.
6. **Adapter stays thin** — No Prisma delegate simulation needed.

### Negative

1. **Relations without FK enforcement** — The schema declares relationships that the database does not enforce. Mitigated by explicit `///` comments on each relation field.
2. **Future reader confusion risk** — Someone seeing Prisma relations might assume FK constraints exist. Mitigated by comments explicitly stating app-level integrity.

### Mitigations

All added relation fields include a Prisma `///` comment documenting:
- That referential integrity is application-level
- That no DB FK constraint exists
- A cross-reference to ADR-002 for full context

Example:
```prisma
/// Reverse relation for product_tags join table.
/// Referential integrity is application-level; no DB FK constraint exists.
/// See ADR-002 §7.1.
productTags ProductTag[]
```

---

## 16. Explicit Non-Goals

| Non-Goal | Reason |
|----------|--------|
| Adding FK constraints to database | No DB migration planned |
| Changing referential integrity model | Application-level integrity is sufficient |
| Adding cascade delete behavior | No FK to cascade; app handles referential integrity |
| Introducing brand_* target tables | Not related to this decision |
| Restoring frozen schema's exact relations | `onDelete: Cascade` from frozen schema was inaccurate |
| Changing any other model's relations | Only Tag, ProductTag, LegacyJournalTag affected |
| Adding relations for join tables without consumer need | Orders, admin_users, audit_logs remain bare |
| Creating a second ORM abstraction | Adapter stays thin — no delegate proxying |
| Data migration | No data changes needed |

---

## 17. Rejected Alternatives

### Option B (Bare Schema, Separate Queries) — Rejected

**Why:** While architectually "purer" (schema mirrors only FK-backed relationships), this would force:
- 2 extra COUNT queries per tag list (N+1 pattern)
- 2 extra findMany queries per tag detail
- TypeScript type changes in `tags/page.tsx`
- A precedent where logical column relationships are excluded from the canonical schema

The benefit (schema doesn't declare FK-less relations) does not outweigh the cost (consumer complexity, N+1 risk, larger Phase C2 scope).

### Option C (Adapter Simulates Prisma Delegate) — Rejected

**Why:** Prisma delegate simulation is technically infeasible with type safety. The `include`/`_count` SDK methods are deeply tied to Prisma's generated types. Hand-rolling equivalent behavior would require:
- Wrapping every Prisma query method
- Maintaining type-safe mappings for arbitrary shapes
- Breaking on Prisma Client version upgrades

This creates a "second ORM" that is neither as capable as Prisma nor as simple as raw SQL.

---

## 18. Phase C Execution Boundary

### Phase C1 Scope (Tag Relations + Adapter Infrastructure)

**What C1 does:**
- ✅ Modify `packages/brand-db/schema.prisma` — add 6 relation fields
- ✅ Update Contract Guard — add 6 new rules for Tag relations
- ✅ Update guard tests — verify relations exist
- ✅ Create `apps/brand-os/src/lib/brand-db-adapter.ts` — thin re-export layer
- ✅ Add `@yunwu/brand-db` to `apps/brand-os/package.json`
- ✅ Run `pnpm install` to link workspace dependency
- ✅ Run `pnpm --filter @yunwu/brand-db prisma:generate`
- ✅ Run `pnpm --filter @yunwu/brand-db typecheck`
- ✅ Run Contract Guard — verify new rules pass

**What C1 does NOT do:**
- ❌ Migrate 17 production consumers
- ❌ Delete old `@prisma/brand-client` generated output
- ❌ Delete frozen `apps/brand-os/prisma/schema.prisma`
- ❌ Remove `postinstall` prisma generate
- ❌ Modify Publisher (`apps/platform/lib/publisher.ts`)
- ❌ Modify `apps/platform` brand modules
- ❌ Write to database
- ❌ Deploy to any environment

### Phase C2 Scope (Consumer Migration)

**What C2 does:**
- ✅ Migrate all 17 production consumers to use adapter
- ✅ Handle 4 model delegate renames (product→legacyBrandProduct, etc.)
- ✅ Verify Tag `include`/`_count` queries work with canonical schema
- ✅ Update Contract Guard for consumer-facing rules
- ✅ Run `pnpm --filter @yunwu/brand-os typecheck` and `build`

**What C2 does NOT do:**
- ❌ Delete frozen schema (Phase H)
- ❌ Delete old generated client (Phase H)
- ❌ Modify Publisher (Phase E)
- ❌ Modify apps/platform (Phase D)
- ❌ Write to database

### Phase H (Future) — When Frozen Schema Is Deleted

The relations added in C1 must remain in the canonical schema. They are not "compatibility shims" — they are legitimate expressions of column relationships. Phase H deletes the frozen schema file but keeps the canonical schema intact.

---

## Appendix A: Evidence Cross-Reference

| Fact | Source | Location |
|------|--------|----------|
| `tags` table column structure | `brand-db-schema-metadata-2026-07-11.json` | Section: `tables.tags.columns` |
| `product_tags` table columns | Same | Section: `tables.product_tags.columns` |
| `product_tags` has NO FK constraints | `BRAND_DB_SCHEMA_METADATA_2026-07-11.md` | Section 7: "Notable: product_tags has NO explicit foreign key constraint" |
| `product_tags` unique index | Same | Section 7, Unique Constraints: "(product_id, tag_id) composite unique" |
| `journal_tags` table columns | `brand-db-schema-metadata-2026-07-11.json` | Section: `tables.journal_tags.columns` |
| `journal_tags` has NO FK constraints | `BRAND_DB_SCHEMA_METADATA_2026-07-11.md` | Implicit — not listed in Foreign Keys section |
| Consumer: `getTags()` with `_count.include` | `apps/brand-os/src/lib/actions/tag-actions.ts` | Line 15 |
| Consumer: `getTag()` with `include` | Same | Line 22 |
| Consumer: `updateProductTags()` write | Same | Lines 67-72 |
| Consumer: `tags/page.tsx` type | `apps/brand-os/src/app/admin/tags/page.tsx` | Line 14 |
| Frozen schema relations (ProductTag) | `apps/brand-os/prisma/schema.prisma` | ProductTag model with `@relation` + `onDelete: Cascade` |
| Frozen schema relations (JournalTag) | Same | JournalTag model with `@relation` + `onDelete: Cascade` |
| 22 physical table count | `BRAND_DB_SCHEMA_METADATA_2026-07-11.md` | Section 5: Table Existence Matrix |
| Phase C1/C2 boundary | `ADR-002` (this document) | Section 18 |
