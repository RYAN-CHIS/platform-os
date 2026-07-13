# Phase C4 — Brand OS Legacy Client Cleanup Readiness

**Date:** 2026-07-13
**Scope:** Static C3 inventory after the non-production consumer migration.
**Database activity:** None. This report is based on source, package-script, and generated-output path inspection only.

## C3 Classification Inventory

| File | Classification | Current client source | Operation type | Writes | Migrate in C3 | C4 action |
|---|---|---|---|---:|---:|---|
| `apps/brand-os/src/{lib,app}/**` — 17 Phase C2 files | A: production runtime | `@/lib/brand-db-adapter` | runtime reads/writes | Yes | Already complete in C2 | None |
| `apps/brand-os/seed.ts` | B: development seed | Default `@prisma/client` before C3; `@yunwu/brand-db` after C3 | seed Journal posts | Yes if explicitly run | Yes | None |
| `apps/brand-os/src/lib/admin-identity.test.ts` | B: unit test | None | pure identity decision | No | Not needed | Keep |
| `apps/brand-os/src/lib/series-id.test.ts` | B: unit test | None | pure validation | No | Not needed | Keep |
| `apps/brand-os/src/lib/prisma.ts` | C: legacy infrastructure | local `@prisma/brand-client` | old singleton entry | No direct consumer | No | Remove/retire only in C4 |
| `apps/brand-os/src/lib/db.ts` | C: legacy infrastructure | local `@prisma/brand-client` | old singleton entry | No direct consumer | No | Remove/retire only in C4 |
| `apps/brand-os/prisma/schema.prisma` | C: frozen schema | N/A | local-client generator input | No | No | Stop using in C4; physical deletion is Phase H |
| `apps/brand-os/node_modules/@prisma/brand-client` | C: legacy generated output | generated from frozen schema | local generated client | N/A | No | Stop generating in C4; delete only when safe |
| `apps/brand-os/package.json` `postinstall` | C: legacy infrastructure | `npx prisma generate` | generates frozen-client output | No | No | Modify/remove in C4 |
| `scripts/reset-password.mjs` | D: unrelated ERP/default-client maintenance | default `@prisma/client`, `user` model | ERP/admin password utility | Yes if run | No | Out of scope |
| `scripts/reset-password.ts` | D: ERP maintenance | `@yunwu/db` | ERP/admin password utility | Yes if run | No | Out of scope |
| `scripts/reset-pw.js`, `scripts/test-login.js` | D: unrelated historical ERP tools | `pg` | local/ERP maintenance | Yes if run | No | Out of scope |

The 17 production files are already migrated in Phase C2 and are deliberately not modified in C3. No new production runtime consumer of a legacy Brand Prisma client was found.

## Seed Migration

`apps/brand-os/seed.ts` is the only actual Brand OS non-production Prisma consumer found. C3 changes only its client boundary:

- imports `createBrandDb` and `JournalCategory` from `@yunwu/brand-db`;
- creates a script-scoped client with `createBrandDb()`;
- uses the canonical `journalPost` delegate;
- retains the original records and insertion order unchanged;
- disconnects in the existing `finally` block.

`createBrandDb()` accepts `BRAND_DATABASE_URL` only and has no `DATABASE_URL` fallback. The seed is not exposed by a package script and was not executed during C3.

The seed retains its pre-existing optional ERP synchronization subprocess reference. The referenced `apps/brand-os/scripts/sync-from-erp.mjs` file is absent, and no `$transaction` or shared client is present. This is a non-atomic cross-context maintenance risk to assess separately; C3 neither executes nor redesigns it.

## Publisher and Context Audit

- Every seeded `JournalPost.status` value is `PUBLISHED`, which is a valid canonical `PublishStatus` value.
- The seed contains none of `IN_REVIEW`, `SCHEDULED`, or `REJECTED`; no Phase E mapping is required.
- No migrated C3 file uses `$transaction`, raw SQL, an ERP client, or a cross-database transaction.
- Root password-reset scripts are ERP/default-client utilities, not Brand Runtime consumers, and remain out of scope.

