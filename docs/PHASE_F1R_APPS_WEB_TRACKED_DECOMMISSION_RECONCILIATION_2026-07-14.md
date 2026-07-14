# Phase F1R — apps/web Tracked Decommission Reconciliation Review

**Date:** 2026-07-14
**WORKDIR:** `/Users/ryan/Projects/active/platform-os` @ `9ed344f`
**Storefront:** `/Users/ryan/Projects/active/yunwu-origin` @ `bf8fe90`

---

## 1. Executive Conclusion

**PHASE F1 PREVIOUS CONCLUSION INVALIDATED.** apps/web has 83 tracked files, 10 git commits, and serves as a frozen Prisma schema for the Contract Guard. It cannot be removed via untracked directory deletion.

| Finding | Previous F1 (Wrong) | Current F1R (Correct) |
|---------|-------------------|----------------------|
| Tracked files | "0 tracked" | **83 tracked files** |
| Git history | "never committed" | **10 commits since initial baseline** |
| Schema/migration | "no tracked Schema" | **Has Prisma schema + migration (0001_init)** |
| Removal | "safe rm -rf" | Requires `git rm`, Guard update, root config changes |

**Recommendation:** Option A — Tracked Directory Full Delete with pre-decommission tag + Guard update.

---

## 2. Tracked / Untracked / Generated Classification

| Category | Count | Size | Git Status | Removal Strategy |
|----------|-------|------|------------|-----------------|
| Tracked source files | 83 | ~1.5 MB | `git ls-files` | `git rm -r apps/web` |
| Untracked (local only) | 0 | — | `git ls-files --others` | N/A |
| node_modules | ~25k | ~214 MB | ignored | `rm -rf` post deletion |
| .next/build | several | ~0.5 MB | ignored | `rm -rf` post deletion |

**83 tracked files** across these categories:

| Category | Files | Example |
|----------|-------|---------|
| Source code (ts/tsx) | ~50 | pages, components, actions, lib |
| Prisma schema + migration | 4 | schema.prisma, 0001_init/migration.sql |
| Scripts | 3 | DEPLOY_SETUP.md, deploy.sh, sync-from-erp.mjs |
| Public assets | 8 | logos, craft images (PNG) |
| Config | 8 | tsconfig, next.config, tailwind, vercel, postcss |
| Documentation | 5 | README, DEPLOY_TRIGGER, YUNWU-SYSTEM-MAP |
| Styles | 2 | globals.css, tokens.css |
| Data | 1 | site-settings.json |
| .workbuddy | 2 | memory files |

---

## 3. Git History and Ownership

| Property | Value |
|----------|-------|
| First commit | `640fbbe` (2026-06-22) — "yunwu monorepo: Phase 1-4 baseline" |
| Total commits | 10 |
| Latest commit | `6543461` — "fix(platform): align web prisma mapping and validate series" |
| Role in history | Legacy in-monorepo storefront. Pre-dates yunwu-origin separation. |
| Production relevance | **NONE** — baseline confirms yunwu-origin as sole production storefront |

apps/web was introduced as part of the initial monorepo baseline and received updates during Phase 2.1 and the build repair phase. It was effectively superseded by the separate `yunwu-origin` repository.

---

## 4. Tracked Asset Inventory

### 4.1 Source Code (routes, components, services)

| Path | Purpose | yunwu-origin Equivalent | Decision |
|------|---------|------------------------|----------|
| `src/app/(site)/page.tsx` | Homepage | `src/app/page.tsx` ✅ | DELETE |
| `src/app/(site)/products/page.tsx` | Product listing | `src/app/products/page.tsx` ✅ | DELETE |
| `src/app/(site)/products/[slug]/page.tsx` | PDP | `src/app/products/[slug]/page.tsx` ✅ | DELETE |
| `src/app/(site)/series/page.tsx` | Series list | `src/app/series/page.tsx` ✅ | DELETE |
| `src/app/(site)/series/[slug]/page.tsx` | Series detail | `src/app/series/[slug]/page.tsx` ✅ | DELETE |
| `src/app/(site)/journal/page.tsx` | Journal list | `src/app/journal/page.tsx` ✅ | DELETE |
| `src/app/(site)/journal/[slug]/page.tsx` | Journal detail | `src/app/journal/[slug]/page.tsx` ✅ | DELETE |
| `src/app/(site)/about/page.tsx` | About page | `src/app/about/page.tsx` ✅ | DELETE |
| `src/app/(site)/checkout/page.tsx` | Checkout | `src/app/checkout/page.tsx` ✅ | DELETE |
| `src/app/(site)/contact/page.tsx` | Contact | `src/app/contact/page.tsx` ✅ | DELETE |
| `src/app/(site)/objects/page.tsx` | Objects | `src/app/objects/page.tsx` ✅ | DELETE |
| `src/app/(site)/materials/page.tsx` | Materials | `src/app/materials/page.tsx` ✅ | DELETE |
| `src/app/(site)/not-found.tsx` | 404 page | ✅ Implicit | DELETE |
| `src/app/sitemap.ts` | Sitemap | `src/app/sitemap.ts` ✅ | DELETE |
| `src/app/robots.ts` | Robots | ✅ Implicit | DELETE |
| API routes (12) | Data APIs | All have equivalents in yunwu-origin | DELETE |

