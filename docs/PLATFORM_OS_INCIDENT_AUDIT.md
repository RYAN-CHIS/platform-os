# Platform OS Incident Audit v1

**Date:** 2026-07-15

**WORKDIR:** `/Users/ryan/Projects/active/platform-os`

**Audited range:** `03bc3d9^..7cbcffd` (Phase D through Phase G governance sequence)

**Method:** Git-history, source/reference, local deployment-config, static contract, and local Platform-build audit.
**Not performed:** database access, DDL/DML, Prisma migration/db push/db pull, deployment, Vercel mutation, environment/secrets mutation, commit, or push.

## Incident conclusion

There is **no evidence that the Phase F deletion of `apps/web` broke the current Platform build or the configured Platform Vercel target**. The deletion was followed by explicit root script, lockfile, Vercel-target, and guard cleanup. The local linked Vercel metadata and the tracked root configuration both target `apps/platform`, while the real production Storefront remains the separately owned `/Users/ryan/Projects/active/yunwu-origin` repository.

The audit did identify one independent production-grade gap: the Phase D/E Publisher controls do not cover four direct Journal write paths in `apps/brand-os`. This is a workflow-boundary issue, not a file-removal regression.

## Scope and commit ledger

The full audited range contains 19 commits. Git rename/copy detection (`-M -C`) found **zero moves, zero renames, and zero copies**.

| Commit | Change count | Subject | Incident assessment |
|---|---:|---|---|
| `03bc3d9` | A1/M5 | Establish Brand DB adapter and low-risk reads | Build dependency change; current Platform build passes. |
| `1ad2956` | M9 | Typed Brand settings/content/banner CRUD | No file deletion. |
| `dcc0298` | A3/M5 | Typed Product and Series migration | No file deletion. |
| `d95d16d` | A2/M4 | Typed Journal migration | No file deletion. |
| `95a0f36` | A2/M8 | Canonical Publisher transitions | Guard exists, but Brand OS bypass remains. |
| `7f3ad1e` | M4 | Publisher version snapshots | No file deletion. |
| `f80b46a` | A3/M10 | Emergency rollback contract | No file deletion. |
| `9ed344f` | A2/M10 | Remove dead Home Publisher path | No file deletion; rollback tag point. |
| `c7854f7` | D83 | Remove tracked legacy `apps/web` | Safe under current Platform/Storefront ownership evidence. |
| `69c37b4` | A4/M6 | Finalize legacy Web decommission | Removes runtime/build/config references and adds guard. |
| `eb27ebe` | A3/M4/D2 | Remove historical ERP credentials | Script deletion is protected by a contract guard. |
| `c5a9c7f` | A1 | Restore Materials schema contract artifact | Documentation/guard artifact only. |
| `c18eab1` | A2 | Profile Materials production data read-only | Documentation only. |
| `798a5b1` | A1 | Reconcile Materials physical mapping | Documentation only. |
| `3b2b298` | A2/M4 | Declare canonical Materials schema | No file deletion. |
| `fd8f67b` | A5 | Design Materials migration/backfill | Documentation only. |
| `5cc5e54` | A1 | Record Materials staging reconciliation | Documentation only. |
| `1e6717c` | A1 | Record staging access recovery | Documentation only. |
| `7cbcffd` | A1 | Establish isolated Brand DB staging | Documentation only. |

## Deleted, moved, and renamed files

### Summary

| Commit | Deleted | Moved/renamed | Classification |
|---|---:|---:|---|
| `c7854f7` | 83 under `apps/web` | 0 | Legacy in-monorepo Storefront decommission. |
| `eb27ebe` | 2 ERP reset/import scripts | 0 | Historical-secret remediation. |
| All other audited commits | 0 | 0 | No deletion/move/rename. |

### `c7854f7` — all 83 deleted `apps/web` files

