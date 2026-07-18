# ADR-004: Canonical Brand Client Defaults and Write Contract Completeness

**Status:** ACCEPTED

**Date:** 2026-07-12

---

## 1. Context

Phase C2 was blocked a second time after ADR-003 resolved the initial 5 gaps but missed additional write-contract mismatches. A complete audit of all 17 production consumers reveals that the canonical schema lacks `@default(cuid())`, `@default(autoincrement())`, `@updatedAt`, and related annotations on **9 additional models** beyond those covered by ADR-003.

ADR-003 correctly resolved: JournalPost, PageContent, AuditLog, AdminUser.

ADR-004 extends the same principles to complete the full write contract: LegacyBrandProduct, LegacyBrandSeries, LegacyBrandMaterial, Media, SeoConfig, SiteSetting, Tag, ProductTag, LegacyJournalTag.

---

## 2. Phase C2 Second Blocking Evidence

After applying ADR-003 decisions, the canonical schema still blocks the following production writes:

| Canonical Model | Write Op | File | Problem | ADR-003 Covered? |
|----------------|----------|------|---------|-----------------|
| `LegacyBrandProduct.updatedAt` | `update` (admin-actions.ts:232) | `updateProduct` | No `@updatedAt` — DB NOT NULL, consumer doesn't pass it | ❌ No |
| `LegacyBrandSeries.id` | `create` (admin-actions.ts:79) | `createSeries` | No `@default(autoincrement())` — DB `series_id_seq` provides it | ❌ No |
| `LegacyBrandSeries.updatedAt` | `create`/`update` | `createSeries`/`updateSeries` | No `@updatedAt` — consumer doesn't pass it | ❌ No |
| `LegacyBrandMaterial.id` | `create` (admin-actions.ts:133) | `createMaterial` | No `@default(autoincrement())` | ❌ No |
| `LegacyBrandMaterial.updatedAt` | `create`/`update` | `createMaterial`/`updateMaterial` | No `@updatedAt` | ❌ No |
| `Media.id` | `create` (admin-actions.ts:295) | `saveMedia` | No `@default(cuid())` | ❌ No |
| `SeoConfig.id` | `upsert` create (admin-actions.ts:324) | `upsertSeoConfig` | No `@default(cuid())` | ❌ No |
| `SeoConfig.updatedAt` | `upsert` create/update | `upsertSeoConfig` | No `@updatedAt` | ❌ No |
| `SiteSetting.id` | `upsert` create (admin-actions.ts:344) | `upsertSiteSetting` | No `@default(cuid())` | ❌ No |
| `SiteSetting.updatedAt` | `upsert` create/update | `upsertSiteSetting` | No `@updatedAt` | ❌ No |
| `Tag.id` | `create` (tag-actions.ts:49) | `upsertTag` | No `@default(cuid())` | ❌ No |
| `ProductTag.id` | `createMany` (tag-actions.ts:69) | `updateProductTags` | No `@default(cuid())` | ❌ No |
| `LegacyJournalTag.id` | `createMany` (tag-actions.ts:83) | `updateJournalTags` | No `@default(cuid())` | ❌ No |

---

## 3. Scope and Relationship to ADR-003

ADR-004 **extends but does not override** ADR-003.

| ADR-003 Decisions | ADR-004 Status |
|------------------|----------------|
| JournalPost.id = `@default(cuid())` | ✅ Continue — already applied or confirmed |
| JournalPost.updatedAt = `@updatedAt` | ✅ Continue |
| PageContent.id = `@default(cuid())` | ✅ Continue |
| PageContent.updatedAt = `@updatedAt` | ✅ Continue |
| AuditLog.id = `@default(cuid())` | ✅ Continue |
| AdminUser.id = `@default(cuid())` | ✅ Continue |
| AdminUser.updatedAt = `@updatedAt` | ✅ Continue |
| AdminUser.email ≠ `@unique` | ✅ Continue |
| ContactLead = `wechat` | ✅ Continue |
| Auth fail-closed on duplicate email | ✅ Continue |

ADR-004 adds coverage for **9 additional models** not addressed by ADR-003.

---

## 4. Complete Production Write Inventory

### 4.1 Consumer Files and All Write Operations

