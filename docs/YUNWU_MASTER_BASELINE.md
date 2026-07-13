# YUNWU Master Baseline

> **Single Source of Truth** for 允物 (Yunwu) Project
>
> Last updated: 2026-07-13 (Phase D1 Platform Brand adapter and low-risk reads)
>
> Everything below this line is authoritative.

---

## Prisma Hotfix — Schema Ownership Audit (2026-07-11)

- The frozen Web Prisma schema keeps the TypeScript field `remainingQuantity` and now maps it to the existing production column `remaining_qty`.
- No database migration was required or performed.
- Brand OS product creation now rejects a missing or invalid `seriesId` instead of writing `0`.
- The temporary three-client Prisma strategy remains in place; convergence on the canonical `@yunwu/db` client remains a separate Phase 3 task.

---

## Prisma Phase 3A — Canonical Contract Guard (2026-07-11)

- Run `pnpm check:prisma-contract` to verify frozen-schema ownership declarations, generator/datasource contracts, and known Prisma column mappings without connecting to a database.
- The guard is intentionally read-only; Phase 3B/3C client migrations and Phase 3D frozen-schema deletion remain separate tasks.

---

## Prisma Phase B — Brand Runtime Canonical Package (2026-07-12)

- Brand Runtime canonical schema: `packages/brand-db/schema.prisma`.
- Brand Runtime Prisma client package: `@yunwu/brand-db`, generated privately as `@prisma/brand-client`.
- Brand Runtime uses `BRAND_DATABASE_URL` only; ERP continues to use `DATABASE_URL` through `@yunwu/db`. The two canonical schemas and clients must remain isolated.
- Product OS owns no database. This phase establishes only the schema package and read-only contract guard; it does not migrate application consumers.
- Consumer migration for `apps/brand-os` and Platform Brand modules belongs to Phase C/D. Publisher status mapping remains Phase E.

---

## Prisma Phase C1 — Brand OS Relation and Adapter Infrastructure (2026-07-12)

- ADR-002 is accepted. The canonical Brand schema explicitly declares the Tag, ProductTag, and LegacyJournalTag Prisma Client relations needed by Brand OS.
- `product_tags` and `journal_tags` have no production database FK constraints. Prisma relations are not database FKs; referential integrity remains application-level and relation actions are non-Cascade.
- `apps/brand-os/src/lib/brand-db-adapter.ts` is the server-only thin re-export entry for `@yunwu/brand-db`.
- Phase C1 does not migrate consumers. The legacy client, frozen schema, and existing generate entry remain until their later phases; consumer migration is Phase C2 and frozen-schema deletion is Phase H.

---

## Prisma Phase C2 — Canonical Brand Write Contract and Consumer Migration (2026-07-12)

- ADR-003 and ADR-004 establish the approved Canonical Write Contract in `packages/brand-db/schema.prisma`. `JournalPost`, `PageContent`, `AuditLog`, and `AdminUser` use Prisma-side `cuid()` defaults; `Media`, `SeoConfig`, `SiteSetting`, `Tag`, `ProductTag`, and `LegacyJournalTag` do so under ADR-004. Non-Prisma writers must explicitly generate those IDs.
- Existing database-backed sequence behavior is represented by `autoincrement()` for `LegacyBrandProduct`, `LegacyBrandSeries`, and `LegacyBrandMaterial`; no DDL, migration, or database action was performed. The listed `updatedAt` fields are Prisma Client-maintained with `@updatedAt`, not database triggers.
- All 17 audited Brand OS production consumers now use the server-only `@/lib/brand-db-adapter`; the client-side tags page uses a local literal TagType union and does not import the adapter. The legacy `src/lib/prisma.ts`, `src/lib/db.ts`, frozen schema, and legacy client generation remain for later retirement phases.
- `AdminUser.email` remains intentionally non-unique. Authentication reads at most two matching rows and rejects/audits duplicates; admin creation performs an authorization-first application pre-check. This is not a database uniqueness guarantee and concurrent duplicate creation remains a Phase G hardening concern.
- `ContactLead.wechat` remains an unmapped optional field; `we_chat` is not a canonical field. `pnpm check:prisma-contract` now guards the approved defaults, timestamp behavior, email uniqueness prohibition, and contact-field contract.
- Phase C3 is limited to non-production code migration; Phase H alone may remove the frozen schema or legacy Brand Prisma client.

---

## Prisma Phase C3 — Brand OS Non-Production Consumer Migration (2026-07-13)