## Legacy Client and Frozen Schema Status

| Item | Current state | Consumers after C3 | C4 readiness |
|---|---|---:|---|
| `src/lib/prisma.ts` | imports `@prisma/brand-client` | 0 business consumers | Can be retired after a fresh import audit and typecheck |
| `src/lib/db.ts` | imports `@prisma/brand-client` | 0 business consumers | Can be retired after a fresh import audit and typecheck |
| Frozen schema | input to `postinstall: npx prisma generate` | no source import | May be stopped in C4; physical deletion remains Phase H |
| Legacy generated client | `apps/brand-os/node_modules/@prisma/brand-client` | only the two legacy entry files | May stop generating after those entries are retired |
| Canonical generated client | `packages/brand-db/node_modules/@prisma/brand-client` | `@yunwu/brand-db` package | Keep; this is the canonical package output |

Although production consumers no longer import the legacy entries, TypeScript currently includes `src/lib/prisma.ts` and `src/lib/db.ts` in the Brand OS project. Therefore the legacy generated package must remain available until C4 retires those entry files and validates the app typecheck/build without it.

## Package Script Status

| Script or concern | Status in C3 | C4 disposition |
|---|---|---|
| Brand OS `dev`, `build`, `start` | Keep unchanged | KEEP |
| Brand OS `postinstall: npx prisma generate` | Kept unchanged | MODIFY/REMOVE IN C4 after legacy entries are retired |
| Brand OS seed command | No package script exists | KEEP absent; do not add a runtime seed command as cleanup |
| Root `dev:brand-os`, `build:brand-os` | Keep unchanged | KEEP |
| Canonical `@yunwu/brand-db generate` | Keep | KEEP |
| Frozen schema file | Keep physically unchanged | DEFER PHYSICAL DELETION TO PHASE H |

## Dependency Candidates for C4

No dependency is removed in C3. Subject to a C4 import and build audit, the following are candidates:

| Dependency | Why it may be removable later | C3 action |
|---|---|---|
| `apps/brand-os` `@prisma/client` | No remaining Brand OS source import after the seed migration; currently retained for legacy generation tooling | Keep |
| `apps/brand-os` `prisma` devDependency | Supports the frozen-schema postinstall generation | Keep |
| `apps/brand-os` `@yunwu/db` | No Brand OS source import found; verify workspace/package-script use before removal | Keep |
| local `@prisma/brand-client` generated output | Exists only for legacy entries and frozen generation | Keep until C4 validates retirement |
| `@yunwu/brand-db` | Canonical runtime and seed package | KEEP |

## Remaining References and C4 Sequence

| Legacy entry | File | Reference type | Needed after C3 | Target phase |
|---|---|---|---:|---|
| local client import | `apps/brand-os/src/lib/prisma.ts` | source infrastructure | Yes, until entry retirement | C4 |
| local client import | `apps/brand-os/src/lib/db.ts` | source infrastructure | Yes, until entry retirement | C4 |
| frozen generator | `apps/brand-os/prisma/schema.prisma` | `postinstall` input | Yes, until generation is disabled | C4 stop-use / H delete |
| legacy generated output | `apps/brand-os/node_modules/@prisma/brand-client` | generated artifact | Yes, until C4 validation | C4 |
| old default client dependency | `apps/brand-os/package.json` | dependency/tooling | Yes, until C4 validation | C4 |

Recommended minimum C4 order:

1. Re-run legacy import inventory and confirm production/non-production consumer count remains zero.
2. Retire the two dead local entry files or otherwise remove their TypeScript reachability.
3. Disable the frozen local generate path and adjust `postinstall`.
4. Verify Brand OS typecheck, tests, and build without the local generated client.
5. Remove now-dead package dependencies only after the validation succeeds.
6. Keep the frozen schema physically present; Phase H alone may delete it.
7. Update the baseline, commit, and push. Do not deploy without separate authorization.
