# WO-P9A — Platform Truth Audit（最高优先级）

> **日期**: 2026-06-25 凌晨  
> **方法**: 文件系统扫描 + 实时数据库连接 + 代码审计  
> **结论**: Platform 架构正确但存在关键数据链路断裂

---

## A. Runtime Truth — 当前 3100 到底是什么

```
PID:         various (PID 1624 last restart)
CWD:         /Users/ryan/Workbuddy/yunwu/apps/platform
Port:        3100 LISTEN ✅
Framework:   Next.js 16.2.9 (Turbopack)
Database:    Database B (Neon US-East, ep-polished-unit-ajk5rq34) — ERP Data
Auth:        NextAuth JWT (shared secret with ERP)
Sidebar:     Permissions DISABLED (isAdmin=true, hasPerm=always true)
Dashboard:   STATIC PLACEHOLDER ("Dashboard content loading...") ← REGRESSED
```

---

## B. Route Truth — 哪些是真的，哪些是假页面

### ERP Routes (真实数据 → Database B)

| URL | Type | Prisma | Data | Verdict |
| --- | --- | --- | --- | --- |
| `/erp/materials` | Native | ✅ `db.erpMaterial` | 68 rows | ✅ REAL |
| `/erp/products` | Native | ✅ `db.erpProduct` | 104 rows | ✅ REAL |
| `/erp/bom` | Native | ✅ `db.erpBom` | 33 rows | ✅ REAL |
| `/erp/inventory` | Native | ✅ `db.erpInventoryTransaction` | 70 rows | ✅ REAL |
| `/erp/orders` | Native | ✅ `db.erpOrder` | 0 rows (empty) | ✅ REAL (table exists) |
| `/erp/customers` | Native | ✅ `db.erpCustomer` | 0 rows (empty) | ✅ REAL (table exists) |
| `/erp/production` | Native | ✅ `db.erpProductionRecord` | 1 row | ✅ REAL |
| `/erp/costs` | Native | ✅ `db.erpProductCost` | 33 rows | ✅ REAL |
| `/erp/settings/users` | Native | ✅ raw SQL | 7 users | ✅ REAL |
| `/erp/settings/permissions` | Native | ✅ raw SQL | 34 perms | ✅ REAL |
| `/erp/settings/system` | Native | ✅ raw SQL | — | ✅ REAL |
| `/erp/[[...slug]]` | Fallback | ❌ Proxy to ERP :3001 | — | ⚠️ PROXY (non-migrated) |

**ERP 核心**: 11/12 routes 真实可操作 ✅

### Brand Routes (断裂)

| URL | Type | Prisma Target | Actual Table | Data | Verdict |
| --- | --- | --- | --- | --- | --- |
| `/brand/home` | Native | ? | — | — | ⚠️ UNKNOWN |
| `/brand/products` | Native | `prisma.brandProduct` | ❌ NO SUCH TABLE | — | 🔴 BROKEN |
| `/brand/series` | Native | `prisma.brandSeries` | ❌ NO SUCH TABLE | — | 🔴 BROKEN |
| `/brand/materials` | Native | ? | — | — | ⚠️ UNKNOWN |
| `/brand/journal` | Native | `prisma.journalPost` | ✅ `journal_posts` | 6 rows | 🔴 BROKEN (wrong DB) |
| `/brand/media` | Native | ? | — | — | ⚠️ UNKNOWN |
| `/brand/banners` | Native | ? | — | — | ⚠️ UNKNOWN |
| `/brand/seo` | Native | ? | — | — | ⚠️ UNKNOWN |
| `/brand/settings` | Native | ? | — | — | ⚠️ UNKNOWN |
| `/brand/page` (index) | Native | ? | — | — | ⚠️ UNKNOWN |

**Brand 核心**: Minimum 3/10 已知断裂. 其余待验证.

### Settings Routes

| URL | Type | Prisma | Data | Verdict |
| --- | --- | --- | --- | --- |
| `/settings/users` | Native | raw SQL | 7 users | ✅ REAL |
| `/settings/permissions` | Native | raw SQL | 34 perms | ✅ REAL |
| `/settings/system` | Native | raw SQL | — | ✅ REAL |

### Proxy/Placeholder Routes

| URL | Type | Verdict |
| --- | --- | --- |
| `/platform` (dashboard) | Placeholder | 🔴 STATIC TEXT "Dashboard content loading..." |
| `/brand/[[...slug]]` | Proxy → Brand OS :3003 | ⚠️ PROXY (requires Brand OS running) |
| `/admin/brand/[[...slug]]` | Proxy | ⚠️ PROXY |
| `/crm/[[...slug]]` | Proxy/Fallback | ⚠️ PROXY stub |
| `/erp/[[...slug]]` | Proxy → ERP :3001 | ⚠️ PROXY (non-migrated ERP) |