```text
apps/web/.deploy-trigger
apps/web/.env.example
apps/web/.gitignore
apps/web/.vercelignore
apps/web/.workbuddy/memory/2026-06-20.md
apps/web/.workbuddy/memory/MEMORY.md
apps/web/DEPLOY_TRIGGER.md
apps/web/README.md
apps/web/YUNWU-SYSTEM-MAP-v2.md
apps/web/next.config.js
apps/web/package.json
apps/web/postcss.config.js
apps/web/prisma/migrations/0001_init/migration.sql
apps/web/prisma/migrations/migration_lock.toml
apps/web/prisma/schema.backup.prisma
apps/web/prisma/schema.prisma
apps/web/prisma/schema.prisma.v2lite-backup
apps/web/prisma/seed.ts
apps/web/public/images/crafts/cloisonne.png
apps/web/public/images/crafts/lacquerware.png
apps/web/public/images/crafts/leather.png
apps/web/public/images/crafts/porcelain.png
apps/web/public/images/crafts/seal-carving.png
apps/web/public/logo-icon.png
apps/web/public/logo-vert.png
apps/web/public/logo.png
apps/web/scripts/DEPLOY_SETUP.md
apps/web/scripts/deploy.sh
apps/web/scripts/sync-from-erp.mjs
apps/web/src/app/(site)/about/page.tsx
apps/web/src/app/(site)/checkout/page.tsx
apps/web/src/app/(site)/contact/ContactForm.tsx
apps/web/src/app/(site)/contact/page.tsx
apps/web/src/app/(site)/journal/[slug]/page.tsx
apps/web/src/app/(site)/journal/page.tsx
apps/web/src/app/(site)/layout.tsx
apps/web/src/app/(site)/materials/page.tsx
apps/web/src/app/(site)/not-found.tsx
apps/web/src/app/(site)/objects/page.tsx
apps/web/src/app/(site)/page.tsx
apps/web/src/app/(site)/products/[slug]/BuyButton.tsx
apps/web/src/app/(site)/products/[slug]/page.tsx
apps/web/src/app/(site)/products/page.tsx
apps/web/src/app/(site)/series/[slug]/page.tsx
apps/web/src/app/(site)/series/page.tsx
apps/web/src/app/api/admin/upload/route.ts
apps/web/src/app/api/auth/[...nextauth]/route.ts
apps/web/src/app/api/cart/route.ts
apps/web/src/app/api/contact/route.ts
apps/web/src/app/api/materials/route.ts
apps/web/src/app/api/orders/route.ts
apps/web/src/app/api/posts/[slug]/route.ts
apps/web/src/app/api/posts/route.ts
apps/web/src/app/api/products/route.ts
apps/web/src/app/api/series/route.ts
apps/web/src/app/api/site-settings/route.ts
apps/web/src/app/layout.tsx
apps/web/src/app/robots.ts
apps/web/src/app/sitemap.ts
apps/web/src/components/providers.tsx
apps/web/src/components/ui/Button.tsx
apps/web/src/components/ui/ContentCard.tsx
apps/web/src/components/ui/ProductCard.tsx
apps/web/src/components/ui/SectionWrapper.tsx
apps/web/src/components/ui/Tag.tsx
apps/web/src/components/ui/index.ts
apps/web/src/data/site-settings.json
apps/web/src/lib/actions/admin-actions.ts
apps/web/src/lib/actions/audit-actions.ts
apps/web/src/lib/actions/auth.ts
apps/web/src/lib/actions/content-actions.ts
apps/web/src/lib/actions/tag-actions.ts
apps/web/src/lib/audit-log.ts
apps/web/src/lib/auth-helpers.ts
apps/web/src/lib/auth.ts
apps/web/src/lib/db.ts
apps/web/src/lib/prisma.ts
apps/web/src/middleware.ts
apps/web/src/styles/globals.css
apps/web/src/styles/tokens.css
apps/web/tailwind.config.js
apps/web/tsconfig.json
apps/web/vercel.json
```

### `eb27ebe` — all deleted ERP files

```text
apps/erp/scripts/reset-and-import-v2.js
apps/erp/scripts/reset-and-import.js
```

The retained ERP import scripts were changed in the same commit to require the intended environment contract. The current ERP-secret guard verifies both superseded reset scripts remain absent.

