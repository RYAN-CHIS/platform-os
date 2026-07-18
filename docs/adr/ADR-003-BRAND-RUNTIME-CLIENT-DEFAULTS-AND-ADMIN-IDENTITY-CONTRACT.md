# ADR-003: Brand Runtime Client-Generated Defaults and Admin Identity Contract

**Status:** ACCEPTED

**Date:** 2026-07-12

---

## 1. Context

Phase C Architecture Review and Phase C1 implementation completed. Phase C2 is blocked by five schema-level compatibility gaps between the canonical `packages/brand-db/schema.prisma` and existing production consumers in `apps/brand-os`:

1. **ID generation:** `JournalPost`, `PageContent`, `AuditLog`, `AdminUser` — consumers create records without passing `id`. Canonical schema has no `@default(cuid())`.
2. **Timestamp maintenance:** `JournalPost.updatedAt`, `PageContent.updatedAt` — consumers never pass `updatedAt`. Canonical schema has no `@updatedAt`.
3. **Admin identity:** Auth uses `findUnique({ where: { email } })`. Database has no unique constraint on `admin_users.email`. Canonical schema has no `@unique`.
4. **Auth creation:** `createAdminUser` does not check for duplicate emails before inserting.
5. **Field naming:** Consumer accesses `lead.we_chat`. Physical column is `wechat`. Canonical schema uses `wechat`.

Each gap represents a mismatch between three contract layers: the database contract, the Prisma Client contract, and the application behavior contract.

---

## 2. Phase C2 Blocking Evidence

### 2.1 Files That Block

| Consumer File | Dependency | Reason Blocked |
|--------------|-----------|----------------|
| `src/lib/auth.ts:17` | `prisma.adminUser.findUnique({ where: { email } })` | No `@unique` on canonical `AdminUser.email` — `findUnique` won't compile |
| `src/lib/actions/admin-actions.ts:258` | `prisma.journalPost.create({ data })` — no id passed | No `@default(cuid())` on canonical `JournalPost.id` |
| `src/lib/actions/content-actions.ts:50` | `prisma.pageContent.create({ data })` — no id passed | No `@default(cuid())` on canonical `PageContent.id` |
| `src/lib/audit-log.ts:25` | `prisma.auditLog.create({ data })` — no id passed | No `@default(cuid())` on canonical `AuditLog.id` |
| `src/lib/actions/admin-actions.ts:385` | `prisma.adminUser.create({ data })` — no id passed | No `@default(cuid())` on canonical `AdminUser.id` |

### 2.2 Consumer Dependencies (No `updatedAt` Passed)

| Consumer File | Operation | Missing Field |
|--------------|-----------|---------------|
| `src/lib/actions/admin-actions.ts:258` | `journalPost.create` | `updatedAt` (DB NOT NULL, no default) |
| `src/lib/actions/admin-actions.ts:269` | `journalPost.update` | `updatedAt` (DB NOT NULL, no default) |
| `src/lib/actions/content-actions.ts:48,50` | `pageContent.create/update` | `updatedAt` (DB NOT NULL, no default) |

### 2.3 AdminUser.email Unique Query

| Source | Behavior |
|--------|----------|
| Physical database (`admin_users.email`) | `text`, NOT NULL. **No unique constraint.** No index confirmed. |
| Frozen schema | `email String @unique` |
| Auth consumer (`auth.ts:17`) | `prisma.adminUser.findUnique({ where: { email } })` |
| Create consumer (`admin-actions.ts:385`) | No duplicate email check before insert |
| Canonical schema | `email String` — no `@unique` |

---

## 3. Database Facts

Source: `docs/db-metadata/brand-db-schema-metadata-2026-07-11.json`, collected via read-only PostgreSQL session.

### 3.1 ID Columns — No Database Defaults

| Table | Column | Type | Nullable | DB Default |
|-------|--------|------|----------|------------|
| `journal_posts` | `id` | text | NOT NULL | None |
| `page_contents` | `id` | text | NOT NULL | None |
| `audit_logs` | `id` | text | NOT NULL | None |
| `admin_users` | `id` | text | NOT NULL | None |

All four tables have `text` PK columns with **no database-level default**. IDs must be generated client-side.

### 3.2 updatedAt Columns — No Database Defaults

| Table | Column | Type | Nullable | DB Default |
|-------|--------|------|----------|------------|
| `journal_posts` | `updated_at` | timestamp | NOT NULL | None |
| `page_contents` | `updated_at` | timestamp | NOT NULL | None |

The `created_at` columns DO have `CURRENT_TIMESTAMP` as a database default. The `updated_at` columns do NOT.

### 3.3 AdminUser.email — No Database Unique Constraint

| Column | Type | Nullable | Unique Constraint | Index |
|--------|------|----------|-------------------|-------|
| `admin_users.email` | text | NOT NULL | **None confirmed** | **None confirmed** |

The metadata's Foreign Keys and Unique Constraints sections (Section 7 of BRAND_DB_SCHEMA_METADATA) list no entry for `admin_users.email`. The frozen schema's `@unique` is a Prisma Client declaration only, unbacked by the database.

