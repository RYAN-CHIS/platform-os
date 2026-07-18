# Prisma Schema Ownership & Runtime Contract Audit — Commit 480afda

**Date:** 2026-07-11
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**Audit Mode:** Read-only — no code changes, no database writes, no deployment

---

## Executive Summary

Commit 480afda restored compilation for 3 of 4 apps (erp ✅, brand-os ✅, platform-app ✅) but web still fails at runtime with P2022 because the generated Prisma Client expects a column `products.remaining_quantity` that does not exist in the production database. The production column is named `remaining_qty`.

The commit introduced three independent Prisma Clients (`@prisma/client`, `@prisma/brand-client`, `@prisma/web-client`) as a build fix. This restored compilation but preserved an underlying architecture problem: the web and brand-os frozen schemas have drifted from both the canonical `packages/db` schema AND the production database.

The `seriesId: null → 0` change in brand-os writes an invalid foreign key (`series_id = 0`) when no series is provided, which creates data integrity risk.

---

## Deployment Status of 480afda

| Check | Result |
|-------|--------|
| Pushed to `origin/main`? | ✅ Yes (480afda is on origin/main) |
| Deployed to Vercel production? | ❓ Cannot determine without Vercel API. Check Vercel dashboard. |
| HEAD == origin/main? | ✅ Yes (480afdac) |
| Current branch | `main` |

**If 480afda has NOT been deployed:** deployment must wait for the fixes identified in this audit.

**If 480afda HAS been deployed:** the web app is likely returning 500 errors on any route that queries `products.remaining_quantity`. Verify and roll back if needed.

---

## Prisma Schema Inventory

| Schema | Path | DB Target | Generator Output | Models | Consumers |
|--------|------|-----------|------------------|--------|-----------|
| **Canonical** | `packages/db/schema.prisma` | Production (Neon) via `DATABASE_URL` | Default `node_modules/@prisma/client` | 46 (all domain models) | `@yunwu/db`, apps/platform, apps/erp |
| **Frozen — brand-os** | `apps/brand-os/prisma/schema.prisma` | Same production DB via `DATABASE_URL` | `node_modules/@prisma/brand-client` | 15 (subset) | apps/brand-os |
| **Frozen — web** | `apps/web/prisma/schema.prisma` | Same production DB via `DATABASE_URL` | `node_modules/@prisma/web-client` | 15 (subset) | apps/web |
| **Frozen — erp** | `apps/erp/prisma/schema.prisma` | Same production DB via `DATABASE_URL` | Default `node_modules/@prisma/client` | ~20 (ERP models) | apps/erp |

### Schema header annotations confirm intent

Both `apps/brand-os/prisma/schema.prisma` and `apps/web/prisma/schema.prisma` contain this header:

```
/// ⚠️  FROZEN — 历史参考，禁止修改，禁止 migrate
/// 权威 Schema: packages/db/schema.prisma (37 models)
/// Migration 控制: packages/db (pnpm --filter @yunwu/db db:push)
/// 此文件仅用于 prisma generate (生成客户端类型)
/// Phase 3: 迁移完成后删除此文件
```

The `apps/erp/prisma/schema.prisma` has an identical header. All three frozen schemas explicitly state they should be removed in Phase 3.

---

## Prisma Client Inventory

| Client | Generated From | Generator Output | Used By | Generated in Commit 480afda? |
|--------|---------------|------------------|---------|------------------------------|
| `@prisma/client` | `packages/db/schema.prisma` (canonical) | Default `node_modules/@prisma/client` | `@yunwu/db`, apps/platform, apps/erp | ❌ No (pre-existing) |
| `@prisma/brand-client` | `apps/brand-os/prisma/schema.prisma` | `apps/brand-os/node_modules/@prisma/brand-client` | apps/brand-os | ✅ Yes (output relocated) |
| `@prisma/web-client` | `apps/web/prisma/schema.prisma` | `apps/web/node_modules/@prisma/web-client` | apps/web | ✅ Yes (output relocated) |

