# ADR-006 — Emergency Published Content Rollback Contract

**Status:** ACCEPTED
**Date:** 2026-07-13
**Supersedes:** Phase E2A-2 editorial semantics decision

---

## 1. Context

The Publisher creates version snapshots at publish time (`content_versions` table). These snapshots capture the full live row "as-published." The `rollbackToVersion()` function exists but had an incomplete contract: it previously restored all snapshot fields except id/timestamps, including restoring `status`/`publishStatus` which bypasses the Publisher state machine.

The production storefront reads current records directly — there is no separate live table, no published projection. Any rollback operation that changes `status` to `DRAFT` would remove published content from the public website.

This ADR establishes a formal contract for rollback as a **privileged emergency operation**.

---

## 2. Decision

**Emergency Immediate Restore** is a privileged, audited Publisher command that restores previously-approved historical content into the current record without changing its lifecycle status.

### 2.1 Core Principles

| Principle | Rationale |
|-----------|-----------|
| ContentVersion snapshots capture **approved** state | Snapshots are created at PUBLISH time. Restored content was previously reviewed and approved. |
| Rollback does NOT require re-review | Content was already approved. Rollback is an emergency restoration, not a new edit. |
| Rollback changes live content immediately | The architecture has no live table separation. Content-field changes on a PUBLISHED record are immediately visible. |
| Rollback is privileged | Requires admin/publisher-level role. Not available to ordinary editors. |
| Rollback is audited | Full audit trail: actor, reason, source version, content identifiers. |
| Rollback creates a RESTORED version | The restore event is itself captured as a new immutable version. |

### 2.2 Lifecycle Status Behavior

| Current Status | After Rollback | Storefront | Rationale |
|---------------|----------------|------------|-----------|
| PUBLISHED | PUBLISHED (unchanged) | ✅ Restored content shown | Emergency fix path |
| DRAFT | DRAFT (unchanged) | ❌ Was not visible | Cannot bypass editorial workflow |
| APPROVED | APPROVED (unchanged) | ❌ Was not visible | Cannot auto-publish |
| PENDING_REVIEW | PENDING_REVIEW (unchanged) | ❌ Was not visible | Out of scope |
| UNPUBLISHED | UNPUBLISHED (unchanged) | ❌ Was not visible | Must explicitly republish |
| ARCHIVED | ❌ Rollback REJECTED | N/A | Closed terminal state |

### 2.3 Field Restoration Rules

**Content fields restored** — per content-type whitelist:
- Products: name, slug, objectCategory, theme, story, materials, coverImage, gallery, inspiration, keywords, lifeStage, suitableFor, sortOrder, materialOrigin, craftMethod, completionDate, serialNumber, creationStory, emotionalState, companionsCount, productType
- Journal: title, slug, excerpt, content, coverImage, coverAlt, readingTime, category, seoTitle, seoDescription, sortOrder
- Series: slug, name, description, coverImage, heroText, longDesc, shortDesc, sortOrder
- Banners: title, subtitle, btnText, imageUrl, mobileImageUrl, linkUrl, position, sortOrder, startAt, endAt
- Home/PageContent: **not supported in Phase E2B**; its legacy Publisher path remains deferred.

**NEVER restored:** status, publishStatus, publish_status, workflowState, publishedAt, scheduledAt, id, createdAt, updatedAt, created_at, updated_at, version metadata, audit metadata, erpProductId, erp_product_id, sku, seriesId, relations, inventory (`stock`, `remainingQty`), or ERP-owned cost/price fields.

### 2.4 Side Effects

| Effect | Behavior |
|--------|----------|
| New content_version created? | ✅ YES — with status `"RESTORED"` |
| Historical versions modified? | ❌ NO — immutable |
| Pending publish_jobs cancelled? | ✅ YES — only pending jobs for the same content type and content ID |
| PublishedAt changed? | ❌ NO — preserved as-is |
| Audit log written? | ✅ YES — actor, reason, sourceVersion, contentType, contentId |
| Preview tokens invalidated? | ⏳ Deferred to Phase E3 |

### 2.5 UI Requirements

| Requirement | Rule |
|------------|------|
| Confirmation dialog | **Required.** Text: "此操作会立即使用所选历史版本替换当前线上内容。无需重新审核，操作不可静默撤销。" |
| Reason field | **Required.** Trimmed, 5–500 characters; URLs and credential-like values are rejected before audit logging. |
| Source version displayed | Must show which version is being restored |
| Current state displayed | Must show current status and "will remain unchanged" |
| Permission check | Admin/publisher-level role required |
| ARCHIVED content | Rollback button hidden or disabled |

---

## 3. Consequences

### Positive

1. Rollback is implementable immediately — no schema change, no storefront migration, no data backfill.
2. Rollback restores previously-approved content — not arbitrary edits.
3. Full audit trail provides governance.
4. Confirmation dialog prevents accidental rollbacks.
5. RESTORED version captures the event for future reference.
6. Lifecycle integrity preserved — Publisher remains exclusive status owner.

### Negative

1. Rollback bypasses normal review workflow — deliberately, for emergency scenarios.
2. An incorrectly-executed rollback changes live content — mitigated by:
   - Confirmation dialog
   - Reason requirement
   - Audit log
   - RESTORED version (can rollback the rollback)
3. PUBLISHED status must be explicitly understood as potentially overwritable by emergency operations.

---

## 4. Compliance

| Rule | Enforced By |
|------|-------------|
| G-ROLLBACK-01: Target version must belong to same contentType + contentId | `rollbackToVersion()` code |
| G-ROLLBACK-02: Snapshot restore uses field whitelist, not snapshot spread | Static code review + tests |
| G-ROLLBACK-03: status/publishStatus/publishedAt NEVER restored | Static code review + tests |
| G-ROLLBACK-04: Historical versions never modified | Code review |
| G-ROLLBACK-05: Audit log written with actor + reason | Static code review |
| G-ROLLBACK-06: Pending publish_jobs cancelled | Code review |
| G-ROLLBACK-07: RESTORED version created | Unit test |
| G-ROLLBACK-08: Unsupported content types fail closed | Unit test |
| G-ROLLBACK-09: ARCHIVED content rejected | Unit test |

---

## 5. Non-Goals

| Non-Goal | Reason |
|----------|--------|
| Published projection / live table architecture | Phase G — not needed for rollback |
| Storefront read model migration | Not needed — rollback preserves PUBLISHED status |
| Schema change of any kind | Not needed |
| Data migration / backfill | Not needed |
| Revision pointer model | Phase G — Option C rejected |
| Preview token invalidation | Phase E3 |

---

## 6. References

- ADR-001: Publish Status Contract
- ADR-003/004: Client Defaults and Write Contract
- Phase E2A Report: Production Storefront Read Model (CASE C finding)
- Phase E2A-2 Decision: Emergency Immediate Restore (Option A)