### 3.4 ContactLead Physical Columns

| Column | Type | Nullable |
|--------|------|----------|
| `wechat` | text | YES |

Physical column name is `wechat` (single word, lowercase, no underscore). Frozen schema's `@map("we_chat")` references a column name that does not exist per metadata.

---

## 4. Frozen Schema Behavior

| Model | Field | Frozen Declaration | DB Has Default? |
|-------|-------|-------------------|-----------------|
| `JournalPost` | `id` | `@id @default(cuid())` | ❌ No |
| `JournalPost` | `updatedAt` | `@updatedAt` | ❌ No |
| `PageContent` | `id` | `@id @default(cuid())` | ❌ No |
| `PageContent` | `updatedAt` | `@updatedAt` | ❌ No |
| `AuditLog` | `id` | `@id @default(cuid())` | ❌ No |
| `AdminUser` | `id` | `@id @default(cuid())` | ❌ No |
| `AdminUser` | `email` | `@unique` | ❌ No (no unique constraint) |
| `ContactLead` | `we_chat` | `String? @map("we_chat")` | N/A |

All frozen defaults are Prisma Client-side behaviors. None are backed by database defaults or constraints.

---

## 5. Production Consumer Behavior

| Consumer | Operation | Passes id? | Passes updatedAt? | Relies On |
|----------|-----------|-----------|-------------------|-----------|
| `admin-actions.ts:createJournalPost` | `journalPost.create({ data })` | ❌ No | ❌ No | `@default(cuid())`, `@updatedAt` |
| `admin-actions.ts:updateJournalPost` | `journalPost.update({ where, data })` | N/A | ❌ No | `@updatedAt` |
| `content-actions.ts:upsertPageContent` | `pageContent.create({ data })` | ❌ No | ❌ No | `@default(cuid())`, `@updatedAt` |
| `audit-log.ts:logAction` | `auditLog.create({ data })` | ❌ No | N/A (no updatedAt) | `@default(cuid())` |
| `admin-actions.ts:createAdminUser` | `adminUser.create({ data })` | ❌ No | ❌ No | `@default(cuid())`, `@updatedAt` |
| `auth.ts:authorize` | `adminUser.findUnique({ where: { email } })` | N/A | N/A | `@unique` on email |

---

## 6. Contract Layer Classification

### 6.1 Three-Layer Model

| Layer | Definition | Examples |
|-------|-----------|----------|
| **Database Contract** | What the PostgreSQL database guarantees via constraints, defaults, FKs, types | `text NOT NULL`, `serial PK`, `CURRENT_TIMESTAMP` default |
| **Prisma Client Contract** | What the generated Prisma Client provides at the application layer | `@default(cuid())`, `@updatedAt`, `@unique` (Client-side), `@relation` (query API) |
| **Application Behavior Contract** | What consumer code depends on for correct behavior | Not passing id on create, expecting Prisma to handle timestamps, querying by email |

### 6.2 Classification of Each Contested Declaration

| Declaration | Database | Prisma Client | Application | Can Enter Canonical? |
|-------------|----------|---------------|-------------|---------------------|
| `@default(cuid())` on `JournalPost.id` | No default | Client generates cuid on create | Consumers omit id | ✅ Yes — Prisma Client contract |
| `@updatedAt` on `JournalPost.updatedAt` | No default/trigger | Prisma sets `now()` on create/update | Consumers omit updatedAt | ✅ Yes — Prisma Client contract |
| `@default(cuid())` on `PageContent.id` | No default | Client generates cuid | Consumers omit id | ✅ Yes — Prisma Client contract |
| `@updatedAt` on `PageContent.updatedAt` | No default/trigger | Prisma sets `now()` on create/update | Consumers omit updatedAt | ✅ Yes — Prisma Client contract |
| `@default(cuid())` on `AuditLog.id` | No default | Client generates cuid | Consumers omit id | ✅ Yes — Prisma Client contract |
| `@default(cuid())` on `AdminUser.id` | No default | Client generates cuid | Consumers omit id | ✅ Yes — Prisma Client contract |
| `@unique` on `AdminUser.email` | No unique constraint | Enables `findUnique` API | Auth uses `findUnique` | ❌ **No** — see Section 7 |
| `@map` on `ContactLead.wechat` | Column is `wechat` | Maps Prisma field to DB column | Consumer uses `we_chat` | ✅ Yes — but field name is `wechat` |

### 6.3 Principle: Why `@default(cuid())` and `@updatedAt` CAN Enter Canonical Schema

These declarations:
1. Do not require any DDL or database change
2. Do not change the query API shape (create still returns a record)
3. Are passive — they supply values when missing, they don't alter existing values
4. Are consistent with the frozen schema's longstanding behavior
5. Have zero security impact

### 6.4 Principle: Why `@unique` on `AdminUser.email` CANNOT Enter Canonical Schema

