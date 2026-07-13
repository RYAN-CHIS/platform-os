# Phase H — Frozen Brand Schema Deletion Readiness

**Date:** 2026-07-13
**Status:** `FROZEN BRAND SCHEMA INACTIVE — PHASE H PHYSICAL DELETION PENDING`

## Frozen Asset

| Item | Value |
|---|---|
| Frozen schema | `apps/brand-os/prisma/schema.prisma` |
| Git status | Tracked, retained unchanged in Phase C4 |
| Legacy generated output | `apps/brand-os/node_modules/@prisma/brand-client` — removed in C4; it was ignored/untracked |
| Canonical generated output | `packages/brand-db/node_modules/@prisma/brand-client` — retained; this is `@yunwu/brand-db` output |

## C4 Execution Audit

| Question | C4 result |
|---|---|
| Imported by Brand OS source? | No |
| Referenced by Brand OS package scripts? | No |
| Participates in Brand OS install? | No; local `postinstall: npx prisma generate` was removed |
| Participates in Brand OS generate? | No Brand OS generate command remains |
| Participates in Brand OS typecheck? | No; both legacy wrapper files were deleted and full typecheck passes without local output |
| Participates in Brand OS build? | No; build passes after legacy output removal |
| Participates in Brand OS seed? | No; seed uses `@yunwu/brand-db` and `createBrandDb()` |
| Participates in Brand OS CI/build configuration? | No Brand OS CI/config reference found |
| Referenced by root contract guard? | Yes, as a read-only frozen-schema audit fixture/input in `scripts/check-prisma-schema-contract.mjs` and its test. This is not a Brand OS execution path. |

## Why It Is Inactive

The Frozen Schema is no longer an input to Brand OS install, build, typecheck, seed, runtime, or generated-client lifecycle. The former local generated output and both local Prisma wrapper files are gone. The only remaining executable reference is the root contract guard's deliberate static validation of frozen schemas, which remains unchanged because C4 does not authorize guard changes.

## Remaining Phase H Preconditions

Before physical deletion, a separately authorized Phase H must:

1. Decide and implement the Contract Guard/fixture transition that currently reads this Frozen Schema.
2. Re-run the repository-wide static audit for direct, dynamic, test, build, CI, and package-script references.
3. Delete the schema only after the guard no longer expects it.
4. Verify canonical generation, Brand OS typecheck, tests, and build without it.
5. Update the baseline and deletion documentation; commit and push without deployment unless separately authorized.

## Post-Deletion Validation Checklist

- No `apps/brand-os/prisma/schema.prisma` reference in source, scripts, CI, package scripts, or guard fixtures.
- No `@prisma/brand-client` reference outside `packages/brand-db`'s canonical implementation.
- `pnpm --filter @yunwu/brand-db generate` succeeds with a placeholder `BRAND_DATABASE_URL`.
- Brand OS typecheck, seed static compilation, unit tests, Contract Guard tests, and build pass.
- The canonical generated output remains present and resolves through `@yunwu/brand-db`.

## Rollback

C4 is code-only. Reverting its commit restores the two legacy wrappers, Brand OS local generation configuration, and dependency declarations. It does not alter the Frozen Schema or any database state.

**C4 explicitly did not delete, rename, move, format, or otherwise modify the Frozen Schema file.**
