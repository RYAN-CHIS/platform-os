# Phase D2b-1b — Journal Taxonomy Contract Correction

**Date:** 2026-07-13
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**HEAD:** `dcc0298` (Phase D2b-1a complete)
**ADC Journal Review:** `docs/PHASE_D2B_1B_JOURNAL_TAXONOMY_WORKFLOW_CONTRACT_REVIEW_2026-07-13.md`

---

## 1. Executive Correction

The previous review proposed `TRAVELER → DONGHAI` and `OTHER → MATERIAL` without sufficient evidence. This correction document:

1. Establishes evidence-based decisions for each legacy category value
2. Corrects the workflow model description (Journal ≠ Product dual-column system)
3. Defines a fail-closed contract for ambiguous values

**Three confirmed auto-mappings, two rejected auto-mappings.**

---

## 2. Evidence for Each Legacy Category

### 2.1 ARTIFACT (器物志) → OBJECT (器物)

| Evidence Source | Finding |
|----------------|---------|
| UI label | `器物志` = "artifact/object chronicle" |
| Canonical `OBJECT` | `器物` = "artifact/object" |
| Chinese root | **Same character 器物** — direct semantic match |
| Seed data | "关于七序" (OBJECT) — explains brand worldview through the Seven Sequences, which are about artifacts |
| Seed data | "为什么做印章" (OBJECT) — about why Yunwu makes seals (artifacts) |
| Canonical enum definition | OBJECT = 器物 |

**Verdict: AUTO_MAP. Evidence is STRONG.** The Chinese label "器物志" and canonical "器物" share the same root character. Seed content categorized as OBJECT is about artifacts/objects. One-to-one mapping.

### 2.2 BRAND (品牌志) → PHILOSOPHY (哲思)

| Evidence Source | Finding |
|----------------|---------|
| UI label | `品牌志` = "brand chronicle" |
| Canonical `PHILOSOPHY` | `哲思` = "philosophical thoughts" |
| Seed data | "为什么允物不谈开运" (PHILOSOPHY) — explains brand philosophy: why Yunwu doesn't promise luck, the Three Principles (三不原则) |
| Content type | Brand chronicle IS philosophical narrative — about the brand's core values, beliefs, and worldview |
| No evidence | No brand news, announcements, or corporate updates exist |
| Canonical enum definition | PHILOSOPHY = 哲思 |

**Verdict: AUTO_MAP. Evidence is STRONG.** The brand chronicle content is philosophical in nature. The seed's brand philosophy article is categorized as PHILOSOPHY. The "品牌志" label reflects the overall section name, but the content within it is brand philosophy.

### 2.3 CRAFT (工艺) → CRAFT (工艺)

| Evidence Source | Finding |
|----------------|---------|
| UI label | `工艺` = "craft/craftsmanship" |
| Canonical `CRAFT` | `工艺` = "craft/craftsmanship" |
| Seed data | "掐丝珐琅研究" (CRAFT) — research about cloisonné craftsmanship |
| Chinese root | **Exact character match** |

**Verdict: AUTO_MAP. Evidence is DEFINITIVE.** Same Chinese characters. Seed confirms. No ambiguity.

### 2.4 TRAVELER (同行者说) — REJECT AUTO-MAP

| Evidence Source | Finding |
|----------------|---------|
| UI label | `同行者说` = "fellow traveler says" |
| Baseline definition | "User Term: 同行者 (Fellow Traveler)" — this is Yunwu's term for **customers** |
| TRAVELER content type | Customer stories, user experiences, companion narratives |
| Canonical `DONGHAI` | `东海` = "East Sea" — a **geographic location** (the Donghai market) |
| Seed DONGHAI content | "东海寻珠记" — a **founder's travelogue** about sourcing materials at the Donghai market |
| Semantic mismatch | TRAVELER = customer stories; DONGHAI = founder travelogue |
| Mapping to other options | CREATION (创作) = creative process — not customer stories. OBJECT (器物) = artifacts — not customer stories. MATERIAL (材料) = materials — not customer stories. **No canonical value matches TRAVELER.** |

