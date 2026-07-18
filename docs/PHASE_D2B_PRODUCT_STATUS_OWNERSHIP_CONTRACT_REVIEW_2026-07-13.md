# Phase D2b — Product Status Ownership Contract Review

**Date:** 2026-07-13
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**HEAD:** `1ad2956` (Phase D2a complete)
**Phase D2b-1a:** BLOCKED by Product status ownership ambiguity

---

## 1. Executive Conclusion

**UNBLOCKED with clean ownership separation.** The Product status dual-column system is well-documented by ADR-001, and the ownership boundary can be established without changing business behavior:

| Column | Owner | Status |
|--------|-------|--------|
| `LegacyBrandProduct.status` (text, workflow) | **Publisher ONLY** | Normal CRUD must stop writing it |
| `LegacyBrandProduct.publishStatus` (enum, persistence) | **Publisher ONLY** | Normal CRUD must stop writing it |

The current behavior of `createProduct`, `updateProduct`, `refreshLinkedErpFields`, and the UI form writing to `status` is a **legacy overlap** that ADR-001 already resolved at the architectural level. Phase D2b can close the gap without a new ADR.

**ADR-005 is NOT required for Product status** — ADR-001 already covers the decision.

**Series is NOT blocked** by this decision and can proceed independently.

---

## 2. Current Status Field Model

### 2.1 Dual-Column System (Database)

Source: `packages/brand-db/schema.prisma` and DB metadata.

| Field | DB Type | Canonical Type | CHECK / Enum | Default |
|-------|---------|----------------|-------------|---------|
| `products.status` | text | `String @default("draft")` | CHECK: 7 values (DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED) | `'draft'` (lowercase) |
| `products.publish_status` | PublishStatus enum | `PublishStatus @default(DRAFT)` | Enum: 6 values (DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED) | `'DRAFT'::PublishStatus` |

### 2.2 ADR-001 Ownership Model (Already Decided)

ADR-001 Section 9.1 states:

| Column | Owner | Allowed Values |
|--------|-------|---------------|
| `products.status` (text) | **Publisher** — workflow state machine | DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED |
| `products.publish_status` (enum) | **Product CRUD actions** — persistence lifecycle | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED |

**The ADR-001 decision is already correct.** The implementation gap is:
- `status` is still written by normal CRUD (updateProduct, refreshLinkedErpFields, UI) when it should be Publisher-only
- ADR-001's "Product CRUD actions" owner for `publish_status` refers to the existing `PUBLISH_STATUS_ALIASES` mapping, which is part of the Publisher workflow path, not the normal updateProduct path

---

## 3. Current Value Inventory

### 3.1 Values Accepted by Database

| Column | Allowed Values | Source |
|--------|---------------|--------|
| `products.status` | DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED | CHECK constraint + DB metadata |
| `products.publish_status` | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED | PostgreSQL enum |

### 3.2 Values Used in Code

| Value | Written to | Context | ADR-001 Classification |
|-------|-----------|---------|----------------------|
| DRAFT | `status`, `publish_status` | Initial create, reset | Persistence + Workflow |
| IN_REVIEW | `status` | Publisher workflow | Workflow-only, maps to PENDING_REVIEW |
| APPROVED | `status`, `publish_status` | Publisher workflow | Persistence value |
| SCHEDULED | `status` | Publisher workflow | Workflow-only, maps to APPROVED for persistence |
| PUBLISHED | `status`, `publish_status` | Publisher workflow | Persistence value |
| UNPUBLISHED | `status`, `publish_status` | Publisher workflow | Persistence value |
| ARCHIVED | `status`, `publish_status` | Publisher workflow | Persistence value |
| REJECTED | `status` only | Publisher workflow | Workflow-only, no publish_status mapping |
| PENDING_REVIEW | `publish_status` only | PUBLISH_STATUS_ALIASES | Persistence value |

### 3.3 ERP Values Mapped by `refreshLinkedErpFields`