`@unique` is fundamentally different from a default:
1. It changes the query API — enables `findUnique` which promises at-most-one-result
2. It creates a type-level contract that the database does not enforce
3. If duplicate emails exist in production (possible given no DB constraint and no app-level duplicate check), `findUnique` returns the first match silently — masking a security issue
4. It provides a false sense of identity safety during auth

**This distinction is critical.** A relation field (ADR-002) extends the query API in an additive way (enables `include`). A `@unique` declaration constrains the query API in a semantic way (guarantees uniqueness) and changes the contract with consumers. These are not equivalently safe.

---

## 7. AdminUser Email Identity — Risk Analysis

### 7.1 Current Vulnerability

The `createAdminUser` function at `admin-actions.ts:385` does NOT check for duplicate emails:

```typescript
export async function createAdminUser(data: {
  email: string; name: string; password: string; role: string;
}) {
  const hash = await bcrypt.hash(data.password, 10);
  const u = await prisma.adminUser.create({
    data: { email: data.email, name: data.name, passwordHash: hash, role: data.role as any },
  });
  return u;
}
```

Combined with:
- No DB unique constraint on `email`
- Frozen schema's `@unique` only works at Prisma level (Prisma checks before insert — but only if using Prisma)
- Raw SQL or direct DB writes bypass the check entirely

This means duplicate admin accounts with the same email CAN exist. If they do, `findUnique` returns only one (arbitrary first match), which may allow auth as the wrong user.

### 7.2 Security Classification

| Aspect | Classification |
|--------|---------------|
| Current DB state | Unknown — cannot confirm duplicates without reading data (prohibited) |
| Risk severity | 🟡 Medium — potential auth bypass if duplicates exist |
| Mitigation complexity | 🟢 Low — application-level check + `findFirst` change |
| Schema accuracy | 🔴 `@unique` on canonical schema would be inaccurate |

---

## 8. Options Considered

### 8.1 Options for ID Generation (JournalPost, PageContent, AuditLog, AdminUser)

**Option A: Restore `@default(cuid())` in canonical schema.**
- Pro: Consumer-compatible, no DDL change, matches frozen behavior.
- Pro: Single cuid generation algorithm keeps IDs consistent across all write paths.
- Pro: Prisma's cuid generation is well-tested and deterministic.
- Con: cuid is a Prisma-specific algorithm — non-Prisma writes must generate their own.
- **Verdict: RECOMMENDED.**

**Option B: Consumers generate IDs at application layer.**
- Pro: Explicit control over ID format.
- Con: Every consumer must be audited and modified — significant C2 scope increase.
- Con: Multiple consumers might generate incompatible ID formats.
- Con: `crypto.randomUUID()` is the only practical alternative; not meaningfully different from cuid.
- **Verdict: Rejected** — unnecessary scope increase with no security/quality benefit.

**Option C: Database migration to add UUID/auto-generate defaults.**
- Pro: ID generation at database layer.
- Con: Requires DDL migration — prohibited in Phase B/C/D scope.
- Con: Existing `text` columns would need type migration — complex with existing data.
- **Verdict: Rejected** — out of scope, can be reconsidered in Phase G.

### 8.2 Options for updatedAt (JournalPost, PageContent)

**Option A: Use `@updatedAt` in canonical schema.**
- Pro: Consumer-compatible, no DDL change.
- Pro: Prisma handles both create and update timestamps correctly.
- Con: Only works for Prisma writes — raw SQL or direct DB writes won't update the field.
- **Verdict: RECOMMENDED.** The Brand Runtime bounded context uses typed Prisma clients for all current production writes (no raw SQL in apps/brand-os). This is the correct boundary for Prisma Client behavior.

**Option B: Consumers explicitly set timestamps.**
- Pro: Explicit, no Prisma magic.
- Con: Every consumer must be modified. Easy to forget on new consumers.
- Con: Requires consistent access to `new Date()` across all write paths.
- Con: update operations would need to read current time and pass it — error-prone.
- **Verdict: Rejected** — high maintenance burden with no benefit.

**Option C: Database trigger for updated_at.**
- Con: Requires DDL migration — out of scope.
- **Verdict: Rejected** — Phase G consideration.

### 8.3 Options for AdminUser.email

**Option A: Add `@unique` to canonical schema (inaccurate).**
- Pro: Auth consumer compiles with existing `findUnique`.
- Pro: Prisma Client performs application-level unique check on insert.
- Con: **Inaccurate** — database does not enforce uniqueness. Schema would claim a constraint that does not exist.
- Con: If duplicate emails exist in production (possible), `findUnique` silently returns one — could auth as wrong user.
- Con: Creates false sense of security. Developers may rely on DB uniqueness when it doesn't exist.
- **Verdict: REJECTED.** Violates Schema Accuracy principle.

**Option B: No `@unique`; change auth to `findFirst` with fail-closed.**
- Pro: Accurate — schema matches database.
- Pro: Security improvement — explicit duplicate detection and fail-closed behavior.
- Pro: Sets precedent for identity handling across the project.
- Con: Requires changing `auth.ts` — but this is a single file with isolated change.
- **Verdict: RECOMMENDED.**

