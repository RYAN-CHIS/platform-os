# ADR-001: Brand Runtime Publish Status Ownership and Runtime Contract

**Status:** ACCEPTED

**Date:** 2026-07-12

**Author:** Phase B pre-implementation audit

**Approved by:** Pending — no deployment change, architecture decision only

---

## 1. Status

ACCEPTED — See Section 17 for Phase B unblock criteria.

---

## 2. Context

The Platform OS monorepo contains four bounded contexts sharing two databases. The Brand Runtime bounded context (Brand DB, Singapore) uses a dual status system for products that has never been formally defined. Three competing `PublishStatus` definitions exist across the repository:

| Source | Values | Authority |
|--------|--------|-----------|
| PostgreSQL enum `PublishStatus` (Brand DB) | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED (6) | **AUTHORITATIVE** — live database metadata |
| Publisher state machine (code) | DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED (7) | Code-only — writes to text CHECK columns |
| Frozen Prisma schemas | DRAFT, PUBLISHED (2) | Stale — Phase H deletion target |

Phase B (creation of `@yunwu/brand-db`) requires a single, authoritative publish-status contract before the canonical Prisma schema can be designed and implemented.

This ADR resolves the conflict by establishing:
- Which values are persistence states (stored in DB)
- Which values are workflow-only (transient, never stored directly in PublishStatus enum columns)
- Which values are API aliases (mapped at application layer)
- Which status field each entity uses
- How the Publisher state machine maps to persistence

---

## 3. Database Facts

Source: `docs/db-metadata/brand-db-schema-metadata-2026-07-11.json`, collected from Brand Runtime PostgreSQL via read-only session (`brand_app` role, `default_transaction_read_only = on`).

### 3.1 PostgreSQL Enum: PublishStatus

```sql
CREATE TYPE "PublishStatus" AS ENUM (
  'DRAFT',         -- Order: 1
  'PENDING_REVIEW', -- Order: 2
  'APPROVED',       -- Order: 3
  'PUBLISHED',      -- Order: 4
  'UNPUBLISHED',    -- Order: 5
  'ARCHIVED'        -- Order: 6
);
```

Used by: `products.publish_status`, `journal_posts.status`.

### 3.2 Status Columns

| Table | Column | PostgreSQL Type | Nullable | Default | Constraint |
|-------|--------|----------------|----------|---------|------------|
| `products` | `status` | text | NOT NULL | `'draft'` (lowercase) | CHECK: DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED |
| `products` | `publish_status` | PublishStatus (enum) | NOT NULL | `'DRAFT'::PublishStatus` | Enum type (6 values) |
| `series` | `status` | varchar(20) | YES | `'DRAFT'` | CHECK: same 7 values as products.status |
| `journal_posts` | `status` | PublishStatus (enum) | NOT NULL | `'DRAFT'::PublishStatus` | Enum type (6 values) |
| `banners` | `status` | varchar(20) | YES | `'DRAFT'` | None (free text) |
| `publish_jobs` | `status` | varchar(20) | YES | `'pending'` | None (free text) |
| `content_versions` | `status` | varchar(20) | YES | `'PUBLISHED'` | None (free text) |
| `seo_snapshots` | (no status field) | — | — | — | — |
| `page_contents` | (no status field — uses `published` boolean) | boolean | NOT NULL | `true` | — |

### 3.3 CHECK Constraint Values: products.status / series.status

Values accepted by CHECK constraint: `DRAFT`, `IN_REVIEW`, `APPROVED`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`, `REJECTED`.

Note: `products.status` default is lowercase `'draft'` — the CHECK constraint accepts uppercase, and code normalizes via `.toUpperCase()`.

### 3.4 Frozen Schema PublishStatus (Stale — Do Not Use)

```prisma
enum PublishStatus {
  DRAFT
  PUBLISHED
}
```

This is missing PENDING_REVIEW, APPROVED, UNPUBLISHED, and ARCHIVED. It does not reflect production reality and must not be used in the canonical `@yunwu/brand-db` schema.

---

## 4. Problem

### 4.1 Dual Status System on `products`

The `products` table has two independent status columns that are **not synchronized**:

```
products.status (text, CHECK: 7 values)
  ── Written by Publisher state machine
  ── Contains workflow states: DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED
  ── Default: 'draft' (lowercase)

products.publish_status (PublishStatus enum, 6 values)
  ── Written directly by product CRUD actions
  ── Contains canonical publish states: DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED
  ── Default: 'DRAFT' (uppercase)
