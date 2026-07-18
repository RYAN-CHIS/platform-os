# Phase 3 Prisma Client Convergence & Vercel Ownership Audit

**Date:** 2026-07-11
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**Commit:** 6543461 (P0 hotfix deployed to production)
**Audit Mode:** Read-only — no files modified, no database accessed, no deployment

---

## Executive Conclusion

**Prisma convergence is safe and feasible.** Two of four apps (platform and erp) already consume `@yunwu/db`. Only brand-os and web use separate locally-generated clients. The frozen schemas are duplicates with drift risk.

**Vercel configuration has a latent mismatch.** The root `vercel.json` points to `@yunwu/web` but the actual project (`.vercel/project.json`) builds `apps/platform`. If the Vercel linkage is ever lost and re-linked, this would deploy the wrong app.

**Recommended approach:** Phase 3A (unified generation + type transit) immediately; 3B/3C (brand-os/web migration) as independent, deployable steps.

---

## 1. Current Prisma Ownership Map

### 1.1 Schema Inventory

| Schema | Path | Models | Output | Auto-gen | Header Intent |
|--------|------|--------|--------|----------|--------------|
| **Canonical** | `packages/db/schema.prisma` | **41** | Default (`node_modules/@prisma/client`) | `postinstall: prisma generate` | Single source of truth |
| **Frozen (erp)** | `apps/erp/prisma/schema.prisma` | 24 | Default (no explicit output) | None (no postinstall script) | "Phase 3: delete" |
| **Frozen (brand-os)** | `apps/brand-os/prisma/schema.prisma` | 16 | `node_modules/@prisma/brand-client` | `postinstall: npx prisma generate` | "Phase 3: delete" |
| **Frozen (web)** | `apps/web/prisma/schema.prisma` | 16 | `node_modules/@prisma/web-client` | `postinstall: npx prisma generate` | "Phase 3: delete" |

### 1.2 Prisma Client Consumption Matrix

| App/ Package | Dependencies | Actual Import From | Client Used | Schema Served By | Generate Trigger | Can switch to `@yunwu/db` today? |
|-------------|-------------|-------------------|-------------|-----------------|-----------------|----------------------------------|
| **@yunwu/db** | `@prisma/client` | (owns the client) | Default `@prisma/client` | `packages/db/schema.prisma` | `postinstall: prisma generate` | ✅ (it IS the source) |
| **@yunwu/platform-app** | `@yunwu/db`, `@prisma/client` | `@yunwu/db` | Default `@prisma/client` | Inherited from packages/db | `pnpm db:generate` (manual) | ✅ Already done |
| **@yunwu/erp** | `@yunwu/db`, `@prisma/client` | **`@yunwu/db`** | Default `@prisma/client` | Inherited from packages/db | Inherited from packages/db postinstall | ✅ Already done |
| **@yunwu/brand-os** | `@yunwu/db`, `@prisma/client` | `@prisma/brand-client` | `@prisma/brand-client` | `apps/brand-os/prisma/schema.prisma` | `postinstall: npx prisma generate` | ❌ Not yet — depends on local schema |
| **@yunwu/web** | `@yunwu/db`, `@prisma/client` | `@prisma/web-client` | `@prisma/web-client` | `apps/web/prisma/schema.prisma` | `postinstall: npx prisma generate` | ❌ Not yet — depends on local schema |

### 1.3 Critical Observations

1. **erp already converged.** Its `prisma.ts` imports from `@yunwu/db`. Its local `schema.prisma` is vestigial — no one runs `prisma generate` from erp. Only its presence in Git is misleading.

2. **brand-os and web have identical model content** (16 models each). Both are subsets of the canonical 41-model schema. Their header comments explicitly say "Phase 3: delete this file after migration."

3. **packages/db has a `postinstall` hook** that generates the default `@prisma/client` whenever the package is installed. This means the canonical client is always available.

4. **brand-os and web both depend on `@yunwu/db`** but don't use it for Prisma access — they import from their local clients instead. The dependency is unused.

### 1.4 Schema Drift Risk

The frozen schemas (brand-os, web, erp) are **manually maintained copies** of subsets of the canonical schema. Adding a field to `packages/db/schema.prisma` does NOT automatically add it to the three frozen files. All three have already drifted independently of each other (different Product model structures, different enum values, different V2.1 fields). Every change requires 4 file edits instead of 1.