**Option C: Defer AdminUser migration to separate phase.**
- Pro: Doesn't block other 16 consumers.
- Con: Requires C2 split, adds coordination overhead.
- Con: Leaves current vulnerability unaddressed longer.
- **Verdict: Rejected** — the change is small enough to include in C2.

### 8.4 Options for ContactLead Naming

**Option A: Canonical uses `wechat` (correct physical name). Consumer migrates.**
- Pro: Canonical schema matches database.
- Pro: No `@map` gymnastics.
- Con: Consumer template must change `lead.we_chat` → `lead.wechat`.
- **Verdict: RECOMMENDED.**

**Option B: Canonical uses `we_chat` with `@map("wechat")` for backward compat.**
- Pro: Consumer code doesn't change.
- Con: Physical column name is `wechat`, not `we_chat`. Frozen schema's `@map("we_chat")` was already wrong.
- Con: Perpetuates an inaccurate mapping.
- **Verdict: Rejected** — canonical schema must be accurate.

---

## 9. Decisions A–H

### Decision A: JournalPost.id

**`@default(cuid())` — Canonical schema adds it.**

Rationale: Text PK, no DB default, consumer omits id, frozen schema had `@default(cuid())`. This is a Prisma Client contract, not a database contract.

### Decision B: JournalPost.updatedAt

**`@updatedAt` — Canonical schema adds it.**

Rationale: Timestamp NOT NULL, no DB default, consumer omits updatedAt. Prisma Client manages the field.

### Decision C: PageContent.id

**`@default(cuid())` — Canonical schema adds it.**

Same rationale as Decision A.

### Decision D: PageContent.updatedAt

**`@updatedAt` — Canonical schema adds it.**

Same rationale as Decision B.

### Decision E: AuditLog.id

**`@default(cuid())` — Canonical schema adds it.**

Same rationale as Decision A.

### Decision F: AdminUser.email

**Do NOT add `@unique`. Change auth to use `findFirst` with fail-closed identity handling.**

Full rationale in Section 11. The canonical schema must be accurate. Auth must be secure.

### Decision G: ContactLead API Field

**Canonical schema uses `wechat` (single word, lowercase, no underscore). Consumer changes `lead.we_chat` to `lead.wechat`.**

Rationale: Physical column is `wechat`. Canonical must match physical.

### Decision H: Phase C2 Split

**Do NOT split Phase C2. All consumers migrate together.**

Rationale: The AdminUser auth change is isolated to one file (`auth.ts`) and does not create dependency risk for other consumers. Splitting adds coordination overhead without meaningful risk reduction.

---

## 10. ID Generation Contract

### 10.1 Canonical Schema Declarations

```prisma
model JournalPost {
  id        String   @id @default(cuid())
  updatedAt DateTime @updatedAt @map("updated_at")
  // ...
}

model PageContent {
  id        String   @id @default(cuid())
  updatedAt DateTime @updatedAt @map("updated_at")
  // ...
}

model AuditLog {
  id String @id @default(cuid())
  // ... (no updatedAt field)
}

model AdminUser {
  id        String   @id @default(cuid())
  updatedAt DateTime @updatedAt @map("updated_at")
  // ...
}
```

### 10.2 ID Format Consistency

All ID fields use `cuid()` format, consistent with:
- Historical frozen schema behavior
- Existing database records (all known records use cuid-like text keys)
- Prisma's default ID generation algorithm

### 10.3 Non-Prisma Write Paths

Any non-Prisma write path (raw SQL, direct DB write) must generate its own ID. This is documented via Prisma `///` comments on each `@id` field:

```prisma
/// Client-generated cuid. Non-Prisma writes must generate IDs explicitly.
```

### 10.4 Future Migration Path

If a future phase decides to migrate IDs to database-generated UUIDs, the change path would be:
1. Add a new `uuid` column with DB default `gen_random_uuid()`
2. Backfill existing `id` values as `uuid` migration
3. Swap PK to `uuid`
4. Update Prisma schema

This is explicitly Phase G territory and not required for Phase C.

---

## 11. Timestamp Maintenance Contract

### 11.1 Canonical Schema Declarations

```prisma
model JournalPost {
  updatedAt DateTime @updatedAt @map("updated_at")
  // ...
}

model PageContent {
  updatedAt DateTime @updatedAt @map("updated_at")
  // ...
}

model AdminUser {
  updatedAt DateTime @updatedAt @map("updated_at")
  // ...
}
```

### 11.2 Behavior Specification

| Operation | `@updatedAt` Behavior | DB Behavior |
|-----------|----------------------|-------------|
| `prisma.journalPost.create({ data: {...} })` | Prisma sets `updatedAt = now()` | NOT NULL column satisfied |
| `prisma.journalPost.update({ where: {...}, data: {...} })` | Prisma sets `updatedAt = now()` | NOT NULL column satisfied |
| `prisma.$executeRaw("UPDATE journal_posts SET ...")` | ❌ NOT applied | `updated_at` NOT NULL would fail unless explicitly set |

