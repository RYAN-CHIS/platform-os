# Brand Runtime Database Schema Metadata

> Export Date: 2026-07-11
> Read-Only Session: Confirmed
> Schema: public
> Connection: brand_app role via Neon pooled endpoint

---

## Metadata Provenance

This metadata was collected from the Brand Runtime PostgreSQL database through read-only system catalog queries.

- **Read-only enforcement**: Session-level `default_transaction_read_only = on` was set before any query executed.
- **No row data exported**: Only schema metadata (tables, columns, constraints, indexes, enums) was queried from `information_schema`, `pg_catalog`, and `pg_type`/`pg_enum`. No business data from user tables was read or exported.
- **No database mutation**: No INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, GRANT, or any DDL/DML statement was executed.
- **Credentials sanitized**: Connection identifiers including hostnames, tokens, and passwords are replaced with SHA-256 fingerprints or removed. Only role names (`brand_app`, `erp_app`) appear as metadata context — no secrets.
- **Purpose**: These artifacts serve as the physical database evidence for Platform OS Architecture Cleanup Phase B. Code semantics (Prisma schemas, application logic) remain separate from the physical database facts documented here.

---


## 1. Connection Target Confirmation

**CONNECTION TARGET: BRAND RUNTIME CONFIRMED**

Evidence:
- Database fingerprint: `693fe5919fc2`
- All 15 expected Brand Runtime tables present
- Zero ERP-only tables present: `works`, `batches`, `purchase_records`, `production_records`, `product_skus`, `customers`, `inventory_transactions`, `bom`, `raw_materials` — all absent
- One cross-reference table `orders` exists (legacy ERP order table co-located in Brand DB — not an ERP-only table)
- `brand_product_content` relationship table present (supplemental Brand layer)

---

## 2. Query Safety Controls

| Control | Applied |
|---------|---------|
| `SET default_transaction_read_only = on` | ✅ |
| `BEGIN READ ONLY` | ✅ (session-wide) |
| Statement timeout | 30s (via psql timeout) |
| No INSERT/UPDATE/DELETE | ✅ |
| No DDL (CREATE/ALTER/DROP/GRANT) | ✅ |
| No Prisma migration commands | ✅ |
| No `COPY TO PROGRAM` | ✅ |
| No stored procedure calls | ✅ |

---

## 3. Enum Inventory

| Enum Name | Values (in order) | Used By |
|-----------|------------------|---------|
| **PublishStatus** | DRAFT(1), PENDING_REVIEW(2), APPROVED(3), PUBLISHED(4), UNPUBLISHED(5), ARCHIVED(6) | `products.publish_status`, `journal_posts.status` |
| AdminRole | SUPER_ADMIN(1), ADMIN(2), EDITOR(3), OPERATOR(4) | `admin_users.role` |
| JournalCategory | OBJECT(1), MATERIAL(2), CRAFT(3), DONGHAI(4), CREATION(5), PHILOSOPHY(6) | `journal_posts.category` |
| MediaCategory | PRODUCT(1), BEADS(2), SEAL(3), INCENSE(4), PORCELAIN(5), WOODWORK(6), OTHER_OBJ(7), MATERIAL(8), BRAND(9), CRAFT(10), ARTICLE(11) | `media.category` |
| ObjectCategory | BRACELET(1), INCENSE(2), SEAL(3), CERAMIC(4), ENAMEL(5), SCHOLAR(6) | `products.object_category` |
| ProductType | STANDARD(1), BATCHED(2) | `products.product_type` |
| TagType | SERIES(1), VALUE(2), MATERIAL(3), EMOTION(4), SCENE(5), OBJECT(6) | `tags.type` |

---

## 4. PublishStatus — Exact Values and Ordering

**Database enum values (exact, in sort order):**

| Sort Order | Value | Notes |
|-----------|-------|-------|
| 1 | `DRAFT` | Default for `products.publish_status` and `journal_posts.status` |
| 2 | `PENDING_REVIEW` | Exists in DB enum but rarely referenced in application |
| 3 | `APPROVED` | Exists in DB enum; appears in publisher state machine |
| 4 | `PUBLISHED` | Terminal publish state |
| 5 | `UNPUBLISHED` | Exists in DB enum; appears as raw SQL alias |
| 6 | `ARCHIVED` | Terminal archived state |

**NOT in the enum:** `IN_REVIEW`, `SCHEDULED`, `REJECTED` — these are CHECK CONSTRAINT values only, on `products.status` (text column) and `series.status` (varchar column).

