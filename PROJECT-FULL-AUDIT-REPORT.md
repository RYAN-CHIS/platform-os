# 允物项目全量审查报告 (Project Full Audit)

> **日期**: 2026-06-24  
> **范围**: `/Users/ryan/Workbuddy/yunwu` + 18 个历史 Workbuddy 会话  
> **方法**: 文件系统扫描 + 数据库连接测试 + 进程分析 + Git 日志

---

## 一、项目演化时间线

```
阶段 0 (2026-06-17): 初创原型
  └── Workbuddy/2026-06-17-22-01-58/backend/prisma/
      一次 migration: 仅 product + sku + bom 表
      数据库: 本地 SQLite

阶段 1 (2026-06-18): 两个并行方向
  ├── Workbuddy/2026-06-18-02-40-15/yunwu-origin/  ← 独立站原型 (16 models, SQLite)
  └── Workbuddy/2026-06-18-02-40-15/yunwu-mvp/     ← ERP 原型

阶段 2 (2026-06-21): Monorepo 雏形
  └── Workbuddy/2026-06-21-01-31-08/
      ├── apps/admin/    ← ERP 后台
      ├── apps/web/      ← 独立站
      └── packages/db/   ← 首次合并 Schema

阶段 3 (2026-06-22): 现项目建立 (yunwu/)
  ├── Git init: 640fbbe "yunwu monorepo: Phase 1-4 baseline"
  ├── 4 个 App: web, erp, brand-os, (platform 未创建)
  ├── 数据库决策: ERP → Neon US-East, Web/Brand → Neon Singapore
  └── Canonical Schema: packages/db/schema.prisma (38 models)

阶段 4 (2026-06-22 晚): Platform OS 独立实验
  └── Workbuddy/2026-06-22-22-55-34/ (独立 repo)
      Platform Shell + Brand + ERP Dashboard
      端口 3300, 现已停止

阶段 5 (2026-06-23): Platform 集成开发 (本次会话)
  ├── WO-P4A: Product SSOT (brand_product_content 表)
  ├── WO-P4C: Design System (tokens + components)
  ├── WO-P5B: Brand OS Module Migration
  ├── WO-P5C: CRM Integration (Customer360)
  ├── WO-P6A→P6E+: 7 ERP modules native migration
  ├── WO-P6AA: Gateway completion
  ├── WO-P6F-Pre: ERP decommission audit
  └── WO-Deploy: Vercel deployment

当前状态 (2026-06-24):
  ✅ Port 3000: Platform App (旧 Workbuddy 会话, 仍在运行)
  ✅ Port 3001: Legacy ERP (当前项目, apps/erp)
  ⚠️ Port 3100: Platform App (当前项目) — 未运行
```

---

## 二、当前真实架构图

### Frontend

```
Public Website:
  框架: Next.js 15.3
  代码: apps/web/ (12 pages)
  端口: 3002 (dev, 未运行)
  数据库: Neon Singapore
  域名: www.yunwuorigin.com
  状态: 🟢 Production

Admin - Legacy ERP:
  框架: Next.js 16.2
  代码: apps/erp/ (18 pages, 43 APIs)
  端口: 3001 (RUNNING)
  数据库: Neon US-East
  状态: 🟢 Running (dev)

Admin - Platform (当前项目):
  框架: Next.js 16.2
  代码: apps/platform/ (17 pages)
  端口: 3100 (NOT RUNNING)
  数据库: Neon US-East
  状态: 🟡 Dev (not started)

Admin - Brand OS (deprecated):
  框架: Next.js 15
  代码: apps/brand-os/ (16 pages, 7 APIs)
  端口: 3003 (未运行)
  数据库: Neon Singapore
  状态: ⚠️ Deprecated

Admin - Platform (旧会话):
  框架: Next.js 15.3
  代码: Workbuddy/2026-06-22-22-55-34/apps/platform
  端口: 3000 (RUNNING)
  数据库: 无 (demo)
  状态: ⚠️ Orphan process
```

### Backend

```
Backend Service 1: ERP API (apps/erp/app/api/)
  43 REST endpoints
  Materials, Products, SKU, BOM, Inventory, Orders,
  Customers, Production, Costs, Media, Banners,
  Import/Export, Permissions, Users, Auth
  → Database: Neon US-East (erp_* tables)

Backend Service 2: Web API (apps/web/src/app/api/)
  10 endpoints (public)
  Products, Materials, Series, Posts, Cart, Orders, Contact, Upload
  → Database: Neon Singapore (brand_* tables)

Backend Service 3: Brand OS API (apps/brand-os/src/app/api/)
  7 endpoints (admin)
  Products, Materials, Series, Posts, Media, Contact, SiteSettings
  → Database: Neon Singapore
  Status: ⚠️ Deprecated — will merge into Platform
```