### 11.3 Boundary

`@updatedAt` is a **Prisma Client contract**. It applies only when writes go through the generated Prisma Client. Raw SQL and direct DB writes must manage `updated_at` explicitly.

### 11.4 AuditLog Exception

`AuditLog` has no `updatedAt` field — it is an append-only audit trail with only `createdAt`.

---

## 12. Admin Identity and Duplicate Handling Contract

### 12.1 Canonical Schema Declaration

```prisma
model AdminUser {
  id           String    @id @default(cuid())
  email        String
  passwordHash String    @map("password_hash")
  name         String
  role         AdminRole
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  @@map("admin_users")
}
```

**No `@unique` on `email`.** The database does not enforce email uniqueness. The schema must reflect this.

### 12.2 Auth Query Change

The consumer at `apps/brand-os/src/lib/auth.ts` line 17 must change from:

```typescript
// ❌ Before: assumes unique constraint exists
const user = await prisma.adminUser.findUnique({
  where: { email: credentials.email },
});
```

To:

```typescript
// ✅ After: explicit identity resolution with fail-closed
const users = await brandDb.adminUser.findMany({
  where: { email: credentials.email },
  take: 2,  // only need 2 to detect duplicates
});

if (users.length === 0) return null;          // No user — reject
if (users.length > 1) {
  // Duplicate emails detected — fail closed and audit
  console.error(`Duplicate admin users found for email: ${credentials.email}`);
  // Option: log security event
  return null;  // Fail closed — do not authenticate
}

const user = users[0];  // Exactly one — safe to authenticate
```

### 12.3 Duplicate Email Prevention on Create

The consumer at `admin-actions.ts:385` must add a pre-creation check:

```typescript
// Check for existing email before creating
const existing = await brandDb.adminUser.findFirst({
  where: { email: data.email },
});
if (existing) {
  throw new Error(`Admin user with email ${data.email} already exists`);
}
```

### 12.4 Security Semantics

| Scenario | `findUnique` (old) | `findFirst` + fail-closed (new) |
|----------|-------------------|--------------------------------|
| 0 users, email matches | Returns `null` → reject | Returns `null` → reject ✅ Same |
| 1 user, email matches | Returns user → authenticate | Returns user → authenticate ✅ Same |
| 2+ users, email matches | Returns first → might auth wrong user | Detects duplicates → fail closed ❌ Rejects |
| Raw SQL insert bypasses Prisma | No unique check | No unique check (same vulnerability) ⚠️ |
| Prisma creates with existing email | Prisma Client blocks (application-level unique check) | App-level pre-check blocks ⚠️ |

**Improvement over current state:** The new approach fails closed on duplicates (the old approach silently returns one). The pre-creation check partially mitigates the lack of DB constraint. The remaining vulnerability (raw SQL bypassing both checks) requires a DB-level unique constraint — which is a Phase G concern.

### 12.5 Why Not Database Unique Constraint Now

Adding a `UNIQUE` constraint to `admin_users.email` would require:
1. A read-only data audit to confirm no existing duplicates (cannot be done without DB read — prohibited)
2. A DDL migration (`CREATE UNIQUE INDEX CONCURRENTLY ...` or `ALTER TABLE ... ADD CONSTRAINT`)
3. Error handling for any duplicate discovered during migration

This is properly scoped to Phase G (data migration and cleanup), not Phase C (consumer migration).

---

## 13. ContactLead Naming Contract

### 13.1 Canonical Schema Declaration

```prisma
model ContactLead {
  // ...
  /// Physical column: wechat. Application-level field name matches DB column.
  wechat String?
  // ...
}
```

### 13.2 Consumer Migration

The template at `apps/brand-os/src/app/admin/leads/page.tsx:40` must change:

```tsx
{/* Before */}
<td>{lead.we_chat || '-'}</td>

{/* After */}
<td>{lead.wechat || '-'}</td>
```

### 13.3 Naming Principle

**Prisma model fields use camelCase for single-concept names.** The physical column `wechat` (single concept, no underscore) becomes the Prisma field `wechat` (camelCase). No `@map` is needed when the camelCase representation matches the lowercase physical name.

For multi-word physical names with underscores, `@map` is required:
```prisma
interestedCategory String? @map("interested_category")
```

---

## 14. Canonical Schema Accuracy Rules

### 14.1 Adopted Principles

| Rule | Applies To | Source |
|------|-----------|--------|
| `@map` / `@@map` must match physical names exactly | All models | ADR-003 |
| `@unique` requires database unique constraint | All fields | ADR-003 |
| `@default(cuid())` is valid without DB default | Text PK with no DB default | ADR-003 |
| `@updatedAt` is valid without DB trigger | NOT NULL timestamp without DB default | ADR-003 |
| `@relation` does not require DB FK | Join tables with known column relationships | ADR-002 |
| `onDelete: Cascade` requires DB FK | Must not use when no FK exists | ADR-002 |

### 14.2 Rationale for Asymmetric Treatment

The key distinction is **what each declaration promises to consumers**:

| Declaration | Consumer Promise | Risk if Inaccurate |
|------------|-----------------|-------------------|
| `@default(cuid())` | "You can omit `id` on create" | 🟢 Low — create still succeeds, Prisma generates ID |
| `@updatedAt` | "You can omit `updatedAt`" | 🟢 Low — Prisma sets current time |
| `@relation` | "You can `include` related models" | 🟡 Medium — query works but referential integrity is app-level |
| `@unique` | "At most one record matches this value" | 🔴 High — `findUnique` silently returns first match on duplicates |

`@unique` is uniquely risky because it changes the **query semantic** from "find records matching" to "find exactly one record matching." When the database doesn't enforce this, the consumer has a false guarantee.

### 14.3 Contract Guard Enforcement

The Contract Guard enforces these rules statically:

| Rule | Guard Check |
|------|-------------|
| `@map` accuracy | Manual review during Phase C1/C2 (automated in Phase D) |
| `@unique` accuracy | Only permitted if database constraint proven in metadata |
| `@default(cuid())` | Permitted on text PK fields without DB default |
| `@updatedAt` | Permitted on NOT NULL timestamp fields without DB default |
| `@relation` without FK | Must have `onDelete: NoAction` and comment referencing ADR-002 |

---

## 15. Application-Layer Responsibilities

### 15.1 What Consumers Must Do

| Responsibility | Consumer | Implementation |
|---------------|----------|----------------|
| Handle non-unique email auth | `auth.ts` | `findFirst` + duplicate detection (Section 12.2) |
| Check email uniqueness before create | `admin-actions.ts:createAdminUser` | `findFirst` pre-check (Section 12.3) |
| Update field name | `leads/page.tsx` | `we_chat` → `wechat` |
| Not pass `id` on create | All consumers | Already not passing — canonical schema handles via `@default(cuid())` |
| Not pass `updatedAt` on create/update | journalPost, pageContent consumers | Already not passing — canonical schema handles via `@updatedAt` |

### 15.2 What Consumers Must NOT Do

| Prohibition | Reason |
|-------------|--------|
| ❌ Not import from `@prisma/brand-client` directly | Must use adapter → canonical |
| ❌ Not pass `id` as cuid manually | Let Prisma generate it |
| ❌ Not pass `updatedAt` manually | Let Prisma manage it |
| ❌ Not assume `@unique` on `admin_users.email` | Database does not enforce |
| ❌ Not use `findUnique({ where: { email } })` | Requires `@unique` — use `findFirst` |

---

## 16. Adapter Boundary

The adapter (`apps/brand-os/src/lib/brand-db-adapter.ts`) remains a **thin re-export layer**. It does NOT:

| Responsibility | Adapter? | Handled By |
|---------------|----------|------------|
| ID generation | ❌ | Canonical schema `@default(cuid())` |
| Timestamp maintenance | ❌ | Canonical schema `@updatedAt` |
| Auth identity resolution | ❌ | Application code (`auth.ts` — direct change) |
| Field name translation | ❌ | Consumer code change |
| Prisma delegate simulation | ❌ | Canonical schema relations |

---

## 17. Contract Guard Impact

### 17.1 Static Contract Guard Rules (Schema-Level)

| Rule | Target | Phase |
|------|--------|-------|
| `JournalPost.id` has `@default(cuid())` | Canonical schema | C1 ✅ (already exists or will be added via this ADR) |
| `JournalPost.updatedAt` has `@updatedAt` | Canonical schema | C1 ✅ |
| `PageContent.id` has `@default(cuid())` | Canonical schema | C1 ✅ |
| `PageContent.updatedAt` has `@updatedAt` | Canonical schema | C1 ✅ |
| `AuditLog.id` has `@default(cuid())` | Canonical schema | C1 ✅ |
| `AdminUser.id` has `@default(cuid())` | Canonical schema | C1 ✅ |
| `AdminUser.email` does NOT have `@unique` | Canonical schema | C1 ✅ |
| `ContactLead.wechat` maps to physical `wechat` | Canonical schema | C1 ✅ |

### 17.2 Application Behavior Guard (Test-Level)

| Guard | What It Checks | Phase |
|-------|---------------|-------|
| Auth handles duplicate emails | Integration test: create 2 users with same email, auth should fail | C2 |
| AdminUser create checks duplicates | Integration test: create user with existing email should error | C2 |
| No `findUnique` by email | Static code search: `adminUser.findUnique` should not exist in brand-os | C2 |

---

## 18. Test Requirements

| Test | Scope | Phase |
|------|-------|-------|
| Schema validation | `prisma validate` on canonical schema | C1 ✅ |
| Client generation | `prisma generate` succeeds with new defaults | C1 ✅ |
| Canonical typecheck | `pnpm --filter @yunwu/brand-db typecheck` | C1 ✅ |
| Brand OS typecheck | `pnpm --filter @yunwu/brand-os typecheck` with adapter | C2 |
| Brand OS build | `pnpm --filter @yunwu/brand-os build` | C2 |
| Auth unit test | Auth rejects 0, authenticates 1, fails closed on 2+ | C2 |
| AdminUser create test | Duplicate email pre-check works | C2 |
| Contract Guard | New rules pass | C1 ✅ |
| No `@unique` on email | Guard rule verifies | C1 ✅ |
| No `findUnique` by email | Static search confirms | C2 |

