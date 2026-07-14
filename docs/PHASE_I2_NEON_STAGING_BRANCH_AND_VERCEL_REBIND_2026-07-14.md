# Phase I2 — Neon Staging Branch Creation and Vercel Rebind

**Date:** 2026-07-14
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**Previous HEAD:** `1e6717c`
**Status:** REQUIRES HUMAN ACTION — Neon Console authentication needed

---

## 1. Workspace Gate

| Check | Result |
|-------|--------|
| WORKDIR | ✅ `/Users/ryan/Projects/active/platform-os` |
| Branch | ✅ `main` |
| HEAD == origin/main | ✅ `1e6717c` == `1e6717c` |
| `pnpm check:secrets` | ✅ PASS, 0 findings |

---

## 2. Neon Topology Audit

### 2.1 Identified Infrastructure

| Component | Identifier (REDACTED) |
|-----------|----------------------|
| Vercel Project | `platform-os` (prj_KyNN2wqLPlMfHsq0hYXU3Q6mP0EH) |
| Vercel Team | `yunwu1` (team_j9lFcExPCgDUqvnA48Lj7W4m) |
| Brand DB Compute | `ep-morning-sun-aoo4dk3t` |
| General DB Compute | `ep-polished-unit-ajk5rq34` |
| Brand DB User (Production) | `neondb_owner` |
| Brand DB User (Development) | `brand_app` |
| Neon Project ID | Not determinable without Neon Console access |
| Production Branch ID | Not determinable without Neon Console access |

### 2.2 Current Configuration Issue

**Both Production and Development share the same Neon compute endpoint** (`ep-morning-sun-aoo4dk3t`). Without Neon Console access, I cannot determine whether:
- They truly share the same branch (worst case — no isolation)
- They are different branches on the same project (possible — branches share compute but have separate data)
- Production was intended to be on a separate branch

The Neon password rotation affected both `neondb_owner` and `brand_app`, suggesting both roles authenticate to the same branch/endpoint.

---

## 3. Blocking Item: No Neon Console Access

I do not have:
- A Neon API key or JWT token
- The `neonctl` CLI installed
- Credentials to authenticate to `https://console.neon.tech`

**What I can do within available tools:**
- ✅ Work in this workspace
- ✅ Verify Git state and secrets
- ✅ Configure Vercel environment variables
- ✅ Validate database connectivity once credentials are available
- ✅ Execute SQL queries on authorized databases

**What requires human action:**
- ❌ Access the Neon Console (`console.neon.tech`)
- ❌ Create a new staging branch
- ❌ Retrieve the new branch's connection string
- ❌ Reset or create new database roles

---

## 4. Step-by-Step Instructions for You (Ryan)

### Step 1: Access Neon Console

1. Go to **console.neon.tech** and log in
2. Find the project whose compute endpoint starts with `ep-morning-sun-...` (Brand DB)
3. Locate the **Branches** tab for this project

### Step 2: Identify Current Branch Structure

- Note the **Default Branch** name (likely `main` or the project name)
- Check if there are already any other branches
- Check if Development is currently on the default branch or a different one

### Step 3: Create a Staging Branch

1. Click **New Branch** or **Create Branch**
2. **Parent branch:** Default/Production branch
3. **Branch name:** `staging-2026-07-14` (or `staging`, whichever you prefer)
4. **Create with data:** ✅ Yes (copy data from parent — this gives us the same 5 products + 1 brand_materials row)
5. Click **Create Branch**

### Step 4: Retrieve Staging Branch Connection String

After creation:
1. The new branch will have its own compute endpoint
2. Click **Connect** on the new branch
3. You'll see a connection string like: `<NEON_BRANCH_CONNECTION_STRING>`
4. **Copy this connection string** (the `neondb_owner` password)

### Step 5: Share with Me

Share the **complete connection string** for the new staging branch with the `neondb_owner` role. I will then:

1. Connect and create the **staging_app** role (DML-only)
2. Set up proper user/owner separation
3. Confirm baseline state
4. Return the staging_app credential for you to put into Vercel

Alternatively, if you prefer to create the staging_app role yourself:

**SQL to create staging_app role (run on new branch):**
```sql
CREATE ROLE staging_app WITH LOGIN PASSWORD '<generated-password>' NOBYPASSRLS;
GRANT CONNECT ON DATABASE neondb TO staging_app;
GRANT USAGE ON SCHEMA public TO staging_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO staging_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO staging_app;
```

### Step 6: Update Vercel Development Environment

In Vercel Console → platform-os → Settings → Environment Variables:

| Variable | Environment | New Value |
|----------|-------------|-----------|
| `BRAND_DATABASE_URL` | **Development** | `<STAGING_APP_CONNECTION_STRING>` |
| `BRAND_DATABASE_URL` | **Production** | ✅ **DO NOT CHANGE** |

### Step 7 (Optional but Recommended): Staging Owner URL

Also add a new variable for migration usage:

| Variable | Environment | Value |
|----------|-------------|-------|
| `STAGING_BRAND_DATABASE_OWNER_URL` | **Development** (and/or Preview) | `<STAGING_OWNER_CONNECTION_STRING>` |

---

## 5. What Happens After You Complete the Steps

Once you share the staging connection string (or confirm you've set it up):

**I will do:**
1. ✅ Connect to the new staging branch
2. ✅ Verify isolation (branch ID, endpoint ID different from production)
3. ✅ Create `staging_app` role with DML-only permissions
4. ✅ Confirm `neondb_owner` has DDL (ALTER TABLE) on materials/product_materials
5. ✅ Run baseline preflight (table existence, row counts)
6. ✅ Validate staging owner can execute ALTER (using temp table probe)
7. ✅ Document everything in this report
8. ✅ Check `pnpm check:secrets` — PASS
9. ✅ Commit and push this report
10. ✅ Mark Phase G2D resumption READY

**I will NOT do (until you explicitly say to resume G2D):**
- ❌ Execute the 14 Materials DDL statements
- ❌ Execute backfill
- ❌ Execute rollback
- ❌ Modify production database or Vercel env
- ❌ Deploy anything

---

## 6. Security Reminder

| Concern | Guideline |
|---------|-----------|
| Sharing the connection string | Share via a secure channel, not in public chat |
| Don't post credentials in code | I will not write them to repository |
| Production stays unchanged | Confirmed — only Development env changes |

---

*End of Phase I2 report — awaiting human action to create Neon staging branch.*