```

No mechanism keeps these two columns in sync. The Publisher never writes to `publish_status`. The product actions write to `publish_status` via typed SQL casts but also have code that reads and writes `status`.

### 4.2 Publisher Journal CAST Failure Risk

The Publisher's `transitionStatus()` function performs:

```typescript
if (contentType === "journal") {
  await brandPrisma.$executeRawUnsafe(
    `UPDATE ${table} SET status = CAST($1 AS "PublishStatus"), ...`,
    newStatus, isPublishing, liveContentId
  );
}
```

`newStatus` can be `IN_REVIEW`, `SCHEDULED`, or `REJECTED` (from `VALID_TRANSITIONS`). These values are **not members** of the PostgreSQL `PublishStatus` enum. The CAST would fail at the database level with a runtime error.

Whether this code path has been exercised in production is unknown, but the code is written and present on `main`.

### 4.3 Three Competing Definitions

| Source | Values | Used For |
|--------|--------|----------|
| PostgreSQL enum | 6 values | Physical storage |
| Publisher state machine | 7 values (adds IN_REVIEW, SCHEDULED, REJECTED) | Workflow transitions |
| Product actions `PUBLISH_STATUS_ALIASES` | Maps IN_REVIEW→PENDING_REVIEW, SCHEDULED→APPROVED | API/UI compatibility layer |

### 4.4 No Single Source of Truth for Brand Runtime Status

Phase B requires a canonical schema for `@yunwu/brand-db`. Without resolving which values are persistence states vs. workflow states, the Prisma schema cannot be correctly modeled.

---

## 5. Considered Options

### Option 1: Add IN_REVIEW, SCHEDULED, REJECTED to PostgreSQL PublishStatus enum

- **Pro:** Eliminates the CAST mismatch; Publisher values match database values
- **Con:** Requires a database migration (ALTER TYPE ... ADD VALUE) — prohibited in Phase B
- **Con:** Blurs the distinction between workflow state and publish state
- **Con:** `SCHEDULED` is not a publish status — it's a scheduling state better handled by `publish_jobs`
- **Con:** `REJECTED` is a review outcome, not a terminal publish state
- **Verdict:** Rejected — database migration not justified; workflow states should not be persistence states

### Option 2: Normalize to 6-value PublishStatus, Map Workflow States at Application Layer

- **Pro:** No database migration required; PublishStatus enum is already correct
- **Pro:** Publisher workflow states become transient application concepts
- **Pro:** `products.status` (text) continues to hold workflow states; `products.publish_status` (enum) holds canonical state
- **Con:** Dual status system remains — two columns, two owners
- **Con:** Publisher must be fixed to not CAST non-enum values for journals
- **Verdict:** **Recommended** — pragmatically matches the existing database

### Option 3: Eliminate `products.status`, Keep Only `products.publish_status`

- **Pro:** Single status column simplifies the model
- **Con:** Requires migrating the CHECK constraint and all existing data — database migration
- **Con:** Publisher's 7-state workflow must be adapted to 6 persistence states; transient states need alternate storage
- **Con:** No production evidence that this would improve anything — the dual system serves different purposes
- **Verdict:** Rejected — future consideration after all consumers migrate to `@yunwu/brand-db`

### Option 4: One Universal Status Model Across All Entities

- **Pro:** Simplifies the Publisher (no per-entity branching)
- **Con:** Database facts contradict this — different entities use different types (text, varchar, enum)
- **Con:** `banners.status` is free varchar with no constraints
- **Con:** `publish_jobs.status` has its own lifecycle (pending/published/failed/cancelled)
- **Verdict:** Rejected — cannot force a universal model on heterogeneous database types

---

## 6. Decision

**Adopt Option 2: Canonical 6-value PublishStatus PostgreSQL enum, with workflow states mapped at the application layer.**

### Decision Rationale

1. **Database authority:** The live PostgreSQL `PublishStatus` enum (6 values) is the single source of truth for persistence. Code definitions that disagree are wrong by definition.

2. **No migration required:** All six values already exist in the database enum. The decision requires zero DDL changes.

3. **Semantic clarity:** Workflow states (IN_REVIEW, SCHEDULED, REJECTED) are transient process states. Publish states (DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED) are content lifecycle states. They serve different purposes and should not share the same type.

4. **Existing patterns validated:** The `PUBLISH_STATUS_ALIASES` map in `apps/platform/modules/brand/products/actions.ts` already implements this mapping. The decision formalizes an existing pattern.

5. **Phase B unblocked:** The canonical Prisma schema can be modeled against the 6-value enum immediately. No external dependency.

### What This Means

- `IN_REVIEW` is **not** a database state — it is a workflow action that maps to `PENDING_REVIEW` for persistence
- `SCHEDULED` is **not** a database state — it is a workflow action that maps to `APPROVED` for persistence; the actual schedule is stored in `publish_jobs`
- `REJECTED` is **not** a database state — it is a workflow action that stays in `products.status` (text) only; it has no `publish_status` mapping
- `PENDING_REVIEW` and `UNPUBLISHED` are persistence states that exist in the enum but may be surfaced to users as "In Review" and "Unpublished"

---

## 7. Persistence Model

### 7.1 Canonical Persistence Lifecycle

```
                    ┌─────────────┐
                    │   DRAFT     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │PENDING_REVIEW│
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  APPROVED   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  PUBLISHED  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼─────┐ ┌───▼────┐ ┌────▼─────┐
       │ UNPUBLISHED │ │ DRAFT  │ │ ARCHIVED │
       └─────────────┘ └────────┘ └──────────┘