---

## 19. Phase C2 Execution Plan

### 19.1 Canonical Schema Changes (C1 — already done or added)

The following changes to `packages/brand-db/schema.prisma` are required. Some may already exist from C1; this ADR confirms the final set:

| Model | Field | Final Declaration |
|-------|-------|-------------------|
| `AdminUser` | `id` | `String @id @default(cuid())` |
| `AdminUser` | `email` | `String` (no `@unique`) |
| `AdminUser` | `updatedAt` | `DateTime @updatedAt @map("updated_at")` |
| `JournalPost` | `id` | `String @id @default(cuid())` |
| `JournalPost` | `updatedAt` | `DateTime @updatedAt @map("updated_at")` |
| `PageContent` | `id` | `String @id @default(cuid())` |
| `PageContent` | `updatedAt` | `DateTime @updatedAt @map("updated_at")` |
| `AuditLog` | `id` | `String @id @default(cuid())` |
| `ContactLead` | `wechat` | `String?` (no `@map` needed — matches physical) |

### 19.2 Consumer Changes (C2 — all 17 files)

| # | File | Change | Risk |
|---|------|--------|------|
| 1 | `src/lib/auth.ts` | `findUnique({ where: { email } })` → `findFirst()` with duplicate detection | 🟡 P1 |
| 2 | `src/lib/actions/admin-actions.ts` | Add email duplicate check in `createAdminUser`; import adapter | 🟡 P1 |
| 3 | `src/lib/actions/admin-actions.ts` | Model renames (product→legacyBrandProduct, series→legacyBrandSeries, material→legacyBrandMaterial) | 🟢 Low |
| 4 | `src/lib/actions/tag-actions.ts` | Import adapter, model rename journalTag→legacyJournalTag | 🟢 Low |
| 5 | `src/lib/actions/audit-actions.ts` | Import adapter | 🟢 Low |
| 6 | `src/lib/actions/content-actions.ts` | Import adapter | 🟢 Low |
| 7 | `src/lib/audit-log.ts` | Import adapter | 🟢 Low |
| 8 | `src/app/api/products/route.ts` | Import adapter, model rename | 🟢 Low |
| 9 | `src/app/api/series/route.ts` | Import adapter, model rename | 🟢 Low |
| 10 | `src/app/api/posts/route.ts` | Import adapter | 🟢 Low |
| 11 | `src/app/api/materials/route.ts` | Import adapter, model rename | 🟢 Low |
| 12 | `src/app/api/media/route.ts` | Import adapter | 🟢 Low |
| 13 | `src/app/api/contact/route.ts` | Import adapter | 🟢 Low |
| 14 | `src/app/api/site-settings/route.ts` | Import adapter | 🟢 Low |
| 15 | `src/app/admin/journal/[id]/page.tsx` | Import adapter | 🟢 Low |
| 16 | `src/app/admin/leads/page.tsx` | Import adapter; `we_chat` → `wechat` | 🟢 Low |
| 17 | `src/app/admin/page.tsx` | Import adapter; model renames | 🟢 Low |
| 18 | `src/app/admin/tags/page.tsx` | Import adapter + enum from `@yunwu/brand-db` | 🟢 Low |

### 19.3 Change Isolation

The auth change (`auth.ts`) is isolated from all other consumers:
- Auth is imported by `auth-helpers.ts` and `middleware.ts` (not Prisma consumers)
- Auth does not share types or query results with other consumers
- Auth change can be verified independently

All other consumer changes are import path changes only (no query logic changes).

### 19.4 Not in C2 Scope

| Item | Phase |
|------|-------|
| Delete frozen `apps/brand-os/prisma/schema.prisma` | H |
| Delete `@prisma/brand-client` generated output | H |
| Remove `postinstall: npx prisma generate` | C4 |
| Remove unused deps (`@yunwu/db`, `pg`, `@prisma/client`, `prisma`) | C4 |

---

## 20. Database Migration Impact

### 20.1 Required Now

**Zero DDL changes are required for Phase C2.** All decisions in this ADR are:
- Canonical schema `.prisma` declaration changes (no DDL)
- Application code changes (no DDL)

### 20.2 Deferred Database Governance

The following database changes are identified as desirable but deferred:

| Item | Priority | Reason Deferred | Phase |
|------|----------|----------------|-------|
| `UNIQUE` constraint on `admin_users.email` | 🟡 Medium | Requires data audit to confirm no existing duplicates | G |
| Index on `admin_users.email` | 🟢 Low | Not confirmed missing; `findFirst` works without index | G |
| `updated_at` DB default/trigger | 🟢 Low | Not needed — Prisma `@updatedAt` is sufficient | Never (if all writes go through Prisma) |
| Migrate `text` PK to `uuid` with DB default | 🟢 Low | cuid works; no performance issue reported | G |