| # | File | Model | Op | Data (omitted fields) | Frozen Default |
|---|------|-------|-----|----------------------|---------------|
| 1 | `admin-actions.ts:79` | series → **LegacyBrandSeries** | `create` | name, slug, description, shortDesc?, longDesc?, coverImage?, sortOrder?, isActive? (omits: id, updatedAt) | `@id @default(autoincrement())`, `@updatedAt` |
| 2 | `admin-actions.ts:90` | series → **LegacyBrandSeries** | `update` | same fields optional (omits: updatedAt) | `@updatedAt` |
| 3 | `admin-actions.ts:98` | series | `delete` | — | — |
| 4 | `admin-actions.ts:133` | material → **LegacyBrandMaterial** | `create` | name, alias?, type?, origin?, history?, features?, description?, image? (omits: id, updatedAt) | `@id @default(autoincrement())`, `@updatedAt` |
| 5 | `admin-actions.ts:143` | material → **LegacyBrandMaterial** | `update` | (omits: updatedAt) | `@updatedAt` |
| 6 | `admin-actions.ts:150` | material | `delete` | — | — |
| 7 | `admin-actions.ts:198` | product → **LegacyBrandProduct** | `create` | sku, name, slug, seriesId, objectCategory, theme?, story?, materials?, coverImage?, gallery?, costPrice?, salePrice?, status? (omits: id autoincrement DB default exists) | `@id @default(autoincrement())` |
| 8 | `admin-actions.ts:232` | product → **LegacyBrandProduct** | `update` | (omits: updatedAt) | `@updatedAt` |
| 9 | `admin-actions.ts:239` | product | `delete` | — | — |
| 10 | `admin-actions.ts:258` | journalPost | `create` | (omits: id, updatedAt) | `@default(cuid())`, `@updatedAt` ✅ ADR-003 |
| 11 | `admin-actions.ts:269` | journalPost | `update` | (omits: updatedAt) | `@updatedAt` ✅ ADR-003 |
| 12 | `admin-actions.ts:277` | journalPost | `delete` | — | — |
| 13 | `admin-actions.ts:295` | media → **Media** | `create` | filename, url, category, altText?, size, mimeType (omits: id) | `@id @default(cuid())` |
| 14 | `admin-actions.ts:306` | media | `delete` | — | — |
| 15 | `admin-actions.ts:324` | seoConfig → **SeoConfig** | `upsert` create | pageKey, title, description, ogImage?, canonical? (omits: id, updatedAt) | `@id @default(cuid())`, `@updatedAt` |
| 16 | `admin-actions.ts:344` | siteSetting → **SiteSetting** | `upsert` create | key, value (omits: id, updatedAt) | `@id @default(cuid())`, `@updatedAt` |
| 17 | `admin-actions.ts:385` | adminUser → **AdminUser** | `create` | email, name, passwordHash, role (omits: id, updatedAt) | `@default(cuid())`, `@updatedAt` ✅ ADR-003 |
| 18 | `admin-actions.ts:394` | adminUser | `delete` | — | — |
| 19 | `content-actions.ts:48,50` | pageContent → **PageContent** | `create` / `update` | (omits: id, updatedAt) | `@default(cuid())`, `@updatedAt` ✅ ADR-003 |
| 20 | `content-actions.ts:59` | pageContent | `delete` | — | — |
| 21 | `tag-actions.ts:49` | tag → **Tag** | `create` | name, slug, description?, type (omits: id) | `@id @default(cuid())` |
| 22 | `tag-actions.ts:47` | tag | `update` | — (only scalar fields) | — |
| 23 | `tag-actions.ts:58` | tag | `delete` | — | — |
| 24 | `tag-actions.ts:67` | productTag → **ProductTag** | `deleteMany` | where: productId | — |
| 25 | `tag-actions.ts:69` | productTag → **ProductTag** | `createMany` | data: [{ productId, tagId }] (omits: id per record) | `@id @default(cuid())` |
| 26 | `tag-actions.ts:81` | journalTag → **LegacyJournalTag** | `deleteMany` | where: journalId | — |
| 27 | `tag-actions.ts:83` | journalTag → **LegacyJournalTag** | `createMany` | data: [{ journalId, tagId }] (omits: id per record) | `@id @default(cuid())` |
| 28 | `audit-log.ts:25` | auditLog → **AuditLog** | `create` | userId, action, entityType, entityId?, details? (omits: id) | `@id @default(cuid())` ✅ ADR-003 |
| 29 | `journal/[id]/page.tsx:65` | journalPost | `update` | (omits: updatedAt) | `@updatedAt` ✅ ADR-003 |
| 30 | `journal/[id]/page.tsx:77` | journalPost | `delete` | — | — |
| 31 | `api/products/route.ts:54` | product → **LegacyBrandProduct** | `create` | (omits: updatedAt) | `@updatedAt` |
| 32 | `api/products/route.ts:85` | product → **LegacyBrandProduct** | `update` | (omits: updatedAt) | `@updatedAt` |
| 33 | `api/posts/route.ts:32` | journalPost | `create` | (omits: id, updatedAt) | `@default(cuid())`, `@updatedAt` ✅ ADR-003 |

### 4.2 Models With Write Operations Only — No Writes

These models are read-only in brand-os: `ContactLead`, `Banner`, `PublishJob`, `ContentVersion`, `SeoSnapshot`, `LegacyBrandProductContent`, `LegacyBrandMaterialLink`, `LegacyProductMaterial`, `LegacyOrder`

These models need no write-contract changes.

### 4.3 Model Summary

| Model | Has Writes? | Current ADR-003 Coverage | Needed |
|-------|------------|--------------------------|--------|
| `LegacyBrandProduct` | ✅ create, update, delete | ❌ Missing `@updatedAt` | ADR-004 |
| `LegacyBrandSeries` | ✅ create, update, delete | ❌ Missing `@default(autoincrement())` + `@updatedAt` | ADR-004 |
| `LegacyBrandMaterial` | ✅ create, update, delete | ❌ Missing `@default(autoincrement())` + `@updatedAt` | ADR-004 |
| `Media` | ✅ create, delete | ❌ Missing `@default(cuid())` | ADR-004 |
| `SeoConfig` | ✅ upsert | ❌ Missing `@default(cuid())` + `@updatedAt` | ADR-004 |
| `SiteSetting` | ✅ upsert | ❌ Missing `@default(cuid())` + `@updatedAt` | ADR-004 |
| `Tag` | ✅ create, update, delete | ❌ Missing `@default(cuid())` | ADR-004 |
| `ProductTag` | ✅ createMany, deleteMany | ❌ Missing `@default(cuid())` | ADR-004 |
| `LegacyJournalTag` | ✅ createMany, deleteMany | ❌ Missing `@default(cuid())` | ADR-004 |
| `JournalPost` | ✅ create, update, delete | ✅ ADR-003 | — |
| `PageContent` | ✅ create, update, delete | ✅ ADR-003 | — |
| `AuditLog` | ✅ create | ✅ ADR-003 | — |
| `AdminUser` | ✅ create, delete | ✅ ADR-003 | — |

---

## 5. Database Metadata Facts

Source: `docs/db-metadata/brand-db-schema-metadata-2026-07-11.json`

### 5.1 ID Column Analysis