| ERP Status | Brand `status` mapped value | ERP Meaning |
|-----------|---------------------------|-------------|
| DESIGNING | DRAFT | Product being designed |
| READY | APPROVED | Product ready for production |
| ACTIVE | PUBLISHED | Product active in catalog |
| ARCHIVED | ARCHIVED | Product archived |

The ERP status values and their mapping are defined in `refreshLinkedErpFields` (line 369-374) and represent the ERP product lifecycle, NOT the Brand workflow state.

---

## 4. Complete Writer Inventory

| # | Function | Writes To | Current Values | Owner Should Be | Phase |
|---|----------|-----------|---------------|-----------------|-------|
| 1 | `createProduct` (line 546) | `status` via dynamic INSERT | DRAFT (default + ERP refresh override) | ✅ **Initial default only** | D2b |
| 2 | `createProduct` | `publish_status` via dynamic INSERT | (not in create fields) | ❌ Not in create fields — OK | D2b |
| 3 | `updateProduct` (line 575) | `status` via dynamic UPDATE | Any from PRODUCT_UPDATE_FIELDS (includes `status`) | ❌ **Should NOT write status** | D2b |
| 4 | `updateProduct` | `publish_status` via dynamic UPDATE | Any mapped via PUBLISH_STATUS_ALIASES | ❌ **Should NOT write publish_status** | D2b |
| 5 | `refreshLinkedErpFields` (line 356) | `status` via ERP status mapping | DESIGNING→DRAFT, READY→APPROVED, ACTIVE→PUBLISHED, ARCHIVED→ARCHIVED | ❌ **ERP status should NOT map to workflow status** | D2b |
| 6 | `toggleProductStatus` (line 658) | `status` via Publisher | All 7 workflow values | ✅ **Publisher — correct** | Phase E |
| 7 | `submitProductForReview` (line 711) | Via Publisher | IN_REVIEW | ✅ **Publisher** | Phase E |
| 8 | `approveProduct` (line 715) | Via Publisher | APPROVED | ✅ **Publisher** | Phase E |
| 9 | `rejectProduct` (line 719) | Via Publisher | REJECTED | ✅ **Publisher** | Phase E |
| 10 | `publishProductNow` (line 723) | Via Publisher | PUBLISHED | ✅ **Publisher** | Phase E |
| 11 | Product UI form (line 274) | `status` via updateProduct | DRAFT / PUBLISHED / UNPUBLISHED | ❌ **UI should NOT write status directly** | D2b |

---

## 5. Reader Inventory

| Consumer | Reads | Purpose |
|----------|-------|---------|
| `listProducts` | `status` | Display in table + filter |
| `getBrandStats` | `status` | Product counts by status |
| Product UI table | `status` | StatusBadge display + workflow buttons |
| Product edit form | `status` | Initial value for dropdown |
| Publisher `transitionStatus` | `status` | Current state validation |
| Publisher `getContentStatus` | `status` | Status query |
| Product OS / fabric | `status` | Storefront filtering |

All **readers** can remain unchanged. The read path is not contested.

---

## 6. Create Default Contract

**Decision: `createProduct` can set initial `status = "DRAFT"`.**

Rationale:
- DRAFT is the initial state, not a workflow transition
- Canonical schema already has `@default("draft")` on `LegacyBrandProduct.status`
- ADR-001 Section 9.1 lists DRAFT as the default persistence state
- The default is not a transition — it's the starting state
- No workflow ownership violation

**However**, `createProduct` should NOT:
- Write to `publish_status` (not in create fields — already correct)
- Accept `IN_REVIEW`, `APPROVED`, `SCHEDULED`, `PUBLISHED`, `UNPUBLISHED`, `ARCHIVED`, `REJECTED` for `status`
- Accept any status value that implies a workflow transition

**Implementation:** `PRODUCT_CREATE_FIELDS` removes `status` from the dynamic list. Schema `@default("draft")` handles the default.

---

## 7. Normal Update Contract

**Decision: `updateProduct` must NOT write to `status` or `publish_status`.**