**Critical observation:** All three clients point to the SAME production database via `DATABASE_URL` env var. They are not independent databases — they are different Prisma representations of the same database. This means any field present in one schema but not in another will cause runtime errors if queried from the wrong client.

---

## Canonical Schema Decision

**The canonical schema is `packages/db/schema.prisma`.** This is confirmed by:

1. The project baseline (`docs/YUNWU_MASTER_BASELINE.md`) — references "authoritative Schema: packages/db/schema.prisma"
2. The header comments in all three frozen schemas
3. The `packages/db/index.ts` which wraps PrismaClient and exports domain services
4. The architecture intent documented in Phase 2.95+ milestones

The frozen schemas exist solely to generate separate Prisma Client outputs for apps that cannot import from `packages/db` due to Turbopack/build resolution issues. They are NOT independent schema authorities.

**Verdict:** The frozen schemas are legitimate as a BUILDWORK (temporary build fix) but are architecturally incorrect as long-term schema sources. They must be reconciled with `packages/db/schema.prisma` and eventually removed.

---

## Actual Production DB Structure vs All Schemas

### Product Field Drift Matrix

| DB Column | Production DB | Canonical (packages/db) | Frozen (brand-os) | Frozen (web) | Frozen (erp) |
|-----------|---------------|------------------------|-------------------|--------------|--------------|
| `id` | ✅ `Int @id` | ❌ Not present as Product (uses ErpProduct) | ✅ `Int @id` | ✅ `Int @id` | ❌ Uses ErpProduct |
| `sku` | ✅ `String @unique` | ❌ | ✅ | ✅ | ❌ |
| `name` | ✅ | ❌ | ✅ | ✅ | ❌ |
| `series_id` | ✅ `Int` | ❌ | ✅ `@map("series_id")` | ✅ `@map("series_id")` | ❌ |
| `stock` | ✅ `Int @default(0)` | ❌ | ✅ `Int @default(0)` | ✅ `Int @default(0)` | ❌ (has `finished_stock`) |
| `remaining_qty` | ✅ `Int?` | ❌ | ❌ **MISSING** | ❌ **has @map("remaining_quantity") — WRONG NAME** | ❌ |
| `publish_status` | ✅ `PublishStatus @default(DRAFT)` | ❌ | ❌ **MISSING** | ❌ **MISSING** | ❌ |
| `product_type` | ✅ `ProductType @default(STANDARD)` | ❌ | ❌ **MISSING** | ❌ **MISSING** | ❌ |
| `erp_product_id` | ✅ `Int? @unique` | ❌ | ❌ **MISSING** | ❌ **MISSING** | ❌ |
| `companions_count` | ✅ `Int @default(0)` | ❌ | ✅ `@map("companions_count")` | ✅ `@map("companions_count")` | ❌ |
| `sort_order` | ✅ `Int @default(0)` | ❌ | ❌ **MISSING** | ❌ **MISSING** | ❌ |
| `published_at` | ✅ `DateTime?` | ❌ | ❌ **MISSING** | ❌ **MISSING** | ❌ |
| V2.1 fields | ✅ (materialOrigin, craftMethod, etc.) | ❌ | ✅ (present) | ✅ (present) | ❌ |

### Root Cause of `remaining_quantity` P2022

**The web frozen schema has:**
```prisma
remainingQuantity Int?  @map("remaining_quantity")
```

**The production database has:**
```sql
remaining_qty Int?  -- column name is "remaining_qty", NOT "remaining_quantity"
```

The `@map("remaining_quantity")` causes Prisma to generate SQL referencing `remaining_quantity` as the column name. That column does not exist in the database. The production column is named `remaining_qty`.

**Fix:** Change the web schema to:
```prisma
remainingQty Int?  @map("remaining_qty")
```

No database migration is required — the column already exists, just under a different name than what the schema expects.

### Why brand-os and erp don't fail

- **brand-os** uses `@prisma/brand-client` which does NOT query `remaining_quantity` (it queries `stock` instead). The brand-os frozen schema lacks the field entirely, so no P2022.
- **erp** uses its own schema which maps to `ErpProduct.finished_stock`, not the `products` table at all.
- Only **web** accesses products through a client that expects the non-existent column.