**Key finding:** TRAVELER (同行者说) is the user-facing term for "Fellow Traveler" content — customer stories and companion narratives. No canonical JournalCategory value fits this semantic:

| Candidate | Reason for rejection |
|-----------|---------------------|
| DONGHAI | DONGHAI is a geographic place (Donghai market). TRAVELER is about customer experiences. |
| CREATION | CREATION is about the creative/craftsmanship process. Not customer stories. |
| PHILOSOPHY | PHILOSOPHY is brand worldview. Not customer stories. |
| OBJECT | OBJECT is about artifacts. Not customer stories. |
| MATERIAL | MATERIAL is about materials. Not customer stories. |

**Verdict: REQUIRE_MANUAL_SELECTION. No evidence for any automatic mapping.**

### 2.5 OTHER (其他) — REJECT AUTO-MAP

| Evidence Source | Finding |
|----------------|---------|
| UI label | `其他` = "other / miscellaneous" |
| Semantic | Catch-all bucket for unclassified content |
| MATERIAL mapping attempt | MATERIAL = "材料" — a **specific content theme** about materials. NOT a catch-all. |
| No evidence | No existing content tagged OTHER in DB (PostgreSQL JournalCategory enum rejects it). No historical usage. |

**Verdict: REQUIRE_MANUAL_SELECTION. No automatic mapping. "OTHER" is a UX placeholder, not a content category.**

---

## 3. Confirmed One-to-One Mappings

| Legacy Value | Canonical Value | Evidence Strength | Action |
|-------------|----------------|-----------------|--------|
| `ARTIFACT` | `OBJECT` | STRONG — same Chinese root | ✅ Auto-map |
| `BRAND` | `PHILOSOPHY` | STRONG — brand philosophy content | ✅ Auto-map |
| `CRAFT` | `CRAFT` | DEFINITIVE — exact Chinese match | ✅ Auto-map (pass-through) |

## 4. Reject Mappings (No Auto-Map)

| Legacy Value | Proposed In Previous Review | Rejected Because | Correct Action |
|-------------|---------------------------|-----------------|----------------|
| `TRAVELER` | `DONGHAI` | DONGHAI = geographic place; TRAVELER = customer stories. No semantic overlap. | ❌ Validation error — require manual selection |
| `OTHER` | `MATERIAL` | MATERIAL = specific content theme; OTHER = catch-all. No semantic overlap. | ❌ Validation error — require manual selection |

---

## 5. Options Considered

### Option A: Auto-map all 5 values (REJECTED)

Previous review's proposal. TRAVELER → DONGHAI and OTHER → MATERIAL lack evidence. Would silently misclassify content.

### Option B: Auto-map 3 confirmed + reject 2 ambiguous (RECOMMENDED)

ARTIFACT → OBJECT, BRAND → PHILOSOPHY, CRAFT → CRAFT auto-mapped. TRAVELER and OTHER return validation errors requiring manual selection.

### Option C: UI directly uses canonical values only (RECOMMENDED FOR UI)

The dropdown shows canonical values. Auto-mapping handles backward compatibility for API callers who submit legacy values.

### Option D: Legacy compatibility with explicit unmapped state

Mapped values pass through. Unmapped values throw. Only for API-level backward compat.

---

## 6. Final Application Mapping Contract

```typescript
import { JournalCategory } from "@yunwu/brand-db";

// Legacy UI values → canonical JournalCategory mapping.
// Only values with strong semantic evidence are auto-mapped.
// Ambiguous values (TRAVELER, OTHER) cause validation errors.
const CATEGORY_MAP: Record<string, JournalCategory> = {
  ARTIFACT: JournalCategory.OBJECT,
  BRAND: JournalCategory.PHILOSOPHY,
  CRAFT: JournalCategory.CRAFT,
};

// Accept legacy input and return a canonical JournalCategory or error.
// Used in createPost and updatePost save paths.
function resolveJournalCategory(input: string): 
  { category: JournalCategory } | { error: string } 
{
  if (!input) return { category: JournalCategory.OBJECT };
  
  // Canonical values pass through directly.
  const upper = input.toUpperCase();
  if (Object.values(JournalCategory).includes(upper as JournalCategory)) {
    return { category: upper as JournalCategory };
  }
  
  // Auto-mapped legacy values.
  const mapped = CATEGORY_MAP[upper];
  if (mapped) return { category: mapped };
  
  // Ambiguous values — fail closed.
  return { error: `无法识别的分类 "${input}"。请选择：${Object.values(JournalCategory).join("、")}` };
}
```

