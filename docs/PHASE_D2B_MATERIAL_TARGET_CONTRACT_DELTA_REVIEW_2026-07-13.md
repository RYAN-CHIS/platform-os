# Phase D2b — Material Target Contract Delta Review

**Date:** 2026-07-13
**WORKDIR:** `/Users/ryan/Projects/active/platform-os`
**HEAD:** `1ad2956` (Phase D2a complete)
**Phase D2b:** BLOCKED — materials module targets wrong physical table

---

## 1. Executive Conclusion

**BLOCKED — MATERIAL TARGET CONTRACT RESOLUTION REQUIRES NEW ADR.**

Three independent findings:

**Finding 1 (Wrong-Table):** `materials/actions.ts` CRUD targets `brand_materials` but semantically operates on material *entity* data. The table `brand_materials` is a 3-column product-material link table per authoritative metadata. This is a naming accident: the platform code's `ensureTable()` created or extended `brand_materials` with 20+ content columns, conflating junction semantics with entity semantics.

**Finding 2 (Schema Gap):** The canonical `LegacyBrandMaterial` (mapped to `materials` table) has 12 columns but the UI requires ~25 content fields. A direct typed migration to `LegacyBrandMaterial` would lose functionality — 13+ UI-used fields are missing from both the physical `materials` table and the canonical model.

**Finding 3 (Non-Blocking for D2b-1):** The materials module is **independent** from Products/Series/Journal — no shared helpers, no atomic commit requirement. D2b can be split.

---

## 2. Physical Table Matrix

Source: `docs/db-metadata/brand-db-schema-metadata-2026-07-11.json` (authoritative read-only session).

### 2.1 `materials` — Legacy material entity table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | NOT NULL | sequence `materials_id_seq` | PK, @default(autoincrement()) |
| `name` | text | NOT NULL | none | UNIQUE |
| `type` | text | NOT NULL | `''` | Category-like |
| `origin` | text | NOT NULL | `''` | |
| `description` | text | NOT NULL | `''` | |
| `image` | text | NOT NULL | `''` | |
| `createdAt` | timestamp | NOT NULL | `CURRENT_TIMESTAMP` | |
| `updatedAt` | timestamp | NOT NULL | none | |
| `alias` | text | YES | none | |
| `features` | text | YES | none | |
| `history` | text | YES | none | |
| `related_articles` | text | NOT NULL | `'[]'` | |

**12 columns.** Material entity with basic content fields. **No slug, no status, no SEO, no sort_order, no cover_image.**

### 2.2 `brand_materials` — Named junction table

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | integer | NOT NULL | sequence | PK |
| `product_id` | integer | NOT NULL | none | Links to product |
| `material_id` | integer | NOT NULL | none | Links to material |

**3 columns.** Pure junction table. **No content fields.** This is what the authoritative metadata documents.

**Note:** Platform code `materials/actions.ts:38-63` (`ensureTable()`) creates 20+ additional columns via `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS`. The production table may now have BOTH junction + content columns if this code has executed against the Brand DB. The authoritative metadata captured the base state (3 columns), but the de facto table likely has ~23 columns.

### 2.3 `product_materials` — Alternative junction table

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | integer | NOT NULL | sequence, PK |
| `product_id` | integer | NOT NULL | none |
| `material_id` | integer | NOT NULL | none |

**3 columns.** Same structure as `brand_materials`. Duplicate junction table from a previous schema version.

### 2.4 Future Target Tables

| Table | Status (per metadata) | Purpose |
|-------|----------------------|---------|
| `brand_materials` (future) | **DOES NOT EXIST** | Planned target for material *entity* content (per Phase B architecture) |
| `brand_products` | DOES NOT EXIST | Future product entity |
| `brand_series` | DOES NOT EXIST | Future series entity |

---

## 3. Canonical Model Matrix

| Canonical Model | Physical Table | Columns | Semantic Role |
|----------------|---------------|---------|---------------|
| `LegacyBrandMaterial` | `@@map("materials")` | 12 (entity fields) | **Material entity** — name, type, origin, description, image, etc. |
| `LegacyBrandMaterialLink` | `@@map("brand_materials")` | 3 (junction) | **Product-Material link** — id, productId, materialId |
| `LegacyProductMaterial` | `@@map("product_materials")` | 3 (junction) | **Duplicate product-material link** — id, productId, materialId |
| `LegacyBrandProduct` | `@@map("products")` | ~28 | Brand product entity |