- `apps/brand-os/seed.ts` is the sole Brand OS non-production Prisma consumer identified by the C3 static inventory. It now uses `@yunwu/brand-db` with script-scoped `createBrandDb()` and explicit `finally` disconnect; it uses `BRAND_DATABASE_URL` only.
- No seed was run and no database connection, read, or write was performed. Seeded status values remain canonical `PUBLISHED`; Publisher state mapping remains Phase E.
- The Phase C4 readiness inventory is recorded in `docs/PHASE_C4_BRAND_OS_LEGACY_CLIENT_CLEANUP_READINESS_2026-07-13.md`. The legacy local client entries, frozen schema, generated output, postinstall, and dependencies remain in place for C4/H; no cleanup occurred in C3.

---

## Prisma Phase C4 — Brand OS Legacy Client Decommission (2026-07-13)

- Brand OS no longer generates or imports its local legacy Prisma Client. `src/lib/prisma.ts`, `src/lib/db.ts`, the ignored local generated output, and the local Prisma `postinstall` path are retired.
- Brand OS Runtime continues to use the server-only `brand-db-adapter`; the independent seed continues to use `@yunwu/brand-db` with `createBrandDb()`. Canonical client generation is owned only by `packages/brand-db`.
- The Brand OS package no longer directly depends on `@prisma/client`, `prisma`, or ERP `@yunwu/db`; it retains `@yunwu/brand-db` and `server-only`.
- `apps/brand-os/prisma/schema.prisma` remains physically unchanged but is inactive for Brand OS install, build, typecheck, runtime, and seed. It remains a read-only root Contract Guard input until Phase H has separately transitioned that guard.
- Phase H deletion readiness is recorded in `docs/PHASE_H_FROZEN_BRAND_SCHEMA_DELETION_READINESS_2026-07-13.md`. Physical Frozen Schema deletion remains Phase H only; Platform migration, Publisher status work, and any target-table migration remain Phases D, E, and G.

---

## Prisma Phase D1 — Platform Brand Adapter and Low-Risk Reads (2026-07-13)

- `apps/platform/lib/brand-db.ts` is the sole server-only Platform import boundary for Canonical Brand Runtime reads. It reuses `@yunwu/brand-db`'s `brandDb`; ERP access remains on `@yunwu/db`.
- The Platform Brand Home statistics counts and Brand Banners list read now use typed Canonical Prisma delegates. Their existing business response shapes are preserved; Banners retains the SQL-equivalent `COALESCE(sort_order, 0)` and created-at ordering in the action layer.
- `page_contents` remains raw SQL because its production response includes `status` and `published_at`, which are not modeled by the Canonical `PageContent`; it is deferred without a Schema change. All writes, Publisher calls, dynamic SQL, Settings/SEO, mixed-context paths, and `products/actions.ts` remain for later phases.
- Platform now declares `@yunwu/brand-db` and `server-only`; it retains ERP `@yunwu/db`, `@prisma/client`, and its existing Prisma tooling. No second Brand Client lifecycle was introduced.
- Phase D2 owns write migration and remaining context-ownership violations; Publisher remains Phase E.

---

## 1. Project Identity

| Attribute | Value |
|-----------|-------|
| **Project Name** | 允物 (Yunwu) — Eastern Cultural Brand |
| **Founder** | Ryan 迟硕 |
| **Git Remote (Platform OS)** | `git@github.com:RYAN-CHIS/platform-os.git` |
| **Git Remote (Storefront)** | `git@github.com:RYAN-CHIS/yunwu-origin.git` |
| **Production Branch** | `main` (both repos) |
| **Package Manager** | `pnpm` (platform-os monorepo) |
| **Monorepo Engine** | pnpm workspace (`pnpm-workspace.yaml`) |
| **Root Lock File** | `pnpm-lock.yaml` |
| **Node Version** | 24.x (Vercel Production) |
| **Build Output** | `.next/` (renewable, gitignored) |

---

## 2. Architecture Overview

### 2.1 Two Project Structure (2026-06-29 Cleanup)

After Yunwu Project Cleanup (2026-06-29), the project converged to exactly two active directories:

```
/Users/ryan/Workbuddy/
├── platform-os/              ← Backend: ERP OS + Brand OS + Media Library
│   └── apps/platform/        ← Vercel Production (Root: apps/platform)
│       ├── app/login/        ← Admin login
│       ├── app/(platform)/brand/media/  ← Brand media library
│       ├── app/(platform)/brand/products/
│       ├── app/(platform)/brand/series/
│       ├── app/(platform)/brand/journal/
│       ├── app/(platform)/brand/materials/
│       ├── app/(platform)/brand/settings/
│       └── app/(platform)/erp/
└── yunwu-origin/             ← Frontend: Storefront (Product OS)
    └── src/app/
        ├── products/
        ├── series/
        ├── journal/
        ├── materials/
        └── about/
```