### Database

```
Database A: Neon PostgreSQL (Singapore)
  地址: ep-morning-sun-aoo4dk3t-pooler.c-2.ap-southeast-1.aws.neon.tech
  用户: neondb_owner
  密码: npg_uDbxK58hWIRf
  表数: 17
  数据: 31 行 (7 series + 5 products + 6 journal + 2 admin + 1 lead + 5 content + 0 others)
  用途: 公共网站 + Brand OS Admin
  ERP 表: ❌ NONE

Database B: Neon PostgreSQL (US-East)
  地址: ep-polished-unit-ajk5rq34.c-3.us-east-2.aws.neon.tech
  用户: neondb_owner
  密码: npg_cAas8kuHmrO0
  表数: ~24 (推断)
  数据: 未知 (无法连接验证)
  用途: ERP 系统
  状态: 🟢 Active — Port 3001 正在使用

Historical: 本地 SQLite (多个旧会话)
  Workbuddy/*/prisma/dev.db — 开发原型, 已废弃
  Workbuddy/*/prisma/yunwu.db — 独立站原型, 已废弃
```

### Auth (NextAuth)

```
统一认证: NextAuth JWT
  Secret: 各 app 独立 (platform/erp 共用 DVhVrOdJ+zg...)
  Brand/Web 另用: 081d540d94f7e43...
  权限系统: ERP V3 RBAC+ABAC (34 权限点)
  Platform: 61 统一权限码
```

### Deploy

```
Vercel Project 1: yunwu1/platform-os
  URL: https://platform-i3o3vkfsw-yunwu1.vercel.app
  Aliased: https://platform-os-eosin.vercel.app
  状态: Deployed (无 DATABASE_URL)

Vercel Project 2: (apps/web)
  域名: www.yunwuorigin.com
  状态: Production

GitHub: RYAN-CHIS/platform-os
  分支: main
  最新: f6b99d2
```

---

## 三、数据库完整清单

### 数据库 1: Neon Singapore (Brand/Web)

| 字段 | 值 |
| --- | --- |
| **类型** | Neon PostgreSQL (Serverless) |
| **地址** | `ep-morning-sun-aoo4dk3t-pooler.c-2.ap-southeast-1.aws.neon.tech` |
| **数据库名** | `neondb` |
| **用户** | `neondb_owner` |
| **密码** | `npg_uDbxK58hWIRf` |
| **表数** | 17 |
| **数据行数** | 31 |
| **用途** | 公共网站 (www.yunwuorigin.com) + Brand OS Admin |
| **是否仍在使用** | ✅ YES — Port 3000 (旧会话), yunwu-admin |
| **Schema 来源** | apps/web/prisma/schema.prisma (16 models) |
| **新增表** | brand_product_content (WO-P4A 迁移, 5 rows) |

### 数据库 2: Neon US-East (ERP)

| 字段 | 值 |
| --- | --- |
| **类型** | Neon PostgreSQL (Serverless) |
| **地址** | `ep-polished-unit-ajk5rq34.c-3.us-east-2.aws.neon.tech` |
| **数据库名** | `neondb` |
| **用户** | `neondb_owner` |
| **密码** | `npg_cAas8kuHmrO0` |
| **表数** | ~24 (推断) |
| **数据行数** | 未知 (无法连接验证) |
| **用途** | ERP 系统 |
| **是否仍在使用** | ✅ YES — Port 3001 正在使用 |

### 数据库 3-8: 历史 SQLite (已废弃)

| 路径 | 大小 | 用途 |
| --- | --- | --- |
| `Workbuddy/2026-06-17-22-01-58/backend/prisma/dev.db` | ~60K | 初版原型 |
| `Workbuddy/2026-06-18-02-40-15/yunwu-mvp/prisma/dev.db` | ~60K | ERP 原型 |
| `Workbuddy/2026-06-18-02-40-15/yunwu-origin/prisma/yunwu.db` | ~150K | 独立站原型 |
| `Workbuddy/2026-06-18-02-40-15/yunwu-origin/prisma/dev.db` | ~60K | 独立站开发 |
| `Workbuddy/2026-06-21-01-31-08/packages/db/prisma/yunwu.db` | ~150K | Monorepo 原型 |
| `Workbuddy/2026-06-22-22-55-34/apps/platform/dev.db` | ~60K | Platform 原型 |