## Reference and runtime impact audit

### `apps/web` deletion

Current tracked non-document references to `apps/web`, `@yunwu/web`, and `@prisma/web-client` occur only in the intentional decommission guard and its tests. There is no current runtime reference in an application, package script, root Vercel configuration, or lockfile.

| Check | Result | Meaning |
|---|---|---|
| `git ls-files apps/web` | 0 files | No tracked legacy Web source remains. |
| `pnpm-lock.yaml` importer | No `apps/web` importer | Install/build graph no longer contains the legacy app. |
| Root package scripts | No `dev:web`, `build:web`, or `@yunwu/web` filter | No root command can build/run deleted Web. |
| Workspace glob | `apps/*`, with directory absent | pnpm cannot discover the deleted app. |
| `pnpm check:apps-web-decommission` | 14/14 pass | Enforces absence, configuration cleanup, retained Platform/ERP/Brand OS, and rollback tag. |
| Build | `pnpm --filter @yunwu/platform-app build` pass | Current deploy target compiles and produces 34 routes. |

Historical Markdown reports still mention `apps/web`. They are audit history and are deliberately excluded from runtime-reference checks. They are not execution references.

### Build and runtime

The current Platform build completed successfully with Next.js 16.2.9/Turbopack. Compilation, static generation, and final route optimization all completed. The only observed warning is Next's middleware-to-proxy convention deprecation; it is not a removal regression.

The following static contracts also passed in the audited HEAD:

- Publisher: 18/18
- Rollback: 26/26
- Home Publisher: 13/13
- Prisma: 27/27
- ERP secret: 10/10
- Materials schema: 14/14
- Apps/Web decommission: 14/14
- Hardcoded-secrets gate: zero findings

These checks demonstrate that removal did not leave a broken tracked route, build target, schema guard, or legacy-Web package reference. They do not replace a production traffic probe, which was intentionally not run in this no-deployment audit.

### Vercel, package, workspace, and Turbo configuration

| Configuration | D–G change | Current state | Assessment |
|---|---|---|---|
| Root `vercel.json` | `69c37b4` changed build target from `@yunwu/web`/`apps/web/.next` to `@yunwu/platform-app`/`apps/platform/.next`. | Matches Platform source tree. | Confirmed safe. |
| Local `.vercel/project.json` | Not changed by audited commits. | Project `platform-os`, root directory `apps/platform`, build command enters repo root then builds Platform. | Matches root intent; no Vercel mutation was made. |
| Root `package.json` | Removed Web dev/build scripts; added governance checks. | No legacy Web script remains. | Confirmed safe. |
| `pnpm-workspace.yaml` | No D–G change. | `apps/*` naturally excludes absent Web directory. | Confirmed safe. |
| `pnpm-lock.yaml` | Web importer removed by decommission finalization. | Guard confirms no Web importer/package. | Confirmed safe. |
| `turbo.json` | No D–G change; no `turbo.json` exists at HEAD. | Build behavior is driven by pnpm and Vercel commands, not Turbo config. | No Turbo deletion/regression found. |
| `apps/platform/package.json` | `03bc3d9` added `@yunwu/brand-db` and `server-only`. | Platform production build passes. | Confirmed safe. |

## Storefront and repository-boundary audit

`apps/web` was an in-monorepo legacy Storefront. The audited deletion commit explicitly preserves `/Users/ryan/Projects/active/yunwu-origin` as the production Storefront and created/retained the `pre-apps-web-decommission-2026-07-14` tag at `9ed344f` before deletion.

All 19 audited Git diffs contain paths within the `platform-os` repository only; none can alter the sibling `yunwu-origin` repository. A read-only identity check confirms `yunwu-origin` is a separate Git worktree. No source, Vercel configuration, workspace manifest, or package script in `platform-os` currently points to `yunwu-origin` as an in-repository build dependency.

Therefore, there is no evidence of an incorrect cross-repository modification. This audit did not claim live Storefront traffic health because it intentionally did not deploy, alter Vercel, or issue production requests.