### 2.2 Monorepo Structure (platform-os)

```
platform-os/
├── apps/
│   └── platform/     → Platform OS (unified admin entry, Next.js, port 3100)
├── packages/
│   ├── auth/         → Identity, session, NextAuth, permission middleware
│   ├── db/           → Unified Prisma entry (41 models)
│   ├── platform/     → Sidebar, permission config, gateway, service layer
│   ├── ui/           → Unified UI components, design tokens
│   └── shared/       → Date, amount, order number utilities
└── docs/             → Project documentation & reports
```

### 2.3 App Roles

| App | Role | Current Status |
|-----|------|----------------|
| **Platform** | Unified management: ERP OS + Brand OS + Media Library | **Active, production** |
| **Storefront (yunwu-origin)** | Public website: product showcase, PDP, journal, series | **Active, production** |

### 2.4 Backend

- No standalone backend service.
- All backend logic via:
  - Next.js Route Handlers (`app/api/**/route.ts`)
  - Next.js Server Actions
  - Prisma ORM (`packages/db/schema.prisma`)
  - NextAuth (authentication, via `packages/auth`)

### 2.5 Database

| Database | Provider | URL Env Var | Location | Application Role |
|----------|----------|-------------|----------|-----------------|
| **Brand DB** (yunwu-origin) | Neon (PostgreSQL) | `BRAND_DATABASE_URL` | ap-southeast-1 (Singapore) | `brand_app` |
| **ERP DB** (yunwu-brand-os) | Neon (PostgreSQL) | `DATABASE_URL` / `DIRECT_DATABASE_URL` | us-east-2 (US-East) | `erp_app` |
| **Storefront DB** | Neon (PostgreSQL) | `DATABASE_URL` (yunwu-origin repo) | ap-southeast-1 | `neondb_owner` (to be rotated) |

### 2.6 Infrastructure

| Service | Provider | Config |
|---------|----------|--------|
| **Deployment** | Vercel (2 projects only) | platform-os + yunwu-origin |
| **Production URL (Platform OS)** | `https://platform-os-eosin.vercel.app` | Vercel, connected to RYAN-CHIS/platform-os |
| **Production URL (Storefront)** | `https://www.yunwuorigin.com` | Vercel, connected to RYAN-CHIS/yunwu-origin |
| **Blob Store** | Vercel Blob | `store_aX5AkCAHGANaFqRv` (shared) |

### 2.7 Banner Management — 统一数据源（2026-07-11）

| 项 | 值 |
|----|----|
| **Single Source of Truth** | Brand DB `neondb`（Singapore, Neon Brand DB）的 `banners` 表 |
| 后台管理路径 | `apps/platform/app/(platform)/brand/banners/`（`page.tsx` + `client.tsx`）+ `apps/platform/modules/brand/banners/actions.ts` |
| 前台读取层 | `yunwu-origin/src/lib/banners.ts` → `getPublishedBannersByPlacement(placement)` |
| 前台展示组件 | `yunwu-origin/src/components/BannerSection.tsx`（服务端组件）|
| 前台接入点 | `yunwu-origin/src/app/page.tsx` 首页 `placement="home"` |
| placement 约定 | `home` / `product` / `series`（可扩展）|
| 发布过滤 | `status='PUBLISHED'` 且 `start_at <= now` 且 `end_at >= now` |
| 排序 | `sort_order ASC`（NULL 视为 0），其次 `created_at DESC` |
| 移动端 | 优先 `mobile_image_url`，缺省回退 `image_url` |
| 静态 / JSON Banner 是否已迁移 | **无**——网站原计划无图片 Banner；首页 Hero 为纯文字品牌叙事（`src/data/site-settings.json`），保留不纳入 Banner 管理 |
| 临时 fallback | **无**——前台直连 DB；`BannerSection` 空结果返回 `null`，不存在静态双数据源 |
| `banners` 表关键列 | id, title, subtitle, btn_text, image_url, mobile_image_url, link_url, position, sort_order, status, start_at, end_at, published_at, created_at, updated_at |
| 新增列（2026-07-11） | `published_at`(timestamptz)、`subtitle`(varchar 255)、`btn_text`(varchar 120)、`mobile_image_url`(text) —— 均为 nullable，无默认值 |
| 迁移方式 | Brand DB 手动迁移（Prisma CLI 6.19.3 vs 全局 7.8.0 不兼容，禁用 `db push` / `migrate`）|
| 正式迁移文件 | `docs/db/migrations/2026-07-11-add-banner-management-columns.sql`（幂等 `IF NOT EXISTS`，含 forward + rollback 注释）|
| 迁移记录文档 | `docs/db/brand-db-manual-migrations.md` → 迁移 #2 |
| Rollback | 手动 `ALTER TABLE banners DROP COLUMN IF EXISTS <col>`（4 列，详见迁移文件注释；回滚会丢弃字段内容）|
| Prisma Schema 对齐 | yunwu-origin `prisma/schema.prisma` `banners` 模型已含 15 列，与真实 DB 一致；`prisma validate` ✅ / `prisma generate` ✅。platform-os 无 banners Prisma 模型（由 `$queryRawUnsafe` 管理）|
| 测试 Banner 清理 | 已清理——`banners` 表恢复为 1 条正式数据（`个人中心` / home / DRAFT），无测试残留 |

