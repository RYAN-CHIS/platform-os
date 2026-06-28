# YUNWU Master Baseline

> **Single Source of Truth** for 允物 (Yunwu) Project
>
> Last updated: 2026-06-27
>
> Everything below this line is authoritative.

---

## 1. Project Identity

| Attribute | Value |
|-----------|-------|
| **Project Name** | 允物 (Yunwu) — Eastern Cultural Brand |
| **Founder** | Ryan 迟硕 |
| **Git Remote** | `git@github.com:RYAN-CHIS/platform-os.git` |
| **Production Branch** | `main` |
| **Package Manager** | `pnpm` |
| **Monorepo Engine** | pnpm workspace (`pnpm-workspace.yaml`) |
| **Root Lock File** | `pnpm-lock.yaml` |
| **Node Version** | 22.22.2 (managed) |
| **Build Output** | `.next/` (renewable, gitignored) |

---

## 2. Architecture Overview

### 2.1 Monorepo Structure

```
yunwu/
├── apps/
│   ├── platform/     → Platform OS (unified admin entry, Next.js 16, port 3100, /erp/*)
│   ├── erp/          → ERP legacy app (Next.js 16, port 3001, being migrated to Platform)
│   ├── web/          → Public website (Next.js 15, port 3002, SEO/product showcase)
│   └── brand-os/     → Brand OS legacy admin (Next.js 15, port 3003, pending deprecation)
├── packages/
│   ├── auth/         → Identity, session, NextAuth, permission middleware (active)
│   ├── db/           → Unified Prisma entry, Domain/Control/Fabric/Canonical layers (active)
│   ├── platform/     → Sidebar, permission config, gateway, service layer, CRM (partially wired)
│   ├── ui/           → Unified UI components, design tokens, permission boundaries (active)
│   └── shared/       → Date, amount, order number utilities (no current imports)
└── docs/             → Project documentation & reports
```

### 2.2 App Roles

| App | Role | Current Status | Port |
|-----|------|----------------|------|
| **Platform** | Unified management entry for Brand OS → ERP → full control | **Active, primary** | 3100 |
| **ERP** | Inventory, production, orders, customers, BOM | Active, being migrated to Platform | 3001 |
| **Web** | Public website: product showcase, SEO, order API | Active, separate deploy | 3002 |
| **Brand OS** | Brand backend + brand API | Marked for deprecation, still proxied by Platform | 3003 |

### 2.3 Backend

- No standalone Python/Java/Go backend.
- All backend logic via:
  - Next.js Route Handlers (`app/api/**/route.ts`)
  - Next.js Server Actions (`apps/*/src/lib/actions`, `apps/platform/modules/**/actions.ts`)
  - Prisma ORM (`packages/db/schema.prisma` + per-app schemas)
  - NextAuth (authentication, via `packages/auth`)
  - Platform data gateway + ERP service layer (`packages/platform`)

### 2.4 Database

| Database | Provider | URL Env Var | Location |
|----------|----------|-------------|----------|
| **ERP Main DB** | Neon (PostgreSQL) | `DATABASE_URL` | `ep-polished-unit-ajk5rq34`, us-east-2 |
| **Brand DB** | Neon (PostgreSQL) | `BRAND_DATABASE_URL` | Linked to Brand OS |
| **Prisma Schema** | `packages/db/schema.prisma` | — | Monorepo root managed |
| **Local Dev** | SQLite (historical) | — | Historical workspaces |

### 2.5 Infrastructure

| Service | Provider | Config |
|---------|----------|--------|
| **Deployment** | Vercel | Per-app `vercel.json`; Platform uses pnpm |
| **Production URL (Platform)** | Vercel | Connected to RYAN-CHIS/platform-os |
| **Production URL (Web)** | `www.yunwuorigin.com` | Vercel, separate repo `yunwu-origin` |
| **No Docker/PM2** | — | All service entry via Next.js CLI + Vercel |