Rationale:
- `status` is Publisher-owned workflow state per ADR-001
- `publish_status` is Publisher-linked persistence lifecycle per ADR-001
- Normal field updates (name, sku, price, story, etc.) are independent of status
- The current `PRODUCT_UPDATE_FIELDS` includes `status` and `publish_status` — this is the legacy gap
- Editor workflow transitions are handled by dedicated buttons → Publisher

**Implementation:** Remove `status` and `publish_status` from `PRODUCT_UPDATE_FIELDS`. The Publisher wrappers (submitProductForReview, approveProduct, etc.) remain as the exclusive transition path.

---

## 8. UI Contract

**Decision: Product edit form must NOT directly edit `status`.**

The UI currently has:
1. **Status dropdown** in edit form (line 274) — ❌ **Remove**
2. **Workflow action buttons** (lines 395-459) — ✅ **Keep**
3. **StatusBadge** for display — ✅ **Keep**

The edit form status dropdown duplicates Publisher workflow buttons:
- The dropdown's "PUBLISHED" is also served by the "Publish" workflow button
- The dropdown's "UNPUBLISHED" is also served by the "Unpublish" workflow button
- The dropdown's "DRAFT" is also the reset action from workflow buttons

Removing the dropdown doesn't lose functionality — it removes a duplicate, uncontrolled status write path.

---

## 9. ERP Refresh Contract

### 9.1 Current Behavior

`refreshLinkedErpFields` (line 356) reads ERP product status and maps it to Brand `products.status`:

```
DESIGNING  → DRAFT
READY      → APPROVED
ACTIVE     → PUBLISHED
ARCHIVED   → ARCHIVED
```

This mapping is called during:
- `createProduct` (after initial data normalization)
- `updateProduct` (after merge with existing data)

### 9.2 Problem

| Concern | Assessment |
|---------|------------|
| ERP status represents | ERP product lifecycle (design → ready → active → archived) |
| Brand status represents | Brand content workflow (draft → review → approved → published) |
| Are these the same? | **No.** Different domains, different semantics |
| Can ERP ACTIVE force a Brand product to PUBLISHED? | ❌ **Yes, currently** — this is a context ownership violation |
| Can ERP ARCHIVED force Brand to ARCHIVED? | ❌ **Yes, currently** |
| Does ERP refresh override manual editorial workflow? | ❌ **Yes** — if editor sets IN_REVIEW but ERP returns ACTIVE, the product jumps to PUBLISHED |

### 9.3 Decision

**`refreshLinkedErpFields` must NOT write to `status`.**

ERP status is a **separate concern** from Brand content workflow:

| ERP field | Brand impact |
|-----------|-------------|
| `status` | ❌ Must not write to `products.status` |
| `name` | ✅ Acceptable (product name sync) |
| `price` | ✅ Acceptable (price sync, matched by drift detection) |
| `stock` | ✅ Acceptable (inventory sync) |

The `status` mapping function at line 369-374 is removed. The ERP status remains readable via `listErpProductsForSelect()` but does NOT override Brand workflow state.

### 9.4 Context Ownership

This is a **context ownership correction**, not a new restriction. ERP product lifecycle should not control Brand Runtime content publication workflow. The Publisher is the sole owner of Brand workflow state.

---

## 10. Publisher Ownership

### 10.1 Current Publisher Behavior

The Publisher (`lib/publisher.ts`) writes to `products.status` via `transitionStatus`:
```typescript
// Non-journal branch (includes products):
UPDATE products SET status = $1, updated_at = NOW()
```

The Publisher does NOT write to `products.publish_status` — this is a known gap (ADR-001 Section 10.3, Issue: "No publish_status write").

### 10.2 Phase E Boundary

| Function | Current | Phase E Action |
|----------|---------|---------------|
| `transitionStatus` | Writes to `products.status` | Add `publish_status` write with ADR-001 mapping |
| `submitForReview` | Writes IN_REVIEW to `products.status` | Map IN_REVIEW→PENDING_REVIEW for `publish_status` |
| `approveContent` | Writes APPROVED | ✅ Correct for both columns |
| `rejectContent` | Writes REJECTED | Map REJECTED→DRAFT for `publish_status` |
| `publishNow` | Writes PUBLISHED | ✅ Correct |
| `schedulePublish` | Writes SCHEDULED to `products.status` + publish_jobs | Map SCHEDULED→APPROVED for `publish_status` |
| `unpublishContent` | Writes DRAFT | ✅ Correct for status; UNPUBLISHED for publish_status |

