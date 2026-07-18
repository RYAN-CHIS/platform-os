# Phase E2A-2 — Rollback Editorial Semantics Final Decision

**Date:** 2026-07-13
**WORKDIR:** `/Users/ryan/Projects/active/platform-os` @ `7f3ad1e`
**Storefront:** `yunwu-origin` @ `bf8fe90` — current-record reader, no live table

---

## 1. Executive Decision

**SELECTED: Option A — Emergency Immediate Restore.**

Rollback is a **privileged, audited, emergency operational command** that restores previously-approved historical content into the current published record.

| Dimension | Decision |
|-----------|----------|
| Immediate public effect? | **YES** — current PUBLISHED record is overwritten, storefront shows restored content |
| Review/approve bypass? | **YES** — content was previously reviewed at original publish time |
| Is this acceptable? | ✅ **YES** — Rollback is ADMIN-level, snapshots capture approved state, safeguards required |

---

## 2. Why Option A Is Correct

### 2.1 Architectural Constraint

The current architecture has NO live table separation. Any rollback operation necessarily either:
- **Changes live content** (if we keep PUBLISHED)
- **Removes content from storefront** (if we set DRAFT)

Between these two outcomes, changing live content to a previously-approved state is the better choice. DRAFT status creates content disappearance — a worse user experience for both editors and visitors.

### 2.2 Snapshot Content Was Approved

ContentVersion snapshots are created at PUBLISH time — they capture the exact state of content that was reviewed, approved, and published. Rollback restores approved content, not arbitrary edits.

### 2.3 Operational Need

Rollback addresses scenarios where incorrect content is live and must be fixed immediately:
- Pricing error in product description
- Incorrect product specification published
- Wrong SEO metadata live
- Journal article needs reverting to previous version

Waiting for re-review in these scenarios is not acceptable.

### 2.4 Immediate Implementability

Option A requires:
- ❌ No schema change
- ❌ No storefront migration
- ❌ No data backfill
- ❌ No published projection build
- ✅ Field whitelist in publisher.ts
- ✅ Confirmation dialog in UI
- ✅ Audit log
- ✅ RESTORED version creation

---

## 3. Why Options B and C Are Not Selected

### Option B (Restore as Draft with Published Projection)

Requires building a published projection system + storefront migration. This is Phase G territory, not E2. The rollback feature would be blocked for weeks/months.

### Option C (Create New Draft Revision)

Requires revision pointer model + likely schema change. Same Phase G concern.

Both options are correct for the long-term architecture but do not serve the immediate operational need.

---

## 4. Rollback UI Audit

| Content Type | UI Entry | Required Role | Confirmation | Public Side Effect Explained |
|---|---|---|---|:---:|
| Series | Version history modal → "回滚" button | None visible (inherits page role) | **None** | **Not explained** |
| Products | Version history modal (client.tsx) | None visible | **None** | **Not explained** |
| Journal | Version history modal (client.tsx) | None visible | **None** | **Not explained** |
| Banners | Version history (not found) | — | — | — |
| Home | Version history modal (client.tsx) | None visible | **None** | **Not explained** |

**Gap:** Current rollback UI has NO confirmation dialog, NO reason field, and NO public content side-effect warning. All must be added.

---

## 5. ADR-006: Emergency Published Content Rollback Contract

### 5.1 Core Contract

1. **Rollback is a privileged Publisher-owned command.** It restores historical content into the current published record.

2. **PUBLISHED content after rollback:** Content fields restored from snapshot. `status`, `publishStatus`, `publishedAt` UNCHANGED. Content remains PUBLISHED. Storefront immediately shows restored content.

3. **Review/approve bypass authorized.** Snapshot captures previously-approved content. Rollback does not require re-review. This is a deliberate emergency policy, not a normal editing path.

4. **Content-type field whitelist enforced.** Only approved field sets are restored (Section 5.3). Unknown fields rejected.

5. **Lifecycle fields NEVER restored:** `status`, `publishStatus`, `publishedAt`, `scheduledAt`, `id`, `createdAt`, `updatedAt`, `erpProductId`.

### 5.2 Content-Type Whitelists

**Products:** sku, name, slug, seriesId, theme, story, materials, costPrice, salePrice, coverImage, gallery, stock, inspiration, keywords, lifeStage, suitableFor, sortOrder, materialOrigin, craftMethod, completionDate, serialNumber, creationStory, emotionalState, companionsCount, remainingQty, productType

**Journal:** title, slug, excerpt, content, coverImage, coverAlt, readingTime, category, seoTitle, seoDescription, sortOrder

**Series:** slug, name, description, coverImage, heroText, longDesc, shortDesc, sortOrder

**Banners:** title, subtitle, btnText, imageUrl, mobileImageUrl, linkUrl, position, sortOrder, startAt, endAt