## Confirmed-safe, suspicious, and recovery assessment

### Confirmed-safe deletions

1. **All 83 `apps/web` files** in `c7854f7` are confirmed safe for the current `platform-os` build/deployment graph. The app was removed together with its Prisma schema/migrations, routes, local Vercel configuration, scripts, and assets; the subsequent commit removed root build references and added a permanent absence guard.
2. **The two ERP reset/import scripts** in `eb27ebe` are confirmed safe as historical-secret remediation. A current contract guard requires them to remain absent and verifies the retained scripts' environment behavior.
3. **No moves or renames** require restoration because none occurred in the audited history.

### Suspicious items (not confirmed deletion regressions)

1. **P0 — Brand OS Journal writes bypass Publisher ownership.** `apps/brand-os/src/app/api/posts/route.ts` accepts caller status and directly creates a Journal post; `admin-actions.ts` directly creates/updates Journal posts; the Journal edit page directly toggles `DRAFT`/`PUBLISHED`; the new page exposes a DRAFT/PUBLISHED selector. The Platform-only Publisher guard remains green because it does not cover this application boundary.
2. **P1 — Storefront deletion relies on an ownership invariant.** Current configuration proves `platform-os` does not deploy `apps/web`, but it cannot by itself prove a third-party/manual Vercel project is not still configured elsewhere to deploy the historical app. No local evidence indicates such a project. Treat any external report of a legacy-Web deployment as an incident trigger, not as a reason to immediately restore files into the Platform project.
3. **P2 — Historical reports contain superseded claims about `apps/web` (including an earlier “untracked” conclusion).** They are non-runtime documentation, but could mislead future responders.
4. **P2 — Next middleware-to-proxy deprecation warning.** Observed in the passing Platform build; unrelated to the deletion.

## Prioritized recovery plan

### P0 — affects production workflow integrity

1. **Contain the Brand OS Journal bypass before additional governance work.** Make Journal status transitions go through the canonical Publisher owner, decide whether the public-looking POST route may write at all, and add an app-wide bypass test. This is a targeted remediation, not a rollback of Phase D–G file deletion.
2. **Do not restore `apps/web` into the current Platform Vercel project.** Current Platform production build is healthy and explicitly targets `apps/platform`; restoring the legacy app or reverting root Vercel configuration would reintroduce the previously removed wrong-target risk.

### P1 — high risk / conditional recovery

1. If concrete evidence identifies a still-live legacy Web deployment, recover it **only in an isolated branch or separate Vercel project** from `pre-apps-web-decommission-2026-07-14`. Preserve the current Platform `vercel.json` and do not combine legacy-Web restoration with the Platform deployment target.
2. Before any such restoration, confirm domain ownership and traffic routing from the Vercel dashboard; this audit did not access or mutate it.
3. Keep the ERP deleted scripts absent. If a historical import workflow must be recovered, reconstruct it from Git history into a reviewed replacement that uses the current secret contract; do not restore the old secret-bearing scripts verbatim.

### P2 — optimization and prevention

1. Update or archive superseded Phase F documentation so it no longer presents the pre-reconciliation “untracked Web” conclusion as current fact.
2. Address the middleware-to-proxy deprecation during routine framework maintenance.
3. Retain and periodically run `check:apps-web-decommission`, the Publisher guard, rollback guard, and secret guard as regression controls.

## Final incident classification

| Priority | Finding | Required response |
|---|---|---|
| **P0** | Brand OS Journal workflow bypasses canonical Publisher ownership. | Targeted containment and cross-app guard; no file restoration. |
| **P1** | Legacy Web restoration is only conditionally needed if an external legacy deployment is proven. | Investigate external deployment ownership first; recover from pre-decommission tag in isolation only. |
| **P2** | Historical documentation drift and middleware deprecation. | Clean up in a later documentation/framework-maintenance task. |

**Bottom line:** The audited removals are safe in the current repository. There is no recommended restore of `apps/web`, its frozen Prisma schema, or the deleted ERP reset scripts. The incident-worthy next action is closing the unguarded Brand OS Publisher write surface.