**数据源边界（重要更正）**：Brand OS `BRAND_DATABASE_URL` 与 Storefront `yunwu-origin` `DATABASE_URL` 指向同一 Neon 实例。因此前台可直连读取后台已发布 Banner。后台 `banners` 表是唯一编辑源。

**数据库凭证权限（2026-07-11 安全修复后）**：

| repo | env key | host fingerprint | database | role/username | 权限 | 状态 |
|------|---------|------------------|----------|----------------|------|------|
| platform-os | `BRAND_DATABASE_URL` | `fingerprint:c52c417909f5` (ap-southeast-1, Neon) | `neondb` | `brand_app` | SELECT, INSERT, UPDATE, DELETE | ✅ 最小权限 |
| platform-os | `DATABASE_URL` | `fingerprint:aabd02495d66` (us-east-2, Neon) | `neondb` | `erp_app` | SELECT, INSERT, UPDATE, DELETE | ✅ 最小权限 |
| platform-os | `DIRECT_DATABASE_URL` | `fingerprint:aabd02495d66` (us-east-2, Neon) | `neondb` | `erp_app` | SELECT, INSERT, UPDATE, DELETE | ✅ 最小权限 |
| yunwu-origin | `DATABASE_URL` | `fingerprint:c52c417909f5` (ap-southeast-1, Neon) | `neondb` | `neondb_owner` | owner（全权限） | ⚠️ 待创建只读 role |

- Brand DB 与 Storefront 指向**同一数据库实例**：✅ 是（Singapore, Neon Brand DB）
- 前台凭证仍为 `neondb_owner`（过度授权），当前代码仅 SELECT，但**凭证未轮换**
- ✅ platform-os 生产环境已全部使用 `brand_app` / `erp_app` 应用角色，非 owner
- ✅ 源代码不存在任何硬编码 credentials
- ⚠️ **TO DO**: 为 storefront 创建只读 role，替换 yunwu-origin 的 `DATABASE_URL`

**后台 UI E2E 验收状态（2026-07-11 补验）**：

> 🚫 **BLOCKED：缺少已登录后台浏览器会话。**
> `https://platform.yunwuorigin.com/brand/banners` 返回 307 登录墙，本环境无后台账号/ Cookie，无法以真实点击完成新增/编辑/发布/下架 UI 验收，也未用 SQL / curl 替代。
> 代码链路（actions.ts 列白名单 + `transitionStatus` published_at、client.tsx 筛选/移动图/router.refresh、前台 BannerSection）已完成并通过构建与 Prisma 校验；但**后台真实 UI E2E 尚未验收**，不得声称整体完成。

**禁止事项**：后台与静态 JSON 长期双数据源；前台复制 Banner 内容；发布后将 Banner 移出主表；为让页面出现而重复创建同一 Banner；将商品图片误迁为 Banner；擅自变更生产数据库凭证。

**相关 commit**：
- platform-os（后台 + 迁移文档 + 本文档）：见本仓库最新 commit（`a0369e1…` 之后本轮新增 `2026-07-11` 迁移记录）
- yunwu-origin（前台读取层 + 接入）：`bf8fe90aec227690bcd4c0b4e2834fceece57f4a`（本轮无代码/Schema 变更，commit = N/A）

**生产部署**：
- 后台：`https://platform.yunwuorigin.com/brand/banners`
- 前台：`https://www.yunwuorigin.com`

---

## 3. Active Directories (FORBIDDEN list below)

### 3.1 Active ONLY