```

### 7.2 Persistence State Definitions

| State | Type | Meaning | Is Terminal | Can Be Default |
|-------|------|---------|-------------|----------------|
| DRAFT | enum value | Content being created, not yet ready for review | No | Yes (default for products.publish_status, journal_posts.status) |
| PENDING_REVIEW | enum value | Content submitted for review, awaiting approval | No | No |
| APPROVED | enum value | Content approved, ready for publication | No | No |
| PUBLISHED | enum value | Content publicly visible | No (can unpublish or archive) | No |
| UNPUBLISHED | enum value | Content was published then taken down | No (can go back to DRAFT) | No |
| ARCHIVED | enum value | Content permanently withdrawn | Yes | No |

### 7.3 Non-Persistence States (For Reference)

The following are **not** members of the canonical persistence model:

| "State" | Domain | Where It Lives | Why Not Persistence |
|---------|--------|----------------|---------------------|
| IN_REVIEW | Workflow | `products.status` text column only | Transient review state; maps to PENDING_REVIEW for publish_status |
| SCHEDULED | Workflow | `products.status` text column only + `publish_jobs` row | Scheduling is about timing, not publish state; maps to APPROVED for publish_status |
| REJECTED | Workflow | `products.status` text column only | Review outcome, not a publish position; no valid PublishStatus mapping |
| pending | PublishJob lifecycle | `publish_jobs.status` free text | Part of scheduling pipeline, not content status |
| failed | PublishJob lifecycle | `publish_jobs.status` free text | Pipeline error state |
| cancelled | PublishJob lifecycle | `publish_jobs.status` free text | Manual cancellation |

---

## 8. Workflow Model

### 8.1 Publisher State Machine (Current, to be preserved)

The Publisher's 7-state transition table is a **workflow model**, not a persistence model. It lives entirely in application code (`apps/platform/lib/publisher.ts`).

```
                    ┌─────────────┐
                    │   DRAFT     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  IN_REVIEW  │◄────────── REJECTED
                    └──────┬──────┘                 ▲
                           │                        │
                    ┌──────▼──────┐                  │
                    │  APPROVED   │──────────────────┘
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  SCHEDULED  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  PUBLISHED  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼─────┐ ┌───▼────┐ ┌────▼─────┐
       │ UNPUBLISHED │ │ DRAFT  │ │ ARCHIVED │
       └─────────────┘ └────────┘ └──────────┘