---

## 3. Permission Model (RBAC v2)

| Role | Scope |
|------|-------|
| **Admin** | Full access across all modules |
| **Manager** | Module-level write + management |
| **Operator** | Operational write permissions |
| **Viewer** | Read-only |

Permission matrix: Role × Module × Operation (create/read/update/delete/manage).

---

## 4. Brand Identity (Yunwu Charter — Highest Fact Source)

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

## 5. Product & Data Structure

### 5.1 Core Entities

- **Works** (34 imported) — Product series/collections
- **Products** (82 imported) — Individual products/artifacts
- **Raw Materials** (108 imported) — BOM ingredients
- **Purchase Records** (204 imported) — Procurement history
- **BOM** — Bill of Materials (product × raw material × quantity)
- **Inventory** — Stock tracking per SKU
- **Orders** — Customer orders
- **Cost Records** — Product cost calculation

### 5.2 Key Business Rules

- Product creation: initial inventory = 0, requires cost record + showcase status
- No new feature modifications to Product, SKU, Inventory, BOM, Cost, Purchase, Order, Permission, or Audit core modules (protected status)

---

## 6. Work Order Protocol V2

| ID | Title | Priority | Status |
|----|-------|----------|--------|
| WO-P7A | ERP Platform Migration Audit | — | Historical |
| WO-P7B | Product Core Unification | — | Historical |
| WO-P7C | Schema Map ProductService Activation | — | Historical |
| WO-P7D | Runtime Decoupling | — | Historical |
| WO-P7E | Orders-Customers Takeover | — | Historical |
| WO-P7F | Inventory-Production Takeover | — | Historical |
| WO-P10A | Platform Real Operational Buildout | — | Phase 8: Productionization |
| WO-P13B | Platform OS Audit System Full Wiring | **Active** | Brand CRUD + Settings audit coverage |
| ... | (full list in root P*.md reports) | | |

**Process:**
1. Read audit state before changes
2. No destructive operations without approval
3. Error chain output for root cause analysis
4. Every write operation triggers audit log

---

## 7. Deployment & Git Workflow

### 7.1 Git

- Remote: `git@github.com:RYAN-CHIS/platform-os.git`
- Branch: `main` (production)
- Protected modules: Product, SKU, Inventory, BOM, Cost, Purchase, Order, Permission, Audit
- Production baseline commit (yunwu-origin): `4d55ba7`

### 7.2 Vercel

- Platform: pnpm build, Vercel project `platform`
- ERP: uses `npm` in vercel.json (legacy, needs alignment)
- Web: uses `npm` in vercel.json (legacy)
- Brand OS: Vercel config pending clarification

### 7.3 Port Convention

| App | Dev | Start |
|-----|-----|-------|
| Platform | 3100 | 3100 |
| ERP | 3001 | 3000 (⚠️ conflict risk) |
| Web | 3002 | 3000 (⚠️ conflict risk) |
| Brand OS | 3003 | 3000 (⚠️ conflict risk) |

---

## 8. Testing

- No test files exist currently (`*.test.*`, `*.spec.*`, `tests/`, `__tests__/` all absent).
- Future requirement: build verification for all 4 apps + smoke tests for core routes + Prisma schema smoke tests.

---

## 9. YUNWU Baseline Synchronization Law

> **Code < Baseline → Update Baseline**
>
> **Baseline < Code → Update Baseline**
>
> **Forbidden:** Code changes without Baseline updates.

### 9.1 Before Every Task

1. Read this document
2. Confirm current baseline state
3. If code differs from baseline: output Delta Report; do not proceed

### 9.2 After Every Task

1. Check: `Code == Baseline?`
2. If no: immediately update this document
3. Then end task

### 9.3 Scope

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

All require this baseline to be synchronized.

---

*This document is the Single Source of Truth for all Yunwu project development.*
*Every session starts by reading it; every task ends by synchronizing it.*