### 3.1 Canonical Model Completeness

| Model | Complete for current usage? |
|-------|---------------------------|
| `LegacyBrandMaterial` | ❌ — Missing ~13 UI-used fields |
| `LegacyBrandMaterialLink` | ✅ — 3 junctions columns correct for link table |
| `LegacyProductMaterial` | ✅ — 3 junction columns correct for link table |

### 3.2 Naming Conflict

The physical table `brand_materials` is mapped to two different concepts:
| Context | What it refers to |
|---------|-------------------|
| **Canonical Schema** (`LegacyBrandMaterialLink`) | 3-column junction table |
| **Platform code** (`materials/actions.ts`) | 20+-column material content table |
| **Phase B Architecture** (future) | Future target material entity table |

**This is the root cause of the D2b block.** The same table name refers to three different things depending on context.

---

## 4. Material Domain Concepts

The `materials/actions.ts` file operates on **three distinct domain concepts** that must be separated:

| Concept | Physical Table | Canonical Model | Actions.ts Functions |
|---------|---------------|-----------------|---------------------|
| **Material Entity** | `materials` | `LegacyBrandMaterial` | CREATE/UPDATE/DELETE material content |
| **Product-Material Link** | `brand_materials` OR `product_materials` | `LegacyBrandMaterialLink` / `LegacyProductMaterial` | (none — no link operations in this file) |
| **ERP Material Bridge** | `raw_materials` (ERP DB) | `erpMaterial` (ERP client) | `getErpMaterialsForSelect()` |

The file's CRUD functions (`listBrandMaterials`, `createBrandMaterial`, `updateBrandMaterial`, `deleteBrandMaterial`, `toggleMaterialStatus`) intend to operate on **Material Entity** but physically target a table named `brand_materials` which the metadata identifies as a junction table.

---

## 5. Complete Function Inventory

| # | Function | Current SQL Table | R/W | Business Intent | Correct Canonical Model | Migratable Now? |
|---|----------|-----------------|-----|----------------|------------------------|-----------------|
| 1 | `ensureTable()` | `brand_materials` | DDL | Create content table if missing | N/A (future `brand_materials` entity table) | ❌ — DDL, schema decision needed |
| 2 | `ensureColumns()` | `brand_materials` | DDL | Add content columns if missing | N/A (future `brand_materials` entity table) | ❌ — DDL, schema decision needed |
| 3 | `listBrandMaterials()` | `brand_materials` | R | List material entities | `LegacyBrandMaterial` | ⚠️ — 13 fields missing from `LegacyBrandMaterial` |
| 4 | `getMaterialStats()` | `brand_materials` | R | Count materials | `LegacyBrandMaterial.count()` | ✅ — simple count works |
| 5 | `createBrandMaterial()` | `brand_materials` | C | Create material entity | `LegacyBrandMaterial.create()` | ❌ — 13 fields missing |
| 6 | `updateBrandMaterial()` | `brand_materials` | U | Update material entity | `LegacyBrandMaterial.update()` | ❌ — 13 fields missing |
| 7 | `deleteBrandMaterial()` | `brand_materials` | D | Delete material entity | `LegacyBrandMaterial.delete()` | ✅ — delete by id works |
| 8 | `toggleMaterialStatus()` | `brand_materials` | U | Toggle publish status | `LegacyBrandMaterial.update()` | ❌ — status field missing |
| 9 | `getErpMaterialsForSelect()` | `raw_materials` (ERP) | R | ERP material dropdown | Keep `prisma.erpMaterial` (ERP client) | ✅ — not Brand, stays on ERP |

### Classification

| Category | Count | Functions |
|----------|-------|-----------|
| **A: Material Entity CRUD** — targets wrong table | 6 | 3, 4, 5, 6, 7, 8 |
| **B: Product-Material Link** | 0 | (none in this file) |
| **C: ERP Material Bridge** | 1 | 9 |
| **D: Dead/DDL infrastructure** | 2 | 1, 2 |