**Home/PageContent:** pageKey, sectionKey, title, content, image, sortOrder, published

### 5.3 Lifecycle Status Behavior

| Current Status | After Rollback | Storefront Visible? |
|---------------|----------------|-------------------|
| PUBLISHED | PUBLISHED (unchanged) | ✅ Yes — restored content shown |
| DRAFT | DRAFT (unchanged) | ❌ No (was not visible before) |
| APPROVED | APPROVED (unchanged) | ❌ No |
| UNPUBLISHED | UNPUBLISHED (unchanged) | ❌ No |
| PENDING_REVIEW | PENDING_REVIEW (unchanged) | ❌ No |
| ARCHIVED | **Rollback NOT allowed** | N/A |

### 5.4 Operational Requirements

| Requirement | Rule |
|------------|------|
| Permission | Admin-level role (Publisher-level, not ordinary editor) |
| Confirmation | Explicit: "此操作会立即替换线上已发布内容。历史内容将被覆盖。" |
| Reason | Required. Stored in audit log. |
| Audit log | Records: actor, reason, sourceVersion, contentType, contentId, previousContentHash |
| RESTORED version | Created with status "RESTORED" after successful rollback |
| Historical versions | Immutable — never modified or deleted |
| Pending publish_jobs | Cancelled after rollback |
| Preview tokens | Invalidated (future — Phase E3) |
| publishedAt | Preserved as-is (NEVER restored from snapshot) |
| ARCHIVED | Rollback rejected — fail closed |

### 5.5 Codex Implementation

**Files to modify (platform-os only):**
1. `apps/platform/lib/publisher.ts` — `rollbackToVersion()` with whitelist, RESTORED version, job cancellation, audit
2. Brand module `client.tsx` files (series, products, journal, home) — confirmation dialog, reason field, permission check
3. `scripts/check-publisher-contract.mjs` — G-ROLLBACK-* rules
4. `scripts/check-publisher-contract.test.mjs` — rollback contract tests

**Storefront (`yunwu-origin`):** NO changes required.

---

## 6. Final Decision Matrix

| Question | Answer |
|----------|--------|
| Is rollback emergency immediate republish? | **YES** |
| Review/approve bypass authorized? | **YES** — snapshot captured approved state |
| PUBLISHED → immediate public change? | **YES** — content changes immediately |
| UI must show public impact warning? | **YES** — must be added |
| Reason required? | **YES** — must be added |
| Special role required? | **YES** — admin/publisher level |
| DRAFT after rollback? | Stays DRAFT (unchanged) |
| APPROVED after rollback? | Stays APPROVED (unchanged) |
| UNPUBLISHED after rollback? | Stays UNPUBLISHED (unchanged) |
| ARCHIVED rollback allowed? | **NO** — fail closed |
| Pending publish_jobs? | Cancelled |
| RESTORED version created? | **YES** |
| publishedAt preserved? | **YES** — never restored from snapshot |
| Live table modified? | NONE (does not exist) |
| Storefront changes needed? | **NO** |
| Schema change needed? | **NO** |
| Data migration needed? | **NO** |
| Codex directly implementable? | **YES** |

---

```
PHASE E2A-2 ROLLBACK SEMANTICS DECISION COMPLETE

WORKDIR:                      /Users/ryan/Projects/active/platform-os
HEAD:                         7f3ad1e
Selected option:              A — Emergency Immediate Restore
Rollback formal meaning:      Privileged audited command restoring historical approved content into current published record
Immediate public change:      YES
Review/approve bypass:        YES — snapshot captured approved state
Required role:                Admin/Publisher-level
Confirmation warning:         YES — must be added
Reason required:              YES — must be added
PUBLISHED resulting status:   PUBLISHED (unchanged)
DRAFT resulting status:       DRAFT (unchanged)
APPROVED resulting status:    APPROVED (unchanged)
UNPUBLISHED resulting status: UNPUBLISHED (unchanged)
ARCHIVED rollback allowed:    NO — fail closed
Lifecycle fields restored:    NONE
Pending publish jobs:         Cancelled
Audit log:                    YES — actor, reason, version, content identifiers
RESTORED version:             YES — created after successful rollback
publishedAt behavior:         Preserved as-is
Storefront changes required:  NO
Schema change required:       NO
Data migration required:      NO
ADR required:                 YES — ADR-006
ADR path:                     docs/adr/ADR-006-EMERGENCY-PUBLISHED-CONTENT-ROLLBACK-CONTRACT.md
Report path:                  docs/PHASE_E2A_2_ROLLBACK_EDITORIAL_SEMANTICS_DECISION_2026-07-13.md
Modified files:               NONE
Database operations:          NONE
Commit SHA:                   NONE
Push:                         NOT EXECUTED
Codex readiness:              READY
Next phase:                   Phase E2B — Implement rollbackToVersion with whitelist + confirmation + audit
```