### Category Resolution Flow

```
Input from form/API
    │
    ├─ Canonical enum value? (OBJECT, MATERIAL, CRAFT, DONGHAI, CREATION, PHILOSOPHY)
    │   └─ Accept directly
    │
    ├─ Auto-mapped legacy value? (ARTIFACT → OBJECT, BRAND → PHILOSOPHY, CRAFT → CRAFT)
    │   └─ Map and accept
    │
    ├─ Ambiguous legacy value? (TRAVELER, OTHER)
    │   └─ Return validation error: "请重新选择分类"
    │
    └─ Unknown value?
        └─ Return validation error
```

---

## 7. Fail-Closed Behavior

| Situation | Behavior | Error Message |
|-----------|----------|---------------|
| `ARTIFACT` submitted | ✅ Auto-mapped to `OBJECT` | No error (silent success) |
| `BRAND` submitted | ✅ Auto-mapped to `PHILOSOPHY` | No error |
| `CRAFT` submitted | ✅ Pass-through | No error |
| `TRAVELER` submitted | ❌ Validation error | "分类「同行者说」需要重新选择。请从以下分类中选择：器物、材料、工艺、东海、创作、哲思" |
| `OTHER` submitted | ❌ Validation error | "分类「其他」需要重新选择。请从以下分类中选择：器物、材料、工艺、东海、创作、哲思" |
| Empty/null submitted | ✅ Defaults to `OBJECT` | No error |
| Canonical value submitted | ✅ Pass-through | No error |

### Why Fail-Closed for TRAVELER/OTHER?

| Reason | Explanation |
|--------|-------------|
| **No safe default** | Guessing would silently misclassify content |
| **No existing data** | PostgreSQL enum prevents existing TRAVELER/OTHER rows from existing |
| **Editor workflow** | Validation error prompts editor to actively choose the correct category |
| **No UX regression** | The category dropdown shows canonical values — editors CAN choose correctly |
| **Future-proof** | If TRAVELER content later warrants a new canonical category, no misclassified data to migrate |

---

## 8. Canonical UI Contract

The category dropdown must use canonical `JournalCategory` values directly:

```typescript
const CATEGORY_OPTIONS = [
  { label: "器物", value: "OBJECT" },
  { label: "材料", value: "MATERIAL" },
  { label: "工艺", value: "CRAFT" },
  { label: "东海", value: "DONGHAI" },
  { label: "创作", value: "CREATION" },
  { label: "哲思", value: "PHILOSOPHY" },
];
```

| Aspect | Decision |
|--------|----------|
| Dropdown values | Canonical enum values (OBJECT, MATERIAL, CRAFT, DONGHAI, CREATION, PHILOSOPHY) |
| Dropdown labels | Chinese labels: 器物, 材料, 工艺, 东海, 创作, 哲思 |
| Default | `OBJECT` (replaces legacy `ARTIFACT` default) |
| Legacy display | Existing `ARTIFACT`/`BRAND` rows display as `OBJECT`/`PHILOSOPHY` in read path (no data change) |

**The 器物志/品牌志/同行者说/工艺/其他 dropdown has been replaced by this canonical dropdown.**

---

## 9. Save Validation Contract

### 9.1 Create Path

```typescript
// createPost (D2b-1b typed migration)
const categoryResult = resolveJournalCategory(data.category as string);
if ('error' in categoryResult) return { row: null, error: categoryResult.error };

const post = await brandDb.journalPost.create({
  data: {
    title: String(data.title || ""),
    slug: String(data.slug || ""),
    content: String(data.content || ""),
    category: categoryResult.category,
    // status is NOT passed — schema default @default(DRAFT) handles it
    // All other non-status fields...
  }
});
```

### 9.2 Update Path

