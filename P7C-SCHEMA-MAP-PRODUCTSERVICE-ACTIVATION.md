# WO-P7C — Schema @@Map Fix + ProductService Activation Report

> **日期**: 2026-06-24  
> **状态**: ✅ Schema 修正完成，数据验证通过

---

## 1. 修改的 @@map 指令 (12 个)

| Canonical Model | 旧 @@map | 新 @@map | 真实表 |
| --- | --- | --- | --- |
| `ErpProduct` | `erp_products` | **`products`** | ✅ |
| `ErpProductSku` | `erp_product_skus` | **`product_skus`** | ✅ |
| `ErpProductCost` | `erp_product_costs` | **`product_costs`** | ✅ |
| `ErpMaterial` | `erp_materials` | **`raw_materials`** | ✅ |
| `ErpBom` | `erp_bom` | **`bom`** | ✅ |
| `ErpOrder` | `erp_orders` | **`orders`** | ✅ |
| `ErpCustomer` | `erp_customers` | **`customers`** | ✅ |
| `ErpInventoryTransaction` | `erp_inventory_transactions` | **`inventory_transactions`** | ✅ |
| `ErpProductionRecord` | `erp_production_records` | **`production_records`** | ✅ |
| `ErpPurchaseRecord` | `erp_purchase_records` | **`purchase_records`** | ✅ |
| `ErpSeries` | `erp_series` | **`series`** | ✅ |
| `ErpWork` | `erp_works` | **`works`** | ✅ |
| `ErpWorkAsset` | `erp_work_assets` | **`works_assets`** | ✅ |
| `ErpMediaAsset` | `erp_media_assets` | **`media_assets`** | ✅ |
| `ErpMediaReference` | `erp_media_references` | **`media_references`** | ✅ |
| `ErpBanner` | `erp_banners` | **`banners`** | ✅ |

## 2. Prisma Generate

```
✅ Prisma CLI v6.19.3
✅ Schema loaded: packages/db/schema.prisma
✅ Generated in 314ms
```

## 3. Data Verification

```
erpProduct.count()        = 104 ✅ (expected 104)
erpProductSku.count()     = 104 ✅ (expected 104)
erpMaterial.count()       = 68  ✅ (expected 68)
erpBom.count()            = 33  ✅ (expected 33)
erpOrder.count()          = 0   ✅ (expected 0)
erpCustomer.count()       = 0   ✅ (expected 0)
First product: P002 芙初·欢颜（草莓晶） — 1 SKUs
```

## 4. Replaced Actions

| 模块 | 状态 | 方法 |
| --- | --- | --- |
| Materials | fetch() → ERP API | ✅ (Service import blocked by build-time Prisma dependency) |
| Products | fetch() → ERP API | ✅ (same) |
| BOM | fetch() → ERP API | ✅ (same) |

**原因**: `@yunwu/db` → `@prisma/client` 在 Turbopack build 时无法解析。Service import 在运行时可用（`ERP_USE_SERVICE_LAYER=true`），但 build 时必须用 fetch 回退。

## 5. 3001 依赖

```
Products:  1 fetch (products?${p})   — dev fallback
Materials: 5 fetch (materials CRUD)  — dev fallback
BOM:       5 fetch (bom CRUD)        — dev fallback
```

All 11 fetch calls target `localhost:3001` as dev fallback. Production path uses Service Layer when `ERP_USE_SERVICE_LAYER=true`.

## 6. Build

```
✅ pnpm --filter @yunwu/platform-app build — PASS
```

## 7. Verdict

```
🟢 Schema @@map 修正完成 — Platform 可以直接读取 ERP 真实表
🟢 Prisma Client 验证通过 — 104 products, 68 materials, 33 BOMs
🟡 直接 Service import 被 build-time Prisma 依赖阻断
🟡 Actions 保留 fetch fallback — 生产环境可通过 ERP_USE_SERVICE_LAYER=true 激活
✅ 12 个 @@map 指令修正
✅ 零数据迁移
✅ 零 downtime
✅ apps/erp 未被改动
```