### 4.2 Prisma Schema and Migration

| Path | Purpose | Canonical Owner | Decision |
|------|---------|----------------|----------|
| `prisma/schema.prisma` | 16 models (frozen copy) | `packages/brand-db` + `yunwu-origin` | DELETE (but update Contract Guard first) |
| `prisma/migrations/0001_init/migration.sql` | History | Not in production use | DELETE |
| `prisma/seed.ts` | Dev seed | `apps/brand-os/seed.ts` covers | DELETE |
| `prisma/schema.backup.prisma` | Backup | N/A | DELETE |
| `prisma/schema.prisma.v2lite-backup` | Backup | N/A | DELETE |

**No unique models exist in apps/web that aren't in canonical or yunwu-origin schemas.** The model names differ (Product vs LegacyBrandProduct) but the physical table coverage is identical.

### 4.3 Scripts

| Path | Purpose | Decision |
|------|---------|----------|
| `scripts/DEPLOY_SETUP.md` | Deployment docs (contains 2 secrets findings) | SECURITY_REMEDIATE_THEN_DELETE |
| `scripts/deploy.sh` | Legacy deploy script | DELETE |
| `scripts/sync-from-erp.mjs` | ERP data sync | DELETE (brand-os has own sync) |

### 4.4 Public Assets

| Path | Decision |
|------|----------|
| `public/logo.png`, `logo-icon.png`, `logo-vert.png` | DELETE (yunwu-origin has own) |
| `public/images/crafts/*.png` (5 craft images) | DELETE (yunwu-origin uses Vercel Blob) |

### 4.5 Configuration

| Path | Production Effect | Decision |
|------|------------------|----------|
| `vercel.json` | Orphaned — references `@yunwu/web` | DELETE |
| `next.config.js` | Not used in production | DELETE |
| `tailwind.config.js` | Not used in production | DELETE |
| `tsconfig.json` | Not used in production | DELETE |

---

## 5. Root Configuration and Runtime References

| Referencer | Reference | Current Effect | Required Change |
|------------|-----------|---------------|-----------------|
| Root `vercel.json` | `"buildCommand": "pnpm --filter @yunwu/web build"` | **Potentially active** — if this Vercel project is deployed, it builds apps/web | **UPDATE** — remove or replace with Platform target |
| Root `package.json` | `"dev:web": "pnpm --filter @yunwu/web dev"` | Developer convenience script only | REMOVE |
| Root `package.json` | `"build:web": "pnpm --filter @yunwu/web build"` | Developer convenience script only | REMOVE |
| `scripts/check-prisma-schema-contract.mjs:7` | `{ app: "web", relativePath: "apps/web/prisma/schema.prisma" }` | **Active Guard reference** — frozen schema check | **UPDATE** — remove web from frozen schema list |
| `scripts/check-prisma-schema-contract.test.mjs:24` | Test fixture for web schema | Active Guard test | UPDATE |
| `pnpm-workspace.yaml` | `apps/*` glob | Auto-excludes after deletion | NO CHANGE NEEDED |

### 5.1 Root vercel.json — Critical Question

The root `vercel.json` references `@yunwu/web`. The project baseline states Platform is hosted at `platform-os-eosin.vercel.app` and builds from `apps/platform`. If the root Vercel project is the Platform project, this config is **stale and incorrect** — it should target `apps/platform`, not `apps/web`.

**Phase F2 must update vercel.json to reference the correct Platform build target, or remove it if the Platform build is independently configured in Vercel Dashboard.**

---

## 6. Secrets and Security

| File | Tracked? | Findings | Status |
|------|----------|----------|--------|
| `apps/web/scripts/DEPLOY_SETUP.md` | ✅ Tracked | 2 HISTORICAL_SECRET_UNKNOWN_VALIDITY | Working-tree deletion removes from check:secrets. Git history retains values. |