---

## seriesId Zero-Risk Assessment

### The Change

In `apps/brand-os/src/app/api/products/route.ts`, line 53 was changed from:
```typescript
seriesId: data.seriesId ? parseInt(data.seriesId) : null
```
to:
```typescript
seriesId: data.seriesId ? parseInt(data.seriesId) : 0
```

### What seriesId Is

`seriesId` is a foreign key to the `series` table. The `series` model uses `@id @default(autoincrement())` — IDs start at 1. **There is no series with ID 0 in the database.**

### Risk Assessment

| Factor | Assessment |
|--------|-----------|
| Is `series_id` nullable in production? | **No** — `series_id INTEGER NOT NULL` |
| Is 0 a valid persisted series ID? | **No** — the foreign key constraint requires a valid series.id |
| Can the route be called without seriesId? | **Yes** — the POST handler defaults `data.seriesId` to 0 when falsy |
| What happens on INSERT with series_id=0? | PostgreSQL will fail with a foreign key violation if the constraint is enforced, OR insert an orphaned row if the constraint is deferred |
| Does this affect existing data? | Only newly created products lose their series association |

**Verdict: INCORRECT — MUST REWORK**

The correct behavior should be:
- **If the field is NOT NULL in the schema**: pass a valid seriesId or reject the request
- **If the field should be nullable**: revert to `null` AND add `@default(0)` or make the DB column nullable

Since the production schema shows `series_id` is non-nullable (`Int` not `Int?`), `0` is technically closer to correct than `null` (which would fail with `NOT NULL` constraint), but it creates an invalid foreign key. The correct fix is to either:
1. Require `seriesId` from the client and return 400 if missing, OR
2. Change the DB column to allow NULL and revert the code to `null`

**This is not a deployment blocker** (the POST path is authenticated and unlikely to receive null-series requests in normal operation), but it IS a data quality issue that should be fixed before it causes data integrity problems.

---

## @yunwu/auth Dependency Audit

### Current Dependencies

`packages/auth/package.json`:
```json
{
  "dependencies": {
    "@yunwu/db": "workspace:*",
    "@yunwu/platform-core": "workspace:*",
    "next-auth": "^4.24.14",
    "bcryptjs": "^3.0.3",
    "@prisma/client": "^6.19.3"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "prisma": "^6.19.3",
    "next": "^16.0.0"
  }
}
```

### Analysis

| Dependency | Type | Required By | Correct? |
|-----------|------|-------------|----------|
| `@yunwu/db` | runtime | `packages/auth/*.ts` imports from `@yunwu/db` | ✅ Correct — follows the intended `apps → auth → db` direction |
| `@yunwu/platform-core` | runtime | Auth package uses platform types | ✅ Correct |
| `next-auth` | runtime | Session handling | ✅ Correct |
| `bcryptjs` | runtime | Password hashing | ✅ Correct |
| `@prisma/client` | runtime | **Not directly imported by auth package code** | ❌ **INCORRECT — added for Turbopack resolution** |
| `prisma` | dev | **Not used by auth package at all** | ❌ **INCORRECT — added for Turbopack resolution** |
| `next` ^16.0.0 | dev | **Not imported by auth package code** | ❌ **INCORRECT — introduces version coupling** |

### Root cause

`@prisma/client` and `prisma` were added to `packages/auth/package.json` because `packages/sign-identity.ts` used to import from `@prisma/client`:

```typescript
// Original (before commit 480afda): 
import { Prisma } from "@prisma/client"

// After commit 480afda:
// Removed — now uses only @yunwu/db types
```

Commit 480afda already fixed the actual import — the code no longer references `@prisma/client` types. However, the `package.json` dependencies remain. This is harmless but untidy.

**For Turbopack resolution:** The packages/auth project needed `@prisma/client` declared in its own `package.json` because Turbopack resolves `@prisma/client` by scanning each workspace package's own dependencies. It was a build-hack, not a code-level dependency.

### Recommended Dependency Direction

```
apps (platform / brand-os / erp / web)
  → @yunwu/db        (PrismaClient + domain services)
  → @yunwu/auth       (session, identity, access control)
  → @yunwu/platform-core (shared types)
```