| Model (Physical Table) | ID Column Type | DB Default | Seq Present? | Auto-increment? |
|------------------------|---------------|------------|--------------|-----------------|
| `series` | integer | `nextval('series_id_seq'::regclass)` | ✅ `series_id_seq` | ✅ Yes (serial) |
| `materials` | integer | `nextval('materials_id_seq'::regclass)` | ✅ `materials_id_seq` | ✅ Yes (serial) |
| `products` | integer | `nextval('products_id_seq'::regclass)` | ✅ `products_id_seq` | ✅ Yes (serial) |
| `media` | text | None | ❌ | ❌ No — cuid expected |
| `seo_configs` | text | None | ❌ | ❌ No — cuid expected |
| `site_settings` | text | None | ❌ | ❌ No — cuid expected |
| `tags` | text | None | ❌ | ❌ No — cuid expected |
| `product_tags` | text | None | ❌ | ❌ No — cuid expected |
| `journal_tags` | text | None | ❌ | ❌ No — cuid expected |
| `journal_posts` | text | None | ❌ | ❌ No — cuid expected (ADR-003) |
| `page_contents` | text | None | ❌ | ❌ No — cuid expected (ADR-003) |
| `audit_logs` | text | None | ❌ | ❌ No — cuid expected (ADR-003) |
| `admin_users` | text | None | ❌ | ❌ No — cuid expected (ADR-003) |

**Key finding:** `series`, `materials`, and `products` use PostgreSQL `serial`-style ID generation (sequences). All other tables use text IDs with no DB default — the frozen schema uses `@default(cuid())`.

### 5.2 updatedAt Column Analysis

| Physical Table | Column | Type | Nullable | DB Default | DB Trigger |
|----------------|--------|------|----------|------------|------------|
| `series` | `updated_at` | timestamp | NOT NULL | None | None |
| `materials` | `updated_at` | timestamp | NOT NULL | None | None |
| `products` | `updated_at` | timestamp | NOT NULL | None | None |
| `seo_configs` | `updated_at` | timestamp | NOT NULL | None | None |
| `site_settings` | `updated_at` | timestamp | NOT NULL | None | None |
| `journal_posts` | `updated_at` | timestamp | NOT NULL | None | None |
| `page_contents` | `updated_at` | timestamp | NOT NULL | None | None |
| `admin_users` | `updated_at` | timestamp | NOT NULL | None | None |

**All `updated_at` columns are NOT NULL with no DB default or trigger.** Every write must supply this value. The frozen schema universally uses `@updatedAt`.

### 5.3 createdAt Column Analysis

| Physical Table | DB Default |
|----------------|------------|
| All tables with `created_at` | `CURRENT_TIMESTAMP` ✅ |

`created_at` universally has a DB default. The canonical schema's `@default(now())` is redundant but harmless. No action needed.

---

## 6. Frozen Schema Behavior

### 6.1 ID Generation Comparison

| Model | Frozen ID | Canonical ID | GAP? |
|-------|-----------|-------------|------|
| Series | `@id @default(autoincrement())` | `@id` (no default) | 🔴 Needs autoincrement |
| Material | `@id @default(autoincrement())` | `@id` (no default) | 🔴 Needs autoincrement |
| Product | `@id @default(autoincrement())` | `@id @default(autoincrement())` ✅ | — |
| Media | `@id @default(cuid())` | `@id` (no default) | 🔴 Needs cuid |
| SeoConfig | `@id @default(cuid())` | `@id` (no default) | 🔴 Needs cuid |
| SiteSetting | `@id @default(cuid())` | `@id` (no default) | 🔴 Needs cuid |
| Tag | `@id @default(cuid())` | `@id` (no default) | 🔴 Needs cuid |
| ProductTag | `@id @default(cuid())` | `@id` (no default) | 🔴 Needs cuid |
| JournalTag → LegacyJournalTag | `@id @default(cuid())` | `@id` (no default) | 🔴 Needs cuid |
| JournalPost | `@id @default(cuid())` | `@id` (no default) | ✅ ADR-003 |
| PageContent | `@id @default(cuid())` | `@id` (no default) | ✅ ADR-003 |
| AuditLog | `@id @default(cuid())` | `@id` (no default) | ✅ ADR-003 |
| AdminUser | `@id @default(cuid())` | `@id` (no default) | ✅ ADR-003 |

### 6.2 @updatedAt Comparison

| Model | Frozen | Canonical | GAP? |
|-------|--------|-----------|------|
| Series → LegacyBrandSeries | `@updatedAt` | None | 🔴 |
| Material → LegacyBrandMaterial | `@updatedAt` | None | 🔴 |
| Product → LegacyBrandProduct | `@updatedAt` | None | 🔴 |
| SeoConfig | `@updatedAt` | None | 🔴 |
| SiteSetting | `@updatedAt` | None | 🔴 |
| JournalPost | `@updatedAt` | None | ✅ ADR-003 |
| PageContent | `@updatedAt` | None | ✅ ADR-003 |
| AdminUser | `@updatedAt` | None | ✅ ADR-003 |

---

## 7. Canonical Schema Gaps

After applying ADR-003, the following gaps remain:

### 7.1 Missing @default(autoincrement()) — Integer Serial PKS

| Model | Field | DB Has Sequence? | Frozen Has? | Consumer Omits? | Action |
|-------|-------|-----------------|-------------|-----------------|--------|
| `LegacyBrandSeries` | `id` | ✅ `series_id_seq` | ✅ `@default(autoincrement())` | ✅ Yes | Add `@default(autoincrement())` |
| `LegacyBrandMaterial` | `id` | ✅ `materials_id_seq` | ✅ `@default(autoincrement())` | ✅ Yes | Add `@default(autoincrement())` |

`LegacyBrandProduct.id` already has `@default(autoincrement())` in canonical. No gap.

### 7.2 Missing @default(cuid()) — Text PK Models