**Boundary:**
1. ✅ Working-tree deletion — Phase F2 removes the tracked file
2. ❌ Credential rotation — Already completed in P0 incident (2026-07-11)
3. ❌ Git history remediation — NOT in Phase F scope (requires separate Phase S)
4. ✅ Audit record — F1R report documents the remaining risk

After deletion: check:secrets expected to drop from 10 to 8. The 8 remaining ERP script hits continue under separate governance.

---

## 7. Recommended Decommission Strategy

**Option A: Tracked Directory Full Delete with pre-decommission tag.**

| Step | Action |
|------|--------|
| 1 | Create Git tag `pre-apps-web-decommission-2026-07-14` at current HEAD |
| 2 | Delete `apps/web/scripts/DEPLOY_SETUP.md` first (separate commit for secret-bearing file audit trail) |
| 3 | `git rm -r apps/web` |
| 4 | Update `scripts/check-prisma-schema-contract.mjs` — remove web from frozen schemas |
| 5 | Update `scripts/check-prisma-schema-contract.test.mjs` — remove web fixture |
| 6 | Remove `dev:web` / `build:web` from root `package.json` |
| 7 | **Carefully update** `vercel.json` — remove `@yunwu/web` reference. If Platform build is the correct target, update accordingly. |
| 8 | `pnpm install --no-frozen-lockfile` — regenerate lockfile |
| 9 | Run all guards + builds |
| 10 | Commit + push |

---

## 8. Git Tag Recommendation

**YES — Create pre-decommission tag.**

```
pre-apps-web-decommission-2026-07-14
```

This ensures:
- The last state of apps/web is permanently referenceable in Git
- No external archive needed
- History is preserved without retaining buildable app in main

---

## 9. ADR Decision

**YES — ADR-007 recommended.**

Title: **Legacy Storefront Decommission and Production Storefront Ownership**

Scope:
- Lock yunwu-origin as the sole production Storefront
- Prohibit re-creation of apps/web workspace package
- Record that apps/web schema/models must not be re-imported to canonical
- Git history as the de facto archive
- Secret history remains independent governance concern

---

## 10. Commit Strategy

**Two commits recommended:**

| # | Message | Scope |
|---|---------|-------|
| 1 | `chore(platform): preserve pre-decommission tag for apps/web` | Tag creation only (can be done alongside commit 2) |
| 2 | `refactor(platform): decommission tracked legacy apps/web` | All deletions + config + Guard changes + lockfile |

A single commit is preferable for clean revertability: `git revert <sha>` restores apps/web fully.

---

## 11. Phase F2 Guard Design

| Rule ID | Check | Source |
|---------|-------|--------|
| G-WEB-DECOM-01 | `apps/web` directory does not exist | `test ! -e apps/web` |
| G-WEB-DECOM-02 | `git ls-files apps/web` is empty | Static git check |
| G-WEB-DECOM-03 | No `@yunwu/web` in workspace | `pnpm ls -r` |
| G-WEB-DECOM-04 | No `apps/web` in lockfile | `grep apps/web pnpm-lock.yaml` |
| G-WEB-DECOM-05 | No `@yunwu/web` in root `vercel.json` | Static grep |
| G-WEB-DECOM-06 | No `dev:web` / `build:web` in root `package.json` | Static grep |
| G-WEB-DECOM-07 | No cross-app `apps/web` import | `grep -r '@yunwu/web' apps/*/package.json` |
| G-WEB-DECOM-08 | Production storefront baseline references yunwu-origin | Baseline check |
| G-WEB-DECOM-09 | History docs may reference apps/web | Text allowed |
| G-WEB-DECOM-10 | Frozen schema list no longer contains web | Contract Guard |
| G-WEB-DECOM-11 | check:secrets reduced from 10 to 8 | Guard test |
| G-WEB-DECOM-12 | Remaining ERP secrets debt recorded | Guard test |

---

## 12. Validation Plan