---

## 6. Field Source Matrix

### 6.1 Fields Used by Actions.ts vs. Available in Canonical Models

| Field | actions.ts uses? | In `LegacyBrandMaterial`? | In `materials` table? | In extended `brand_materials`? |
|-------|-----------------|--------------------------|----------------------|-------------------------------|
| `id` | ✅ | ✅ `id` | ✅ | ✅ |
| `name` | ✅ | ✅ `name` | ✅ | ✅ |
| `slug` | ✅ | ❌ | ❌ | ✅ (added by ensureColumns) |
| `alias` | ✅ | ✅ `alias` | ✅ | ✅ |
| `category` | ✅ (falls back to `type`) | ❌ (has `type`) | ✅ (has `type`) | ✅ |
| `origin` | ✅ | ✅ `origin` | ✅ | ✅ |
| `description` | ✅ | ✅ `description` | ✅ | ✅ |
| `short_desc` | ✅ | ❌ | ❌ | ✅ |
| `features` | ✅ | ✅ `features` | ✅ | ✅ |
| `story` | ✅ (falls back to `history`) | ❌ (has `history`) | ✅ (has `history`) | ✅ |
| `applicable_products` | ✅ | ❌ | ❌ | ✅ |
| `status` | ✅ | ❌ | ❌ | ✅ |
| `sort_order` | ✅ | ❌ | ❌ | ✅ |
| `image` | ✅ | ✅ `image` | ✅ | ✅ |
| `cover_image` | ✅ | ❌ | ❌ | ✅ |
| `detail_images` | ✅ | ❌ | ❌ | ✅ |
| `seo_title` | ✅ | ❌ | ❌ | ✅ |
| `seo_description` | ✅ | ❌ | ❌ | ✅ |
| `seo_keywords` | ✅ | ❌ | ❌ | ✅ |
| `erp_material_id` | ✅ | ❌ | ❌ | ✅ |
| `created_at` | ✅ | ✅ `createdAt` | ✅ | ✅ |
| `updated_at` | ✅ | ✅ `updatedAt` | ✅ | ✅ |
| `history` | (fallback for story) | ✅ `history` | ✅ | ✅ |
| `type` | (fallback for category) | ✅ `type` | ✅ | ✅ |

### 6.2 Summary

| Category | Count | Fields |
|----------|-------|--------|
| Fields in both `LegacyBrandMaterial` and UI | 9 | id, name, alias, origin, description, features, image, created_at, updated_at |
| Fields in `LegacyBrandMaterial` but fallback only | 2 | type→category, history→story |
| Fields MISSING from `LegacyBrandMaterial` | 13 | slug, category, short_desc, story, applicable_products, status, sort_order, cover_image, detail_images, seo_title, seo_description, seo_keywords, erp_material_id |

---

## 7. Caller Contract

The Materials UI page at `apps/platform/app/(platform)/brand/materials/client.tsx` typically:
- Lists materials (needs all 20+ display fields)
- Creates materials (needs name, slug, category, origin, description, etc.)
- Edits materials (needs SEO fields, status, etc.)
- Deletes materials (needs only id)
- Searches materials (by name, description)

These are **Material Entity** operations, not Product-Material link operations.

---

## 8. ERP / Brand Boundary

The file correctly separates:

| Code | Client | Database | Correct? |
|------|--------|----------|----------|
| `brandPrisma` operations (lines 38-279) | `@yunwu/db/brand` | Brand DB | ✅ Brand Runtime entity |
| `prisma.erpMaterial` (line 302) | `@yunwu/db` | ERP DB | ✅ ERP Material bridge |
| No cross-database transactions | — | — | ✅ Safe |

No context ownership violation in this file.

---

## 9. Wrong-Table Evidence

**Conclusion CONFIRMED:** `materials/actions.ts` material entity CRUD operates on a **de facto content table** (`brand_materials`) that was created/extended by the code itself, rather than the canonical material entity table (`materials`).