**Phase D2b does NOT modify Publisher.** These remain Phase E.

---

## 11. ADR-001 Consistency

| ADR-001 Rule | Current Compliance | D2b Target |
|---|---|---|
| `products.status` is text with CHECK constraint | ✅ Compliant | ✅ No change |
| `products.publish_status` is PublishStatus enum | ✅ Compliant | ✅ No change |
| IN_REVIEW maps to PENDING_REVIEW for publish_status | ⚠️ Not implemented (Phase E) | ⚠️ Phase E |
| SCHEDULED maps to APPROVED for publish_status | ⚠️ Not implemented (Phase E) | ⚠️ Phase E |
| REJECTED has no publish_status mapping | ⚠️ Not implemented (Phase E) | ⚠️ Phase E |
| Publisher owns workflow transitions | ⚠️ **Violated** — CRUD and UI also write status | ✅ **Enforced in D2b** |
| ERP status should not control Brand workflow | ⚠️ **Violated** — refreshLinkedErpFields maps ERP status | ✅ **Fixed in D2b** |

**No ADR-001 rules are violated by the D2b changes.** The D2b changes align implementation with ADR-001's already-decided ownership model.

---

## 12. Options Considered

### Option A: Publisher-Only Status (RECOMMENDED)

- `createProduct`: Only DRAFT (via schema default)
- `updateProduct`: No `status`, no `publish_status`
- UI: Remove status dropdown; keep workflow buttons
- ERP refresh: Remove status mapping
- Publisher: Exclusive owner of all status transitions

**Risks:** 🟢 Low — no behavior change for users (workflow buttons provide same transitions as removed dropdown items).

### Option B: CRUD Can Write DRAFT Only

- `updateProduct` allows status: "DRAFT" only
- Blocks PUBLISHED, UNPUBLISHED edit

**Verdict:** ✅ Effectively same as Option A — the ONLY values users could set to without triggering Publisher transitions are also available via workflow buttons. Adds complexity for no benefit.

### Option C: Keep Current Dual Ownership

- CRUD continues writing status
- Publisher continues writing status

**Verdict:** ❌ Creates race conditions (CRUD and Publisher overwrite each other), violates ADR-001, blocks typed migration.

### Option D: Remove `status` Column, Keep Only `publish_status`

**Verdict:** ❌ Would require database migration, Publisher refactor, and behavioral changes. Out of scope for Phase D.

---

## 13. Final Ownership Decision

**Option A — Publisher-Only Status Ownership.**

### Operation Permission Matrix

| Operation | `status` write allowed? | `publishStatus` write allowed? | Owner | Phase |
|-----------|----------------------|-----------------------------|-------|-------|
| `createProduct` | ✅ Only DRAFT (via schema default or explicit) | ❌ **Not allowed** (not in create fields) | Application + Schema default | D2b |
| `updateProduct` (normal fields) | ❌ **Not allowed** | ❌ **Not allowed** | Normal CRUD | D2b |
| Product UI save | ❌ **Not allowed** | ❌ **Not allowed** | UI | D2b |
| `refreshLinkedErpFields` | ❌ **Not allowed** | ❌ **Not allowed** | ERP sync | D2b |
| `toggleProductStatus` | ✅ All 7 workflow values | ❌ Via Publisher only | Publisher | Phase E |
| `submitForReview` | ✅ IN_REVIEW | ⚠️ Via mapping in Phase E | Publisher | Phase E |
| `approve` | ✅ APPROVED | ✅ APPROVED | Publisher | Phase E |
| `reject` | ✅ REJECTED | ⚠️ DRAFT via mapping in Phase E | Publisher | Phase E |
| `publishNow` | ✅ PUBLISHED | ✅ PUBLISHED | Publisher | Phase E |
| `unpublish` | ✅ DRAFT | ✅ UNPUBLISHED | Publisher | Phase E |
| `schedule` | ✅ SCHEDULED | ⚠️ APPROVED via mapping in Phase E | Publisher | Phase E |
| `archive` | ✅ ARCHIVED | ✅ ARCHIVED | Publisher | Phase E |