```

### 8.2 Workflow-to-Persistence Mapping

| Workflow State | Maps To Persistence | Mechanism | Notes |
|---------------|-------------------|-----------|-------|
| DRAFT | DRAFT | Direct 1:1 | Same value in both models |
| IN_REVIEW | PENDING_REVIEW | `PUBLISH_STATUS_ALIASES` map | IN_REVIEW is the workflow action name; PENDING_REVIEW is the stored enum value |
| APPROVED | APPROVED | Direct 1:1 | Same value in both models |
| SCHEDULED | APPROVED | `PUBLISH_STATUS_ALIASES` map | Content status remains APPROVED while scheduled; `publish_jobs` holds the timing |
| PUBLISHED | PUBLISHED | Direct 1:1 | Same value in both models |
| (n/a) | UNPUBLISHED | Direct 1:1 | UNPUBLISHED is a persistence-only state; reached via unpublish action which goes to DRAFT in workflow |
| ARCHIVED | ARCHIVED | Direct 1:1 | Same value in both models |
| REJECTED | (no mapping) | Stays in `products.status` text column only | REJECTED has no PublishStatus enum representation. The text status column retains it, but publish_status is not changed by rejection. |

### 8.3 State Transition Validation (Publisher `VALID_TRANSITIONS`)

The existing 7-state transition table is **accepted as-is** for the workflow model:

```
DRAFT     → IN_REVIEW, PUBLISHED, ARCHIVED
IN_REVIEW → APPROVED, REJECTED, DRAFT
APPROVED  → SCHEDULED, PUBLISHED, REJECTED, DRAFT
SCHEDULED → PUBLISHED, APPROVED, DRAFT
PUBLISHED → ARCHIVED, DRAFT
ARCHIVED  → DRAFT, IN_REVIEW
REJECTED  → DRAFT, IN_REVIEW
```

These transitions apply to all content types at the workflow level. Entity-specific restrictions may be added in Phase D/E.

---

## 9. Entity-Specific Contracts

### 9.1 Product

| Attribute | Detail |
|-----------|--------|
| **Owner** | Brand Runtime |
| **Persistence status type (publish_status)** | `PublishStatus` enum (6 values) |
| **Workflow status type (status)** | `String` (text), CHECK: 7 workflow values |
| **Workflow state owner** | Publisher (`transitionStatus`) writes to `status`; Product CRUD actions write to `publish_status` |
| **Allowed persistence values** | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED |
| **Allowed workflow values** | DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED |
| **Publisher controls** | Writes to `status` column (text). Does NOT write to `publish_status`. |
| **Contract Guard validates** | Both columns exist; `publish_status` uses PublishStatus enum; `status` is text with documented CHECK values |
| **Dual-status sync** | Not enforced. Application code (`PUBLISH_STATUS_ALIASES`) maps workflow to persistence when explicitly writing `publish_status`. |

### 9.2 Series

| Attribute | Detail |
|-----------|--------|
| **Owner** | Brand Runtime |
| **Persistence status type** | `varchar(20)` with CHECK constraint (7 workflow values) |
| **Workflow state owner** | Publisher only |
| **Allowed values** | DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED |
| **Publisher controls** | Yes — writes via `UPDATE series SET status = $1` |
| **Contract Guard validates** | `series.status` is string, NOT PublishStatus enum |
| **Notes** | series has no `publish_status` column. It uses only the generic status field. |

### 9.3 JournalPost

| Attribute | Detail |
|-----------|--------|
| **Owner** | Brand Runtime |
| **Persistence status type** | `PublishStatus` enum (6 values) |
| **Workflow state owner** | Publisher, but `transitionStatus` MUST NOT CAST non-enum values |
| **Allowed persistence values** | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED |
| **Workflow transitions** | Same 7-state table, but IN_REVIEW/SCHEDULED/REJECTED cannot be CAST directly |
| **Publisher controls** | Writes to `status` column via `CAST($1 AS "PublishStatus")` — CURRENTLY BROKEN for IN_REVIEW/SCHEDULED/REJECTED |
| **Contract Guard validates** | `journal_posts.status` uses PublishStatus enum |
| **Critical fix needed** | Publisher must map workflow states to persistence values before CAST, OR journal actions must bypass publisher for workflow states |

### 9.4 Banner

| Attribute | Detail |
|-----------|--------|
| **Owner** | Brand Runtime |
| **Persistence status type** | `varchar(20)` free text (no CHECK, no enum) |
| **Allowed values** | Any string. Code uses DRAFT and PUBLISHED. Publisher writes full workflow set. |
| **Publisher controls** | Yes — writes via `UPDATE banners SET status = $1` (no CAST) |
| **Contract Guard validates** | `banners.status` is string, NOT PublishStatus enum |
| **Notes** | banners.status has no database-level constraints. Code convention only. |

### 9.5 PublishJob

| Attribute | Detail |
|-----------|--------|
| **Owner** | Publisher (internal pipeline) |
| **Persistence status type** | `varchar(20)` free text |
| **Allowed values** | `pending`, `published`, `failed`, `cancelled` (code convention) |
| **Workflow state owner** | N/A — PublishJobs have no complex workflow; they are schedule records |
| **Publisher controls** | Owns the full lifecycle: INSERT (pending) → UPDATE (published/failed/cancelled) |
| **Contract Guard validates** | `publish_jobs.status` is string, NOT PublishStatus enum |

### 9.6 ContentVersion

| Attribute | Detail |
|-----------|--------|
| **Owner** | Publisher (internal) |
| **Persistence status type** | `varchar(20)` free text |
| **Allowed values** | `PUBLISHED` (code convention — reflects the content's state at snapshot time) |
| **Workflow state owner** | N/A |
| **Publisher controls** | Owns full lifecycle |
| **Contract Guard validates** | `content_versions.status` is string, NOT PublishStatus enum |

---

## 10. Publisher Mapping

### 10.1 Current Publisher Code Audit

`apps/platform/lib/publisher.ts` — Function: `transitionStatus()`

```typescript
// Lines 44-52: Shared transition table (VALID_TRANSITIONS)
// Line 68-74: Content type → table mapping
// Line 256-259: Journal branch — DOES CAST($1 AS "PublishStatus")
// Line 261-266: Non-journal branch — SET status = $1 (no cast)
```

### 10.2 Identified Issues

| Issue | Entity | Severity | Description |
|-------|--------|----------|-------------|
| CAST failure for IN_REVIEW | JournalPost | 🔴 P0 | `CAST('IN_REVIEW' AS "PublishStatus")` fails — IN_REVIEW not in enum |
| CAST failure for SCHEDULED | JournalPost | 🔴 P0 | `CAST('SCHEDULED' AS "PublishStatus")` fails — SCHEDULED not in enum |
| CAST failure for REJECTED | JournalPost | 🔴 P0 | `CAST('REJECTED' AS "PublishStatus")` fails — REJECTED not in enum |
| Shared transition table | All | 🟡 P2 | Products and journals have different valid transitions; shared table over-fits |
| No publish_status write | Product | 🟡 P2 | Publisher never writes to `products.publish_status`, leaving the dual system desynchronized |

### 10.3 Required Publisher Changes (Phase E)

The Publisher must be modified to:

1. **For journals:** Map workflow states to PublishStatus enum values before writing:
   - `IN_REVIEW` → `PENDING_REVIEW`
   - `SCHEDULED` → `APPROVED`
   - `REJECTED` → Skip PublishStatus write (or store metadata; see rejected decision below)

2. **For products (future):** Write to both `status` (workflow, text) and `publish_status` (persistence, enum) using the alias mapping.

3. **Transition table:** Either validate per-content-type or document that the shared table is an approximation.

### 10.4 Rejected State Decision

**REJECTED is mapped to DRAFT for the purpose of publish_status, with the REJECTED value retained in the text `status` column.**

Rationale:
- REJECTED has no corresponding PublishStatus enum value
- Adding it would require a database migration
- The application already treats "back to DRAFT" as the rejection outcome for publish_status
- REJECTED metadata (reason, reviewer, timestamp) should be stored in a separate audit/log field, not conflated with publish status
- The text `products.status` column retains REJECTED for workflow continuity

Implementation (when Publisher is migrated):
```
Journal:   status (PublishStatus) = 'DRAFT'   — with audit log for rejection metadata
Product:   status (text) = 'REJECTED'          — retains workflow state
Product:   publish_status (enum) = 'DRAFT'     — reset to DRAFT
```

### 10.5 Scheduling State Decision

**SCHEDULED is stored in `publish_jobs`, not in `publish_status`.**

- `publish_jobs.status = 'pending'` with `publish_at` timestamp is the authoritative scheduling record
- Entity status remains at `APPROVED` (the state before scheduling)
- When `publish_at` fires, Publisher transitions to `PUBLISHED`
- If a schedule is cancelled, `publish_jobs.status = 'cancelled'` and entity status returns to `APPROVED`

### 10.6 Valid CAST Operations

| CAST | Status | Notes |
|------|--------|-------|
| `CAST('DRAFT' AS "PublishStatus")` | ✅ VALID | Direct enum value |
| `CAST('PENDING_REVIEW' AS "PublishStatus")` | ✅ VALID | Direct enum value |
| `CAST('APPROVED' AS "PublishStatus")` | ✅ VALID | Direct enum value |
| `CAST('PUBLISHED' AS "PublishStatus")` | ✅ VALID | Direct enum value |
| `CAST('UNPUBLISHED' AS "PublishStatus")` | ✅ VALID | Direct enum value |
| `CAST('ARCHIVED' AS "PublishStatus")` | ✅ VALID | Direct enum value |
| `CAST('IN_REVIEW' AS "PublishStatus")` | ❌ INVALID | Not in enum — map to PENDING_REVIEW first |
| `CAST('SCHEDULED' AS "PublishStatus")` | ❌ INVALID | Not in enum — map to APPROVED first |
| `CAST('REJECTED' AS "PublishStatus")` | ❌ INVALID | Not in enum — write DRAFT or write to text column only |

---

## 11. API Contract

### 11.1 Input/Output Values

| Context | Accepted Input Values | Returned Values | Notes |
|---------|---------------------|-----------------|-------|
| Product CRUD API (publish_status) | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED | Same 6 values | Rejects IN_REVIEW, SCHEDULED, REJECTED for publish_status |
| Product CRUD API (status) | DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED | Same 7 values | Direct text column passthrough |
| Series CRUD API | DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED | Same 7 values | All workflow values accepted |
| Journal CRUD API | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED | Same 6 values | API must map IN_REVIEW→PENDING_REVIEW, REJECTED→DRAFT |
| Banner CRUD API | DRAFT, PUBLISHED (convention) | DRAFT, PUBLISHED | Free text — convention only |
| Publisher API | DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED | Status-specific responses | Internal — not directly user-facing |

### 11.2 Backward Compatibility Aliases

The following aliases are accepted at API boundaries and MUST be mapped:

| Submitted Value | Canonical Persistence Value | Expires |
|----------------|---------------------------|---------|
| `IN_REVIEW` | `PENDING_REVIEW` | Phase E (when Publisher is fixed) |
| `SCHEDULED` | `APPROVED` | Never — legitimate API value for scheduling intent |
| `REJECTED` | `DRAFT` (for publish_status) | Phase E (when reject-with-metadata is implemented) |
| `"pending"` (publish_jobs) | `"pending"` | Never — internal convention |

### 11.3 Deprecated Values

| Value | Context | Deprecation | Replacement |
|-------|---------|-------------|-------------|
| `IN_REVIEW` as persistence | `products.publish_status`, `journal_posts.status` | Immediately | Use `PENDING_REVIEW` for persistence |
| 2-value `PublishStatus` enum in frozen schemas | Prisma schema files | Phase H | Use 6-value enum from `@yunwu/brand-db` |
| `CAST($1 AS "PublishStatus")` with non-enum values | Publisher journal branch | Phase E | Map values before CAST |

### 11.4 Error Behavior

| Violation | HTTP/Response | Behavior |
|-----------|---------------|----------|
| Invalid transition | `{ success: false, error: "...", previousStatus: "..." }` | Publisher returns error string |
| Non-enum value in publish_status | PostgreSQL error | Must be prevented by application-layer validation |
| Unknown content type | Throws `Error("Unknown content type")` | Publisher throws — caught by caller as 500 |

### 11.5 External Caller Visibility

**External callers (API clients, storefront) MUST only see canonical persistence states:**

- ✅ DRAFT
- ✅ PENDING_REVIEW
- ✅ APPROVED
- ✅ PUBLISHED
- ✅ UNPUBLISHED
- ✅ ARCHIVED

**Workflow-only states MUST NOT be exposed externally:**

- ❌ IN_REVIEW — maps to PENDING_REVIEW for external visibility
- ❌ SCHEDULED — maps to APPROVED for external visibility
- ❌ REJECTED — maps to DRAFT for external visibility

---

## 12. Prisma Modeling Rules

### 12.1 Rules for `packages/brand-db/schema.prisma`

#### PublishStatus Enum (Exact — Match Database)

```prisma
enum PublishStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  PUBLISHED
  UNPUBLISHED
  ARCHIVED
}
```

Rule: The enum values and their order MUST match the PostgreSQL enum exactly. Any discrepancy causes a Prisma validation error or runtime mismatch.

#### Fields Using PublishStatus Enum

| Model | Field | Type | Rule |
|-------|-------|------|------|
| `LegacyBrandProduct` | `publish_status` | `PublishStatus` | **MUST NOT** be nullable. Default DRAFT. |
| `JournalPost` | `status` | `PublishStatus` | **MUST NOT** be nullable. Default DRAFT. |

#### Fields Remaining String (Not PublishStatus)

| Model | Field | Type | Rule |
|-------|-------|------|------|
| `LegacyBrandProduct` | `status` | `String` | Document CHECK constraint values in Prisma comment |
| `LegacyBrandSeries` | `status` | `String?` | Nullable in DB. Document CHECK constraint in comment. |
| `Banner` | `status` | `String?` | Free text. Default "DRAFT". No enum. |
| `PublishJob` | `status` | `String?` | Free text. Default "pending". No enum. |
| `ContentVersion` | `status` | `String?` | Free text. Default "PUBLISHED". No enum. |

#### Fields Requiring Prisma Comments

Every `String` status field MUST have a Prisma `///` comment documenting:
- The constraint type (CHECK, free text, or convention)
- The allowed values (if constrained)
- The owner context
- Cross-reference to ADR-001