The evidence chain:
1. Authoritative metadata shows `brand_materials` = 3 columns (junction)
2. Authoritative metadata shows `materials` = 12 columns (entity)
3. Canonical `LegacyBrandMaterial` maps to `materials` (correct entity)
4. Canonical `LegacyBrandMaterialLink` maps to `brand_materials` (correct junction)
5. Code's `ensureTable()` creates 20+ content columns on a table named `brand_materials`
6. This is a **historical naming accident** — the name `brand_materials` was overloaded

**The platform code's `brand_materials` table has been repurposed as a material content table that doesn't correspond to any canonical model.**

---

## 10. Options Considered

### Option A: Redirect to `LegacyBrandMaterial` + add missing fields

Redirect CRUD to `LegacyBrandMaterial` (mapped to `materials` table). Add 13 missing fields to canonical schema.

**DDL required:** YES — `ALTER TABLE materials ADD COLUMN ...` for each missing field.
**Canonical schema change:** YES — add 13 fields to `LegacyBrandMaterial`.
**Risk:** DDL is out of scope for Phase D2b. Would need Phase G.
**Verdict:** ❌ Rejected for D2b — DDL dependency blocks typed migration.

### Option B: Keep Raw SQL — Defer materials typed migration

Keep materials/actions.ts on raw SQL. Document the gap. Proceed with D2b-1 (Products/Series/Journal).

**DDL required:** NO.
**Canonical schema change:** NO.
**Risk:** Materials remain untyped until Phase G. Acceptable — materials is a self-contained module.
**Verdict:** ✅ Recommended for D2b.

### Option C: Model the extended `brand_materials` as a new canonical entity

Add a new canonical model (e.g., `LegacyBrandMaterialContent` or similar) that maps to the extended `brand_materials` table.

**Problem:** The canonical schema already has `LegacyBrandMaterialLink → @@map("brand_materials")`. Two Prisma models cannot map to the same table. Would need to rename or remove `LegacyBrandMaterialLink`'s `@@map` — but the junction table IS physically named `brand_materials` per metadata.

**Verdict:** ❌ Rejected — table name conflict prevents clean two-model mapping.

### Option D: Split the file — simple operations typed, complex stays raw SQL

Migrate `deleteBrandMaterial`, `getMaterialStats` to typed `LegacyBrandMaterial`. Keep create/update/list on raw SQL.

**DDL required:** NO.
**Canonical schema change:** NO.
**Risk:** Partial migration — creates a "two-client" pattern within one file.
**Verdict:** ⚠️ Possible but increases file complexity. Not recommended unless DDL is permanently off the table.

### Recommendation: **Option B — Defer to Phase G.**

---

## 11. Final Target Decision

| Question | Answer |
|----------|--------|
| Is `brand_materials` a junction table per DB metadata? | ✅ YES — 3 columns: id, product_id, material_id |
| Is `materials` the material entity table? | ✅ YES — 12 content columns |
| Does `materials/actions.ts` CRUD target the wrong table? | ✅ YES — should target `materials` |
| Is a direct typed migration to `LegacyBrandMaterial` possible now? | ❌ NO — 13 UI-needed fields missing from both physical `materials` table and canonical model |
| Should we add DDL to the `materials` table in Phase D2b? | ❌ NO — DDL is Phase G territory |
| Best D2b approach? | **Defer materials typed migration to Phase G with ADR-005** |
| Can Products/Series/Journal proceed? | ✅ YES — no dependency on materials |

---

## 12. Delete Semantics

**Current behavior:** `deleteBrandMaterial(id)` deletes from `brand_materials` table by `id`.
**If targeting `LegacyBrandMaterial`:** Delete by `id` from `materials` table. Same semantic (delete entity by id).
**No ambiguity:** The delete operates on the material entity, not a product-material link. ✅

---

## 13. Relation Model Decision

| Question | Answer |
|----------|--------|
| Which model for Product-Material links? | `LegacyProductMaterial` (clearer name, `@@map("product_materials")`) |
| What about `LegacyBrandMaterialLink`? | Maps to `brand_materials` junction table (deprecated name, kept for compatibility) |
| Does the materials actions file need link operations? | ❌ No — link operations are in `products/actions.ts` |
| Should `LegacyBrandMaterialLink` be removed? | ❌ Not in Phase D — Phase H concern |