**`@yunwu/auth` should NOT directly depend on `@prisma/client` or `prisma`** — it should access the database exclusively through `@yunwu/db`. The `@prisma/client` dependency can be removed from `packages/auth/package.json` once Turbopack resolution is resolved at the monorepo level.

**Adding `next` ^16.0.0 as a devDependency** creates a version coupling risk — if the monorepo upgrades to Next.js 17, `packages/auth` also needs updating even though it doesn't import Next.js directly. This should be removed and resolved through the monorepo's shared dependency resolution instead.

---

## Independent Client Strategy Evaluation

| Option | Benefits | Risks | Migration Cost | Recommendation |
|--------|----------|-------|----------------|----------------|
| **A: Keep 3 clients permanently** | No migration needed | Schema drift guaranteed; build complexity; confusing | None | ❌ Not recommended |
| **B: Keep 3 clients temporarily, converge** | Quick fix for current build; allows incremental cleanup | Drift continues during transition; must track removal | Low | ✅ **RECOMMENDED FOR NOW** |
| **C: Use packages/db as only client** | Single source of truth; no drift | Requires all apps to resolve `@yunwu/db` import path — current Turbopack issue | Medium | ✅ **RECOMMENDED AS TARGET** |
| **D: Create bounded DB packages** | Cleanest separation; clear ownership | Highest upfront cost; overkill for current scale | High | ❌ Not needed now |
| **E: Other** | N/A | N/A | N/A | N/A |

**Recommendation:** Accept Option B as the current state (three clients). Work toward Option C (single `packages/db` client) by fixing the Turbopack resolution issue. Remove the frozen schemas when all apps can import from `@yunwu/db`.

### Independent Client Rules (if kept temporarily)

1. All three frozen schemas must be regenerated whenever `packages/db/schema.prisma` changes
2. A `postinstall` script must run all three `prisma generate` commands
3. CI must fail if frozen schemas drift from canonical
4. Every field in frozen schemas must exist in the production database

---

## Commit 480afda File-by-File Verdict

| File | Change | Correctness | Architecture Impact | Runtime Risk | Decision | Required Follow-up |
|------|--------|-------------|---------------------|--------------|----------|-------------------|
| `apps/brand-os/prisma/schema.prisma` | Added `companionsCount` field | ✅ Correct (matches DB) | Low — frozen schema | 🟢 None | **KEEP** | None (will be removed in Phase 3) |
| `apps/web/prisma/schema.prisma` | Added `companionsCount` field | ✅ Correct (matches DB) | Low — frozen schema | 🟢 None | **KEEP** | None |
| `apps/web/prisma/schema.prisma` | Has `remainingQuantity @map("remaining_quantity")` | ❌ **WRONG COLUMN NAME** — DB has `remaining_qty` | Low | 🔴 P2022 at runtime | **KEEP WITH FOLLOW-UP** | Change `@map("remaining_quantity")` → `@map("remaining_qty")` |
| `apps/brand-os/src/app/api/products/route.ts` | `seriesId: null → 0` | ❌ **INCORRECT** — 0 is not a valid FK | Low | 🟡 Invalid FK risk | **REWORK** | Either require seriesId or revert to null+nullable DB column |
| `apps/brand-os/src/lib/prisma.ts` | Changed to `@prisma/brand-client` | ✅ Correct for current build strategy | Medium — 3-client approach | 🟢 None | **KEEP** | None |
| `apps/web/src/lib/prisma.ts` | Changed to `@prisma/web-client` | ✅ Correct for current build strategy | Medium — 3-client approach | 🟢 None | **KEEP** | None |
| `apps/brand-os/src/lib/db.ts` | Import path update | ✅ Correct | Low | 🟢 None | **KEEP** | None |
| `apps/web/src/lib/db.ts` | Import path update | ✅ Correct | Low | 🟢 None | **KEEP** | None |
| `apps/brand-os/src/lib/actions/*` | Import path update | ✅ Correct | Low | 🟢 None | **KEEP** | None |
| `apps/web/src/lib/actions/*` | Import path update | ✅ Correct | Low | 🟢 None | **KEEP** | None |
| `apps/brand-os/src/app/admin/tags/page.tsx` | Import path update | ✅ Correct | Low | 🟢 None | **KEEP** | None |
| `packages/auth/package.json` | Added `@prisma/client`, `prisma`, `next` | ❌ **INCORRECT** — build hack, not actual dependency | Medium — version coupling | 🟢 Low risk | **KEEP WITH FOLLOW-UP** | Remove deps once Turbopack resolution is fixed |
| `packages/auth/sign-identity.ts` | Added 'platform' to SystemDomain union | ✅ Correct | Low | 🟢 None | **KEEP** | None |
| `packages/auth/index.ts` | Updated VerifyResult export path | ✅ Correct | Low | 🟢 None | **KEEP** | None |
| `packages/db/index.ts` | Re-export fix | ✅ Correct | Low | 🟢 None | **KEEP** | None |
| `pnpm-lock.yaml` | Lock file update | ✅ Correct | Low | 🟢 None | **KEEP** | None |