| Directory | Purpose | Git Remote | Vercel Project |
|-----------|---------|------------|----------------|
| `/Users/ryan/Projects/active/platform-os/` | Backend (ERP + Brand OS + Media) | `RYAN-CHIS/platform-os.git` | `platform-os` |
| `/Users/ryan/Projects/active/yunwu-origin/` | Frontend (Storefront + Product OS) | `RYAN-CHIS/yunwu-origin.git` | `yunwu-origin` |

### 3.2 FORBIDDEN

The following paths are **forbidden** as active development sources (archived to `/Users/ryan/Archives/yunwu-cleanup-20260629/`):

- ~~`/Users/ryan/yunwu-origin`~~ — **Duplicate clone archived**
- ~~`/Users/ryan/yunwu-brand-os`~~ — **Old standalone ERP, repo `yunwu-erp` archived**
- ~~`/Users/ryan/Workbuddy/yunwu`~~ — **Renamed to platform-os**
- ~~`/Users/ryan/Workbuddy/yunwu-admin`~~ — **Renamed to yunwu-origin**
- ~~`StudyBuddy/APP/` — **Deleted from active** | **STUDY_ARTIFACT**~~

**Rules:**
- No development from legacy snapshots
- No use of `yunwu-admin` or `yunwu-brand-os` as active source
- No creation of new Vercel projects outside platform-os / yunwu-origin
- All historical snapshots archived only; restore by retrieving from Archives

---

## 4. Permission Model (RBAC v2)

| Role | Scope |
|------|-------|
| **Admin** | Full access across all modules |
| **Manager** | Module-level write + management |
| **Operator** | Operational write permissions |
| **Viewer** | Read-only |

Permission matrix: Role × Module × Operation (create/read/update/delete/manage).

---

## 5. Brand Identity (Yunwu Charter — Highest Fact Source)

| Item | Value |
|------|-------|
| **Charter File** | `docs/允物品牌宪章.pdf` (15 articles + final chapter) |
| **Core Claim** | 让物归物，让心归心 (Let things be things, let the heart be the heart) |
| **Three Principles** | 不承诺（招财/转运/改命）、不否定（传统文化）、不利用（恐惧/焦虑） |
| **User Term** | 同行者 (Fellow Traveler) |
| **Product Term** | 作品 (Artifact) |
| **Cart Term** | 六会 (Liuhui) |
| **Purchase Term** | 结缘 (Connection) |
| **Five Categories** | 见己 / 留痕 / 栖居 / 随行 / 传藏 |
| **Forbidden** | 神化器物、焦虑销售、虚假故事 |

---

## 6. Vercel Projects (Final, 2026-06-29)

| Project | Production URL | Git Repo | Root Dir | Status |
|---------|---------------|----------|----------|--------|
| **platform-os** | `https://platform-os-eosin.vercel.app` | `RYAN-CHIS/platform-os` | `apps/platform` | ✅ Production |
| **yunwu-origin** | `https://www.yunwuorigin.com` | `RYAN-CHIS/yunwu-origin` | `.` | ✅ Production |
| ~~platform~~ | — | — | — | ❌ Deleted |
| ~~archive-yunwu-erp~~ | — | — | — | ❌ Deleted |

### Domain & Alias

| Alias | Target | Status |
|-------|--------|--------|
| `platform-os-eosin.vercel.app` | `platform-os` production deploy | ✅ Active |
| `www.yunwuorigin.com` | `yunwu-origin` production deploy | ✅ Active |

---

## 7. Product & Data Structure

### 7.1 Core Entities

- **Series** — Product series/collections
- **Product** — Individual products/artifacts
- **Batch** — Limited editions with serial numbers
- **RitualTaxonomy** — Ritual classification navigation
- **CustomerQuote** — Customer quotation system
- **CrossSellRelation** — Cross-sell recommendations
- **JournalEntry** — Brand journal entries
- **Material** — Material definitions
- **ProductMaterial** — Product-material relationships
- **Order** — Customer orders
- **JournalPost** — Published journal posts
- **ContactLead** — Customer leads

### 7.2 Schema Models (platform-os)

41 models in `packages/db/schema.prisma`:
- Auth & Permission: User, PermissionGroup, Permission, UserPermission, PermissionTemplate, PermissionTemplateItem, TemporaryPermission, AuditLog
- ERP Core: ErpSeries, ErpWork, ErpWorkAsset, ErpProduct, ErpProductSku, ErpProductCost, ErpProductionRecord, ErpMaterial, ErpPurchaseRecord, ErpInventoryTransaction, ErpBom, ErpCustomer, ErpOrder, ErpMediaAsset, ErpMediaReference, ErpBanner
- Brand OS: BrandSeries, BrandProduct, BrandProductContent, BrandProductMaterial, BrandProductTag, BrandMaterial, BrandOrder, JournalPost, ContactLead, PageContent, SeoConfig, SiteSetting, ContentVersion, PublishJob, SeoSnapshot, BrandTag, BrandJournalTag

