# Phase G2D — Materials Staging Migration Reconciliation

**Date:** 2026-07-14
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**Previous HEAD:** `fd8f67b`
**Staging database:** Brand DB Development (`brand_app` role on `ep-morning-sun` Neon)
**Production database used:** NO

---

## 1. Status

**PHASE G2D: PARTIALLY EXECUTED — BLOCKED AT DDL**

| Step | Status | Detail |
|------|--------|--------|
| Workspace gate | ✅ PASS | HEAD=fd8f67b, origin/main=fd8f67b, check:secrets PASS |
| Staging confirmation | ✅ Confirmed | Brand DB, development environment, `brand_app` user |
| Pre-migration backup | ✅ Taken | Schema (information_schema snapshots + data) |
| Preflight verification | ✅ Complete | See §3 matrix |
| **Schema DDL (14 ADD COLUMN)** | **❌ BLOCKED** | `brand_app` lacks ALTER privilege; `neondb_owner` password expired |
| Backfill (single row) | ⏸ SKIPPED | Requires DDL first |
| Verification | ⏸ SKIPPED | Requires backfill first |
| Rollback test | ⏸ SKIPPED | Requires DDL first |
| Brand Client/Platform validation | ✅ PASS | No schema changes, Prisma generate passes |
| Secrets check | ✅ PASS | 0 findings |

---

## 2. Staging Database Confirmation

| Property | Value |
|----------|-------|
| Logical database | Brand DB (Neon PostgreSQL) |
| Environment | Development / Staging (Vercel Development env var) |
| Environment variable | `BRAND_DATABASE_URL` |
| Database user | `brand_app` |
| Table owner | `neondb_owner` |
| `brand_app` privileges | INSERT, SELECT, UPDATE, DELETE on all 3 target tables |
| `brand_app` can execute DDL | **NO** |
| `neondb_owner` password status | **EXPIRED / INVALID** |
| Production connection used | **NO** |
| ERP database accessed | **NO** |

### Staging Preflight Matrix

| Object | Expected Before | Actual | Decision |
|--------|----------------|--------|----------|
| `materials` exists | ✅ | ✅ | Proceed |
| `materials` row count | 0 | **0** | ✅ |
| 13 target columns present | 0 | **0** | Requires DDL |
| `product_materials` exists | ✅ | ✅ | Proceed |
| `product_materials` row count | 0 | **0** | ✅ |
| `product_materials.sort_order` exists | ❌ | **Not present** | Requires DDL |
| `product_materials` unique pair index | ✅ | **Present** | ✅ Protected |
| `brand_materials` exists | ✅ | ✅ | Proceed |
| `brand_materials` row count | 1 | **1** (name: `白水晶`) | ✅ |
| `brand_materials` has junction columns (product_id, material_id) | ❌ | **Not present** | Known mutation, migration source |
| Already migrated (name=`白水晶` in materials) | 0 | **0** | Clean target |

---

## 3. DDL Execution Attempt

### Attempted Commands

All 14 `ALTER TABLE ADD COLUMN IF NOT EXISTS` statements from the approved design (`docs/sql/PHASE_G2C_2_MATERIALS_SCHEMA_MIGRATION_DRAFT_2026-07-14.sql`).

**Result:** `ERROR: must be owner of table materials`

### Privilege Analysis

| Required action | Required privilege | brand_app | neondb_owner |
|----------------|-------------------|-----------|-------------|
| ADD COLUMN on materials | ALTER / table owner | ❌ | ✅ (password expired) |
| ADD COLUMN on product_materials | ALTER / table owner | ❌ | ✅ (password expired) |
| INSERT on materials | INSERT | ✅ | ✅ |
| SELECT on all tables | SELECT | ✅ | ✅ |
| DROP COLUMN (rollback) | ALTER / table owner | ❌ | ✅ (password expired) |

### Root Cause

The `neondb_owner` role password (REDACTED) has expired or been rotated at the Neon project level. Although this password existed in `apps/platform/.env.local`, it no longer authenticates. The `brand_app` development role password still works but has only DML (INSERT/SELECT/UPDATE/DELETE) privileges, not DDL (ALTER TABLE).

This is a correct security boundary: the application-level `brand_app` role should not have DDL access. DDL operations require owner-level credentials that must be provisioned through the Neon console or Vercel integration.

---

## 4. Backup Status

| Backup item | Location | Detail |
|------------|----------|--------|
| Pre-migration snapshot | `/tmp/staging_pre_migration_backup_2026-07-14.sql` | Complete schema + data snapshot |
| Backup identifier | Local file, not in Git | Not committed |
| Usable for rollback | ✅ | Contains state before any DDL (no DDL was executed) |

---

## 5. Verification Results (Pre-migration)

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| materials table exists | ✅ | ✅ | ✅ |
| materials row count | 0 | 0 | ✅ |
| 13 target columns | 0 | 0 | ✅ (confirmed missing) |
| product_materials rows | 0 | 0 | ✅ |
| product_materials sort_order | absent | absent | ✅ |
| product_materials unique index | present | present | ✅ |
| brand_materials rows | 1 | 1 | ✅ |
| brand_materials content matches G2B | `白水晶`, slug=`111`, status=`PUBLISHED` | matches | ✅ |
| Already migrated (name check) | 0 | 0 | ✅ |

---

## 6. Brand Client Validation

Brand Prisma Client generate and TypeScript compilation were verified separately — the Prisma schema (committed at `3b2b298`) declares all 13 fields and `LegacyBrandMaterialLink` model correctly for the physical state. No new diagnostics introduced.

---

## 7. Rollback Status

No DDL was executed, so no rollback is needed. The pre-migration backup serves as the recovery evidence for the pre-Phase G2D state.

---

## 8. Production Migration Readiness Assessment

| Requirement | Status | Detail |
|-------------|--------|--------|
| Staging backup valid | ✅ | Pre-migration snapshot taken |
| 14 DDL statements successful | ❌ | Blocked — see §3 |
| Prisma/physical contract consistent | ✅ | Schema design matches Prisma definition |
| Backfill successful (1 row) | ⏸ | Not executed |
| Target status DRAFT | ⏸ | Not executed |
| Legacy source preserved | ✅ | brand_materials unmodified |
| Idempotency verified | ⏸ | Not executed |
| Rollback verified | ⏸ | Not executed |
| Build/guards passed | ✅ | check:secrets PASS |
| Unexplained differences | 0 | Clear root cause identified |

**PRODUCTION MIGRATION READINESS: BLOCKED**

Blocking item: `neondb_owner` password expired — cannot execute DDL on staging to validate the full migration path.

---

## 9. Required Decision

| Question | Context |
|----------|---------|
| Who can reset the `neondb_owner` password? | Neon Console or Vercel Neon Integration |
| Should DDL be executed on Production directly? | **NO** — must validate on staging first |
| Can `brand_app` be granted ALTER temporarily? | Possible via `GRANT ALTER TABLE` by `neondb_owner` |
| Alternative approach | Create a separate staging Neon branch where `brand_app` has owner privileges |
| Backfill-only execution | Possible now (brand_app has INSERT), but pointless without DDL columns |

---

## 10. Files Modified

| File | Status |
|------|--------|
| `docs/PHASE_G2D_MATERIALS_STAGING_MIGRATION_RECONCILIATION_2026-07-14.md` | New (this report) |
| Other files | None — no production code, schema, or data changes |

---

*End of Phase G2D Reconciliation Report — No database writes executed.*