Example:
```prisma
/// Workflow state: text with CHECK constraint.
/// Values: DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED.
/// Owner: Publisher state machine.
/// See ADR-001 Section 7.3.
status String @default("draft") @map("status")
```

#### Constraints NOT Representable in Prisma

| Constraint | Where | Why Not Representable | Mitigation |
|-----------|-------|-----------------------|------------|
| CHECK constraint on `products.status` | PostgreSQL | Prisma has no CHECK constraint support for specific values | Document in schema comment; validate in application code |
| CHECK constraint on `series.status` | PostgreSQL | Same | Same |
| `PublishStatus` enum ordering | PostgreSQL | Prisma enum ordering is alphabetical, not by DB sort order | Document DB ordering in comment |
| `publish_jobs.status = 'pending'` default | PostgreSQL | Default is application convention, not schema constraint | Document in comment |

#### Fields That Must NEVER Be CAST to PublishStatus

| Field | Reason | Phase E Action |
|-------|--------|----------------|
| `products.status` | Text column with different value set (includes IN_REVIEW, SCHEDULED, REJECTED) | No cast needed — it's a string |
| `series.status` | Same as above | No cast needed |
| `banners.status` | Free text, no constraints | No cast needed |
| `publish_jobs.status` | Own lifecycle (pending/published/failed/cancelled) | No cast needed |
| `content_versions.status` | Own convention (PUBLISHED) | No cast needed |