---

## 14. Canonical Schema Decision

**NO CHANGE REQUIRED FOR PHASE D2b.**

The canonical schema's `LegacyBrandMaterial` and `LegacyBrandMaterialLink` correctly represent the physical database structure. The 13-field gap between what the UI needs and what `materials` table provides is a **data model evolution concern** for Phase G.

---

## 15. Database Migration Decision

**NO DDL FOR PHASE D2b.**

Adding 13 columns to the `materials` table would require `ALTER TABLE` statements. This is properly scoped to Phase G (data migration design).

---

## 16. ADR-005 Decision

**ADR-005 REQUIRED.**

The materials module presents a genuine architecture decision that existing ADRs do not cover:

| Issue | ADR Coverage |
|-------|-------------|
| Material entity table vs. junction table naming conflict | ❌ Not covered |
| Platform code's de facto `brand_materials` content table | ❌ Not covered |
| Adding content fields to `LegacyBrandMaterial` | ❌ Not covered |
| Future `brand_materials` target entity table design | ❌ Not covered — Phase B only mentioned it |
| Migration strategy for material content fields | ❌ Not covered |

**Title:** ADR-005: Brand Material Entity Data Model and Migration Strategy

---

## 17. D2b Split Decision

**ACCEPTED: SPLIT D2b into D2b-1 and D2b-2.**

| Subphase | Scope | Materials Dependency? | Status |
|----------|-------|----------------------|--------|
| **D2b-1** | Products, Series, Journal typed migration | ❌ None | ✅ Proceed |
| **D2b-2** | Materials contract correction + ADR-005 | N/A | ⏳ Blocked pending ADR-005 |

### 17.1 Rationale for Split

- Products/Series/Journal have **no shared helpers** with Materials
- Products/Series/Journal have **no atomic commit requirement** with Materials
- Products/Series/Journal typed migration is **not blocked** by Materials
- Materials requires **new architectural decision** (ADR-005) that Products/Series/Journal don't need
- Keeping D2b combined would **unnecessarily delay** three independent modules

### 17.2 Verification of Independence

| Check | Products | Series | Journal | Materials |
|-------|----------|--------|---------|-----------|
| Uses `@/lib/brand-db` adapter? | Target | Target | Target | Not yet |
| Shares helpers with Materials? | No | No | No | — |
| Materials shares helpers with it? | No | No | No | — |
| Needs ADR-005 for migration? | No | No | No | Yes |
| Can migrate independently? | Yes | Yes | Yes | Yes |

---

## 18. D2b-1 Scope

### 18.1 Files

| # | File | Migration |
|---|------|-----------|
| 1 | `modules/brand/products/actions.ts` | Dynamic column CRUD → `brandDb.legacyBrandProduct.*` + `brandDb.legacyBrandSeries.*`. Keep `prisma` for ERP parts. Keep Publisher wrappers. |
| 2 | `modules/brand/series/actions.ts` | Dynamic column CRUD → `brandDb.legacyBrandSeries.*`. Keep Publisher wrappers. |
| 3 | `modules/brand/journal/actions.ts` | Dynamic column CRUD → `brandDb.journalPost.*`. Keep Publisher wrappers. |
| 4 | `modules/brand/banners/actions.ts` | `moveBanner` sort swap → `brandDb.banner.*` |
| 5 | `modules/brand/materials/actions.ts` | **Not included** — deferred to D2b-2 |

### 18.2 Explicit Exclusions

| Item | Reason |
|------|--------|
| Publisher wrappers (transitionStatus, publishNow, etc.) | Phase E |
| `lib/publisher.ts` | Phase E |
| Materials actions | D2b-2 / ADR-005 |
| ERP operations in products/actions.ts | Keep `prisma` (ERP) |

---

## 19. D2b-2 Scope (Future, After ADR-005)

| Item | Status |
|------|--------|
| ADR-005 | ⏳ Needed — material entity data model |
| Canonical schema changes | ⏳ Per ADR-005 decision |
| DDL to `materials` table (if ADR-005 chooses) | ⏳ Phase G |
| Typed migration of materials CRUD | ⏳ After ADR-005 + schema change |
| Clean up `ensureTable()` / `ensureColumns()` | ⏳ After table choice made |
| Resolve `LegacyBrandMaterialLink` table name conflict | ⏳ After data migration to proper table |