---

## 14. Schema Impact

**NO CHANGE to Canonical Schema.**

| Field | Current | Change? |
|-------|---------|---------|
| `LegacyBrandProduct.status` | `String @default("draft")` | ✅ Correct — no change |
| `LegacyBrandProduct.publishStatus` | `PublishStatus @default(DRAFT)` | ✅ Correct — no change |

The schema already has the right defaults and types. The gap is only in application-layer write permissions.

---

## 15. Guard / Test Impact

### 15.1 Static Guard

| Rule | What it checks |
|------|---------------|
| G-PROD-01 | `PRODUCT_CREATE_FIELDS` does NOT include `status` or `publish_status` |
| G-PROD-02 | `PRODUCT_UPDATE_FIELDS` does NOT include `status` or `publish_status` |
| G-PROD-03 | `refreshLinkedErpFields` does NOT return `status` |
| G-PROD-04 | Product UI `<select>` does NOT have a `status` option |

These are **static code analysis rules** (grep/regex), not Prisma schema guard.

### 15.2 Test Requirements

| Test | Verifies |
|------|----------|
| `createProduct` without status → default `"draft"` | Schema default works |
| `updateProduct` with `status: "PUBLISHED"` → does NOT change DB status | Permission enforcement |
| `updateProduct` with `publish_status: "PUBLISHED"` → does NOT change DB | Permission enforcement |
| ERP refresh does NOT override status | Context ownership |
| UI workflow buttons still work (toggleProductStatus) | Publisher path intact |

---

## 16. Phase D2b Boundary

| File | Action |
|------|--------|
| `products/actions.ts` | Remove `status` and `publish_status` from `PRODUCT_UPDATE_FIELDS`. Remove `status` from `PRODUCT_CREATE_FIELDS`. Remove status mapping from `refreshLinkedErpFields`. Keep `PRODUCT_STATUS_VALUES` and `PUBLISH_STATUS_ALIASES` for Publisher reference. Migrate CRUD to typed `brandDb.legacyBrandProduct.*`. Keep Publisher wrappers. |
| Products UI `client.tsx` | Remove status `<select>` dropdown from edit form. Keep workflow action buttons. Keep StatusBadge display. |
| `series/actions.ts` | Migrate to typed `brandDb.legacyBrandSeries.*` (no product status dependency). |
| `journal/actions.ts` | Migrate to typed `brandDb.journalPost.*` (no product status dependency). |
| `banners/actions.ts` | `moveBanner` only (already not blocked). |
| `lib/publisher.ts` | ❌ **Excluded** — Phase E |
| `materials/actions.ts` | ❌ **Excluded** — D2b-2 / ADR-005 |

### 16.1 Series Independence Confirmed

Series has:
- Its own table (`series`), its own status field (`series.status`)
- No shared code path with Products for status management
- Publisher wrappers are separate functions
- **Series is NOT blocked by Product status ownership resolution**

---

## 17. Phase E Boundary

Functions that remain unchanged in Phase D2b and are reserved for Phase E:

| Function | File | Reason |
|----------|------|--------|
| `transitionStatus` | `lib/publisher.ts` | Core state machine |
| `submitForReview` → `submitProductForReview` | products/actions.ts | Publisher wrapper |
| `approveContent` → `approveProduct` | products/actions.ts | Publisher wrapper |
| `rejectContent` → `rejectProduct` | products/actions.ts | Publisher wrapper |
| `publishNow` → `publishProductNow` | products/actions.ts | Publisher wrapper |
| `schedulePublish` → `scheduleProductPublish` | products/actions.ts | Publisher wrapper |
| `unpublishContent` → `unpublishProduct` | products/actions.ts | Publisher wrapper |
| `archiveContent` → `archiveProduct` | products/actions.ts | Publisher wrapper |
| `toggleProductStatus` | products/actions.ts | Publisher wrapper |
| ADR-001 mapping implementation | — | PublishStatus enum values for Publisher |

