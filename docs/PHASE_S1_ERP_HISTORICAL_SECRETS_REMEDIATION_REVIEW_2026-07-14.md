# Phase S1 — ERP Historical Secrets Remediation Review

**Date:** 2026-07-14
**Status:** Reviewed and sanitized for Phase S2 remediation

## Executive conclusion

The eight ERP working-tree findings corresponded to one revoked historical
database credential. The credential was revoked during the 2026-07-11 P0
incident. No additional credential rotation or Git history rewrite is required
for Phase S2.

This report contains no credential value, connection-string fragment, host,
username, password, token, or searchable credential fingerprint.

## Finding classification

| Classification | Count | Phase S2 action |
| --- | ---: | --- |
| Superseded tracked scripts | 2 | Delete with explicit `git rm` |
| One-off untracked diagnostic scripts | 4 | Delete by explicit path |
| Retained operational scripts | 2 | Migrate to `DIRECT_DATABASE_URL` and fail closed |

## File decisions

### Delete tracked superseded scripts

- `apps/erp/scripts/reset-and-import-v2.js`
- `apps/erp/scripts/reset-and-import.js`

These scripts are superseded historical variants. Before deletion, Phase S2
must confirm that no package command, CI workflow, deployment process, or
runtime script references them.

### Delete untracked diagnostics

- `apps/erp/scripts/check-inventory-table.js`
- `apps/erp/scripts/check-table-structure.js`
- `apps/erp/scripts/import-purchase.js`
- `apps/erp/scripts/import-to-production.js`

These are local diagnostic or one-off scripts. They are not tracked and must be
checked for package, CI, deployment, import, and unique-business-logic usage
before explicit-path deletion.

### Retain and migrate

- `apps/erp/scripts/import-all-v3.js`
- `apps/erp/scripts/reset-and-import-sql.js`

The retained scripts must accept a database connection only through
`process.env.DIRECT_DATABASE_URL`. They must have no source fallback, must fail
closed before client initialization when the variable is absent, and must never
log the value or derived authentication information.

## Security and recovery posture

- One revoked historical database credential caused the eight script findings.
- The working tree is remediated by deleting obsolete scripts and removing
  embedded credentials from retained scripts.
- Historical commits may retain the old value; this is a separate history-risk
  concern and is not remediated by a working-tree change.
- No Git history rewrite is required for this phase.
- No database connection, import, reset, migration, or deployment is authorized
  by this review.

## Phase S2 acceptance criteria

1. The report remains free of sensitive values.
2. The six obsolete or diagnostic scripts are absent.
3. The two retained scripts use only `DIRECT_DATABASE_URL` and fail closed.
4. The ERP Secret Contract Guard passes.
5. `pnpm check:secrets` passes with zero working-tree findings.
6. `apps/web` remains decommissioned.

## Deferred work

- No additional credential rotation is required for the revoked credential.
- No Git history rewrite is required in Phase S2.
- Materials and Phase G remain out of scope.
- Existing `packages/ui` TypeScript environment diagnostics remain separately
  deferred.