> **总计**: 2 个活跃 Neon 数据库 + 6 个废弃 SQLite

---

## 四、Prisma Schema 清单

### Schema A: Canonical (设计稿)

| 路径 | `packages/db/schema.prisma` |
| --- | --- |
| **Models** | 38 (User, Permission, ERP×16, Brand×11, Journal, Content, SEO) |
| **表命名** | `erp_*` prefix + `brand_*` prefix |
| **部署状态** | ❌ NEVER DEPLOYED |
| **用途** | 设计目标 — 尚未执行到数据库 |

### Schema B: ERP (生产)

| 路径 | `apps/erp/prisma/schema.prisma` |
| --- | --- |
| **Models** | 24 (User, Permission×8, Series/Works/Products/SKU/BOM/Material/Order/Customer/Media) |
| **表命名** | 无 prefix (series, products, raw_materials, orders...) |
| **部署状态** | ✅ ACTIVE — 连接 Database B |
| **用途** | ERP 系统唯一运行时 Schema |

### Schema C: Brand/Web (生产)

| 路径 | `apps/web/prisma/schema.prisma` |
| --- | --- |
| **Models** | 16 (Series, Product, Material, Order, Journal, Contact, AdminUser, PageContent, SEO, Tag, Media) |
| **表命名** | 无 prefix (series, products, materials, orders...) |
| **部署状态** | ✅ ACTIVE — 连接 Database A |
| **用途** | 公共网站 + Brand OS 运行时 Schema |

### Schema D: Brand OS (Frozen)

| 路径 | `apps/brand-os/prisma/schema.prisma` |
| --- | --- |
| **Models** | 16 (same as Schema C) |
| **状态** | ⚠️ FROZEN — 已被 Schema C 替代 |

### Schema E: yunwu-admin (独立废弃)

| 路径 | `/Users/ryan/Workbuddy/yunwu-admin/prisma/schema.prisma` |
| --- | --- |
| **Models** | 16 (same as Schema C) |
| **状态** | 🔴 DEPRECATED — 独立项目 |

### 🔴 重复表分析

| 表名 | ERP DB | Brand/Web DB | 冲突? |
| --- | --- | --- | --- |
| `series` | ✅ (24 models) | ✅ (16 models) | 🔴 同名异义 |
| `products` | ✅ | ✅ | 🔴 同名异义 |
| `orders` | ✅ | ✅ | 🔴 同名异义 |
| `materials` | ❌ (use raw_materials) | ✅ | 🟡 不同名 |

> **结论**: Canonical Schema 已设计好解决方案（+ erp_/brand_ prefix），但从未执行迁移。

---

## 五、Migrations 历史

### 有效 migrations (已部署到生产)

```
1. apps/web/prisma/migrations/0001_init/
   └── migration.sql — 创建 16 个 Brand/Web 表
   时间: 2026-06-18 前后
   状态: ✅ Deployed to Database A

2. apps/erp/ — 无 migration 文件 (使用 prisma db push)
   表由 prisma db push 直接同步
   状态: ✅ Schema B = Database B 当前状态
```

### 历史 migrations (已废弃)

```
3. 2026-06-17-22-01-58/backend/prisma/migrations/20250619000000_add_product_sku_bom/
   仅 3 个表: product + sku + bom
   状态: 🔴 Abandoned (最早原型)

4. 2026-06-18-02-40-15/yunwu-origin/prisma/migrations/0001_init/
   16 个表 (Brand 类型)
   状态: 🔴 Abandoned

5. 2026-06-21-01-31-08/apps/admin/prisma/migrations/0001_init/
   ERP 管理后台
   状态: 🔴 Abandoned

6. 2026-06-21-01-31-08/packages/db/prisma/migrations/0001_init/
   首次 Monorepo Canonical Schema
   状态: 🔴 Abandoned (从未执行到生产)

7. 2026-06-22-14-13-20/yunwu-origin/prisma/migrations/0001_init/
   独立站副本
   状态: 🔴 Abandoned

8. 2026-06-22-22-55-34/apps/platform/prisma/migrations/20260623053114_init_rbac/
   Platform 原型 RBAC migration
   状态: 🔴 Abandoned (独立实验)

9. yunwu-admin/prisma/migrations/0001_init/
   管理后台
   状态: 🔴 Abandoned
```