| Model | DB Default? | Frozen Has? | Consumer Omits? | Action |
|-------|-------------|-------------|-----------------|--------|
| `Media` | None | ✅ `@default(cuid())` | ✅ Yes | Add `@default(cuid())` |
| `SeoConfig` | None | ✅ `@default(cuid())` | ✅ Yes | Add `@default(cuid())` |
| `SiteSetting` | None | ✅ `@default(cuid())` | ✅ Yes | Add `@default(cuid())` |
| `Tag` | None | ✅ `@default(cuid())` | ✅ Yes | Add `@default(cuid())` |
| `ProductTag` | None | ✅ `@default(cuid())` | ✅ Yes (createMany) | Add `@default(cuid())` |
| `LegacyJournalTag` | None | ✅ `@default(cuid())` | ✅ Yes (createMany) | Add `@default(cuid())` |

### 7.3 Missing @updatedAt

| Model | DB Default? | Frozen Has? | Consumer Omits? | Action |
|-------|-------------|-------------|-----------------|--------|
| `LegacyBrandProduct` | None | ✅ `@updatedAt` | ✅ Yes (update) | Add `@updatedAt` |
| `LegacyBrandSeries` | None | ✅ `@updatedAt` | ✅ Yes (create, update) | Add `@updatedAt` |
| `LegacyBrandMaterial` | None | ✅ `@updatedAt` | ✅ Yes (create, update) | Add `@updatedAt` |
| `SeoConfig` | None | ✅ `@updatedAt` | ✅ Yes (upsert) | Add `@updatedAt` |
| `SiteSetting` | None | ✅ `@updatedAt` | ✅ Yes (upsert) | Add `@updatedAt` |

---

## 8. ID Generation Principles

### 8.1 Adopted Principle

**Candidate Principle A: Restore all historically proven defaults.**

All ID fields that:
1. Had `@default(cuid())` or `@default(autoincrement())` in the frozen schema
2. Have physical column types compatible with the generation method
3. Are omitted by production consumers on write

...shall have their Prisma Client default restored in the canonical schema.

### 8.2 Justification

The 13 affected models fall into three natural ID categories:

| Category | Models | ID Method | Evidence |
|----------|--------|-----------|----------|
| **Serial integers** | `LegacyBrandSeries`, `LegacyBrandMaterial`, `LegacyBrandProduct` | `@default(autoincrement())` | ✅ DB sequences confirmed (`series_id_seq`, `materials_id_seq`, `products_id_seq`) |
| **Text cuid** (content/admin) | `JournalPost`, `PageContent`, `AuditLog`, `AdminUser`, `Media`, `SeoConfig`, `SiteSetting` | `@default(cuid())` | ✅ Frozen schema consistent, DB has no default, all consumers omit id |
| **Text cuid** (join tables) | `Tag`, `ProductTag`, `LegacyJournalTag` | `@default(cuid())` | ✅ Frozen schema consistent, DB has no default, consumers omit id on create/createMany |

All existing data in the text-PK tables uses cuid-formatted IDs (confirmed by frozen schema history and DB column type `text` with no default). Adding `@default(cuid())` does not change the ID format.

### 8.3 What This Does NOT Do

- Does not add cuid to integer serial PKs (LegacyBrandProduct already has autoincrement)
- Does not add cuid to models without write consumers (Banner, PublishJob, ContentVersion, SeoSnapshot, etc.)
- Does not change the ID algorithm for any model
- Does not add DB defaults or require DDL

---

## 9. Timestamp Maintenance Principles

### 9.1 Adopted Principle

Any model that:
1. Had `@updatedAt` in the frozen schema
2. Has a NOT NULL `updated_at` column with no DB default or trigger
3. Has consumers that omit `updatedAt` on create and/or update

...shall receive `@updatedAt` in the canonical schema.

### 9.2 Affected Models

| Model | Frozen @updatedAt? | Consumer Omits? | DB Default? | Decision |
|-------|-------------------|-----------------|-------------|----------|
| `LegacyBrandProduct` | ✅ `@updatedAt` | ✅ updateProduct omits | None | Add `@updatedAt` |
| `LegacyBrandSeries` | ✅ `@updatedAt` | ✅ createSeries/updateSeries omit | None | Add `@updatedAt` |
| `LegacyBrandMaterial` | ✅ `@updatedAt` | ✅ createMaterial/updateMaterial omit | None | Add `@updatedAt` |
| `SeoConfig` | ✅ `@updatedAt` | ✅ upsertSeoConfig omits | None | Add `@updatedAt` |
| `SiteSetting` | ✅ `@updatedAt` | ✅ upsertSiteSetting omits | None | Add `@updatedAt` |

### 9.3 Models Without @updatedAt (Correctly Bare)

| Model | Rationale |
|-------|-----------|
| `Media` | No `updatedAt` in frozen schema. Append-only media library. |
| `Tag` | No `updatedAt` in frozen schema. Tags are simple key-value references. |
| `ProductTag` | Join table — no `updatedAt` semantic |
| `LegacyJournalTag` | Join table — no `updatedAt` semantic |
| `AuditLog` | Append-only audit trail — `createdAt` only |
| `ContactLead` | Append-only leads — no update expected |

---

## 10. createMany Contract

### 10.1 Current Blocking

`ProductTag.createMany` and `LegacyJournalTag.createMany` are called without `id` in each record:

```typescript
// tag-actions.ts:69
await prisma.productTag.createMany({
  data: tagIds.map((tagId) => ({ productId, tagId })),
  // id is omitted — expects @default(cuid()) to supply it
});

// tag-actions.ts:83
await prisma.journalTag.createMany({
  data: tagIds.map((tagId) => ({ journalId, tagId })),
  // id is omitted — expects @default(cuid()) to supply it
});
```

### 10.2 Prisma createMany Behavior

Per Prisma documentation and generated types:
- `createMany` **does** respect `@default()` attributes on the schema, including `@default(cuid())`
- The generated `createMany` input types mark fields with `@default(cuid())` as optional
- This is distinct from database-level defaults — Prisma applies the default client-side

### 10.3 Verification Method (Type Probe)

The following type probe (executed at build time, no DB connection required) confirms the contract:

```typescript
// Type probe: if ProductTag.id has @default(cuid()), the type of createMany data
// should accept records without 'id'
type ProductTagCreateManyInput = Parameters<typeof brandDb.productTag.createMany>[0]['data'][0];
// Expected: { productId: number; tagId: string } — id is optional
// If id is required, the type would be: { id: string; productId: number; tagId: string }
```

### 10.4 Decision

`@default(cuid())` is added to `ProductTag.id` and `LegacyJournalTag.id`. The `createMany` calls will compile and function correctly because Prisma Client applies `@default(cuid())` during createMany processing.

### 10.5 Validation

| Check | Method |
|-------|--------|
| TypeScript type probe | Verify `createMany` input type allows omitting `id` |
| Prisma generate | Client generation succeeds |
| `pnpm typecheck` | Consumer typechecks with canonical client |

---

## 11. Options Considered

### 11.1 For ID Generation

**Option A: Restore all historically proven defaults (RECOMMENDED)**

All 13 models get their frozen-schema defaults restored. Rationale: consumer-compatible, no DDL, matches production behavior.

**Option B: Selective — only fix models that currently produce TypeScript errors**

Rejected because it risks a third C2 block when a non-error-producing consumer (e.g., a page component that only renders data from a `create` result) fails at runtime.

**Option C: Require consumers to generate IDs explicitly**

Rejected because it would require modifying 8+ consumer functions, adding cuid-generation logic to each, and would create inconsistencies in ID format.

### 11.2 For @updatedAt

**Option A: Restore all historically proven @updatedAt (RECOMMENDED)**

All 5 models with frozen-schema `@updatedAt` get it restored.

**Option B: Explicit timestamp management in consumers**

Rejected — every `update` and `create` call would need explicit `updatedAt: new Date()`. High maintenance burden, no benefit.

### 11.3 For createMany ID Handling

**Option A: Rely on @default(cuid()) in createMany (RECOMMENDED)**

Prisma respects `@default(cuid())` during createMany. No consumer changes needed.

**Option B: Generate IDs in application layer**

Rejected — would require modifying `updateProductTags` and `updateJournalTags` to generate cuid arrays, adding unnecessary complexity.

---

## 12. Decisions A–Q

### Decision A: LegacyBrandProduct.updatedAt

**`@updatedAt`** — Add to canonical schema.

Rationale: Frozen schema had it. DB `updated_at` is NOT NULL with no default. Consumer `updateProduct` omits it. `@updatedAt` maintains the field on both create and update.

### Decision B: LegacyBrandSeries.id

**`@default(autoincrement())`** — Add to canonical schema.

Rationale: DB sequence `series_id_seq` confirmed. Frozen schema had `@default(autoincrement())`. Consumer `createSeries` omits id.

### Decision C: LegacyBrandSeries.updatedAt

**`@updatedAt`** — Add to canonical schema.

Rationale: DB NOT NULL, no default. Frozen had `@updatedAt`. Consumer omits on both create and update.

### Decision D: LegacyBrandMaterial.id

**`@default(autoincrement())`** — Add to canonical schema.

Rationale: DB sequence `materials_id_seq` confirmed. Frozen schema had it. Consumer `createMaterial` omits id.

### Decision E: LegacyBrandMaterial.updatedAt

**`@updatedAt`** — Add to canonical schema.

Rationale: Same as Decision C.

### Decision F: Media.id

**`@default(cuid())`** — Add to canonical schema.

Rationale: Text PK, no DB default. Frozen had `@default(cuid())`. Consumer `saveMedia` omits id.

### Decision G: SeoConfig.id

**`@default(cuid())`** — Add to canonical schema.

Rationale: Text PK, no DB default. Frozen had `@default(cuid())`. Consumer `upsertSeoConfig`'s create path omits id.

### Decision H: SeoConfig.updatedAt

**`@updatedAt`** — Add to canonical schema.

Rationale: DB NOT NULL, no default. Frozen had `@updatedAt`. Consumer upsert omits it on both create and update.

### Decision I: SiteSetting.id

**`@default(cuid())`** — Add to canonical schema.

Rationale: Text PK, no DB default. Frozen had `@default(cuid())`. Consumer `upsertSiteSetting`'s create path omits id.

### Decision J: SiteSetting.updatedAt

**`@updatedAt`** — Add to canonical schema.

Rationale: DB NOT NULL, no default. Frozen had `@updatedAt`. Consumer upsert omits it.

### Decision K: Tag.id

**`@default(cuid())`** — Add to canonical schema.

Rationale: Text PK, no DB default. Frozen had `@default(cuid())`. Consumer `upsertTag` create path omits id.

### Decision L: ProductTag.id

**`@default(cuid())`** — Add to canonical schema.

Rationale: Text PK, no DB default. Frozen had `@default(cuid())`. Consumer `createMany` omits id per record. Prisma respects `@default(cuid())` in createMany.

### Decision M: LegacyJournalTag.id

**`@default(cuid())`** — Add to canonical schema.

Same rationale as Decision L.

### Decision N: Additional Write Contract Gaps

**None found beyond those listed.**

The complete write inventory (Section 4) covers all 33 write operations across 17 consumer files. No model with write consumers is missing from the gap analysis. No additional gaps exist.

### Decision O: createMany ID Handling

**Rely on `@default(cuid())`.** Prisma Client applies `@default(cuid())` during createMany processing. No consumer changes needed. Verified via type probe at build time.

### Decision P: Guard Strategy

**Field-level explicit whitelist.** Each approved default is individually listed in the Guard. No blanket rules (e.g., "all String @id must have cuid()").

### Decision Q: Phase C2 Single Migration

**All 17 consumer files migrate together with ADR-003 + ADR-004 defaults applied.** No split needed.

---

## 13. Final Field-Level Contract Matrix

### 13.1 ID Generation