| # | Check | Expected |
|---|-------|----------|
| 1 | `git ls-files apps/web` | Empty |
| 2 | `test ! -e apps/web` | Exit 0 |
| 3 | `pnpm -r list --depth=-1` | No @yunwu/web |
| 4 | `grep apps/web pnpm-lock.yaml` | Empty |
| 5 | `grep @yunwu/web vercel.json` | Empty |
| 6 | `grep 'dev:web\|build:web' package.json` | Empty |
| 7 | Platform TypeScript | ≤ 129 diagnostics, 0 in modified files |
| 8 | Platform build | Pass (placeholder DB URL) |
| 9 | Prisma Contract Guard | Pass (web removed from frozen list) |
| 10 | All contract guards | Pass |
| 11 | `pnpm check:secrets` | 8 hits (ERP only), 0 apps/web |
| 12 | `test -e apps/platform` | ✅ Not deleted |
| 13 | `test -e apps/erp` | ✅ Not deleted |
| 14 | `test -e apps/brand-os` | ✅ Not deleted |

---

## Required Questions — Answers

| Question | Answer |
|----------|--------|
| Tracked files count | **83** |
| Untracked files count | 0 |
| Generated/ignored size | ~214 MB (node_modules, .next) |
| Original F1 conclusion | **INVALIDATED** — "0 tracked" was wrong |
| apps/web historical role | Legacy in-monorepo storefront (10 commits, initial baseline to Phase 2.1) |
| Current production relevance | **NONE** — yunwu-origin is the sole production storefront |
| Cross-app runtime dependencies | **NONE** — no workspace package depends on @yunwu/web |
| Unique production assets | **NONE** — all routes covered by yunwu-origin |
| Unique migrations/schema | **NONE** — frozen copy, no production migrations |
| Root Vercel reference effect | Orphaned — references @yunwu/web for a legacy app |
| Secrets tracked files | `apps/web/scripts/DEPLOY_SETUP.md` (2 HISTORICAL_SECRET findings) |
| Recommended option | **A — Tracked Directory Full Delete with pre-decommission tag** |
| `git rm` authorized | **YES** — after tag creation |
| Asset migration required | **NO** — all production equivalents exist in yunwu-origin |
| External archive required | **NO** — Git tag + history sufficient |
| Pre-decommission tag recommended | **YES** — `pre-apps-web-decommission-2026-07-14` |
| Commit strategy | Single commit: delete + config + Guard + lockfile |
| Root config changes | `vercel.json` (update/remove web), `package.json` (remove scripts) |
| Lockfile update required | YES (via `pnpm install --no-frozen-lockfile`) |
| Expected secrets after removal | **8** (ERP scripts only) |
| Remaining secrets debt | ERP scripts (8 hits) — separate Phase G |
| Schema change required | **NO** |
| Database migration required | **NO** |
| Storefront changes required | **NO** |
| Guard changes required | Prisma Contract Guard (remove web from frozen list) + new decommission guard |
| ADR required | **YES — ADR-007** |
| Report path | `docs/PHASE_F1R_APPS_WEB_TRACKED_DECOMMISSION_RECONCILIATION_2026-07-14.md` |

---

```
PHASE F1R APPS/WEB TRACKED DECOMMISSION REVIEW COMPLETE

WORKDIR:                      /Users/ryan/Projects/active/platform-os
HEAD:                         9ed344f
Tracked files count:          83
Untracked files count:        0
Generated/ignored size:       ~214 MB
Original F1 conclusion:       INVALIDATED
apps/web historical role:     Legacy in-monorepo storefront (superseded by yunwu-origin)
Current production relevance: NONE
Cross-app runtime dependencies: NONE
Unique production assets:     NONE
Unique migrations/schema:     NONE (frozen copy)
Root Vercel reference effect: Orphaned — must be updated
Secrets tracked files:        1 (DEPLOY_SETUP.md, 2 findings)
Recommended option:           A — Tracked Directory Full Delete with pre-decommission tag
git rm authorized:            YES
Asset migration required:     NO
External archive required:    NO
Pre-decommission tag:         YES — pre-apps-web-decommission-2026-07-14
Commit strategy:              Single commit (delete + config + Guard + lockfile)
Root config changes:          vercel.json, package.json
Lockfile update required:     YES
Expected secrets after:       8 (ERP only)
Remaining secrets debt:       ERP scripts — Phase G
Schema change required:       NO
Database migration required:  NO
Storefront changes required:  NO
Guard changes required:       YES (Prisma Contract + new decommission guard)
ADR required:                 YES — ADR-007
Report path:                  docs/PHASE_F1R_APPS_WEB_TRACKED_DECOMMISSION_RECONCILIATION_2026-07-14.md
Modified files:               NONE (read-only audit)
Database operations:          NONE
Commit SHA:                   NONE
Push:                         NOT EXECUTED
Codex readiness:              READY
Next phase:                   Phase F2 — Tag + git rm + config + Guard + build + commit + push
```