---

## 21. Security Impact

| Concern | Before | After | Improvement |
|---------|--------|-------|-------------|
| Auth with duplicate emails | `findUnique` silently returns first | `findFirst` + duplicate detection → fail closed | ✅ |
| AdminUser creation with existing email | No check — creates duplicate | Pre-creation check → throws error | ✅ |
| Schema accuracy on email uniqueness | Frozen claims `@unique` (false) | Canonical declares no constraint (true) | ✅ |
| Raw SQL duplicate email insert | No protection (no DB constraint) | Same — Phase G concern | ⚠️ Unchanged |

---

## 22. Rollback Plan

| Phase | Rollback Action | Side Effects |
|-------|----------------|--------------|
| Pre-C2 | `git stash` or revert individual files | None |
| After C2 auth change | `git revert` auth.ts change | Auth reverts to `findUnique` — but canonical schema has no `@unique`. Must also revert schema change. |
| Full C2 rollback | `git revert <C2-commit>` | All consumers revert to frozen schema. Adapter remains. |
| Recovery | `pnpm install && pnpm --filter @yunwu/brand-db prisma:generate && pnpm build` | Restores working state with frozen schema |

**Safety guarantee:** No database mutations occur at any point in C2. Rollback is a pure code revert.

---

## 23. Consequences

### Positive

1. **Phase C2 unblocked** — all 5 schema gaps resolved with clear decisions.
2. **Improved security** — Auth now fails closed on duplicate emails; AdminUser creation checks for duplicates.
3. **Schema accuracy** — No `@unique` declared without DB constraint. `@default(cuid())` and `@updatedAt` are correctly classified as Prisma Client contracts.
4. **Consumer compatibility** — All 17 production consumers work after migration without query restructuring.
5. **Single C2 phase** — Auth change is small enough to include; no split needed.

### Negative

1. **Prisma-only guarantees** — `@default(cuid())`, `@updatedAt`, and relation fields only work when writes go through the Prisma Client. Raw SQL paths must manage these manually.
2. **No DB-level unique email enforcement** — Remaining vulnerability for non-Prisma write paths. Documented as Phase G concern.

---

## 24. Non-Goals

| Non-Goal | Reason |
|----------|--------|
| Adding DB unique constraint on `admin_users.email` | Phase G — requires data audit |
| Adding DB trigger for `updated_at` | Not needed — Prisma handles it |
| Migrating `text` PK to `uuid` | Not needed — cuid works |
| Changing Auth to use third-party identity provider | Out of scope |
| Audit of existing email duplicates in production | Requires reading production data — prohibited in Phase C |
| Migration of Publisher, apps/platform, or storefront | Separate phases |
| Database DDL of any kind | No DB changes in Phase C scope |

---

## Appendix A: Canonical Schema Changes Summary

| Model | Field | Before (Canonical) | After (ADR-003) | Consumer Impact |
|-------|-------|-------------------|----------------|-----------------|
| `JournalPost` | `id` | `String @id` | `String @id @default(cuid())` | Consumer can omit id ✅ |
| `JournalPost` | `updatedAt` | `DateTime @map("updated_at")` | `DateTime @updatedAt @map("updated_at")` | Consumer can omit updatedAt ✅ |
| `PageContent` | `id` | `String @id` | `String @id @default(cuid())` | Consumer can omit id ✅ |
| `PageContent` | `updatedAt` | `DateTime @map("updated_at")` | `DateTime @updatedAt @map("updated_at")` | Consumer can omit updatedAt ✅ |
| `AuditLog` | `id` | `String @id` | `String @id @default(cuid())` | Consumer can omit id ✅ |
| `AdminUser` | `id` | `String @id` | `String @id @default(cuid())` | Consumer can omit id ✅ |
| `AdminUser` | `email` | `String` (no `@unique`) | `String` (no `@unique`) | Auth must use `findFirst` |
| `AdminUser` | `updatedAt` | `DateTime @map("updated_at")` | `DateTime @updatedAt @map("updated_at")` | Consumer can omit updatedAt ✅ |
| `ContactLead` | `wechat` | `String?` | `String?` (no change) | Consumer must use `wechat` not `we_chat` |

## Appendix B: Decision Matrix

| Decision | Chosen Option | Rationale |
|----------|--------------|-----------|
| A: JournalPost.id | `@default(cuid())` | Consumer-compatible, no DDL |
| B: JournalPost.updatedAt | `@updatedAt` | Consumer-compatible, no DDL |
| C: PageContent.id | `@default(cuid())` | Same as A |
| D: PageContent.updatedAt | `@updatedAt` | Same as B |
| E: AuditLog.id | `@default(cuid())` | Same as A |
| F: AdminUser.email | No `@unique`; auth uses `findFirst` | Schema accuracy + security |
| G: ContactLead field | `wechat` (physical name) | Schema accuracy |
| H: C2 split | No split | Auth change is isolated and small |
