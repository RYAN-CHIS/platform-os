# WO-P11A — Platform OS Full Structure Audit + Build Blueprint

> **日期**: 2026-06-25  
> **方法**: 全量文件扫描 + 双数据库实时验证  
> **状态**: 审计完成，施工蓝图已生成

---

## 一、模块逐项审计

### 总览 Dashboard

| Module | Status | Notes |
| --- | --- | --- |
| `/platform` | **PARTIAL** | 有 Sidebar + 标题，无实时数据（之前被重置为静态占位符 WO-P8F） |

---

### ERP 系统

| Module | Route | Actions | Prisma | Data | Status |
| --- | --- | --- | --- | --- | --- |
| 材料管理 | `/erp/materials` | ✅ direct PrismaClient | `erpMaterial` | 68 rows | **REAL** |
| 产品/SKU | `/erp/products` | ✅ direct PrismaClient | `erpProduct` + `erpProductSku` | 104/104 rows | **REAL** |
| BOM 清单 | `/erp/bom` | ✅ direct PrismaClient | `erpBom` | 33 rows | **REAL** |
| 库存池 | `/erp/inventory` | ✅ direct PrismaClient | `erpInventoryTransaction` | 70 rows | **REAL** |
| 生产记录 | `/erp/production` | ✅ direct PrismaClient | `erpProductionRecord` | 1 row | **REAL** |
| 订单管理 | `/erp/orders` | ✅ direct PrismaClient | `erpOrder` | 0 rows | **REAL** |
| 客户管理 | `/erp/customers` | ✅ direct PrismaClient | `erpCustomer` | 0 rows | **REAL** |
| 成本核算 | `/erp/costs` | ✅ inline PrismaClient | `erpProductCost` | 33 rows | **REAL** |
| 采购管理 | — | ❌ | $queryRaw | 2 records | **MISSING** |
| 七序(制造) | — | ❌ | series | 7 rows | **MISSING** |
| 作品管理 | — | ❌ | works | 34 rows | **MISSING** |

**ERP 完成度**: 8/11 REAL, 3 MISSING (purchase, series-mfg, works)

---

### Brand OS

| Module | Route | DB | Data | CRUD | Status |
| --- | --- | --- | --- | --- | --- |
| 首页管理 | `/brand/home` | ✅ Brand DB raw SQL | — | ❌ | **PARTIAL** |
| 品牌志 | `/brand/journal` | ✅ Brand DB | 6 posts | ❌ Read-only | **PARTIAL** |
| 七序系列 | `/brand/series` | ✅ Brand DB | 7 rows | ❌ Read-only | **PARTIAL** |
| 产品展示 | `/brand/products` | ✅ Brand DB | 5 rows | ✅ list+delete | **PARTIAL** |
| 材料展示 | `/brand/materials` | ⚠️ Unverified | 0 rows | ❌ | **PLACEHOLDER** |
| 图片/媒体 | `/brand/media` | ❌ | 0 rows | ❌ | **PLACEHOLDER** |
| Banner | `/brand/banners` | ❌ table missing | 0 | ❌ | **BROKEN** |
| SEO | `/brand/seo` | ⚠️ | 0 rows | ❌ | **PLACEHOLDER** |
| AI 运营 | — | — | — | — | **MISSING** |
| 页面内容 | `/brand/settings` | ⚠️ | 0 rows | ❌ | **PLACEHOLDER** |

**Brand 完成度**: 4/10 (partial), 4 PLACEHOLDER, 1 BROKEN, 1 MISSING

---

### 系统设置

| Module | Route | Data | CRUD | Status |
| --- | --- | --- | --- | --- |
| 用户管理 | `/settings/users` | ✅ 7 users | ❌ Read-only | **REAL** |
| 权限矩阵 | `/settings/permissions` | ✅ 34 codes | ❌ Read-only | **REAL** |
| 系统配置 | `/settings/system` | ✅ env vars | ❌ Read-only | **REAL** |
| 角色管理 | — | ✅ DB has roles | — | **MISSING** |
| 审计日志 | — | ✅ DB has audit_logs | — | **MISSING** |

**Settings 完成度**: 3/5 REAL, 2 MISSING

---

## 二、数据库状态

### ERP DB (US-East) — 12 verified tables