---

## 13. Contract Guard Rules

### 13.1 Phase B Guard Rules (to be implemented)

After Phase B creates `packages/brand-db/schema.prisma`, the Prisma Contract Guard must enforce:

| Rule | Check | Effect |
|------|-------|--------|
| PublishStatus exact values | Enum must have exactly DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED (in order) | Invalid enum additions fail |
| products.publish_status uses PublishStatus | Model field must reference the PublishStatus enum | Missing enum reference fails |
| products.status remains independent | Field must be String, NOT PublishStatus | Wrong type fails |
| series.status is not PublishStatus | Field must be String or String? | Wrong type fails |
| brands.status is not PublishStatus | Field must be String or String? | Wrong type fails |
| publish_jobs.status is not PublishStatus | Field must be String or String? | Wrong type fails |
| content_versions.status is not PublishStatus | Field must be String or String? | Wrong type fails |
| No IN_REVIEW in Prisma enum | Enum must not contain IN_REVIEW | Workflow-only state check fails |
| No SCHEDULED in Prisma enum | Enum must not contain SCHEDULED | Workflow-only state check fails |
| No REJECTED in Prisma enum | Enum must not contain REJECTED | Workflow-only state check fails |
| Datasource uses BRAND_DATABASE_URL | Schema datasource must be `env("BRAND_DATABASE_URL")` | DATABASE_URL fallback fails |
| Generator output path | Output must be `./node_modules/@prisma/brand-client` | Wrong path fails |

### 13.2 Post-Phase D Guard Rules (after Publisher migration)

Additional rules once the Publisher is migrated to use `@yunwu/brand-db`:

| Rule | Check | Effect |
|------|-------|--------|
| Publisher CAST only valid enum values | Code must not CAST IN_REVIEW/SCHEDULED/REJECTED as PublishStatus | Code review gate |
| Workflow states in text columns only | No workflow state (IN_REVIEW, SCHEDULED, REJECTED) written to PublishStatus enum columns | Code review gate |

---

## 14. Migration Impact

### 14.1 Existing Code Violating the Contract

| File | Violation | Severity | Phase |
|------|-----------|----------|-------|
| `apps/platform/lib/publisher.ts:258` | `CAST($1 AS "PublishStatus")` with IN_REVIEW/SCHEDULED/REJECTED for journals | 🔴 P0 | Phase E |
| `apps/brand-os/prisma/schema.prisma` | PublishStatus has only DRAFT/PUBLISHED (stale) | 🟡 P2 | Phase H |
| `apps/web/prisma/schema.prisma` | Same stale PublishStatus | 🟡 P2 | Phase H |
| `yunwu-origin/prisma/schema.prisma` | PublishStatus matches DB ✅ but ProductType enum needs verification | 🟢 P3 | Independent |

### 14.2 Raw SQL CASTs Requiring Correction

| Location | Current CAST | Correct CAST | When |
|----------|-------------|--------------|------|
| `publisher.ts:258` | `CAST($1 AS "PublishStatus")` with IN_REVIEW, SCHEDULED, REJECTED | Map to DRAFT/PENDING_REVIEW/APPROVED first, or use separate SQL for non-enum values | Phase E |
| `products/actions.ts:469` | `'value'::"PublishStatus"` — using enum values directly | ✅ Already correct (uses mapped values via PUBLISH_STATUS_ALIASES) | No change needed |