### 7.3 Schema Models (yunwu-origin)

12 models in `prisma/schema.prisma`:
- Series, Product, Batch, RitualTaxonomy, CustomerQuote, CrossSellRelation, JournalEntry, Material, ProductMaterial, Order, JournalPost, ContactLead

---

## 8. Deployment & Git Workflow

### 8.1 Git

- **platform-os**: `git@github.com:RYAN-CHIS/platform-os.git`, branch `main`
- **yunwu-origin**: `git@github.com:RYAN-CHIS/yunwu-origin.git`, branch `main`

### 8.2 Vercel Build Commands

- **platform-os**: `cd ../.. && pnpm db:generate && cd apps/platform && next build`
- **yunwu-origin**: `npx prisma generate && npx prisma db push --accept-data-loss && next build`

### 8.3 Vercel Node Version

Both projects: 24.x

---

## 9. Blob Store

| Store ID | Projects | Purpose |
|----------|----------|---------|
| `store_aX5AkCAHGANaFqRv` | platform-os + yunwu-origin | Product images, media assets |

---

## 10. YUNWU Baseline Synchronization Law

> **Code < Baseline → Update Baseline**
>
> **Baseline < Code → Update Baseline**
>
> **Forbidden:** Code changes without Baseline updates.

### 10.1 Before Every Task

1. Read this document
2. Confirm current baseline state
3. If code differs from baseline: output Delta Report; do not proceed

### 10.2 After Every Task

1. Check: `Code == Baseline?`
2. If no: immediately update this document
3. Then end task

### 10.3 Scope

Any modification to:
- Architecture
- Product OS
- ERP OS
- Schema
- Database
- Git
- Branch
- Vercel
- Deploy
- Infrastructure
- Product Structure
- AI Workflow
- New features / modules
- Build / Environment
- Active directories

All require this baseline to be synchronized.

---

## 11. Baseline History

| Date | Event |
|------|-------|
| **2026-06-27** | Master Baseline created (v1.0) |
| **2026-06-29** | **Project Cleanup PHASE 1-6 completed** |
| | — Code directories audited: 5 directories → **2 active** |
| | — archiving: `/Users/ryan/yunwu-origin` (duplicate clone) |
| | — archiving: `/Users/ryan/yunwu-brand-os` (old standalone ERP, 19 uncommitted changes preserved) |
| | — archiving: 7 legacy snapshots (3.1 GB total) |
| | — Renamed: `Workbuddy/yunwu` → `platform-os` |
| | — Renamed: `Workbuddy/yunwu-admin` → `yunwu-origin` |
| | — Re-linked: both projects to correct Vercel projects |
| | — Deleted Vercel projects: `platform`, `archive-yunwu-erp` confirmed |
| | — Vercel projects remaining: `platform-os` + `yunwu-origin` only |
| | — FORBIDDEN list established for dead code paths |
| | — Active directories: `/Users/ryan/Projects/active/platform-os/` + `/Users/ryan/Projects/active/yunwu-origin/` |

---

## Appendix A: Safety Notes

- This document contains **no** keys, tokens, or password values
- Environment variables listed by **name only**
- Database connections verified for **existence** only
- Blob Store token not exposed

### Changelog

**2026-07-11 — P1: Backup path hardened**
ERP import scripts (`apps/erp/scripts/reset-and-import-*.js`, `import-all-v3.js`) no longer hard-code the machine-specific path `/Users/ryan/Workbuddy/platform-os/` for backup files. They now use `path.join(__dirname, ...)` to derive the backup directory from the script's own location. This removes the only P1 blocker for repository relocation to `~/Projects/active/platform-os/`. The backup filename pattern (`backup-<timestamp>.json`) and directory (`apps/erp/scripts/`) are unchanged.

## Appendix B: Maintenance

- Update this file after every major change
- Never add new active directories outside the two permitted paths
- Adding new Vercel project requires updating section 6
- Archive any new legacy assets to `/Users/ryan/Archives/`

---

*This document is the Single Source of Truth for all Yunwu project development.*
*Every session starts by reading it; every task ends by synchronizing it.*

---

## 12. Filesystem OS v2 Migration (2026-07-11)