**Also NOT in the enum:** `PUBLISHED` from frozen-schema `PublishStatus` with only DRAFT/PUBLISHED.

---

## 5. Table Existence Matrix

| Table | Status | Notes |
|-------|--------|-------|
| `products` | **EXISTS** | 34 columns, serial PK |
| `series` | **EXISTS** | 14 columns, serial PK |
| `materials` | **EXISTS** | 12 columns, serial PK |
| `tags` | **EXISTS** | 6 columns, text PK |
| `product_tags` | **EXISTS** | 3 columns, many-to-many bridge |
| `media` | **EXISTS** | 8 columns, text PK |
| `journal_posts` | **EXISTS** | 16 columns, text PK |
| `banners` | **EXISTS** | 15 columns, serial PK |
| `contact_leads` | **EXISTS** | 9 columns, text PK |
| `page_contents` | **EXISTS** | 10 columns, text PK |
| `seo_configs` | **EXISTS** | 8 columns, text PK |
| `site_settings` | **EXISTS** | 4 columns, text PK |
| `publish_jobs` | **EXISTS** | 7 columns, text UUID PK |
| `content_versions` | **EXISTS** | 8 columns, text UUID PK |
| `seo_snapshots` | **EXISTS** | 12 columns, text UUID PK |
| `brand_product_content` | **EXISTS (supplemental)** | 1:1 extended content per product |
| `brand_materials` | **EXISTS (supplemental)** | Junction table (was `product_materials`) |
| `journal_tags` | **EXISTS** | Many-to-many: journals ↔ tags |
| `product_materials` | **EXISTS** | Many-to-many: products ↔ materials |
| `orders` | **EXISTS (ERP legacy)** | Co-located in Brand DB, simple order table |
| `admin_users` | **EXISTS** | Auth users, enum role |
| `audit_logs` | **EXISTS** | Entity audit trail |

**Future target tables:**

| Table | Status |
|-------|--------|
| `brand_products` | **DOES NOT EXIST** |
| `brand_series` | **DOES NOT EXIST** |
| `brand_materials` | **DOES NOT EXIST** |
| `brand_tags` | **DOES NOT EXIST** |
| `brand_product_tags` | **DOES NOT EXIST** |

---

## 6. Column Metadata Summary

### 6.1 `products` (34 columns)

Key columns relevant to architecture:
- `id` — integer, PK, autoincrement via sequence
- `sku` — text, UNIQUE NOT NULL
- `slug` — text, UNIQUE NOT NULL
- `series_id` — integer, FK → `series(id)`, RESTRICT on DELETE, CASCADE on UPDATE
- `object_category` — ObjectCategory enum (BRACELET..SCHOLAR), default BRACELET
- `status` — **text** (NOT enum), CHECK constraint: DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED
- `publish_status` — **PublishStatus enum**, default DRAFT
- `product_type` — ProductType enum, default STANDARD
- `erp_product_id` — integer, UNIQUE, nullable (link to ERP)
- `remaining_qty` — integer, nullable
- `cost_price`, `sale_price` — double precision
- `cover_image`, `gallery` — text
- `published_at` — timestamptz, nullable
- `companions_count` — integer, default 0
- `sort_order` — integer, default 0

### 6.2 `series` (14 columns)

- `id` — integer, PK, autoincrement
- `slug` — text, UNIQUE NOT NULL
- `name` — text NOT NULL
- `description` — text NOT NULL
- `coverImage`, `heroText` — text (camelCase naming throughout)
- `status` — **varchar(20)**, nullable, CHECK constraint: same values as products.status
- `published_at` — timestamptz, nullable
- `is_active` — boolean, default true

### 6.3 `journal_posts` (16 columns)

- `id` — text, PK
- `slug` — text, UNIQUE NOT NULL
- `status` — **PublishStatus enum**, default DRAFT
- `category` — JournalCategory enum
- `content` — text NOT NULL (full body)
- `published_at` — timestamp, nullable
- Index: (status, published_at)

### 6.4 `banners` (15 columns)

- `id` — integer, PK, autoincrement
- `status` — **varchar(20)**, nullable, default DRAFT (FREE TEXT, not enum)
- `position` — varchar(50), default 'home'
- `sort_order` — integer, default 0
- `start_at` / `end_at` / `published_at` — timestamptz, nullable
- `subtitle`, `btn_text`, `mobile_image_url` — recent additions, nullable

### 6.5 `publish_jobs` (7 columns)

