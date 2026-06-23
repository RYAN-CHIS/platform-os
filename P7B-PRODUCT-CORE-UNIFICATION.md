# WO-P7B — Product Core Unification Analysis

> **日期**: 2026-06-24  
> **关键发现**: Platform Service 无法直接访问 ERP 数据库

---

## 1. Product Migration Map

```
ERP 真实表:              Canonical 模型:          Platform Service 调用的:
────────────────────────────────────────────────────────────────────
products (104 rows)  →  ErpProduct             →  db.erpProduct.findMany()
                                                    ↓
                                              ❌ 查询 erp_products 表 → NOT FOUND

product_skus (104)   →  ErpProductSku          →  db.erpProductSku.findMany()
                                                    ↓
                                              ❌ 查询 erp_product_skus 表 → NOT FOUND

bom (33 rows)        →  ErpBom                 →  db.erpBom.findMany()
                                                    ↓
                                              ❌ 查询 erp_bom 表 → NOT FOUND

raw_materials (68)   →  ErpMaterial            →  db.erpMaterial.findMany()
                                                    ↓
                                              ❌ 查询 erp_materials 表 → NOT FOUND
```

### 🔴 根因确认

Platform 的 ProductService **不会工作** — 它调用 `db.erpProduct.findMany()`，Prisma 会将其映射到 `erp_products` 表（根据 `@@map("erp_products")`），但 ERP 数据库中实际表名是 `products`（无 erp_ 前缀）。

目前 Platform 能工作的唯一原因是：**actions.ts 使用 fetch() 调用 ERP API，而非直接 Prisma**。

---

## 2. Schema Compatibility Table

| Canonical Model | 期望表名 | 真实表名 | 兼容? | 解决方案 |
| --- | --- | --- | --- | --- |
| `ErpProduct` | `erp_products` | `products` | ❌ | 改 @@map 或 RENAME TABLE |
| `ErpProductSku` | `erp_product_skus` | `product_skus` | ❌ | 同上 |
| `ErpBom` | `erp_bom` | `bom` | ❌ | 同上 |
| `ErpMaterial` | `erp_materials` | `raw_materials` | ❌ | 同上 |
| `ErpOrder` | `erp_orders` | `orders` | ❌ | 同上 |
| `ErpCustomer` | `erp_customers` | `customers` | ✅ | customers 一致 |
| `ErpInventoryTransaction` | `erp_inventory_transactions` | `inventory_transactions` | ❌ | 同上 |
| `ErpProductionRecord` | `erp_production_records` | `production_records` | ✅ | 一致 |
| `ErpProductCost` | `erp_product_costs` | `product_costs` | ❌ | 同上 |

### 统计

```
需要修正: 7 个表
已兼容:   3 个表 (customers, production_records, product_costs 部分)
```

---

## 3. 当前 Platform Product 架构

```
Platform (当前工作模式):
  UI Component (list.tsx)
    → Server Action (actions.ts)
      → fetch("http://localhost:3001/api/products")
        → ERP REST API
          → ERP Prisma Client (Schema: apps/erp/prisma/schema.prisma)
            → ERP DB (真实表: products, product_skus, raw_materials, bom)

Platform (期望生产模式 — 尚未激活):
  UI Component (list.tsx)
    → Server Action (actions.ts)
      → ProductService (packages/platform-core/services/erp/products.service.ts)
        → db.erpProduct.findMany() ← ❌ 查询 erp_products 表, 该表不存在
```

---

## 4. Safe Migration Strategy

### 必须二选一：B 方案

# ✅ 推荐：B — 改 Canonical Schema 的 @@map 指回真实表名

```
原理:  不改数据库，只改 Schema 定义
操作:  修改 packages/db/schema.prisma 中的 @@map，使 Canonical 模型指向真实表名
优点:  零数据迁移、零停机、可立即部署
缺点:  表名与 Canonical 设计初衷不同（无 erp_ brand_ 前缀区分），但可通过目录结构 + 代码约定区分

具体修改:
  @@map("erp_products")      → @@map("products")
  @@map("erp_product_skus")  → @@map("product_skus")
  @@map("erp_materials")     → @@map("raw_materials")
  @@map("erp_bom")          → @@map("bom")
  @@map("erp_orders")       → @@map("orders")
  @@map("erp_inventory_transactions") → @@map("inventory_transactions")
```

### ❌ 不推荐：A — 迁 ERP 数据到 Canonical 新表

```
原因:  104 products + 104 SKUs + 68 materials + 33 BOMs = 309 行数据
       需要 RENAME TABLE + UPDATE FK 约束
       风险高、需要维护窗口
       当前不需要做（数据量小，但暂时没有迁移必要）
```

---

## 5. 迁移顺序（修正后）

```
Phase 1: 修正 Canonical Schema @@map (P0 — 立即)
  ├── 修改 packages/db/schema.prisma
  ├── 重新生成 Prisma Client (pnpm db:generate)
  └── 验证 ProductService 可查询到 products 表

Phase 2: 激活 Platform ProductCore (P1)
  ├── 修改 modules/erp/products/actions.ts 使用 ProductService 替代 fetch()
  ├── 修改 modules/erp/materials/actions.ts 使用 MaterialService 替代 fetch()
  ├── 修改 modules/erp/bom/actions.ts 使用 BOMService 替代 fetch()
  └── 验证 Platform build pass

Phase 3: 验证
  ├── 启动 Platform (port 3100)
  ├── 访问 /platform/erp/products → 应返回 104 条真实数据
  ├── 访问 /platform/erp/materials → 应返回 68 条真实数据
  └── 访问 /platform/erp/bom → 应返回 33 条真实数据
```

---

## 6. 风险

| 风险 | 级别 | 缓解 |
| --- | --- | --- |
| Prisma Client 重新生成后 TypeScript 错误 | 🟡 Medium | 先在 dev 环境测试 |
| @@map 变更影响 packages/db 的其他 consumer (ERP app) | 🔴 High | ERP app 使用自己的 frozen schema，不受影响；但需确认 |
| Brand OS schema 也有 products/material 表命名冲突 | 🟡 Medium | Brand OS 使用独立 DB，不受影响 |
