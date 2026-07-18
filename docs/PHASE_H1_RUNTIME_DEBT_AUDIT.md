# Phase H1 — Runtime Technical Debt Audit and Prioritized Remediation Plan

**Date:** 2026-07-14  
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`  
**Audited baseline:** `7cbcffd73f9acd25b61acfdb9279d5a49dd5eecc`  
**Scope:** static source analysis, existing contract guards, and direct TypeScript diagnostics only.  
**Excluded:** database access, DDL/DML, migrations, deployment, Vercel, environment and secrets changes.

## Executive summary

The repository has three production-relevant debt clusters:

1. `apps/brand-os` has four direct Journal workflow-write paths outside the Platform Publisher boundary, including an unauthenticated-looking `POST /api/posts` path that accepts a caller-provided status.
2. Two request-time Runtime DDL implementations remain: Materials creates/alters `brand_materials`, and permission-item actions create `permission_items`.
3. Full Platform TypeScript checking reports 129 diagnostics. Ninety-four are concentrated in `packages/ui`; 35 are real Platform/gateway/API contract drift that should be triaged after the UI type environment is restored.

The current Platform Publisher, Prisma, Materials-schema, and secrets guards pass. The debt is therefore largely outside the guarded Platform workflow boundary or in legacy/runtime compatibility paths.

## Evidence and method

- `pnpm check:secrets`: pass, zero findings.
- `pnpm --filter @yunwu/platform-app exec tsc --noEmit`: 129 diagnostics.
- `pnpm check:publisher-contract`: 18/18 pass.
- `pnpm check:prisma-contract`: 27/27 pass.
- `pnpm check:materials-schema-contract`: 14/14 pass.
- Source searches were limited to tracked and visible workspace source. No application route, import/reset script, Prisma database command, or database client operation was executed.

## 1. TypeScript diagnostics — complete classification

| Category | Count | Error codes | Assessment | Priority |
|---|---:|---|---|---|
| React/JSX declaration resolution | 83 | TS7026 71, TS2307 6, TS2875 6 | `packages/ui` cannot resolve React/JSX declarations under standalone Platform `tsc`. | P1 |
| UI local prop and implicit-type debt | 11 | TS7031 4, TS7006 3, TS7053 2, TS2322 2 | Follow-on component typing work after React resolution. | P2 |
| Platform model/delegate contract drift | 15 | TS2339 10, TS2551 3, TS2353 1, TS2322 1 | ERP production status fields, dashboard Brand delegate names, and Materials row shape no longer match generated contracts. | P0/P1 |
| Missing symbols, exports, and package resolution | 9 | TS2304 6, TS2305 1, TS2307 2 | Gateway declarations and filters are absent or not exported; two gateway imports cannot resolve `@yunwu/db`. | P1 |
| Handler/input semantic typing | 8 | TS1117 2, TS1345 2, TS2722 1, TS2345 3 | Duplicate API object keys, void truthiness, optional invocation, and mismatched form/action inputs. | P1 |
| Platform implicit callback typing | 3 | TS7006 3 | `PlatformSidebar` callback parameters. | P2 |
| **Total** | **129** |  |  |  |

### Affected-file distribution

| Source area | Diagnostics | Main evidence |
|---|---:|---|
| `packages/ui` | 94 | `shared-states.tsx` 46, `data-table.tsx` 33, `button.tsx` 9, `card.tsx` 2, `feedback.tsx` 2, `permission-boundary.tsx` 2 |
| ERP production actions | 8 | `apps/platform/modules/erp/production/actions.ts` status/model mismatch |
| Dashboard actions | 5 | obsolete Brand delegate names |
| Shared data gateways | 5 | ERP/Brand gateway missing names or `@yunwu/db` resolution |
| Platform sidebar | 6 | missing symbols and implicit callback types |
| Materials import/modal | 4 | duplicate object keys and void truthiness |
| Seven one-off Platform files | 7 | Banner, Brand Materials, ERP Materials/Orders, data table, product filters, roles input |

### Turbopack and environment classification

- No TypeScript diagnostic is emitted by Turbopack itself: this audit used direct `tsc`.
- The dominant failure is React/JSX declaration resolution, not environment-variable typing. No TypeScript diagnostic was attributed to `process.env` typing.
- Historical Turbopack workspace-resolution debt remains documented around package-local dependencies. It is a P2 cleanup only after a clean standalone typecheck baseline is established.

## 2. Runtime DDL inventory

| Location | Current behavior | Classification | Remediation dependency |
|---|---|---|---|
| `apps/platform/modules/brand/materials/actions.ts` | `ensureTable()` creates `brand_materials`; `ensureColumns()` alters it with Materials fields before reads/writes. | **P0: deprecated, pending controlled migration** | G2C-2/G2E migration and consumer cutover. Do not remove while the physical migration is paused. |
| `apps/platform/modules/settings/permissions/item-actions.ts` | `ensureTable()` creates `permission_items` on request before list/create operations. | **P0: pending migration** | Establish explicit schema ownership and a controlled migration before removing request-time DDL. |
| `scripts/check-materials-schema-contract.mjs` | Static guard checks only; no database operation. | Legitimate retain | Keep as governance. |

There are no other source `ensureTable` or `ensureColumns` implementations in the scanned application/package/script set.

## 3. Raw SQL inventory

Static call count: **178** raw-SQL markers.

| Form | Count | Interpretation |
|---|---:|---|
| `$queryRawUnsafe` | 75 | Requires call-site review; several use bound values but are still unsafe APIs. |
| `$executeRawUnsafe` | 31 | Includes request-time DDL and write paths; highest-priority rationalization group. |
| `$queryRaw` | 23 | Parameterized/raw read contract candidates. |
| `$executeRaw` | 14 | Parameterized/raw write contract candidates. |
| `Prisma.sql` | 35 | Typed SQL composition; usually lower-risk but still outside model delegates. |

| Domain | Calls | Classification |
|---|---:|---|
| Platform settings | 81 | Suggested Typed Prisma/repository replacement; permission-item DDL is P0. |
| Platform other (pages, auth, audit, Publisher) | 30 | Split: Publisher/audit may retain; page-level reads should move behind modules/repositories. |
| Platform Brand modules | 26 | Products media-reference and ERP bridge SQL are currently governed by narrow contracts; Materials raw SQL is blocked behind the migration plan. |
| Platform ERP modules | 18 | Suggested typed repository replacement after model contract repair. |
| Platform services | 7 | Historical compatibility SQL; assess after gateway consolidation. |
| Legacy ERP app | 8 | Legacy/local-client debt; defer unless that app remains a production owner. |
| Packages and guards | 8 | Mostly framework/contract guard behavior; retain unless a dedicated typed API is available. |

The audit does not claim that every unsafe call is injectable. It does establish that 106 calls use unsafe APIs and should be reviewed before being treated as trusted infrastructure.

## 4. Prisma Client and boundary audit

| Area | Direct delegate calls | Assessment |
|---|---:|---|
| `apps/platform/modules/brand/**` | 78 | Canonical `brandDb` usage, but directly coupled to delegates rather than a single adapter/repository seam. |
| `apps/platform/modules/erp/**` | 86 | Direct central Prisma usage in modules; gateway/service abstraction is not consistently enforced. |
| Other `apps/platform/**` | 47 | Pages/routes and helpers directly access delegates; prioritize page-level reads and import routes. |
| `packages/**` | 21 | Mostly gateway/domain implementation; this is the appropriate place for low-level client ownership. |
| `apps/brand-os/**` | 76 | Local Brand OS client; separate app boundary, but it contains the Publisher bypass listed below. |
| `apps/erp/**` | 242 | Local legacy ERP client use; high fragmentation but not evidence by itself of a Platform boundary violation. |

`erpDb` is not a distinct package boundary: it is an alias of `@yunwu/db` used in `apps/platform/modules/brand/products/actions.ts` for ERP reads and media-reference synchronization. That cross-logical-domain coupling is a P1 extraction candidate for the ERP bridge/gateway.

## 5. Publisher contract audit

The guarded Platform Publisher contract passes 18/18 tests. Platform Product, Journal, Series, and Banner wrappers route workflow transitions through `apps/platform/lib/publisher.ts`.

However, four `apps/brand-os` Journal paths bypass that owner:

| Location | Finding | Priority |
|---|---|---|
| `apps/brand-os/src/app/api/posts/route.ts` | POST accepts caller-provided `status` and directly calls `journalPost.create`; no authentication check is visible in the route. | **P0** |
| `apps/brand-os/src/lib/actions/admin-actions.ts` | `createJournalPost` accepts `status`; `updateJournalPost` accepts and persists `status` directly. | **P0** |
| `apps/brand-os/src/app/admin/journal/[id]/page.tsx` | Server action directly toggles DRAFT/PUBLISHED and `publishedAt`. | **P0** |
| `apps/brand-os/src/app/admin/journal/new/page.tsx` | UI exposes a DRAFT/PUBLISHED selector that reaches the direct create action. | **P0** |

This is a real scope gap in the existing guard: it validates Platform Publisher paths, not the separate Brand OS application. The Material `status` comparison is a separate String lifecycle and is not counted as a Publisher bypass.

## 6. TODO / FIXME / HACK inventory

- Source code: **0** markers in `apps`, `packages`, and `scripts`.
- Documentation: **3** historical `HACK` references in `docs/PRISMA_SCHEMA_OWNERSHIP_AUDIT_2026-07-11.md`, all describing Turbopack package-dependency workarounds.
- Priority: P2 documentation/packaging cleanup; no executable TODO marker requires immediate action.

## Remaining Debt Backlog

### P0 — production and governance blockers

1. **Close Brand OS Journal Publisher bypasses.** Route all four direct status-write paths through the canonical Publisher ownership boundary; explicitly decide whether the public posts POST route is allowed to write at all, then add coverage outside the Platform-only guard.
2. **Retire request-time Runtime DDL under controlled migrations.** Materials is blocked on the paused migration path; permission items need an explicit schema owner and migration plan. Do not remove either path before the replacement exists.
3. **Repair ERP production record type drift.** Resolve the eight diagnostics in `modules/erp/production/actions.ts` before relying on strict type validation for production writes.

### P1 — next sprint

1. Restore the `packages/ui` React/JSX type environment, then fix its 11 local component typing errors.
2. Resolve the remaining 27 Platform/gateway diagnostics: obsolete Brand delegates, missing gateway exports/imports, duplicate import payload keys, action/form contracts, and sidebar symbols.
3. Establish and enforce module/gateway ownership for the 211 direct Platform delegate calls; start with page-level reads, import routes, and the `erpDb` alias in Brand Products.
4. Replace or isolate raw SQL beginning with the 81 Platform Settings calls and 18 Platform ERP calls; use typed repositories where the Prisma model is authoritative.
5. Add a repository-wide Publisher bypass guard that includes `apps/brand-os` or formally decommission that app's write surface.

### P2 — planned optimization

1. Review the 106 unsafe raw-call sites and convert trusted constant-table access to safer composition where practical.
2. Consolidate the 242 local ERP and 76 local Brand OS delegate calls only after application ownership is confirmed.
3. Remove the historical Turbopack package-dependency workaround after clean standalone type checking is restored.
4. Keep the historical documentation markers as evidence or rewrite them as resolved decisions; no code TODO cleanup is currently needed.

## Recommended execution order

1. H2: Brand OS Publisher/authorization containment and a cross-app bypass guard.
2. H3: Restore UI React/JSX type environment, then clear the 35 non-UI Platform diagnostics.
3. H4: Permission-item schema ownership and Materials Runtime DDL retirement sequencing with the paused migration program.
4. H5: Gateway/repository consolidation and raw SQL replacement, measured by decreasing direct delegate and unsafe-raw counts.

## Audit conclusion

**Infrastructure pause is not a reason to block code-quality work.** The immediate non-infrastructure P0 is the unguarded Brand OS Journal workflow surface. The remaining material Runtime DDL item is documented as a sequenced dependency, not a request to perform a migration in this phase.