### 14.3 Frozen Schema Definitions Requiring Correction

| File | Issue | Correction | Phase |
|------|-------|-----------|-------|
| `apps/brand-os/prisma/schema.prisma` | PublishStatus enum missing 4 values | (Frozen — document drift only) | Phase H delete |
| `apps/web/prisma/schema.prisma` | Same | Same | Phase H delete |

### 14.4 API Values Requiring Mapping

| Incoming Value | Target | Mapping Location | When |
|---------------|--------|-----------------|------|
| `IN_REVIEW` (for publish_status) | `PENDING_REVIEW` | Product actions `PUBLISH_STATUS_ALIASES` | ✅ Already implemented |
| `SCHEDULED` (for publish_status) | `APPROVED` | Product actions `PUBLISH_STATUS_ALIASES` | ✅ Already implemented |
| `REJECTED` (for publish_status) | No mapping needed (stays in text column) | — | Document that REJECTED is text-column only |

### 14.5 Historical Data Compatibility

| Data | Issue | Compatible? | Action |
|------|-------|-------------|--------|
| Existing `products.publish_status` values | Already 6 canonical enum values | ✅ Fully compatible | No migration needed |
| Existing `products.status` values | Uses 7-value CHECK set | ✅ Fully compatible | No migration needed |
| Existing `journal_posts.status` values | Uses PublishStatus enum | ✅ Fully compatible | No migration needed |
| Existing `series.status` values | Uses 7-value CHECK set | ✅ Fully compatible | No migration needed |
| Existing `banners.status` values | Free varchar, mixed DRAFT/PUBLISHED | ✅ Compatible | No migration needed |

### 14.6 Database Migration Required

**No database migration is required.** All six PublishStatus values already exist in the PostgreSQL enum. The CHECK constraints on `products.status` and `series.status` already accept the 7 workflow values. No DDL changes are needed for any Phase B, C, D, or E migration.

---

## 15. Consequences

### Positive

1. **Phase B unblocked** — `packages/brand-db/schema.prisma` can be designed against a stable, authoritative 6-value PublishStatus enum.
2. **No database migration** — All decisions are compatible with the current database schema.
3. **Existing code continues working** — The dual status system on products is formally recognized, not eliminated.
4. **Publisher workflow preserved** — The 7-state state machine continues to function; the mapping layer handles persistence conversion.
5. **Frozen schema deletion unblocked** — Once Phase B creates the canonical schema and Phases C/D/E migrate consumers, frozen schemas can be deleted (Phase H).
6. **Clear ownership boundaries** — Each entity's status contract is explicitly defined; Contract Guard rules are specified.

### Negative

1. **Dual status system persists** — `products.status` and `products.publish_status` remain separate columns. This is acknowledged technical debt.
2. **Publisher journal CAST is broken** — The P0 bug in publisher.ts must be fixed in Phase E before journals can use the Publisher workflow reliably.
3. **IN_REVIEW/SCHEDULED/REJECTED ambiguity** — Developers must understand that these are workflow states, not persistence states. Documentation and guard rules mitigate this.
4. **No automatic sync** — The two product status columns are not synchronized by any trigger or constraint. Application code must handle this explicitly.

---

## 16. Rejected Alternatives

### Alternative A: Extend PostgreSQL enum to 9 values

Adding IN_REVIEW, SCHEDULED, and REJECTED to the `PublishStatus` enum would eliminate the CAST issue but:
- Blurs the semantic distinction between workflow and publish state
- SCHEDULED is a timing state, not a content state
- REJECTED is a review outcome, not a content lifecycle position
- Would require a database migration (`ALTER TYPE ... ADD VALUE`) — prohibited in Phase B
- Long-term, the enum would grow unbounded as new workflow states are added

### Alternative B: Remove `products.status` text column