---

## 2. Current Vercel Deployment Ownership Map

### 2.1 Two Configuration Files

| Config File | Build Target | Root Directory | Build Command | Output Directory | Production? |
|------------|-------------|----------------|---------------|-----------------|-------------|
| **`vercel.json`** (root) | `@yunwu/web` | (not set — defaults to repo root) | `pnpm --filter @yunwu/web build` | `apps/web/.next` | ❌ **Does NOT match production** |
| **`.vercel/project.json`** (Vercel-linked) | `apps/platform` | `apps/platform` | `cd ../.. && pnpm db:generate && cd apps/platform && next build` | `.next` | ✅ **Actual production config** |

### 2.2 How They Interact

Vercel's configuration hierarchy:
1. When a project is linked (`vercel link`), `.vercel/project.json` is created
2. **`.vercel/project.json` settings take precedence** over root `vercel.json` for linked projects
3. Root `vercel.json` is only used as a fallback for unlinked projects or preview deployments

**This means:** Production deployment currently builds `apps/platform` correctly, despite root `vercel.json` pointing to `@yunwu/web`.

### 2.3 Risks

| Risk | Severity | Scenario |
|------|----------|----------|
| **Misleading root vercel.json** | 🟡 Medium | Developer reads root `vercel.json` and assumes the monorepo's primary deployment is `@yunwu/web`. The actual production deployment is `apps/platform`. |
| **vercel.json → web mismatch** | 🟡 Medium | Root `vercel.json` builds `@yunwu/web` but `.vercel/project.json` was explicitly configured for `apps/platform`. If the project is ever unlinked and re-linked, Vercel would auto-detect `vercel.json` and deploy `@yunwu/web`. |
| **Dual-deployment risk** | 🔴 High | If a preview branch deployment picks up root `vercel.json` instead of `.vercel/project.json`, it would build `@yunwu/web` instead of `apps/platform`. |
| **vercel.json purpose unclear** | 🟢 Low | The root `vercel.json` may be a leftover from an earlier architecture when `@yunwu/web` was the main deployment, or it may be the only Vercel Auto-Detect configuration for the `yunwu-origin` repository (a separate repo). For the platform-os monorepo, it is not the active deployment config. |

### 2.4 Production Vercel Project Identity

| Attribute | Value |
|-----------|-------|
| Vercel Project Name | `platform-os` |
| Production Domain | `platform.yunwuorigin.com` |
| Project ID | `prj_KyNN2wqLPlMfHsq0hYXU3Q6mP0EH` |
| Org ID | `team_j9lFcExPCgDUqvnA48Lj7W4m` |
| Root Directory | `apps/platform` |
| Production Branch | `main` |
| Deployed Commit | 6543461 (P0 hotfix) |
| Node Version | 24.x |

**The Vercel project's single deployment entry is `apps/platform`.** It is NOT `@yunwu/web`. The root `vercel.json` should either be removed or rewritten to match `.vercel/project.json`.

---

## 3. Confirmed Root Causes

| Issue | Root Cause |
|-------|------------|
| **Three Prisma Clients** | Build fix for Turbopack resolution (commit 480afda). Brand-os and web could not import from `@yunwu/db` due to Next.js/Turbopack bundling issues. The separate clients were a workaround. |
| **Schema drift frozen files** | The three `apps/*/prisma/schema.prisma` files are manually-maintained copies of canonical schema subsets. They drift independently because there is no automated sync. |
| **erp has a vestigial schema** | ERP already consumes `@yunwu/db`. Its local `prisma/schema.prisma` is never used at runtime. It exists only because it was created before the convergence and never cleaned up. |
| **Root vercel.json points to web** | Historical artifact. The monorepo initially deployed `@yunwu/web` as its primary app. When `apps/platform` became the main deployment, `.vercel/project.json` was updated but root `vercel.json` was not. |

---

## 4. Target Architecture

### 4.1 Prisma Target