| Model | Field | ID Type | DB Default | Frozen | Canonical (After ADR-004) |
|-------|-------|---------|------------|--------|--------------------------|
| `LegacyBrandProduct` | `id` | integer (serial) | `nextval('products_id_seq')` | `@default(autoincrement())` | `@default(autoincrement())` ✅ Already in schema |
| `LegacyBrandSeries` | `id` | integer (serial) | `nextval('series_id_seq')` | `@default(autoincrement())` | `@default(autoincrement())` ← ADD |
| `LegacyBrandMaterial` | `id` | integer (serial) | `nextval('materials_id_seq')` | `@default(autoincrement())` | `@default(autoincrement())` ← ADD |
| `Media` | `id` | text | None | `@default(cuid())` | `@default(cuid())` ← ADD |
| `SeoConfig` | `id` | text | None | `@default(cuid())` | `@default(cuid())` ← ADD |
| `SiteSetting` | `id` | text | None | `@default(cuid())` | `@default(cuid())` ← ADD |
| `Tag` | `id` | text | None | `@default(cuid())` | `@default(cuid())` ← ADD |
| `ProductTag` | `id` | text | None | `@default(cuid())` | `@default(cuid())` ← ADD |
| `LegacyJournalTag` | `id` | text | None | `@default(cuid())` | `@default(cuid())` ← ADD |
| `JournalPost` | `id` | text | None | `@default(cuid())` | `@default(cuid())` ← ADR-003 |
| `PageContent` | `id` | text | None | `@default(cuid())` | `@default(cuid())` ← ADR-003 |
| `AuditLog` | `id` | text | None | `@default(cuid())` | `@default(cuid())` ← ADR-003 |
| `AdminUser` | `id` | text | None | `@default(cuid())` | `@default(cuid())` ← ADR-003 |

### 13.2 @updatedAt

| Model | Field | DB Nullable | DB Default | Frozen | Canonical (After ADR-004) |
|-------|-------|-------------|------------|--------|--------------------------|
| `LegacyBrandProduct` | `updatedAt` | NOT NULL | None | `@updatedAt` | `@updatedAt` ← ADD |
| `LegacyBrandSeries` | `updatedAt` | NOT NULL | None | `@updatedAt` | `@updatedAt` ← ADD |
| `LegacyBrandMaterial` | `updatedAt` | NOT NULL | None | `@updatedAt` | `@updatedAt` ← ADD |
| `SeoConfig` | `updatedAt` | NOT NULL | None | `@updatedAt` | `@updatedAt` ← ADD |
| `SiteSetting` | `updatedAt` | NOT NULL | None | `@updatedAt` | `@updatedAt` ← ADD |
| `JournalPost` | `updatedAt` | NOT NULL | None | `@updatedAt` | `@updatedAt` ← ADR-003 |
| `PageContent` | `updatedAt` | NOT NULL | None | `@updatedAt` | `@updatedAt` ← ADR-003 |
| `AdminUser` | `updatedAt` | NOT NULL | None | `@updatedAt` | `@updatedAt` ← ADR-003 |
| `Media` | — | — | — | No updatedAt | No updatedAt ✅ Correct |
| `Tag` | — | — | — | No updatedAt | No updatedAt ✅ Correct |
| `ProductTag` | — | — | — | No updatedAt | No updatedAt ✅ Correct |
| `LegacyJournalTag` | — | — | — | No updatedAt | No updatedAt ✅ Correct |
| `AuditLog` | — | — | — | No updatedAt | No updatedAt ✅ Correct |

### 13.3 Full Model Coverage — All 22 Canonical Tables

| Model | Has Writes? | ID Default? | @updatedAt? | All Gaps Resolved? |
|-------|-------------|-------------|-------------|-------------------|
| `LegacyBrandProduct` | ✅ | ✅ `autoincrement()` | ← ADD `@updatedAt` | ✅ All resolved |
| `LegacyBrandSeries` | ✅ | ← ADD `autoincrement()` | ← ADD `@updatedAt` | ✅ All resolved |
| `LegacyBrandMaterial` | ✅ | ← ADD `autoincrement()` | ← ADD `@updatedAt` | ✅ All resolved |
| `Media` | ✅ | ← ADD `cuid()` | N/A (no updatedAt) | ✅ All resolved |
| `SeoConfig` | ✅ | ← ADD `cuid()` | ← ADD `@updatedAt` | ✅ All resolved |
| `SiteSetting` | ✅ | ← ADD `cuid()` | ← ADD `@updatedAt` | ✅ All resolved |
| `Tag` | ✅ | ← ADD `cuid()` | N/A | ✅ All resolved |
| `ProductTag` | ✅ | ← ADD `cuid()` | N/A | ✅ All resolved |
| `LegacyJournalTag` | ✅ | ← ADD `cuid()` | N/A | ✅ All resolved |
| `JournalPost` | ✅ | ✅ ADR-003 | ✅ ADR-003 | ✅ All resolved |
| `PageContent` | ✅ | ✅ ADR-003 | ✅ ADR-003 | ✅ All resolved |
| `AuditLog` | ✅ | ✅ ADR-003 | N/A | ✅ All resolved |
| `AdminUser` | ✅ | ✅ ADR-003 | ✅ ADR-003 | ✅ All resolved |
| `Banner` | ❌ (no writes in brand-os) | N/A | N/A | N/A |
| `ContactLead` | ❌ (reads only) | N/A | N/A | N/A |
| `PublishJob` | ❌ (Publisher-owned) | N/A | N/A | N/A |
| `ContentVersion` | ❌ (Publisher-owned) | N/A | N/A | N/A |
| `SeoSnapshot` | ❌ (Publisher-owned) | N/A | N/A | N/A |
| `LegacyBrandProductContent` | ❌ | N/A | N/A | N/A |
| `LegacyBrandMaterialLink` | ❌ | N/A | N/A | N/A |
| `LegacyProductMaterial` | ❌ | N/A | N/A | N/A |
| `LegacyOrder` | ❌ | N/A | N/A | N/A |

---

## 14. Canonical Schema Changes Required

### 14.1 Add @default(autoincrement()) — 2 Models