```typescript
// updatePost (D2b-1b typed migration)
const { status, publish_status, publishStatus, ...safeData } = data;

if (safeData.category) {
  const categoryResult = resolveJournalCategory(safeData.category as string);
  if ('error' in categoryResult) return { error: categoryResult.error };
  safeData.category = categoryResult.category;
}

const post = await brandDb.journalPost.update({
  where: { id: cuid },
  data: {
    ...safeData,
    // updatedAt is handled by @updatedAt — NOT passed
  },
});
```

### 9.3 Stripped Fields

The following fields are STRIPPED from all ordinary CRUD write operations:

| Field | Stripped? | Reason |
|-------|-----------|--------|
| `status` | ✅ Stripped | Publisher-owned workflow |
| `publish_status` | ✅ Stripped | Not a field on journal_posts |
| `publishStatus` | ✅ Stripped | Not a field on journal_posts |
| `updated_at` | ✅ Stripped | Handled by `@updatedAt` |

---

## 10. Corrected Workflow Model Description

### What Journal is NOT

Journal is **not** like Product's dual-column system:

| Aspect | Product | Journal |
|--------|---------|---------|
| Status column 1 | `status` (text CHECK — 7 workflow values) | — |
| Status column 2 | `publish_status` (PublishStatus enum — 6 persistence values) | `status` (PublishStatus enum — 6 values) |
| Has free-text workflow column? | ✅ Yes | ❌ **No** |
| Has separate publishStatus column? | ✅ Yes | ❌ **No** |

### What Journal IS

Journal has a **single** `status` column of type `PublishStatus (enum)` with exactly 6 canonical values:
`DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED`

### Implications

| Concept | Where it lives | Status |
|---------|---------------|--------|
| `DRAFT` | JournalPost.status = DRAFT | ✅ Persistable |
| `PENDING_REVIEW` | JournalPost.status = PENDING_REVIEW | ✅ Persistable (but not exposed in Publisher yet) |
| `APPROVED` | JournalPost.status = APPROVED | ✅ Persistable |
| `PUBLISHED` | JournalPost.status = PUBLISHED | ✅ Persistable |
| `UNPUBLISHED` | JournalPost.status = UNPUBLISHED | ✅ Persistable |
| `ARCHIVED` | JournalPost.status = ARCHIVED | ✅ Persistable |
| `IN_REVIEW` | **Workflow command only** — NOT in PublishStatus enum | ⏳ Phase E (must map to PENDING_REVIEW) |
| `SCHEDULED` | **Workflow command only** — NOT in PublishStatus enum | ⏳ Phase E (must map to APPROVED + publish_jobs) |
| `REJECTED` | **Workflow command only** — NOT in PublishStatus enum | ⏳ Phase E (must remain in metadata/audit log) |

### Shared Governance Principle (Journal = Product)

| Rule | Product | Journal |
|------|---------|---------|
| ordinary CRUD owns `status`? | ❌ Publisher only | ❌ Publisher only |
| ordinary CRUD owns `publishStatus`? | ❌ Publisher only | ❌ N/A (no such column) |
| `create` can set initial value? | ✅ Only DRAFT | ✅ Only DRAFT (via @default) |
| UI form directly edits `status`? | ❌ Removed | ❌ Must be removed |

---

## 11. Exact Codex Scope

### 11.1 Files to Modify

| # | File | Change |
|---|------|--------|
| 1 | `modules/brand/journal/actions.ts` | Migrate to `brandDb.journalPost.*` (7 functions). Add `resolveJournalCategory()`. Strip `status` from create/update data. Strip `publish_status`/`publishStatus`. Keep Publisher wrappers (12 functions, zero diff except import line). |
| 2 | `app/(platform)/brand/journal/client.tsx` | Replace `CATEGORY_OPTIONS` with canonical JournalCategory values. Remove `status` from form submission payload. Update default category to `OBJECT`. |

### 11.2 Category Mapping Function