Consolidating to a single column would simplify the model but:
- Requires data migration (merge existing status values)
- Requires dropping a CHECK constraint and adding a new one
- Would break the Publisher workflow, which relies on the text column's flexibility
- Text column serves a legitimate purpose (workflow states that don't belong in the publish enum)

### Alternative C: Make all entities use PublishStatus enum

Forcing `series.status`, `banners.status`, and `publish_jobs.status` into the PublishStatus enum would:
- Require database migrations for each column type change
- Break existing data compatibility
- Overload the enum with incompatible semantics (publish_jobs lifecycle != content lifecycle)
- Violate the principle of "one type per domain concept"

---

## 17. Implementation Order

### Phase B (Immediately After ADR-001)

**Unblock Criteria:**
- ✅ PublishStatus enum values confirmed (6 values, from live DB metadata)
- ✅ No database migration required for status fields
- ✅ Mapping from workflow states to persistence states defined
- ✅ Prisma modeling rules specified (Section 12)
- ✅ Contract Guard rules specified (Section 13)

Phase B can proceed with creating `packages/brand-db/schema.prisma` using:
- `enum PublishStatus { DRAFT PENDING_REVIEW APPROVED PUBLISHED UNPUBLISHED ARCHIVED }`
- `products.publish_status` → `PublishStatus`
- `products.status` → `String` (with ADR-001 cross-reference comment)
- `series.status` → `String?` (with ADR-001 cross-reference comment)
- `banners.status` → `String?` (free text)
- `publish_jobs.status` → `String?` (free text)
- `content_versions.status` → `String?` (free text)

### Phase C: Brand OS Migration to `@yunwu/brand-db`

- Import the canonical schema and generated client
- Update Brand OS imports to use 6-value PublishStatus enum
- No database migration required

### Phase D: Platform Brand Module Migration

- Migrate raw SQL actions to typed Prisma via `@yunwu/brand-db`
- Preserve `PUBLISH_STATUS_ALIASES` mapping (or migrate to canonical values)
- No database migration required

### Phase E: Publisher Migration (P0 Fix Required)

- Fix `transitionStatus()` to not CAST non-enum values for journals
- Implement workflow-to-persistence mapping in Publisher for journal posts
- Add REJECTED → DRAFT mapping for publish_status
- Ensure Publisher writes to both `status` and `publish_status` for products (future)

### Phase F: Web/Storefront Cleanup

- Verify yunwu-origin covers `apps/web` functionality
- Remove `apps/web` and its frozen schema

### Phase G: Data Migration Design

- Design migration from legacy tables to target tables (if any)
- No status-related changes expected

### Phase H: Frozen Schema Deletion

- Delete `apps/brand-os/prisma/schema.prisma`
- Delete `apps/web/prisma/schema.prisma`
- Delete stale `enum PublishStatus { DRAFT PUBLISHED }`

---

## 18. Phase B Unblock Criteria

| Criterion | Status |
|-----------|--------|
| PublishStatus database enum values confirmed | ✅ ACCEPTED — 6 values from live read-only metadata |
| Workflow-to-persistence mapping defined | ✅ ACCEPTED — Section 8.2 |
| Entity-specific contracts defined | ✅ ACCEPTED — Section 9 |
| Publisher CAST conflicts documented | ✅ ACCEPTED — Section 10 |
| Prisma modeling rules specified | ✅ ACCEPTED — Section 12 |
| Contract Guard rules specified | ✅ ACCEPTED — Section 13 |
| No database migration required | ✅ CONFIRMED — Section 14.6 |
| Existing code remains compatible | ✅ CONFIRMED — Sections 14.1-14.5 |

**Phase B is UNBLOCKED.**

---

## Appendix A: Evidence Sources

| Source | File | Used For |
|--------|------|----------|
| Live DB enum metadata | `docs/db-metadata/brand-db-enums-2026-07-11.json` | PublishStatus exact values, ordering, usage |
| Live DB column metadata | `docs/db-metadata/brand-db-schema-metadata-2026-07-11.json` | Column types, defaults, nullability, constraints |
| DB schema report | `docs/db-metadata/BRAND_DB_SCHEMA_METADATA_2026-07-11.md` | Check constraint values, FK relationships |
| Architecture document | `docs/PLATFORM_OS_CONTEXT_OWNERSHIP_ARCHITECTURE_2026-07-11.md` | Context boundaries, Phase definitions |
| Publisher state machine | `apps/platform/lib/publisher.ts` | Transition table, CAST operations, content type routing |
| Product CRUD actions | `apps/platform/modules/brand/products/actions.ts` | PUBLISH_STATUS_ALIASES, dual-status handling |
| Journal CRUD actions | `apps/platform/modules/brand/journal/actions.ts` | Status validation, publisher delegation |
| Series CRUD actions | `apps/platform/modules/brand/series/actions.ts` | Publisher delegation |
| Banner CRUD actions | `apps/platform/modules/brand/banners/actions.ts` | Status write patterns |
| Frozen brand-os schema | `apps/brand-os/prisma/schema.prisma` | Conflict identification |
| Frozen web schema | `apps/web/prisma/schema.prisma` | Conflict identification |
| yunwu-origin schema | `yunwu-origin/prisma/schema.prisma` | Cross-reference enum values |
| Contract guard | `scripts/check-prisma-schema-contract.mjs` | Current guard rules |

## Appendix B: Reference — Status Value Crosswalk

| Workflow (Publisher) | Persistence (publish_status enum) | Persistence (text status column) | API Input Accepted | API Output Visible |
|---------------------|-----------------------------------|----------------------------------|-------------------|-------------------|
| DRAFT | DRAFT | DRAFT | ✅ | ✅ |
| IN_REVIEW | PENDING_REVIEW | IN_REVIEW | ✅ (maps) | ❌ (shows PENDING_REVIEW) |
| APPROVED | APPROVED | APPROVED | ✅ | ✅ |
| SCHEDULED | APPROVED | SCHEDULED | ✅ (maps) | ❌ (shows APPROVED) |
| PUBLISHED | PUBLISHED | PUBLISHED | ✅ | ✅ |
| UNPUBLISHED | UNPUBLISHED | UNPUBLISHED | ✅ | ✅ |
| ARCHIVED | ARCHIVED | ARCHIVED | ✅ | ✅ |
| REJECTED | (no write) | REJECTED | ✅ (maps to DRAFT for publish_status) | ❌ (shows DRAFT if queried by publish_status) |
| pending (publish_jobs) | N/A | pending | N/A | N/A |
| published (publish_jobs) | N/A | published | N/A | N/A |
| failed (publish_jobs) | N/A | failed | N/A | N/A |
| cancelled (publish_jobs) | N/A | cancelled | N/A | N/A |