### Migration Record

| Attribute | Value |
|-----------|-------|
| **Date** | 2026-07-11 |
| **Strategy** | Direct `mv` on same APFS volume |
| **Symlinks created** | None |
| **Recovery point** | `/Users/ryan/Archives/pre-filesystem-migration/` |

### Path Changes

| Project | Old Path | New Path |
|---------|----------|----------|
| **platform-os** | `/Users/ryan/Workbuddy/platform-os/` | `/Users/ryan/Projects/active/platform-os/` |
| **yunwu-origin** | `/Users/ryan/Workbuddy/yunwu-origin/` | `/Users/ryan/Projects/active/yunwu-origin/` |
| **nexus** | `/Users/ryan/Workbuddy/nexus/` | `/Users/ryan/Projects/active/nexus/` |
| **AI Router** | `/Users/ryan/AI-Router/` | `/Users/ryan/Projects/active/ai-router/` |

### Verification Status

- All 4 Git repositories intact at new paths
- All HEAD hashes unchanged
- All remotes unchanged
- All pre-existing untracked files preserved
- Platform OS build: platform-app ✅, erp/brand-os/web have pre-existing build issues (non-migration)
- Yunwu-origin build: ✅
- Nexus build: ✅
- Recovery point validated and preserved
- No compatibility symlinks created
- No tool history cleaned

### Current Canonical WORKDIR

| Component | Path |
|-----------|------|
| **Backend/Admin** | `/Users/ryan/Projects/active/platform-os` |
| **Frontend/Storefront** | `/Users/ryan/Projects/active/yunwu-origin` |
| **Nexus** | `/Users/ryan/Projects/active/nexus` |
| **AI Router** | `/Users/ryan/Projects/active/ai-router` |

### Rollback

To return to original paths, run the reverse mv commands documented in the recovery point.


---

## 13. Platform OS Build Repair (2026-07-11)

### Context
Post-migration build verification identified 3 pre-existing build failures:
- erp: Turbopack `@prisma/client` module resolution
- brand-os: same + TypeScript type errors
- web: same + TypeScript type error

### Root Causes

| App | Root Cause | Resolution |
|-----|-----------|------------|
| **erp** | `@yunwu/auth` imported `{ Prisma }` from `@prisma/client` without declaring the dependency | Added `@prisma/client ^6.19.3` to `packages/auth/package.json` |
| **brand-os** | Used shared `@yunwu/db` PrismaClient but local code expected local schema model names; plus `@prisma/client` import issues and type errors in `sign-identity.ts` | Brand OS now uses its own local Prisma Client (`@prisma/brand-client`, output from `apps/brand-os/prisma/schema.prisma`). Fixed `sign-identity.ts` system union, `VerifyResult` re-export, and `seriesId` type. |
| **web** | Same pattern as brand-os | Web now uses its own local Prisma Client (`@prisma/web-client`, output from `apps/web/prisma/schema.prisma`) |

### Prisma Client Generation Strategy (post-fix)

| Package | Schema | Output | Used By |
|---------|--------|--------|---------|
| `@yunwu/db` | `packages/db/schema.prisma` (41 models) | pnpm store (default) | erp, platform-app |
| `@prisma/brand-client` | `apps/brand-os/prisma/schema.prisma` (16 models) | `apps/brand-os/node_modules/@prisma/brand-client` | brand-os |
| `@prisma/web-client` | `apps/web/prisma/schema.prisma` (16 models) | `apps/web/node_modules/@prisma/web-client` | web |

### Validation

| App | TypeScript | Build |
|-----|-----------|-------|
| platform-app | ✅ | ✅ |
| erp | ✅ | ✅ |
| brand-os | ✅ | ✅ |
| web | ✅ | ✅ (TS pass; DB schema drift blocks full build — pre-existing) |



---

## 14. P0 Security Incident — Brand DB Credential Leak Remediation (2026-07-11)

### Incident Summary
Brand database `neondb_owner` password tokens were hardcoded as fallback connection strings in 3 service files and leaked via git history. Two Neon database `neondb_owner` passwords were compromised.

### Leaked Credentials

| Cred ID | SHA-256 Fingerprint (first 12 hex) | Role | Git History Range |
|---------|-------------------------------------|------|-------------------|
| Cred A | `59525c2e5689` | `neondb_owner` on Brand DB A | 3 commits (oldest `640fbbe` → latest `c0cf1ce`) |
| Cred B | `e5893b488290` | `neondb_owner` on ERP DB B | 2 commits (oldest `898c22a` → latest `98cd183`) |