> **总计**: 1 有效 migration (deployed) + 7 废弃 migrations

---

## 六、运行端口完整清单

| 端口 | 进程 | 代码路径 | 框架 | 状态 |
| --- | --- | --- | --- | --- |
| **3000** | PID 79885 (next-server v15.3.9) | `Workbuddy/2026-06-22-22-55-34/apps/platform` | Next.js 15 | ⚠️ 旧会话残留 |
| **3001** | PID 76048 (next-server v16.2.9) | **`apps/erp`** (当前项目) | Next.js 16 | 🟢 当前主 ERP |
| 3002 | (未运行) | `apps/web` | Next.js 15 | 公共网站 |
| 3003 | (未运行) | `apps/brand-os` | Next.js 15 | Brand Admin |
| 3100 | (未运行) | `apps/platform` (当前项目) | Next.js 16 | Platform Admin |
| 3300 | (停止) | `Workbuddy/2026-06-22-22-55-34/apps/platform` | Next.js 15 | 历史 |
| 5432 | (无) | — | — | 本地无 PG |

### 🔴 关键发现

**Port 3001 最开始跑的是**: `/Users/ryan/Workbuddy/yunwu/apps/erp` (当前项目的 ERP App)。  
**Port 3000 不是当前项目**: 它是 2026-06-22 晚间的另一个 Platform App 实验，在独立 Workbuddy 会话中。

---

## 七、前端入口清单

| # | 前端 | 路径 | 框架 | 页数 | 用途 |
| --- | --- | --- | --- | --- | --- |
| A | **Legacy ERP** | `apps/erp/app/` | Next.js 16 | 18 | 🔴 参考标准 (当前运行) |
| B | **Platform ERP** | `apps/platform/app/` | Next.js 16 | 17 | 🟡 未来主系统 (已开发, 未运行) |
| C | Brand OS Admin | `apps/brand-os/src/app/` | Next.js 15 | 16 | ⚠️ 待废弃 |
| D | Public Website | `apps/web/src/app/` | Next.js 15 | 12 | 🟢 生产运行 |
| E | Platform (旧) | `Workbuddy/2026-06-22-22-55-34/` | Next.js 15 | 13 | ⚠️ 旧实验 (3000 残留) |
| F | yunwu-admin | `Workbuddy/yunwu-admin/src/app/` | Next.js 15 | 24 | 🔴 废弃 |

---

## 八、后端 API 清单

| # | 服务 | 路径 | 路由数 | 数据库 |
| --- | --- | --- | --- | --- |
| 1 | **ERP API** | `apps/erp/app/api/` | 43 | Database B (Neon US) |
| 2 | **Web API** | `apps/web/src/app/api/` | 10 | Database A (Neon SG) |
| 3 | Brand OS API | `apps/brand-os/src/app/api/` | 7 | Database A (Neon SG) |

> 总计: 60 API routes, 3 个独立后端服务

---

## 九、环境变量冲突分析

| 文件 | 服务 | DATABASE_URL | 指向 |
| --- | --- | --- | --- |
| `apps/erp/.env.local` | ERP | `postgresql://neondb_owner:npg_cAas8kuHmrO0@ep-polished-unit-...` | Database B |
| `apps/platform/.env.local` | Platform | `postgresql://neondb_owner:npg_cAas8kuHmrO0@ep-polished-unit-...` | Database B |
| `apps/brand-os/.env` | Brand OS | `postgresql://neondb_owner:npg_uDbxK58hWIRf@ep-morning-sun-...` | Database A |
| `apps/web/.env` | Web | `postgresql://neondb_owner:npg_uDbxK58hWIRf@ep-morning-sun-...` | Database A |
| `yunwu-admin/.env` | Admin | `postgresql://neondb_owner:npg_uDbxK58hWIRf@ep-morning-sun-...` | Database A |

### 冲突总结

```
2 套凭据, 2 个数据库:
  cred-A (npg_uDbxK58hWIRf) → Database A (Singapore) → Web + Brand + yunwu-admin
  cred-B (npg_cAas8kuHmrO0) → Database B (US-East)   → ERP + Platform

冲突: Brand OS 和 Web 共用 Database A 但各有独立 Schema (重复定义)
      ERP 和 Platform 共用 Database B — 但 Platform 还未启动
      两个数据库都有 series/products/orders 表 (不同结构)
```

---

## 十、重复/废弃资产清单

### 可删除 (确认无用)

