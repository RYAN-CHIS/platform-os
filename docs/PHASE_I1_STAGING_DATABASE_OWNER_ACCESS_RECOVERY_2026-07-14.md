# Phase I1 — Staging Database Owner Access Recovery

**Date:** 2026-07-14
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**HEAD:** `5cc5e54`
**Phase G2D blocker addressed:** Staging Brand DB DDL owner password expired/rotated by Neon

---

## 1. Database Architecture Assessment

### 1.1 Neon Projects

| Project Branch ID | Database | Purpose |
|-------------------|----------|---------|
| `ep-morning-sun-...` (ap-southeast-1) | **Brand DB** | Brand Runtime (materials, products, product_materials, brand_materials, etc.) |
| `ep-polished-unit-...` (us-east-2) | **General DB** | ERP, legacy, cross-cutting data |

### 1.2 Environment-to-Database Mapping

| Vercel Environment | Brand DB Role | Gen DB Role | Status |
|--------------------|-------------|-------------|--------|
| **Production** | `neondb_owner` (Brand DB) | `neondb_owner` (General DB) | Both passwords expired |
| **Development** | `brand_app` (Brand DB) | N/A | Password expired |

### 1.3 Critical Finding: Shared Project

**Both Production and Development environments connect to the same Neon project (`ep-morning-sun-...`).** There is no independent Neon branch for staging/development.

| Question | Answer |
|----------|--------|
| Staging and Production share the same Neon project? | **YES** — both use `ep-morning-sun-...` |
| Staging has an independent Neon branch? | **NO** — same branch for Production and Development |
| Are data sets shared? | **YES** — same tables, same data (5 products, 1 brand_materials row) |

**Implication:** This fails the isolation requirement for safe DDL staging. Awarding DDL access to the shared project risks production data integrity.

---

## 2. Conclusion: Phase I1 Blocked at Infrastructure Level

**No credential reset will solve the fundamental problem:** the Staging and Production databases are the same Neon branch. Even if we restore the `neondb_owner` password, any DDL executed for "staging" would directly modify the same tables that production consumers read from.

### Blocking Item: No Isolated Staging Database

| Requirement | Status |
|-------------|--------|
| Staging database isolated from Production | ❌ **NO** — same Neon project, same branch, same schema, same data |
| Independent Staging Neon branch exists | ❌ **NO** |
| Staging role with DDL privileges | ❌ Not possible without production risk |

---

## 3. Recommended Solution: Create Independent Staging Neon Branch (方案 B)

The only correct path forward is to create a new Neon branch specifically for staging:

### Step-by-Step

| Step | Action | Required Access |
|------|--------|----------------|
| 1 | Access Neon Console for project `ep-morning-sun-...` | Neon account / Vercel integration |
| 2 | Create new branch named `staging` or `preview` from current head | Neon Console |
| 3 | Neon auto-creates a new compute endpoint and connection string | Automatic |
| 4 | New branch has its own `neondb_owner` password | Use Neon Console to retrieve |
| 5 | Create dedicated `staging_app` role with INSERT/SELECT/UPDATE/DELETE | `psql` on new branch |
| 6 | Create dedicated `staging_owner` role or use `neondb_owner` for DDL | As found/created in step 4 |
| 7 | Set `BRAND_DATABASE_URL` in Vercel Development to point to new branch | Vercel Console |
| 8 | Set `STAGING_BRAND_DATABASE_OWNER_URL` in Vercel Development for migration usage | Vercel Console |
| 9 | Verify `brand_app` → `staging_app` privileges are DML-only | `psql` validation |
| 10 | Verify `staging_owner` has DDL (ALTER TABLE) | `psql` validation |
| 11 | Confirm Vercel Production `BRAND_DATABASE_URL` unchanged | Vercel Console |
| 12 | Execute Phase G2D on the isolated staging branch | Controlled migration window |

### Why Not Option A (Restore Existing Credentials)?

| Reason | Detail |
|--------|--------|
| No isolation | Same database would be modified |
| Production risk | Any DDL mistake directly impacts production data |
| Rollback complexity | Cannot safely test rollback on production |
| No repeatable process | Every G-suite phase DDL would face same problem |

### Why Not Option C (Grant brand_app DDL)