```typescript
import { JournalCategory } from "@yunwu/brand-db";

const LEGACY_CATEGORY_MAP: Record<string, JournalCategory> = {
  ARTIFACT: JournalCategory.OBJECT,
  BRAND: JournalCategory.PHILOSOPHY,
  CRAFT: JournalCategory.CRAFT,
};

function resolveJournalCategory(input: string):
  { category: JournalCategory } | { error: string }
{
  if (!input) return { category: JournalCategory.OBJECT };
  const upper = input.toUpperCase();
  
  // Canonical values pass through.
  if (Object.values(JournalCategory).includes(upper as JournalCategory)) {
    return { category: upper as JournalCategory };
  }
  
  // Legacy auto-maps.
  const mapped = LEGACY_CATEGORY_MAP[upper];
  if (mapped) return { category: mapped };
  
  // Fail closed for ambiguous values.
  return { error: `分类 "${input}" 无法识别，请重新选择` };
}
```

### 11.3 Functions to Migrate (7)

| Function | Current | Target |
|----------|---------|--------|
| `listPosts` | `brandPrisma.$queryRawUnsafe` SELECT | `brandDb.journalPost.findMany` |
| `createPost` | `brandPrisma.$queryRawUnsafe` INSERT | `brandDb.journalPost.create` + category resolve |
| `updatePost` | `brandPrisma.$queryRawUnsafe` UPDATE | `brandDb.journalPost.update` + category resolve + status strip |
| `deletePost` | `brandPrisma.$queryRawUnsafe` DELETE | `brandDb.journalPost.delete` |
| `movePost` | `brandPrisma.$queryRawUnsafe` 2x UPDATE | `brandDb.journalPost.update` sort swap |
| `savePostSeoSnapshot` | `brandPrisma.$queryRawUnsafe` SELECT | `brandDb.journalPost.findUnique` + snapshot create |
| `updatePostSeo` | `brandPrisma.$executeRawUnsafe` UPDATE | `brandDb.journalPost.update` + snapshot create |

### 11.4 Functions to Keep Untouched (12 — Phase E)

`submitPostForReview`, `approvePost`, `rejectPost`, `publishPostNow`, `schedulePost`, `unpublishPost`, `archivePost`, `togglePostStatus`, `getPostVersions`, `rollbackPost`, `getPostPreviewToken`, `getPostStatus`

These remain as Publisher wrappers. The only change is the import source (`brandPrisma` → `brandDb` may be needed for type compatibility, but the function body is untouched).

### 11.5 UI Dropdown

```typescript
// Before (legacy — causes DB enum errors)
const CATEGORY_OPTIONS = [
  { label: "器物志", value: "ARTIFACT" },
  { label: "品牌志", value: "BRAND" },
  { label: "同行者说", value: "TRAVELER" },
  { label: "工艺", value: "CRAFT" },
  { label: "其他", value: "OTHER" },
];

// After (canonical — DB-safe)
const CATEGORY_OPTIONS = [
  { label: "器物", value: "OBJECT" },
  { label: "材料", value: "MATERIAL" },
  { label: "工艺", value: "CRAFT" },
  { label: "东海", value: "DONGHAI" },
  { label: "创作", value: "CREATION" },
  { label: "哲思", value: "PHILOSOPHY" },
];
```

---

## 12. Guard Requirements

| Rule ID | Check | Scope | Type |
|---------|-------|-------|------|
| G-JOURNAL-CAT-01 | `CATEGORY_MAP` only contains ARTIFACT, BRAND, CRAFT | actions.ts | Static code review |
| G-JOURNAL-CAT-02 | No automatic mapping for TRAVELER or OTHER | actions.ts | Static code review |
| G-JOURNAL-CAT-03 | `resolveJournalCategory` returns `{ error }` for unknown input | actions.ts | Unit test |
| G-JOURNAL-CAT-04 | `resolveJournalCategory` passes canonical values through | actions.ts | Unit test |
| G-JOURNAL-WF-01 | `updatePost` strips `status` from data | actions.ts | Static code review |
| G-JOURNAL-WF-02 | `updatePost` strips `publish_status`/`publishStatus` from data | actions.ts | Static code review |
| G-JOURNAL-WF-03 | `createPost` does not pass `status` explicitly | actions.ts | Static code review |
| G-JOURNAL-WF-04 | UI form does not include `status` in submission payload | client.tsx | Code review |

---

## 13. Deferred Items