---

## 20. Validation Plan

### D2b-1 Validation

| # | Check | Method |
|---|-------|--------|
| 1 | Products typecheck | `pnpm typecheck` — products/actions.ts zero diagnostics |
| 2 | Series typecheck | `pnpm typecheck` — series/actions.ts zero diagnostics |
| 3 | Journal typecheck | `pnpm typecheck` — journal/actions.ts zero diagnostics |
| 4 | Banner moveBanner typecheck | `pnpm typecheck` — moveBanner compiles |
| 5 | Publisher functions unchanged | `git diff` on Publisher wrappers = only import changes |
| 6 | ERP operations unchanged | `prisma.erpProduct.*` calls remain in products/actions.ts |
| 7 | Platform build | `pnpm --filter @yunwu/platform-app build` |
| 8 | Total errors not increased | Baseline compare |
| 9 | Materials module unchanged | `git diff` shows only non-materials files |

### D2b-2 Validation (Future)

| # | Check | Method |
|---|-------|--------|
| 1 | ADR-005 accepted | Architecture review |
| 2 | Canonical schema changes applied | Per ADR-005 |
| 3 | DDL executed (if required) | Phase G |
| 4 | Materials typed migration | D2b-2 |

---

## 21. Rollback Plan

| Phase | Action |
|-------|--------|
| D2b-1 (pre-commit) | `git checkout -- apps/platform/modules/brand/` |
| D2b-1 (post-commit) | `git revert <commit>` — restores products/series/journal/banners raw SQL |
| D2b-2 (post-ADR) | Per ADR-005 rollback plan |

---

## Required Questions — Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Delta Conclusion | **BLOCKED for materials — RESOLVED for D2b-1** |
| 2 | `brand_materials` physical purpose | **Junction table** (3 columns: id, product_id, material_id) per authoritative metadata |
| 3 | `materials` physical purpose | **Material entity table** (12 content columns) |
| 4 | `product_materials` physical purpose | **Duplicate junction table** (same 3-column structure) |
| 5 | Main CRUD wrong-table decision | ✅ **CONFIRMED** — CRUD targets `brand_materials` (junction) but semantically operates on material entity |
| 6 | Correct canonical material model | `LegacyBrandMaterial` (mapped to `materials`) |
| 7 | Correct relation model(s) | `LegacyProductMaterial` for product-material links |
| 8 | Canonical schema change required? | **YES, but NOT for D2b** — `LegacyBrandMaterial` needs 13 additional fields; belongs in ADR-005 / Phase G |
| 9 | Database migration required? | **YES, but NOT for D2b** — `ALTER TABLE materials ADD COLUMN ...` DDL needed; Phase G |
| 10 | ADR-005 required? | **YES** — material entity data model, table strategy, and migration approach |
| 11 | Materials UI contract status | ✅ UI operates on material entity (correct semantically). Target table is wrong. |
| 12 | Delete semantics | Delete material entity by id — unambiguous. `brand_materials` or `materials` both support id-based delete. |
| 13 | D2b split decision | ✅ **SPLIT** — D2b-1 proceeds with Products/Series/Journal; D2b-2 deferred for materials |
| 14 | D2b-1 file scope | 4 files: products/actions.ts, series/actions.ts, journal/actions.ts, banners/actions.ts (moveBanner only) |
| 15 | D2b-2 file scope | 1 file: materials/actions.ts — after ADR-005 + Phase G DDL |
| 16 | Report Path | `docs/PHASE_D2B_MATERIAL_TARGET_CONTRACT_DELTA_REVIEW_2026-07-13.md` |
| 17 | Next Minimal Codex Scope | **D2b-1**: Products + Series + Journal typed migration + Banner moveBanner. Exclude Materials. |

---

```
FINAL STATUS: PHASE D2B MATERIAL CONTRACT RESOLVED — IMPLEMENTATION PLAN READY
(D2b-1 UNBLOCKED; D2b-2 deferred — ADR-005 REQUIRED)
```
