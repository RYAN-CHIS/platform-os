# YUNWU Master Baseline

> **Single Source of Truth** for 允物 (Yunwu) Project
>
> Last updated: 2026-06-29
>
> Everything below this line is authoritative.

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

| Database | Provider | URL Env Var | Location |
|----------|----------|-------------|----------|
| **ERP Main DB** | Neon (PostgreSQL) | `DATABASE_URL` | ap-southeast-1 |
| **Brand DB** | Neon (PostgreSQL) | `BRAND_DATABASE_URL` | Shared Neon |
| **Storefront DB** | Neon (PostgreSQL) | `DATABASE_URL` (yunwu-origin) | ap-southeast-1, independent |

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
| **Single Source of Truth** | Brand DB `neondb`（`ep-morning-sun-aoo4dk3t`）的 `banners` 表 |
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

**数据源边界（重要更正）**：Storefront（`yunwu-origin`）的 `DATABASE_URL` 与 Brand OS 的 `BRAND_DATABASE_URL` 指向**同一** Neon 实例（`ep-morning-sun-aoo4dk3t` / `neondb`）。因此前台可直连读取后台已发布 Banner，无需复制/同步。后台 `banners` 表是唯一编辑源；前台只消费发布数据。

**禁止事项**：后台与静态 JSON 长期双数据源；前台复制 Banner 内容；发布后将 Banner 移出主表；为让页面出现而重复创建同一 Banner；将商品图片误迁为 Banner。

**相关 commit**：
- platform-os（后台 + 本文档）：见本仓库最新 commit
- yunwu-origin（前台读取层 + 接入）：`bf8fe90aec227690bcd4c0b4e2834fceece57f4a`

**生产部署**：
- 后台：`https://platform.yunwuorigin.com/brand/banners`
- 前台：`https://www.yunwuorigin.com`

---

## 3. Active Directories (FORBIDDEN list below)

### 3.1 Active ONLY

| Directory | Purpose | Git Remote | Vercel Project |
|-----------|---------|------------|----------------|
| `/Users/ryan/Workbuddy/platform-os/` | Backend (ERP + Brand OS + Media) | `RYAN-CHIS/platform-os.git` | `platform-os` |
| `/Users/ryan/Workbuddy/yunwu-origin/` | Frontend (Storefront + Product OS) | `RYAN-CHIS/yunwu-origin.git` | `yunwu-origin` |

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
| | — Active directories: `/Users/ryan/Workbuddy/platform-os/` + `/Users/ryan/Workbuddy/yunwu-origin/` |

---

## Appendix A: Safety Notes

- This document contains **no** keys, tokens, or password values
- Environment variables listed by **name only**
- Database connections verified for **existence** only
- Blob Store token not exposed

## Appendix B: Maintenance

- Update this file after every major change
- Never add new active directories outside the two permitted paths
- Adding new Vercel project requires updating section 6
- Archive any new legacy assets to `/Users/ryan/Archives/`

---

*This document is the Single Source of Truth for all Yunwu project development.*
*Every session starts by reading it; every task ends by synchronizing it.*