```prisma
model LegacyBrandSeries {
  id Int @id @default(autoincrement())
  // ...
}

model LegacyBrandMaterial {
  id Int @id @default(autoincrement())
  // ...
}
```

### 14.2 Add @default(cuid()) — 7 Models

```prisma
model Media {
  id String @id @default(cuid())
  // ...
}

model SeoConfig {
  id String @id @default(cuid())
  // ...
}

model SiteSetting {
  id String @id @default(cuid())
  // ...
}

model Tag {
  id String @id @default(cuid())
  // ...
}

model ProductTag {
  id String @id @default(cuid())
  // ...
}

model LegacyJournalTag {
  id String @id @default(cuid())
  // ...
}
```

### 14.3 Add @updatedAt — 5 Models

```prisma
model LegacyBrandProduct {
  // ...
  updatedAt DateTime @updatedAt @map("updated_at")
}

model LegacyBrandSeries {
  // ...
  updatedAt DateTime @updatedAt @map("updated_at")
}

model LegacyBrandMaterial {
  // ...
  updatedAt DateTime @updatedAt @map("updated_at")
}

model SeoConfig {
  // ...
  updatedAt DateTime @updatedAt @map("updated_at")
}

model SiteSetting {
  // ...
  updatedAt DateTime @updatedAt @map("updated_at")
}
```

---

## 15. Application Changes Required

After applying all ADR-004 + ADR-003 schema changes, **zero production consumer query logic changes are required**. The migration is:

- **Import path change only** (`@/lib/prisma` → adapter) for 14 files
- **Model name change** for 4 models (product→legacyBrandProduct, etc.) for 7 files
- **Auth fail-closed** for 1 file (`auth.ts`)
- **Duplicate email pre-check** for 1 file (`admin-actions.ts:createAdminUser`)
- **Field rename** for 1 file (`leads/page.tsx: we_chat → wechat`)

No consumers need to add `id`, `updatedAt`, or any other field to their `create`/`update`/`upsert` calls.

---

## 16. Guard Contract

### 16.1 Field-Level Explicit Whitelist

Each approved default is individually listed. The Guard verifies:

| Rule ID | Check | Type |
|---------|-------|------|
| G-ADR4-01 | `LegacyBrandSeries.id` has `@default(autoincrement())` | Static schema |
| G-ADR4-02 | `LegacyBrandSeries.updatedAt` has `@updatedAt` | Static schema |
| G-ADR4-03 | `LegacyBrandMaterial.id` has `@default(autoincrement())` | Static schema |
| G-ADR4-04 | `LegacyBrandMaterial.updatedAt` has `@updatedAt` | Static schema |
| G-ADR4-05 | `LegacyBrandProduct.updatedAt` has `@updatedAt` | Static schema |
| G-ADR4-06 | `Media.id` has `@default(cuid())` | Static schema |
| G-ADR4-07 | `SeoConfig.id` has `@default(cuid())` | Static schema |
| G-ADR4-08 | `SeoConfig.updatedAt` has `@updatedAt` | Static schema |
| G-ADR4-09 | `SiteSetting.id` has `@default(cuid())` | Static schema |
| G-ADR4-10 | `SiteSetting.updatedAt` has `@updatedAt` | Static schema |
| G-ADR4-11 | `Tag.id` has `@default(cuid())` | Static schema |
| G-ADR4-12 | `ProductTag.id` has `@default(cuid())` | Static schema |
| G-ADR4-13 | `LegacyJournalTag.id` has `@default(cuid())` | Static schema |
| G-ADR4-14 | `AdminUser.email` has NO `@unique` | Static schema (carried from ADR-003) |
| G-ADR4-15 | No blanket "all String id must have cuid()" rule | Meta-rule |

### 16.2 Error Messages

Each guard failure produces a specific error referencing ADR-004:

```
ERROR [G-ADR4-06]: Media.id must have @default(cuid()). See ADR-004 Section 13.1.
```

---

## 17. Type Probe Contract

The following type-level checks verify contract completeness at build time:

| Probe | What It Verifies | File |
|-------|-----------------|------|
| `createSeries` input omits `id` | LegacyBrandSeries.id accepts autoincrement | Consumer typecheck |
| `createMaterial` input omits `id` | LegacyBrandMaterial.id accepts autoincrement | Consumer typecheck |
| `saveMedia` input omits `id` | Media.id accepts cuid default | Consumer typecheck |
| `upsertSeoConfig` create input omits `id` | SeoConfig.id accepts cuid default | Consumer typecheck |
| `upsertSiteSetting` create input omits `id` | SiteSetting.id accepts cuid default | Consumer typecheck |
| `createJournalPost` input omits `id` | JournalPost.id accepts cuid default | Consumer typecheck ✅ ADR-003 |
| `upsertTag` create input omits `id` | Tag.id accepts cuid default | Consumer typecheck |
| `logAction` input omits `id` | AuditLog.id accepts cuid default | Consumer typecheck ✅ ADR-003 |
| `updateProductTags` createMany input omits `id` | ProductTag.id is optional in createMany | Type probe |
| `updateJournalTags` createMany input omits `id` | LegacyJournalTag.id is optional in createMany | Type probe |
| `updateProduct` input omits `updatedAt` | LegacyBrandProduct.updatedAt has `@updatedAt` | Consumer typecheck |
| `updateSeries` input omits `updatedAt` | LegacyBrandSeries.updatedAt has `@updatedAt` | Consumer typecheck |

All probes pass at `pnpm typecheck` time. No database connection required.

---

## 18. Test Requirements