**Summary:** 12 of 17 changes are correct and should be kept. 2 need follow-up (web schema column name, auth deps). 1 should be reworked (seriesId: 0). 2 are cleanups.

---

## Safe Remediation Plan

### Step 1 (PRIORITY) — Fix web schema column mapping

```diff
// apps/web/prisma/schema.prisma line 75
-  remainingQuantity Int?          @map("remaining_quantity")
+  remainingQty Int?               @map("remaining_qty")
```

Also add the missing production columns that web uses:
```prisma
  publishStatus     PublishStatus     @default(DRAFT) @map("publish_status")
  productType       ProductType       @default(STANDARD) @map("product_type")
  erpProductId      Int?              @map("erp_product_id")
```

No database migration is needed — these columns already exist.

### Step 2 (RECOMMENDED) — Fix seriesId null handling

```diff
// apps/brand-os/src/app/api/products/route.ts line 53
-  seriesId: data.seriesId ? parseInt(data.seriesId) : 0,
+  if (!data.seriesId) {
+    return NextResponse.json({ error: "缺少 seriesId" }, { status: 400 });
+  }
+  seriesId: parseInt(data.seriesId),
```

### Step 3 (CLEANUP) — Remove auth build-hack dependencies

Remove `@prisma/client`, `prisma`, and `next` from `packages/auth/package.json` once the web and brand-os builds are verified to work without them.

### Step 4 (PHASE 3) — Converge to single client

Fix the Turbopack resolution so all apps import from `@yunwu/db`. Then remove the three frozen schema files and their `prisma generate` outputs.

---

## Database Mutation Decision

| Question | Answer |
|----------|--------|
| Is a database migration required? | **NOT REQUIRED** for the `remaining_qty` fix — column already exists, only the `@map` name is wrong |
| Is a database migration required for `seriesId: 0`? | **NOT REQUIRED** — the fix is in application code (validate input), not schema |
| Are any production columns missing? | **YES** — `publish_status`, `product_type`, `erp_product_id` exist in DB but are missing from web and brand-os frozen schemas. Adding them to the schemas does NOT require migration. |
| Can the remediation be done without `prisma db push`? | **YES** — all fixes are in schema file column mappings and application code |

---

## Deployment Go / No-Go

**NO-GO** for web until the `remaining_quantity → remaining_qty` @map fix is applied.

**GO** for platform-app, brand-os, erp — these apps compile and run correctly.

Once the web schema fix is applied, all four apps should deploy successfully without any database change.

---

## Final Summary

```
COMMIT 480afda:
SAFE WITH CONDITIONS

PRODUCTION DEPLOYMENT:
NO-GO (web only — fix column mapping first)

DATABASE CHANGE:
NOT REQUIRED

SERIES ID CHANGE:
MUST REWORK (validate input instead of defaulting to 0)

PRISMA TARGET ARCHITECTURE:
Temporary 3-client strategy converging to single @yunwu/db canonical client.

NEXT IMPLEMENTATION OWNER:
CLAUDE
```