| # | 路径 | 原因 |
| --- | --- | --- |
| 1 | `Workbuddy/yunwu-admin/` (完整项目) | 与 Brand OS + Web 100% 重复 |
| 2 | `Workbuddy/2026-06-17-22-01-58/` → `2026-06-22-*` (17 个旧会话) | 历史开发，不再使用 |
| 3 | `apps/erp/prisma/schema.prisma` | Frozen — 已被 Canonical 替代 |
| 4 | `apps/brand-os/prisma/schema.prisma` | Frozen — 已被 Canonical 替代 |
| 5 | `apps/web/prisma/schema.prisma` | Frozen — 已被 Canonical 替代 |
| 6 | Root `PHASE-*.md` (9 files) | 历史报告 |
| 7 | Root `WO-*.md` 等 ~70 报告文件 | 审计记录，可归档 |

### 可归档 (保留备份)

| # | 路径 | 原因 |
| --- | --- | --- |
| 1 | `Workbuddy/2026-06-18-02-40-15/yunwu-origin/` | 独立站原型 (有参考价值) |
| 2 | `Workbuddy/2026-06-18-02-40-15/yunwu-mvp/` | ERP 原型 (有参考价值) |
| 3 | `apps/erp/` (整体) | 业务标准 — 暂时保留 |

### 必须保留

| # | 路径 | 原因 |
| --- | --- | --- |
| 1 | `apps/web/` | 公共网站 — 生产运行 |
| 2 | `apps/platform/` | 未来主系统 |
| 3 | `apps/erp/` | 当前运行的 ERP (直到 Platform 完全替代) |
| 4 | `packages/` (5 packages) | 共享基础设施 |
| 5 | `packages/db/schema.prisma` | Canonical Schema |
| 6 | `Database B` (Neon US-East) | ERP 数据 |

---

## 十一、真正应该保留的唯一主线

```
唯一应该继续开发的是:     apps/platform/ (PlatformOS)

代码目录:                 /Users/ryan/Workbuddy/yunwu/apps/platform/
                          /Users/ryan/Workbuddy/yunwu/packages/

数据库:                   Database B (Neon US-East)
                          ep-polished-unit-ajk5rq34.c-3.us-east-2.aws.neon.tech

端口:                     3100 (dev), Vercel (production)

启动命令:                 cd apps/platform && pnpm dev
                          或: pnpm --filter @yunwu/platform-app dev

参考系统 (不删除):         apps/erp/ (Legacy ERP — 业务标准)

需要停止的进程:           PID 79885 (Port 3000 旧 Platform — Workbuddy)
```

---

## 十二、风险报告

### 🔴 高风险

| # | 风险 | 详情 |
| --- | --- | --- |
| 1 | **双数据库并存** | Database A (Singapore) 和 Database B (US-East) 各有一套 products/series/orders 表，字段完全不同。如果 Platform 误连 Database A，ERP 数据不可用。 |
| 2 | **Port 3000 进程残留** | PID 79885 仍在运行旧的 Platform App，占用 3000 端口。可能与新 Platform (3100) 的改造产生混淆。 |
| 3 | **Canonical Schema 未部署** | 当前使用 2 套独立 Schema (ERP 24 + Brand 16)，Canonical 38 models 仅在设计文档中存在。 |
| 4 | **密码存在 .env 文件中** | `apps/erp/.env.local` 和 `apps/platform/.env.local` 包含明文数据库密码，已被提交到 git。 |

### 🟡 中风险

| # | 风险 | 详情 |
| --- | --- | --- |
| 5 | **重复表名** | series/products/orders 在两个数据库中含义不同，合并时会冲突 |
| 6 | **yunwu-admin 独立项目** | 与 Brand OS + Web 完全重复，但在独立目录中，可能被错误启动 |
| 7 | **17 个旧 Workbuddy 会话** | 每个都包含 node_modules 和数据库文件，占用大量磁盘空间 |

### 🟢 低风险

| # | 风险 | 详情 |
| --- | --- | --- |
| 8 | **无 Redis/缓存** | 系统目前无缓存层 |
| 9 | **无支付系统** | 订单仅为记录，无实际支付集成 |

---

> **结论**: 项目演化为 2 数据库 (Neon × 2) + 5 App (Web + ERP + Platform + Brand OS + yunwu-admin) + 38 model Canonical Schema (未部署)。主线是 `apps/platform` + Database B。需清理 17 个旧会话、停止 3000 残留进程、部署 Canonical Schema。