```
┌─────────────────────────────────────────────────────┐
│                 @yunwu/db                            │
│  packages/db/schema.prisma (41 models)               │
│  prisma generate → default @prisma/client             │
│  postinstall auto-generates on pnpm install            │
└──────────────────────┬──────────────────────────────┘
                       │ imports from
          ┌────────────┼────────────┬──────────────┐
          ▼            ▼            ▼              ▼
   @yunwu/platform  @yunwu/erp  @yunwu/brand-os  @yunwu/web
   (already done)  (already done)  (NEEDS MIGRATION) (NEEDS MIGRATION)
```

All four apps import `createPrisma` from `@yunwu/db`. No local schema files. No separate Prisma Client generation. One `postinstall` script in `packages/db` generates one client.

### 4.2 Vercel Target

| Action | Detail |
|--------|--------|
| Root `vercel.json` | Rewrite to match actual production config OR remove (delegate entirely to `.vercel/project.json`) |
| `.vercel/project.json` | Keep as-is (correctly configured for `apps/platform`) |
| brand-os/web deployment | These apps are NOT Vercel-deployed from this monorepo. They run locally or are deployed separately. Root `vercel.json` should not reference them. |

---

## 5. Phase 3A–3E Migration Plan

### Phase 3A: Unified Generation + Type Transit Only

**Goal:** Ensure `@yunwu/db` generates ALL types consumed by every app. No behavioral change — brand-os and web still use their local clients at runtime.

**Modification scope:**
- `packages/db/schema.prisma`: Add any model/enum from the frozen schemas that is missing (if any). This audit found the brand-os/web `Product` and `Series` models already have equivalents in `packages/db` as `BrandProduct`/`BrandSeries`. Verify that all fields consumed by brand-os and web code exist in the canonical schema.

**File checklist:**
```
packages/db/schema.prisma             (verify — add missing types if needed)
```

**Validation:**
```bash
# Verify canonical schema includes all fields consumed by brand-os/web
grep -rn "prisma.product\|prisma.brandProduct\|prisma.series" apps/brand-os/src/ apps/web/src/
# Ensure field coverage (manual comparison against previous audit)
```

**Risks:** 🟢 Minimal — no runtime change.

**Rollback:** `git revert` the commit.

**Database change?** No.
**Independent commit/deploy?** Yes.

---

### Phase 3B: Migrate Brand OS to `@yunwu/db`

**Goal:** Brand OS imports `createPrisma` from `@yunwu/db` instead of using `@prisma/brand-client`.

**Modification scope:**

| File | Change |
|------|--------|
| `apps/brand-os/src/lib/prisma.ts` | Replace `import { PrismaClient } from "@prisma/brand-client"` with `import { createPrisma } from "@yunwu/db"`. Remove all local PrismaClient singleton logic (reuse from `@yunwu/db` pattern). |
| `apps/brand-os/package.json` | Remove `"postinstall": "npx prisma generate"` |
| `apps/brand-os/prisma/schema.prisma` | Keep file but add deprecation notice. Do not delete yet (Phase 3D). |

**Validation:**
```bash
pnpm --filter @yunwu/brand-os build
# Verify types resolve, no missing model/enum errors
```

**Risks:**
- 🟡 **Enum/type re-export difference.** Brand OS may import `Prisma` type namespace from `@prisma/brand-client` for type annotations. These must be re-exported from `@yunwu/db` or imported from `@prisma/client` directly.
- 🟡 **Next.js/Turbopack resolution.** If the build fails, the root cause is the same as before commit 480afda — Turbopack needs `@prisma/client` in each app's own `package.json`. Solution: brand-os already has `@prisma/client` in its `package.json` dependencies. The import change from `@prisma/brand-client` to `@yunwu/db` should work because `@yunwu/db` re-exports `PrismaClient` and types, and `@prisma/client` is a direct dependency of brand-os for resolution.

**Rollback:** Restore `prisma.ts` and `package.json` from git.

**Database change?** No.
**Independent commit/deploy?** Yes — brand-os is independently deployable from this monorepo. A build failure does not affect production (which runs `apps/platform`).

---

### Phase 3C: Migrate Web to `@yunwu/db`

**Goal:** Web imports `createPrisma` from `@yunwu/db` instead of using `@prisma/web-client`.

**Modification scope:**

| File | Change |
|------|--------|
| `apps/web/src/lib/prisma.ts` | Same as Brand OS — replace import. |
| `apps/web/package.json` | Remove `"postinstall": "npx prisma generate"` |
| `apps/web/prisma/schema.prisma` | Keep with deprecation notice. |