| Reason | Detail |
|--------|--------|
| Same isolation problem | brand_app connects to production database |
| Safety theater | "Temporary" DDL on production is still production DDL |
| Prisma schema inconsistency | Physical DDL on production without migration tooling |

---

## 4. Current Privilege Status (Pre-Recovery)

### As of 2026-07-14 16:47

| Role | Privileges | Password Status |
|------|-----------|-----------------|
| `brand_app` (development) | SELECT, INSERT, UPDATE, DELETE on materials/product_materials/brand_materials | **ROTATED** 🔴 |
| `neondb_owner` (production) | Full table ownership | **ROTATED** 🔴 |

### Without Neon Branch Isolation, Progress Is Blocked

Even if passwords were functional, executing DDL on the shared database is unacceptable for production integrity.

---

## 5. Variables Maintained (No Changes This Phase)

| Variable | Environment | Environment | Changed? |
|----------|-------------|-------------|----------|
| `BRAND_DATABASE_URL` | Production | `ep-morning-sun-...` | ❌ No |
| `BRAND_DATABASE_URL` | Development | `ep-morning-sun-...` | ❌ No |
| `DATABASE_URL` | Production | `ep-polished-unit-...` | ❌ No |
| `DATABASE_URL` | Development | `ep-morning-sun-...` | ❌ No |

All production and development environment variables are untouched. No deployment, no code changes.

---

## 6. Repository Committed Files

| File | Status |
|------|--------|
| `docs/PHASE_I1_STAGING_DATABASE_OWNER_ACCESS_RECOVERY_2026-07-14.md` | New (this report) |
| Other files | None |

No credentials, URLs, hosts, passwords, tokens, or connection strings are written to this repository.

---

## 7. Security Verification

| Check | Result |
|-------|--------|
| `pnpm check:secrets` | ✅ PASS, 0 findings |
| New credentials written to repo | ❌ NONE |
| Production environment modified | ❌ NONE |
| Password values in report | ❌ NONE (REDACTED throughout) |
| Shell history exposed | ❌ Avoided — PGPASSWORD used in-memory |
| `.env` files staged | ❌ NOT STAGED |

---

## 8. Phase G2D Resumption Gate

| Requirement | Status |
|-------------|--------|
| Staging database isolated from Production | ❌ **NO — BLOCKED** |
| Staging owner credential available | ❌ |
| `materials` owner confirmed | ❌ |
| `product_materials` owner confirmed | ❌ |
| `brand_materials` read access confirmed | ❌ |
| Backup/snapshot available | ❌ (pre-migration snapshot exists but on production-adjacent DB) |
| Production credentials not used | ✅ |
| Secrets Gate PASS | ✅ |
| Credentials not in repo | ✅ |
| Formal DDL not executed | ✅ |
| Backfill not executed | ✅ |
| Deployment not executed | ✅ |

**PHASE G2D RESUMPTION: BLOCKED** 🛑

Blocking condition: **No isolated staging database exists.** Production and Development share the same Neon project/branch. Staging DDL cannot be safely executed.

---

## 9. Required Human/Infrastructure Action

**To unblock, you (Ryan) need to:**

1. **Access Neon Console** for the project at `ep-morning-sun-...` (Brand DB)
2. **Create a new branch** named `staging` or `preview` from current head
3. **Retrieve the new branch connection string** (includes fresh `neondb_owner` password)
4. **Create a restricted `staging_app` role** on the new branch (DML only — SELECT/INSERT/UPDATE/DELETE)
5. **Update Vercel Development environment**:
   - `BRAND_DATABASE_URL` → point to the new staging branch with `staging_app` credentials
   - `STAGING_BRAND_DATABASE_OWNER_URL` → point to the new staging branch with `neondb_owner` credentials (for migration use only)
6. **Confirm Vercel Production `BRAND_DATABASE_URL` unchanged** (still points to `ep-morning-sun` main branch)

After you complete these steps, tell me and I will:
- Verify the new staging branch roles and permissions
- Execute the 14 DDL statements on staging
- Perform single-row backfill
- Run verification and rollback tests
- Confirm Phase G2D completeness

---

*End of Phase I1 Report — No database operations executed, no code modified, no deployment triggered.*
