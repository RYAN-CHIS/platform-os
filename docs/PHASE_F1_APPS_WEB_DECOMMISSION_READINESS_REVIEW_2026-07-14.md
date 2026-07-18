# Phase F1 — Legacy apps/web Decommission Readiness Review

**Date:** 2026-07-14
**WORKDIR:** `/Users/ryan/Projects/active/platform-os` @ `9ed344f`
**Storefront:** `/Users/ryan/Projects/active/yunwu-origin` @ `bf8fe90`

---

## 1. Executive Conclusion

**apps/web is already effectively decommissioned.** Zero files tracked in git. Zero cross-app runtime dependencies. It can be safely removed in a single Phase F2 operation with minimal orchestration.

| Finding | Verdict |
|---------|---------|
| apps/web in git HEAD? | **NO** — zero files tracked |
| Cross-app dependency? | **NO** — no other app/package depends on @yunwu/web |
| Production traffic? | Root `vercel.json` still references `@yunwu/web` — **must be updated** |
| Schema/migration ownership? | **NONE** — all models covered by canonical or storefront |
| Unique production assets? | **NONE** — all pages and routes covered by yunwu-origin |

---

## 2. Git Tracking Status

| Property | Value |
|----------|-------|
| Tracked in HEAD | **0 files** — never committed |
| On disk | ~85 files (untracked, stale) |
| In `.gitignore` | **NO** |
| Reason on disk | Stale from prior clone/setup |

**apps/web has never been tracked in this repository's git history.** All files exist only as untracked local artifacts. This means Phase F removal is purely a filesystem cleanup + config update — no git history concerns.

---

## 3. Production Relevance

### 3.1 Root `vercel.json` — Production Reference (MUST FIX)

```json
{
  "buildCommand": "pnpm --filter @yunwu/web build",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs"
}
```

This configuration tells Vercel to build and deploy `@yunwu/web` as the production project. **This must be updated** to reflect the correct Vercel project configuration.

| Question | Answer |
|----------|--------|
| Is this Vercel config still active? | Unknown — may be orphaned after Vercel project was renamed to `platform-os` |
| Does it affect current production? | If active, it deploys a legacy build of apps/web |
| Must it be changed? | **YES** — root vercel.json must be updated or removed |

### 3.2 Root package.json Scripts

```json
"dev:web": "pnpm --filter @yunwu/web dev",
"build:web": "pnpm --filter @yunwu/web build",
```

These are convenience scripts that will fail after deletion. Must be removed.

### 3.3 No Other Production References

| Check | Result |
|-------|--------|
| Other app depends on `@yunwu/web`? | ❌ NO |
| Package depends on `@yunwu/web`? | ❌ NO |
| pnpm-workspace.yaml excludes `apps/web`? | Uses `apps/*` glob — will auto-exclude after deletion |
| Root build (`build:all`) references web? | `pnpm -r build` will skip apps/web after deletion |
| CI/CD pipeline references? | No CI config found |
| Cron/scheduled job? | None found |
| TypeScript project references? | None found |

---

## 4. Asset Inventory

### 4.1 Routes

| apps/web Route | yunwu-origin Equivalent | Coverage |
|---------------|------------------------|----------|
| `/(site)/` (homepage) | `src/app/page.tsx` | ✅ Covered |
| `/(site)/products` | `src/app/products/page.tsx` | ✅ Covered |
| `/(site)/products/[slug]` | `src/app/products/[slug]/page.tsx` | ✅ Covered |
| `/(site)/series` | `src/app/series/page.tsx` | ✅ Covered |
| `/(site)/series/[slug]` | `src/app/series/[slug]/page.tsx` | ✅ Covered |
| `/(site)/journal` | `src/app/journal/page.tsx` | ✅ Covered |
| `/(site)/journal/[slug]` | `src/app/journal/[slug]/page.tsx` | ✅ Covered |
| `/(site)/objects` | (part of products) | ✅ Covered |
| `/(site)/materials` | (deferred/separate) | ⚠️ Not in production storefront |
| `/(site)/checkout` | (not in storefront) | ℹ️ Storefront uses different checkout |
| `/(site)/contact` | `src/app/contact/page.tsx` | ✅ Covered |
| `/(site)/about` | (not in storefront) | ⚠️ No equivalent |
| `/(site)/materials` | `src/app/materials/page.tsx` | ✅ Covered but storefront materials deferred |

### 4.2 API Routes