**Validation:**
```bash
pnpm --filter @yunwu/web build
```

**Risks:** Same as Phase 3B. The `remainingQuantity` P0 mapping issue was already fixed — the canonical `packages/db` schema now matches production.

**Rollback:** Restore files from git.

**Database change?** No.
**Independent commit/deploy?** Yes — web is independently buildable.

---

### Phase 3D: Delete Duplicate Schemas and Generate Scripts

**Goal:** Remove the three frozen schema files and their associated `postinstall` scripts.

**Preconditions:**
- ✅ Phase 3B confirmed working (brand-os builds from `@yunwu/db`)
- ✅ Phase 3C confirmed working (web builds from `@yunwu/db`)
- ✅ One full `pnpm build:all` passes

**Modification scope:**

| File | Action |
|------|--------|
| `apps/brand-os/prisma/schema.prisma` | Delete |
| `apps/web/prisma/schema.prisma` | Delete |
| `apps/erp/prisma/schema.prisma` | Delete |
| `apps/brand-os/package.json` | Remove `postinstall` line (if not already removed in 3B) |
| `apps/web/package.json` | Remove `postinstall` line (if not already removed in 3C) |
| `packages/db/schema.prisma` | Remove frozen-schema-only re-exports if any |
| Git: verify removal in `git status` | Confirm no lingering schema references |

**Validation:**
```bash
pnpm install                  # triggers packages/db postinstall
pnpm build:all                # all 4 apps must build
pnpm lint                     # no import errors
```

**Risks:**
- 🟡 **Install-time failure.** If `postinstall` scripts reference the deleted schemas, `pnpm install` fails. This is why scripts must be removed first.
- 🟡 **Forward reference.** If some code path still imports from `@prisma/brand-client` or `@prisma/web-client`, the build fails. Verify with `grep` before deletion.

**Rollback:** Restore deleted files from git, revert package.json changes.

**Database change?** No.
**Independent commit/deploy?** Yes, but should be deployed with the next full monorepo deployment.

---

### Phase 3E: CI, Vercel, and Production Verification

**Goal:** Verify convergence stability in CI and production.

| Check | Command/Approach |
|-------|-----------------|
| CI build | `pnpm build:all` in CI environment |
| Type coverage | `pnpm typecheck` or `tsc --noEmit` across all apps |
| Prisma version consistency | All `package.json` files use same `@prisma/client` and `prisma` version |
| Generate determinism | `rm -rf node_modules/@prisma && pnpm install && pnpm db:generate && grep -r "model" apps/*/node_modules/@prisma/client/` |
| Vercel preview deployment | Push to non-main branch, verify Vercel preview builds correctly |
| Vercel production deployment | Deploy from main, verify `platform.yunwuorigin.com` loads |
| Root vercel.json | Update to match actual production config OR remove file |

**Root vercel.json decision:**
- **Recommended: REPLACE** root `vercel.json` with the correct configuration for `apps/platform`. This removes the misleading `@yunwu/web` reference.
- If `@yunwu/web` was ever deployed independently (e.g., from a different branch), keep the file but rename to reflect its purpose.
- If the file is entirely vestigial, **delete it** and let `.vercel/project.json` be the single source of truth.

**Database change?** No.
**Independent commit/deploy?** Yes — CI changes and vercel.json changes are independently deployable.

---

## 6. Risk Register

| Risk | Phase | Likelihood | Impact | Mitigation |
|------|-------|------------|--------|------------|
| **Turbopack resolution fails** when brand-os/web import from `@yunwu/db` | 3B, 3C | 🟡 Medium | 🔴 Build broken | Ensure `@prisma/client` is in each app's `dependencies` (already true for both). `@yunwu/db` re-exports `PrismaClient`. Test with `pnpm build --filter @yunwu/brand-os` first. |
| **Missing enum/type re-export** in `@yunwu/db` | 3B | 🟢 Low | 🟡 TypeScript errors | Add `export type { PublishStatus, ProductType } from "@prisma/client"` to `packages/db/index.ts` or import directly from `@prisma/client`. |
| **Vercel deploys wrong app** via root `vercel.json` | 3E | 🟢 Low | 🔴 Production broken | Fix root `vercel.json` BEFORE or AS PART of Phase 3E. Remove the misleading `@yunwu/web` config. |
| **Schema deletion breaks `pnpm install`** | 3D | 🟢 Low | 🟡 CI failure | Remove `postinstall` scripts BEFORE deleting schema files. Order matters. |
| **brand-os/web are NOT deployed from this monorepo** — changes affect local dev only | 3B, 3C | 🟢 None | 🟢 None | Brand OS and Web are locally-developed apps from this monorepo. Production runs `apps/platform`. Build failures in brand-os/web do NOT affect production. |