- `id` — text, PK, default `gen_random_uuid()`
- `status` — **varchar(20)**, nullable, default 'pending' (FREE TEXT)
- `content_type` — varchar(20), NOT NULL
- `content_id` — text, NOT NULL
- `publish_at` — timestamptz, NOT NULL

### 6.6 `content_versions` (8 columns)

- `id` — text, PK, default `gen_random_uuid()`
- `status` — **varchar(20)**, nullable, default 'PUBLISHED' (FREE TEXT)
- `content_type` - varchar(20), NOT NULL
- `snapshot` — jsonb, default '{}'
- UNIQUE(content_type, content_id, version)

### 6.7 `seo_snapshots` (12 columns)

- `id` — text, PK, default `gen_random_uuid()`
- `title`, `slug` — varchar(255), NOT NULL
- `description`, `keywords`, `og_image`, `canonical_url` — nullable text

---

## 7. Constraint Findings

### Foreign Keys

| Source | Target | Type | Action |
|--------|--------|------|--------|
| `products.series_id` → `series.id` | Same DB | RESTRICT | ON DELETE RESTRICT, ON UPDATE CASCADE |
| `product_materials.product_id` → `products.id` | Same DB | CASCADE | ON UPDATE CASCADE, ON DELETE CASCADE |
| `product_materials.material_id` → `materials.id` | Same DB | CASCADE | ON UPDATE CASCADE, ON DELETE CASCADE |
| `brand_product_content.product_id` → `products.id` | Same DB (implied) | UNIQUE + NOT NULL | No explicit FK found (UNIQUE constraint as 1:1) |

**Notable:** `product_tags` has NO explicit foreign key constraint on `product_id` or `tag_id` — only a unique index on (product_id, tag_id). Referential integrity is handled at application level.

### Unique Constraints

| Table | Columns | Notes |
|-------|---------|-------|
| `products` | `sku`, `slug`, `erp_product_id` | Three separate unique indexes |
| `series` | `slug` | Unique slug |
| `materials` | `name` | Unique material name |
| `tags` | `name`, `slug` | Two separate unique indexes |
| `product_tags` | `(product_id, tag_id)` | Composite unique |
| `product_materials` | `(product_id, material_id)` | Composite unique |
| `brand_product_content` | `product_id` | 1:1 unique |
| `page_contents` | `(page_key, section_key)` | Composite unique |
| `seo_configs` | `page_key` | Unique |
| `site_settings` | `key` | Unique |
| `content_versions` | `(content_type, content_id, version)` | Version uniqueness |

### Check Constraints

| Table | Constraint | Values |
|-------|-----------|--------|
| `products` | `status` text CHECK | DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED |
| `series` | `status` varchar CHECK | Same set (text cast) |

---

## 8. Index Findings

| Table | Index | Type | Notes |
|-------|-------|------|-------|
| `products` | `products_erp_product_id_key` | UNIQUE btree | ERP link lookup |
| `products` | `products_object_category_idx` | btree | Category filtering |
| `products` | `products_publish_status_idx` | btree | Publish status filtering |
| `products` | `products_series_id_idx` | btree | FK join |
| `products` | `products_status_idx` | btree | Legacy status filtering |
| `journal_posts` | `journal_posts_status_published_at_idx` | btree | Content discovery |
| `journal_posts` | `journal_posts_category_idx` | btree | Category grouping |
| `publish_jobs` | `idx_pj_ct_cid` | btree | Content lookup |
| `publish_jobs` | `idx_pj_status_pa` | btree | Schedule scanning |
| `content_versions` | `idx_cv_ct_cid` | btree | Version history lookup |
| `content_versions` | `idx_cv_created` | btree | History ordering |
| `seo_snapshots` | `idx_ss_ct_cid` | btree | SEO lookup |
| `audit_logs` | `audit_logs_entity_type_entity_id_idx` | btree | Audit trail |
| `audit_logs` | `audit_logs_user_id_idx` | btree | User audit |

All indexes use btree method. No partial, GIN, or GiST indexes.

---

## 9. PublishStatus Usage Matrix

### Which columns use PublishStatus enum?

| Table | Column | Type | Nullable | Default | Values (exact) |
|-------|--------|------|----------|---------|-----------------|
| `products` | `publish_status` | **PublishStatus (enum)** | NO | `'DRAFT'::PublishStatus` | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED |
| `journal_posts` | `status` | **PublishStatus (enum)** | NO | `'DRAFT'::PublishStatus` | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED |

### Which columns use text/varchar status with CHECK constraint?