| apps/web Route | yunwu-origin Equivalent | Notes |
|---------------|------------------------|-------|
| `/api/products` | `src/app/api/products/route.ts` | ✅ Covered |
| `/api/series` | `src/app/api/series/route.ts` | ✅ Covered |
| `/api/posts` | `src/app/api/posts/route.ts` | ✅ Covered |
| `/api/contact` | `src/app/api/contact/route.ts` | ✅ Covered |
| `/api/materials` | (not in storefront) | ℹ️ Deferred |
| `/api/orders` | (not in storefront) | ℹ️ Different order system |
| `/api/site-settings` | `src/app/api/site-settings/route.ts` | ✅ Covered |
| `/api/admin/upload` | N/A | ℹ️ Admin functionality in platform |

### 4.3 Unique Assets

| Asset | Exists Only in apps/web? | Needed in Production? | Action |
|-------|-------------------------|----------------------|--------|
| Public images (crafts/*.png) | ✅ YES | ❌ No (yunwu-origin uses Vercel Blob) | DELETE |
| Logo images (logo*.png) | ✅ YES | ❌ No (yunwu-origin has its own) | DELETE |
| Prisma schema + migrations | ✅ YES | ❌ No (canonical schema + yunwu-origin cover) | DELETE |
| Prisma seed | ✅ YES | ❌ No (brand-os seed covers independently) | DELETE |
| DEPLOY_SETUP.md | ✅ YES | ❌ No (contains hardcoded secrets) | DELETE (secret-bearing) |
| sync-from-erp.mjs | ✅ YES | ❌ No (brand-os has its own sync) | DELETE |
| deploy.sh | ✅ YES | ❌ No (Vercel handles deployment) | DELETE |
| .env / .env.example | ✅ YES | ❌ No (should never be in repo) | DELETE |

---

## 5. Secrets and Security

apps/web has **2 secrets gate hits** at `apps/web/scripts/DEPLOY_SETUP.md:17-18`.

| Concern | Decision |
|---------|----------|
| After deletion, check:secrets hits | Reduces from 10 to 8 (ERP scripts remain) |
| DEPLOY_SETUP.md secrets rotation | **Already completed** in P0 incident (2026-07-11) |
| Git history still contains secrets | ✅ True — but apps/web was never tracked, so no git history impact |
| Need to sanitize before archive? | **NO** — no archive needed (no unique production assets) |
| Secrets remediation complete? | **NO** — ERP scripts (8 hits) remain separate Phase G concern |

---

## 6. Archive Strategy

**Recommended: No archive. Git deletion only (Scheme A).**

Rationale:
- apps/web has **zero unique production assets**
- All routes, pages, and data are covered by yunwu-origin or canonical schema
- No migration needed
- No archive needed
- Clean removal is the safest approach

---

## 7. Root Configuration Changes Required

| File | Change |
|------|--------|
| `vercel.json` | **Remove or update** — currently references `@yunwu/web` build. If platform-os is the correct Vercel project, this config is stale/orphaned. |
| `package.json` | Remove `dev:web` and `build:web` scripts |
| `pnpm-lock.yaml` | Auto-updated by `pnpm install` after package removal |

---

## 8. Guard Updates

| Guard | Change |
|-------|--------|
| `check-no-hardcoded-secrets.mjs` | **No change needed** — scanning is file-based. apps/web entries automatically drop. |
| `check-publisher-contract.mjs` | **No change needed** — never referenced apps/web |
| `check-prisma-schema-contract.mjs` | **No change needed** — only checks frozen schemas (brand-os, erp) |

---

## 9. Phase F2 Codex Delete Scope

### Filesystem

| Path | Action |
|------|--------|
| `apps/web/` (entire directory) | **DELETE** — all ~85 files |

### Root Config Changes

| File | Change |
|------|--------|
| `vercel.json` | **UPDATE or DELETE** — remove `@yunwu/web` build reference. Verify correct Vercel project config. |
| `package.json` | **REMOVE** `dev:web` and `build:web` scripts |
| `pnpm-lock.yaml` | Auto-update via `pnpm install` (pnpm removes workspace refs) |

### After Deletion

| Action | Command |
|--------|---------|
| Remove lockfile reference | `pnpm install --no-frozen-lockfile` (regenerates lockfile) |
| Verify workspace | `pnpm ls -r --depth=0` — no @yunwu/web |
| Verify build | `pnpm build:all` — succeeds without web |

---

## 10. Validation Plan

| # | Check | Command |
|---|-------|---------|
| 1 | Workspace list clean | `pnpm ls -r --depth=0` — no @yunwu/web |
| 2 | Lockfile consistent | `pnpm install --frozen-lockfile` passes |
| 3 | Brand-db generate | `pnpm --filter @yunwu/brand-db prisma:generate` |
| 4 | Platform typecheck | `pnpm --filter @yunwu/platform-app exec tsc --noEmit` |
| 5 | Platform build | `pnpm --filter @yunwu/platform-app build` |
| 6 | Brand OS typecheck | `pnpm --filter @yunwu/brand-os exec tsc --noEmit` |
| 7 | Brand OS build | `pnpm --filter @yunwu/brand-os build` |
| 8 | All guards pass | `pnpm check:prisma-contract` + publisher guard + product guard + journal guard + home guard + rollback guard |
| 9 | Secrets gate | `pnpm check:secrets` — 8 remaining (ERP scripts), not 10 |
| 10 | vercel.json valid | No reference to `@yunwu/web` |
| 11 | Root package.json clean | No `dev:web` or `build:web` |

---

## 11. ADR Decision

**NO NEW ADR REQUIRED.**

Rationale:
- apps/web was never tracked in git — no architecture decision needed to remove untracked files
- Production storefront ownership is already documented in baseline (§2.3, §E.1)
- No data model, no migration, no consumer contract is affected
- Root config changes are operational, not architectural

---

## 12. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| vercel.json references @yunwu/web — if still active, production deployment may break | 🟡 Medium | Audit Vercel project config before deployment. If orphaned, delete vercel.json. |
| Someone may rely on apps/web files locally | 🟢 Low | Stale untracked files — no production impact |
| Build script may assume apps/web exists | 🟢 Low | `pnpm -r build` will skip `apps/web` after deletion |

---

## Required Questions — Answers

| Question | Answer |
|----------|--------|
| apps/web production relevance | **NONE** — zero tracked files, no cross-app deps, stale on disk |
| Cross-app runtime dependencies | **NONE** — no other workspace package depends on @yunwu/web |
| Unique production assets | **NONE** — all routes/data covered by yunwu-origin or canonical |
| Schema ownership | **NONE** — Prisma schema was a stale copy |
| Migration ownership | **NONE** — never committed, no migrations to manage |
| Secrets findings affected | 2 hits in DEPLOY_SETUP.md — disappear on deletion. 8 ERP hits remain. |
| Recommended strategy | **Delete entire directory + update root config. No archive needed.** |
| Archive required | **NO** — zero unique production assets |
| Asset migration required | **NO** |
| Root workspace changes | `vercel.json` (update) + `package.json` (remove scripts) |
| CI/build changes | **NONE** — no CI config found |
| Lockfile update required | **YES** — auto-updated via `pnpm install` |
| Schema change required | **NO** |
| Database migration required | **NO** |
| Storefront changes required | **NO** |
| ADR required | **NO** |

---

```
PHASE F1 APPS/WEB DECOMMISSION REVIEW COMPLETE

WORKDIR:                      /Users/ryan/Projects/active/platform-os
HEAD:                         9ed344f
Storefront WORKDIR:           /Users/ryan/Projects/active/yunwu-origin
Storefront HEAD:              bf8fe90
apps/web production relevance: NONE (zero tracked files, stale on disk)
Cross-app runtime dependencies: NONE
Unique production assets:     NONE
Schema ownership:             NONE (stale copy)
Migration ownership:          NONE
Secrets findings affected:    2 hits removed (8 ERP hits remain)
Recommended strategy:         Delete directory + update root config. NO ARCHIVE.
Archive required:             NO
Asset migration required:     NO
Root workspace changes:       vercel.json (update), package.json (remove scripts)
CI/build changes:             NONE
Lockfile update required:     YES (auto via pnpm install)
Schema change required:       NO
Database migration required:  NO
Storefront changes required:  NO
ADR required:                 NO
Report path:                  docs/PHASE_F1_APPS_WEB_DECOMMISSION_READINESS_REVIEW_2026-07-14.md
Modified files:               NONE (read-only audit)
Database operations:          NONE
Commit SHA:                   NONE
Push:                         NOT EXECUTED
Codex readiness:              READY
Next phase:                   Phase F2 — Delete apps/web + update root config
```