---

## 7. Validation Matrix

| Validation | Phase 3A | Phase 3B | Phase 3C | Phase 3D | Phase 3E |
|-----------|----------|----------|----------|----------|----------|
| `pnpm install` succeeds | ✅ | ✅ | ✅ | ✅ | ✅ |
| `pnpm --filter @yunwu/brand-os build` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `pnpm --filter @yunwu/web build` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `pnpm --filter @yunwu/erp build` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `pnpm --filter @yunwu/platform-app build` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `pnpm build:all` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `pnpm lint` | Optional | Optional | Optional | ✅ | ✅ |
| No `@prisma/brand-client` import | N/A | ✅ | N/A | ✅ | ✅ |
| No `@prisma/web-client` import | N/A | N/A | ✅ | ✅ | ✅ |
| No frozen schema files | N/A | N/A | N/A | ✅ | ✅ |
| Root vercel.json accurate | N/A | N/A | N/A | N/A | ✅ |
| Vercel preview build | N/A | N/A | N/A | N/A | ✅ |
| Vercel production build | N/A | N/A | N/A | N/A | ✅ |

---

## 8. Rollback Strategy

| Phase | Rollback Action | Data Loss | Downtime |
|-------|----------------|-----------|----------|
| 3A | `git revert` the commit | None | None (type-only change) |
| 3B | Restore `prisma.ts`, `package.json` from git | None | None (local dev app) |
| 3C | Restore `prisma.ts`, `package.json` from git | None | None (local dev app) |
| 3D | Restore deleted schemas, scripts from git | None | `pnpm install` may rerun generate |
| 3E | `git revert` vercel.json change | None | Brief deployment if production domain affects |

**Full Phase 3 rollback:**
```bash
git revert --no-commit <phase-3a-commit> <phase-3b-commit> <phase-3c-commit>
# Manually restore deleted schema files
git checkout HEAD~1 -- apps/brand-os/prisma/schema.prisma apps/web/prisma/schema.prisma apps/erp/prisma/schema.prisma
pnpm install
pnpm build:all
```

---

## 9. Recommended First Implementation Ticket

### Title: Phase 3A — Canonical schema verification and unified Prisma type transit

**Scope:**
1. Audit `packages/db/schema.prisma` for any model/enum consumed by brand-os or web that is missing
2. Add any missing models/enums (read-only — no migration)
3. Verify all four apps build with `pnpm build:all`

**Files to check:**
```
packages/db/schema.prisma
apps/brand-os/src/lib/prisma.ts       (read — confirm import pattern)
apps/brand-os/src/**/*.ts             (read — audit type usage)
apps/web/src/lib/prisma.ts            (read — confirm import pattern)
apps/web/src/**/*.ts                  (read — audit type usage)
```

**Success criteria:**
```bash
pnpm build:all    # all 4 apps build
```

**Explicitly NOT in scope:**
- Migration of brand-os or web Prisma imports (Phase 3B, 3C)
- Deletion of frozen schemas (Phase 3D)
- Vercel config changes (Phase 3E)
- Database changes

**Owner:** Claude

---

## 10. Summary

```
PRISMA CONVERGENCE FEASIBILITY:
FEASIBLE — Two of four apps already converged, two remain.

VERCEL CONFIGURATION:
ROOT vercel.json DOES NOT MATCH production deployment.
Must be fixed in Phase 3E.

RISK LEVEL:
Low — brand-os and web are not production-deployed from this monorepo.
Production (apps/platform) already uses @yunwu/db.

NEXT ACTION:
Phase 3A — Canonical schema audit + build check.
```

---

**This audit was read-only. No files were modified. No database was accessed. No deployment was executed.**