### Resolution — Source Code

| File | Before | After |
|------|--------|-------|
| `packages/platform/services/brand/products.service.ts` | `process.env.BRAND_DATABASE_URL || "postgresql://USER:***@HOST/DB"` | `process.env.BRAND_DATABASE_URL` — throws if missing |
| `packages/platform/services/brand/journal.service.ts` | Same pattern | Same fix |
| `packages/platform/services/brand/series.service.ts` | Same pattern | Same fix |
| `packages/db/brand.ts` | `process.env.BRAND_DATABASE_URL || process.env.DATABASE_URL || ""` | `process.env.BRAND_DATABASE_URL` — lazy proxy, throws if missing |
| `apps/platform/modules/brand/shared/gateway.ts` | Same fallback to DATABASE_URL | Fail closed with error |
| `apps/platform/modules/erp/shared/gateway.ts` | `ERP_DATABASE_URL || DATABASE_URL || ""` | Fail closed with error |

**Principle applied**: All six files now **fail closed** — missing env var throws at first use, never falls back to plaintext.

### Resolution — Database Roles

| Database | Old Role | New Role | Privileges |
|----------|---------|----------|------------|
| Brand DB A (Singapore) | `neondb_owner` (owner, unlimited) | `brand_app` | `SELECT, INSERT, UPDATE, DELETE` on all tables + default privileges |
| ERP DB B (US-East) | `neondb_owner` (owner, unlimited) | `erp_app` | `SELECT, INSERT, UPDATE, DELETE` on all tables + default privileges |

### Resolution — Vercel Env

| Env Var | Old Value (Production) | New Value | Updated At |
|---------|----------------------|-----------|-----------|
| `BRAND_DATABASE_URL` | `neondb_owner` (Cred A — revoked) | `brand_app` role | 2026-07-11 |
| `DATABASE_URL` | `neondb_owner` (Cred B — revoked) | `erp_app` role | 2026-07-11 |
| `DIRECT_DATABASE_URL` | `neondb_owner` (Cred B — revoked) | `erp_app` role | 2026-07-11 |

All environments (Production, Preview, Development) updated.

### Security Guards

| Guard | Command | What it checks |
|-------|---------|----------------|
| Guard script | `pnpm check:secrets` | Blocks `postgresql://...` with password, `npg_` tokens, `||` URL fallback in source and document files |
| Schema contract | `pnpm check:prisma-contract` | No hardcoded creds in `.prisma` schema files |

**Post-incident rule**: All source files and documentation are scanned by `pnpm check:secrets`. Audit documents use irreversible SHA-256 fingerprints only.

### Git History Status
- Leaked credentials exist in git history (cannot rewrite pushed history)
- Production credentials rotated at database level: **REVOKED**
- Production env vars migrated from `neondb_owner` to `brand_app`/`erp_app`
- Source code no longer contains any hardcoded fallback

### Remaining Risk
- `neondb_owner` role still exists on both Neon projects (default owner, cannot be deleted), **old leaked passwords REVOKED** — confirmed via auth failure on pooled endpoints. New passwords set to random values.
- `yunwu-origin` repo still uses `neondb_owner` via its `DATABASE_URL` — a read-only role (`brand_reader`) should be created and swapped in to replace the overly-permissive owner credential.
- `brand_app` and `erp_app` roles have `rolcreaterole=t` and `rolcreatedb=t` attributes (inherited from owner-level grant). These DDL capabilities cannot be stripped via the application role itself (requires owner). They do not affect credential security.

### Datasource Contract Verification (Phase 3B-0)
**Conclusion: DIFFERENT_LOGICAL_DATABASE**
- `DATABASE_URL` → US-East (ERP DB B) via `erp_app` role
- `BRAND_DATABASE_URL` → Singapore (Brand DB A) via `brand_app` role
- These are separate Neon projects in different cloud regions.
- No fallback exists between the two variables in production code.

### Phase 3B Decision
- **BLOCKED from Phase 3B-1** until environment investigation is complete:
  - Legacy Brand Models are in the ERP DB (US-East `DATABASE_URL`), not in the Brand DB (Singapore `BRAND_DATABASE_URL`)
  - A separate canonical Brand schema/client package or data migration must be designed
- Legacy Brand OS models must NOT be directly mapped to `brand_*` tables in the ERP schema

### Commits
- `103cf37` — `security(db): remove hardcoded brand database credentials`
- `4eee7bd` — `docs: update baseline with P0 security fix record`

### Commit
 — `fix(build): restore platform-os monorepo builds`