| Item | Deferred To | Reason |
|------|-------------|--------|
| Publisher journal status enum mapping (IN_REVIEW, SCHEDULED, REJECTED) | Phase E | Requires Publisher refactor |
| UI label refinement (器物 vs 器物志) | Post-D2b | UX preference, not migration blocker |
| New canonical category for TRAVELER-style content | ADR-005 or later | Semantic decision requires product team input |

---

## 14. Forbidden Actions

| Action | Reason |
|--------|--------|
| Modify `lib/publisher.ts` | Phase E exclusive |
| Modify `JournalCategory` enum | Not needed — 6 canonical values correct |
| Modify `PublishStatus` enum | Not needed — 6 values correct per ADR-001 |
| Add DDL to `journal_posts` table | Not needed — schema matches DB |
| Auto-map TRAVELER to any canonical value | No evidence for correct mapping |
| Auto-map OTHER to any canonical value | No evidence for correct mapping |
| Remove `resolveJournalCategory` validation | Would allow silent misclassification |
| Keep legacy CATEGORY_OPTIONS in UI | Would continue submitting non-enum values |

---

## Required Questions — Answers

| Decision | Verdict | Evidence |
|----------|---------|----------|
| `ARTIFACT` | **AUTO_MAP → OBJECT** | Same Chinese root (器物). Seed confirms. STRONG. |
| `BRAND` | **AUTO_MAP → PHILOSOPHY** | Brand content = philosophical narrative. Seed confirms. STRONG. |
| `TRAVELER` | **REJECT AUTO-MAP** | No canonical value matches "customer stories" semantic. DONGHAI is a geographic place, not a content category for customer narratives. |
| `CRAFT` | **AUTO_MAP → CRAFT** | Exact Chinese character match (工艺). DEFINITIVE. |
| `OTHER` | **REJECT AUTO-MAP** | "Other" is a catch-all UX placeholder, not a content category. MATERIAL is a specific content theme, not a catch-all. |

| Question | Answer |
|----------|--------|
| Canonical UI contract | Dropdown shows canonical JournalCategory values (OBJECT, MATERIAL, CRAFT, DONGHAI, CREATION, PHILOSOPHY) |
| Save validation contract | `resolveJournalCategory()` returns `{ error }` for TRAVELER, OTHER, and unknown values |
| Journal workflow model | Single `status` column = PublishStatus enum (6 values). Not a dual-column system like Product. IN_REVIEW/SCHEDULED/REJECTED are workflow commands only, NOT persistable values. |
| Schema change required | **NO** |
| Data migration required | **NO** — PostgreSQL enum prevents invalid category values from existing in DB |
| Publisher changes in Phase D | **NO** (Phase E only) |
| Codex implementation readiness | **READY** — 7 CRUD functions, category mapping, status stripping, canonical UI dropdown |

---

```
PHASE D2B-1B JOURNAL TAXONOMY CORRECTION COMPLETE

WORKDIR:                      /Users/ryan/Projects/active/platform-os
HEAD:                         dcc0298
ARTIFACT decision:            AUTO_MAP → OBJECT (strong evidence)
BRAND decision:               AUTO_MAP → PHILOSOPHY (strong evidence)
TRAVELER decision:            REJECT AUTO-MAP → validation error
CRAFT decision:               AUTO_MAP → CRAFT (definitive, exact match)
OTHER decision:               REJECT AUTO-MAP → validation error
Canonical UI contract:        Dropdown uses canonical JournalCategory values (6 values)
Save validation contract:     Fail-closed for TRAVELER, OTHER — require manual selection
Journal workflow model:       Single PublishStatus enum column. IN_REVIEW/SCHEDULED/REJECTED = workflow commands only.
Schema change required:       NO
Data migration required:      NO
Publisher changes in Phase D: NO
Codex implementation readiness: READY
Report path:                  docs/PHASE_D2B_1B_JOURNAL_TAXONOMY_CONTRACT_CORRECTION_2026-07-13.md
Modified files:               NONE (read-only)
Database operations:          NONE
Commit SHA:                   NONE
Push:                         NOT EXECUTED
Next Codex scope:             D2b-1b: Journal typed migration (7 functions) + category mapping + status stripping + canonical UI dropdown
```