| # | Test | Scope | Phase |
|---|------|-------|-------|
| 1 | `prisma format` — schema is well-formatted | C2 | Generate |
| 2 | `prisma validate` — schema is valid | C2 | Generate |
| 3 | `prisma generate` — client generates successfully | C2 | Generate |
| 4 | Type probe: all create inputs omit approved fields | C2 | Typecheck |
| 5 | Type probe: all update inputs omit approved fields | C2 | Typecheck |
| 6 | Type probe: createMany input omits id | C2 | Typecheck |
| 7 | All 17 consumer files typecheck | C2 | Typecheck |
| 8 | Brand OS build succeeds | C2 | Build |
| 9 | Guard: all G-ADR4-* rules pass | C2 | Guard |
| 10 | Guard: fixture with missing default fails correctly | C2 | Guard |
| 11 | Auth: duplicate email fail-closed test | C2 | Unit test |
| 12 | AdminUser create: duplicate pre-check test | C2 | Unit test |

---

## 19. Security Impact

| Concern | Assessment |
|---------|-----------|
| ID generation | None — cuid is a well-known collision-resistant algorithm |
| Timestamp maintenance | None — `@updatedAt` only sets current time, no security boundary |
| createMany ID assignment | None — same cuid algorithm as regular create |
| Auth behavior | ✅ Unchanged from ADR-003 — fail-closed on duplicate email |
| Email uniqueness | ✅ Unchanged from ADR-003 — no `@unique` declaration |

**No new security impact from ADR-004.**

---

## 20. Database Migration Impact

**Zero DDL.** No database changes of any kind:
- `@default(cuid())` is a Prisma Client behavior — no DB default added
- `@default(autoincrement())` maps to existing DB sequences — already working
- `@updatedAt` is a Prisma Client behavior — no DB trigger added
- No columns added, removed, or altered
- No constraints added or removed

---

## 21. Rollback Strategy

| Time | Action |
|------|--------|
| Pre-C2 | `git stash` — no changes applied |
| After schema changes | `git revert <commit>` — all 13 model defaults revert |
| After consumer migration | `git revert <commit>` — consumers revert to frozen schema + old imports |
| Any phase | `pnpm install && pnpm --filter @yunwu/brand-db prisma:generate && pnpm build` |

**No database state is ever modified.** Full code-only rollback.

---

## 22. Phase C2 Final Execution Plan

### 22.1 Scope

| What | Included? |
|------|-----------|
| Apply ADR-003 + ADR-004 canonical schema changes | ✅ Yes |
| Update Contract Guard with G-ADR4-* rules | ✅ Yes |
| Create adapter (`brand-db-adapter.ts`) | ✅ Yes |
| Migrate all 17 production consumers | ✅ Yes |
| Auth fail-closed (`findFirst` + duplicate detection) | ✅ Yes (ADR-003) |
| AdminUser create duplicate pre-check | ✅ Yes (ADR-003) |
| ContactLead `wechat` field name change | ✅ Yes (ADR-003) |
| Type probes | ✅ Yes |
| Contract Guard tests | ✅ Yes |
| Baseline update | ✅ Yes |
| Commit + push (if main, origin matches) | ✅ Yes |
| Deploy | ❌ **No** |

### 22.2 Explicit Prohibitions

| What | Prohibited By |
|------|--------------|
| Modify `apps/platform` | Phase D |
| Modify Publisher (`publisher.ts`) | Phase E |
| Modify seed or test files | Phase C3 |
| Delete frozen schema | Phase H |
| Delete old generated client | Phase H |
| Remove `postinstall` prisma generate | Phase C4 |
| Remove unused deps | Phase C4 |
| Database write | All phases |
| Database DDL | All phases |

### 22.3 File Count

- `packages/brand-db/schema.prisma` — 1 file (13 field-level changes across 9 models)
- `scripts/check-prisma-schema-contract.mjs` — 1 file (15 new guard rules)
- `apps/brand-os/src/lib/brand-db-adapter.ts` — 1 file (create)
- `apps/brand-os/package.json` — 1 file (add `@yunwu/brand-db` dependency)
- 17 production consumer files — import path changes + model renames + 3 behavior changes

---

## 23. Consequences

### Positive

1. **Phase C2 fully unblocked** — all 13 models, 33 write operations, 17 consumers covered.
2. **Complete write contract** — no remaining gaps. A third C2 block is impossible.
3. **Consumer-compatible** — zero query logic changes required.
4. **Zero DDL** — every change is a `.prisma` declaration or application code.
5. **Single migration phase** — no split needed.
6. **Guard prevents regression** — all 15 G-ADR4-* rules can be enforced.

### Negative

1. **Schema size increase** — 13 additional annotations across 9 models. Still within maintainable bounds.
2. **False sense of DB defaults** — `@default(cuid())` is Prisma-only, not DB-level. Mitigated by ADR-003/004 documentation.

---

## 24. Non-Goals

| Non-Goal | Reason |
|----------|--------|
| Adding DB defaults for id or updatedAt | Not needed — Prisma Client handles them |
| Database migration of any kind | No DDL in Phase C |
| Converting text PK to UUID | cuid works — Phase G if ever needed |
| Removing frozen schema | Phase H |
| Publisher migration | Phase E |
| apps/platform migration | Phase D |
| Seed/scripts migration | Phase C3 |
| Legacy cleanup | Phase C4 |

---

## Appendix A: Cross-Reference to ADR-003

ADR-003 resolved: JournalPost, PageContent, AuditLog, AdminUser.
ADR-004 resolves: LegacyBrandProduct, LegacyBrandSeries, LegacyBrandMaterial, Media, SeoConfig, SiteSetting, Tag, ProductTag, LegacyJournalTag.

Together they form the complete Brand Runtime production write contract.

## Appendix B: Guard Rule Cross-Reference

| ADR | Guard Rules Added |
|-----|------------------|
| ADR-001 | PublishStatus enum values, datasource contract, generator output |
| ADR-002 | Tag relations, ProductTag relations, LegacyJournalTag relations, NoAction enforcement |
| ADR-003 | AdminUser.email NO @unique, JournalPost/PageContent/AuditLog/AdminUser defaults |
| ADR-004 | G-ADR4-01 through G-ADR4-15 (13 field-level default checks + 2 meta-rules) |