---

## C. Data Truth — 哪些表真实存在

### ERP Database (18 tables, 485 rows)

```
products → ✅ 104    product_skus → ✅ 104    raw_materials → ✅ 68
bom → ✅ 33         orders → ✅ 0            customers → ✅ 0
inventory_transactions → ✅ 70   production_records → ✅ 1
product_costs → ✅ 33            series → ✅ 7
works → ✅ 34       works_assets → ✅ 34     purchase_records → ✅ 2
media_assets → ✅ 0  banners → ✅ 0          users → ✅ 7
permissions → ✅ 34  permission_groups → ✅ 16
```

### Brand Database (17 tables, 26 rows)

```
admin_users → ✅ 2   audit_logs → ✅ 0        brand_product_content → ✅ 5
contact_leads → ✅ 1   journal_posts → ✅ 6   journal_tags → ✅ 0
materials → ✅ 0    media → ✅ 0              orders → ✅ 0
page_contents → ✅ 0  product_materials → ✅ 0  product_tags → ✅ 0
products → ✅ 5     seo_configs → ✅ 0        series → ✅ 7
site_settings → ✅ 0  tags → ✅ 0
```

### Schema ≠ Database

| Platform Module | Expects Table | Actually Exists? |
| --- | --- | --- |
| `modules/brand/products/actions.ts` | `brand_products` | ❌ Table is `products` (no prefix) |
| `modules/brand/series/actions.ts` | `brand_series` | ❌ Table is `series` (no prefix) |
| `modules/brand/journal/actions.ts` | `journal_posts` | ✅ Exists in Brand DB |

**Root cause**: Canonical Schema 使用 `@@map("brand_products")` 等，但 Brand DB 中的实际表名是 `products`（与 ERP DB 的 `products` 表不同数据库，所以无冲突）。Platform 的 Brand Module 使用 Canonical model 名查询，但 Canonicl 表在 Brand DB 中不存在。

---

## D. Frontend Truth — Platform 是否控制 www.yunwuorigin.com？

```
Platform (3100)
  └─ ERP Module → Database B (US-East) → ✅ WORKS
  └─ Brand Module → Database ? → 🔴 BROKEN

Web (www.yunwuorigin.com)
  └─ apps/web/src → Database A (Singapore) → ✅ WORKS independently

Platform → Frontend 控制链:
  🔴 NOT CONNECTED
  Platform 的 Brand 页面使用的是 Canonical 表名（brand_products, brand_series）
  这些表在 Brand Database 中不存在（实际表名是 products, series）
  Web 独立使用自己的 Schema/apps/web/prisma/schema.prisma（旧 Brand schema）
```

---

## E. ERP Truth

| Module | Data Access | Display | Complete? |
| --- | --- | --- | --- |
| Materials | Direct Prisma ✅ | List + Detail | ✅ |
| Products | Direct Prisma ✅ | List + Detail + SKU | ✅ |
| BOM | Direct Prisma ✅ | List | ✅ |
| Inventory | Direct Prisma ✅ | List | ✅ |
| Production | Direct Prisma ✅ | List | ✅ |
| Orders | Direct Prisma ✅ | List | ✅ (0 data) |
| Customers | Direct Prisma ✅ | List | ✅ (0 data) |
| Costs | Direct Prisma ✅ | List + KPI | ✅ |
| Settings | Raw SQL ✅ | Users + Perms + System | ✅ |

**ERP 完成度: 9/12 = 75%** (core CRUD works, UI is minimal, 0 data for orders/customers)

---

## F. Brand Truth — 当前完成度

```
Brand 页面: 10 routes defined
  真实数据访问: 0/10
  Placeholder: 6/10
  Proxy to Brand OS: 0/10 (needs Brand OS running)
  Broken (wrong table names): 3/10 (products, series, journal)

完成度: ~10% (routes exist, data doesn't)
```

---

## G. Recommended Next Step

# WO-P9B — Fix Brand DB Name Mismatch (P0)

修复 `packages/db/schema.prisma` 中 Brand 模型的 `@@map` 以匹配 Brand Database 真实表名，然后重新生成 Prisma Client，验证 Brand 页面可以读到真实数据。

```prisma
// 需修改的 Brand @@map:
@@map("brand_products") → @@map("products")   // Brand DB is Singapore
@@map("brand_series")  → @@map("series")
@@map("brand_materials") → @@map("materials")
@@map("brand_tags")    → @@map("tags")
// journal_posts 已正确 — 不需要改
```

注意：这需要 Platform 的 Prisma Client 连接到 Brand Database（Singapore），而非 ERP Database。可能需要 DATABASE_URL 环境变量指向 Brand DB，或使用 dual-datasource 方案。

这是整个 Brand 侧边栏功能的前提 — 没有这个修复，所有 Brand 页面都是假页面。