---

## 18. Rollback / Compatibility Impact

- **No data loss:** The `createProduct` default "DRAFT" is preserved via schema default
- **No reader impact:** All consumers reading `status` and `publish_status` continue to work
- **UI familiarity:** Workflow buttons already exist and are used; removing the duplicate status dropdown is a UX simplification
- **ERP sync:** Price, name, stock continue to sync; only status sync is removed
- **Publisher unchanged:** All transition paths remain intact

---

## Required Questions — Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Contract Conclusion | **RESOLVED — Publisher-only status ownership** |
| 2 | `Product.status` meaning | **Workflow state** (text, CHECK: 7 values). Owned by Publisher. |
| 3 | `Product.publishStatus` meaning | **Persistence lifecycle** (PublishStatus enum, 6 values). Owned by Publisher (with ADR-001 mapping in Phase E). |
| 4 | Create Status Decision | ✅ **Allowed** — initial "DRAFT" via schema default or explicit. NOT a transition. |
| 5 | Normal Update Status Decision | ❌ **NOT allowed** — `status` removed from `PRODUCT_UPDATE_FIELDS` |
| 6 | Normal Update publishStatus Decision | ❌ **NOT allowed** — `publish_status` removed from `PRODUCT_UPDATE_FIELDS` |
| 7 | UI Status Editing Decision | ❌ **NOT allowed** — remove status dropdown; keep workflow buttons |
| 8 | ERP Refresh Status Decision | ❌ **NOT allowed** — `refreshLinkedErpFields` removes status mapping |
| 9 | Publisher Ownership Decision | ✅ **Exclusive owner** of all workflow transitions via `transitionStatus` |
| 10 | ADR-001 Consistency | ✅ **Fully consistent** — D2b changes align implementation with existing ADR-001 |
| 11 | Schema Change Required? | **NO** — `@default("draft")` and `@default(DRAFT)` already correct |
| 12 | Database Migration Required? | **NO** — zero DDL |
| 13 | Guard/Test Changes Required? | **YES** — 4 static rules + 4 tests |
| 14 | New ADR Required? | **NO** — ADR-001 already covers Product status ownership |
| 15 | Series Can Proceed Independently? | **YES** — no dependency on Product status |
| 16 | Product Migration Unblocked? | **YES** — clean ownership boundary established |
| 17 | Report Path | `docs/PHASE_D2B_PRODUCT_STATUS_OWNERSHIP_CONTRACT_REVIEW_2026-07-13.md` |
| 18 | Next Minimal Codex Scope | **D2b-1a (Products)** + D2b-1b (Series) + D2b-1c (Journal) — see below |

---

## Next Minimal Codex Scope

**D2b-1a: Product Status Ownership + Typed Migration**
1. Remove `status` and `publish_status` from `PRODUCT_UPDATE_FIELDS`
2. Remove `status` from `PRODUCT_CREATE_FIELDS` (rely on schema default)
3. Remove ERP status mapping in `refreshLinkedErpFields`
4. Remove status `<select>` from Products UI edit form
5. Migrate CRUD to typed `brandDb.legacyBrandProduct.*`
6. Keep Publisher wrappers as-is
7. Add static guard rules G-PROD-01 through G-PROD-04

**D2b-1b: Series Typed Migration** (independent, can run in parallel)
1. Migrate CRUD to typed `brandDb.legacyBrandSeries.*`
2. Keep Publisher wrappers

**D2b-1c: Journal Typed Migration** (independent)
1. Migrate CRUD to typed `brandDb.journalPost.*`
2. Keep Publisher wrappers

**Excluded:**
- Materials → D2b-2 (ADR-005)
- Publisher → Phase E
- Schema changes → None needed
- DDL → None needed

---

```
FINAL STATUS: PRODUCT STATUS CONTRACT RESOLVED — PRODUCT MIGRATION UNBLOCKED
(Series, Journal also unblocked — Materials deferred to ADR-005)
```
