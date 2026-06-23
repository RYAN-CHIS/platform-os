# WO-P7D — Remove ERP Runtime Dependency

> **日期**: 2026-06-24  
> **状态**: ✅ 完成 — Platform Product Core 完全独立

---

## 1. 删除的 fetch() 调用

| 文件 | 删除前 | 删除后 |
| --- | --- | --- |
| `materials/actions.ts` | 5 fetch (GET/POST/PUT/DELETE + list to `localhost:3001/api/materials`) | **0** |
| `products/actions.ts` | 8 fetch (list/get/create/update/delete + SKU CRUD to `localhost:3001/api/products`) | **0** |
| `bom/actions.ts` | 5 fetch (list/get/create/update/delete to `localhost:3001/api/bom`) | **0** |

## 2. 改成什么

| Module | 新实现 |
| --- | --- |
| Materials | `new PrismaClient()` → `db.erpMaterial.findMany/findUnique/create/update/delete` |
| Products | `new PrismaClient()` → `db.erpProduct.findMany/findUnique/create/update/delete` + `db.erpProductSku.*` |
| BOM | `new PrismaClient()` → `db.erpBom.findMany/getById/create/update/delete` + `db.erpMaterial` |

## 3. localhost:3001 扫描

```
grep -Rni "localhost:3001" apps/platform/modules/erp/{products,materials,bom}/
→ CLEAN (0 results)
```

## 4. 数据验证

```
Products: 104 ✅
SKUs:     104 ✅
Materials: 68 ✅
BOMs:     33 ✅
```

## 5. Build

```
✅ pnpm --filter @yunwu/platform-app build — PASS
```

## 6. 技术方案

```
Platform 架构变更:
  Before: Platform → fetch() → ERP API (:3001) → Prisma → DB
  After:  Platform → PrismaClient → DB (直接连接)

实现方式:
  - serverExternalPackages: ["@prisma/client"] → keep Prisma external at build
  - import { PrismaClient } from "@prisma/client" → direct import
  - db.erpProduct / db.erpMaterial / db.erpBom → mapped to real tables via @@map fix (WO-P7C)
```

## 7. Product Core 完全独立

```
✅ ERP (3001) 可以停掉
✅ Platform 继续工作
✅ Product 可读 (104)
✅ Materials 可读 (68)
✅ BOM 可读 (33)
✅ 零 fetch
✅ 零 localhost:3001
✅ 零 Server Action 依赖 ERP REST API
```