```
products 104 · product_skus 104 · raw_materials 68 · bom 33
orders 0 · customers 0 · inventory_transactions 70
production_records 1 · product_costs 33 · purchase_records 2
series 7 · works 34
```

### Brand DB (Singapore) — 8 verified tables

```
products 5 · series 7 · journal_posts 6 · page_contents 0
seo_configs 0 · site_settings 0 · media 0 · contact_leads 1
tags 0 (table exists, empty)
banners — table DOES NOT EXIST
```

### 数据库连接矩阵

| Module | Database | Method |
| --- | --- | --- |
| ERP 8 modules | US-East | `new PrismaClient()` (DATABASE_URL) |
| Brand products/series/journal | Singapore | `new PrismaClient({ datasourceUrl: BRAND_DB })` |
| Settings | US-East | `new PrismaClient()` raw queries |
| Dashboard | None | Static placeholder |

---

## 三、真实目录状态

### Active (运行中)

```
apps/platform/modules/erp/ — 7 modules, 20+ files
apps/platform/modules/brand/ — 4 modules (products, series, journal, home)
apps/platform/modules/dashboard/ — 1 file
packages/db/schema.prisma — Canonical (38 models)
packages/platform/config/ — sidebar, permissions, templates
packages/platform/data-gateway/ — 8 gateway files
packages/ui/ — tokens, components
packages/auth/ — platform-auth
```

### Dead (已弃用但仍在目录中)

```
apps/platform/app/(platform)/erp/[[...slug]]/page.tsx  — Proxy fallback
apps/platform/app/(platform)/crm/[[...slug]]/page.tsx     — CRM stub
apps/platform/app/admin/brand/[[...slug]]/page.tsx         — Old proxy
apps/platform/app/(platform)/settings/                     — Duplicate of /erp/settings
apps/platform/modules/erp/shared/service-factory.ts        — Unused fallback helper
```

### Proxy (需 Brand/ERP App 运行)

```
/admin/* → Brand OS :3003
/erp/* (non-native) → ERP :3001 (for works, series-mfg)
```

---

## 四、构建蓝图

### Phase 1 — 修复所有 BROKEN (P0)

| # | Task | Module | Est. |
| --- | --- | --- | --- |
| 1 | Create purchase page | ERP 采购管理 | 2h |
| 2 | Fix /brand/banners (table missing) | Brand Banner | 1h |
| 3 | Remove duplicate /settings routes | Cleanup | 0.5h |
| 4 | Restore Dashboard real data | Dashboard | 1h |

### Phase 2 — 升级 PARTIAL → REAL (P1)

| # | Module | Current | Target | Est. |
| --- | --- | --- | --- | --- |
| 5 | Brand products CRUD | Read+Delete | Full CRUD | 2h |
| 6 | Brand series CRUD | Read-only | Full CRUD | 1h |
| 7 | Brand journal CRUD | Read-only | Full CRUD | 2h |
| 8 | Brand home dashboard | Static | Real data | 1h |
| 9 | Settings users CRUD | Read-only | Full CRUD | 2h |
| 10 | Settings roles page | Missing | Create | 1h |
| 11 | Settings audit log page | Missing | Create | 1h |

### Phase 3 — 完整接到前台控制链路 (P1)

| # | Task | Est. |
| --- | --- | --- |
| 12 | Verify Brand Platform writes → Brand DB → Web reads | 2h |
| 13 | Add Brand Media upload | 3h |
| 14 | Add Brand SEO bulk edit | 1h |
| 15 | Add Brand Page Content editor | 2h |

### Phase 4 — 系统设置完整化 (P2)

| # | Task | Est. |
| --- | --- | --- |
| 16 | Permission assignment UI | 2h |
| 17 | Role template management | 1h |
| 18 | Audit log viewer | 1h |

**总计**: ~22.5h

---

## 五、优先执行

```
P0: Phase 1 (4h)  — 修 BROKEN + 买 Pages
P1: Phase 2 (10h) — 升级 PARTIAL
P1: Phase 3 (8h)  — 接前台
P2: Phase 4 (4h)  — 完善设置
```

> **Truth Audit 结论**: ERP Core 8/11 真实可用，Brand 4/10 部分可用。主要缺口：采购管理、作品管理、品牌 CRUD、横幅管理、审计日志。双数据库架构已建立，Platform 具备同时操作 ERP DB 和 Brand DB 的能力。