| Table | Column | Type | Nullable | Default | Check Constraint Values |
|-------|--------|------|----------|---------|------------------------|
| `products` | `status` | text | NO | `'draft'` (lowercase) | DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED |
| `series` | `status` | varchar(20) | YES | `'DRAFT'` | Same 7 values |

### Which columns use free-text status (no enum, no check)?

| Table | Column | Type | Nullable | Default |
|-------|--------|------|----------|---------|
| `banners` | `status` | varchar(20) | YES | `'DRAFT'` |
| `publish_jobs` | `status` | varchar(20) | YES | `'pending'` |
| `content_versions` | `status` | varchar(20) | YES | `'PUBLISHED'` |
| `orders` | `status` | text | NO | `'pending'` |

---

## 10. Repository Evidence Conflicts

### Conflict A: PublishStatus — 3 competing definitions

| Source | Values | Status |
|--------|--------|--------|
| **PostgreSQL Enum** `PublishStatus` | DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED, UNPUBLISHED, ARCHIVED (6 values) | ✅ **AUTHORITATIVE** |
| **Publisher state machine** (code) | DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED (7 values) | ⚠️ Code-only — never used PublishStatus enum, uses `products.status` text column |
| **Frozen Prisma Schema** | DRAFT, PUBLISHED (2 values) | ⚠️ Stale — does not reflect real DB enum |

### Conflict B: products.status — dual status system

The `products` table has **two independent status fields**:

1. `status` (text) — CHECK constraint with 7 values. Lowercase default `'draft'`. Used by the Publisher state machine (DRAFT, IN_REVIEW, APPROVED, SCHEDULED, PUBLISHED, ARCHIVED, REJECTED).
2. `publish_status` (PublishStatus enum) — 6 values. Uppercase default `'DRAFT'`. Actual PostgreSQL enum.

These are **not synchronized** — they exist as parallel status columns.

### Conflict C: schema.prisma PublishStatus

The frozen Prisma schema in `apps/web/prisma/schema.prisma` and `apps/brand-os/prisma/schema.prisma` define:

```prisma
enum PublishStatus {
  DRAFT
  PUBLISHED
}
```

This is missing 4 values present in the actual database: `PENDING_REVIEW`, `APPROVED`, `UNPUBLISHED`, `ARCHIVED`.

### Conflict D: series.status

- DB: `varchar(20)` with CHECK constraint (7 values). Nullable. Default `'DRAFT'`.
- Some code expects this to be the PublishStatus enum. It is NOT — it's free varchar.

### Conflict E: banners.status

- DB: `varchar(20)`, nullable, default `'DRAFT'`. No enum, no check constraint.
- Code treats this as `DRAFT`/`PUBLISHED` only. DB allows any string.

---

## 11. Phase B Unblock Decision

### Key Unblockers

1. **PublishStatus enum confirmed**: DRAFT(1), PENDING_REVIEW(2), APPROVED(3), PUBLISHED(4), UNPUBLISHED(5), ARCHIVED(6)
2. **No future `brand_*` tables exist** — they would need to be created
3. **products table already has `publish_status` column** (PublishStatus enum) — no migration needed
4. **products table also has legacy `status` text column** — parallel status system
5. **`erp_product_id`** links Brand products to ERP — unique, nullable
6. **Foreign keys are all within DB** — no cross-database references found
7. **brand_product_content exists** as 1:1 supplemental product data

### Remaining Questions

1. Should Phase B canonical models use `publish_status` (enum) or `status` (text+check) for the PublishStatus? The enum is cleaner; the text+check is more flexible.
2. The parallel `status`/`publish_status` on products needs a resolution strategy.
3. `series.status` is varchar with check constraint — not enum. Should it be migrated to PublishStatus enum?
4. `banners.status` is free varchar — needs constraints if formalized.

### Decision

**PHASE B IS UNBLOCKED** — metadata evidence is sufficient to design a canonical Prisma schema.

However, the design must account for:
- The real 6-value PublishStatus enum (not the stale 2-value frozen schema)
- The dual status system on `products` (text `status` + enum `publish_status`)
- `brand_product_content` as an existing 1:1 extension table
- No `brand_*` alias tables exist yet in the Brand Runtime database

---

## Appendix: Sequences

| Sequence | Table |
|----------|-------|
| `products_id_seq` | products.id |
| `series_id_seq` | series.id |
| `materials_id_seq` | materials.id |
| `banners_id_seq` | banners.id |
| `orders_id_seq` | orders.id |
| `brand_materials_id_seq` | brand_materials.id |
| `brand_product_content_id_seq` | brand_product_content.id |
| `product_materials_id_seq` | product_materials.id |
