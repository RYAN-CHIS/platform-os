# PHASE 2.95 DOMAIN UNIFICATION REPORT

**执行日期**: 2026-06-22
**状态**: ✅ COMPLETE

---

## DOMAIN MODELS

| Model | Location | Unified Fields |
|-------|----------|----------------|
| **Product** | `packages/db/domain/product.ts` | id, name, status, price, coverImage, description, stock + ERP/Brand extensions |
| **Series** | `packages/db/domain/series.ts` | id, name, description, coverImage, sortOrder, isActive + ERP/Brand extensions |
| **Material** | `packages/db/domain/material.ts` | id, name, type, description, image, status + ERP/Brand extensions |

## MAPPING LAYER

```
ERP:  prisma.products       → ProductService.map() → DomainProduct
Web:  prisma.product        → ProductService.map() → DomainProduct
Uni:  prisma.erpProduct     → ProductService.map() → DomainProduct
Uni:  prisma.brandProduct   → ProductService.map() → DomainProduct
```

### 使用方式

```ts
// ✅ 正确：使用 Domain 层
import { ProductService } from "@yunwu/db/domain";
const service = new ProductService(prisma);
const { items } = await service.list({ status: "published" });

// ❌ 禁止：直接调用底层 model
const items = await prisma.product.findMany();
const items = await prisma.products.findMany();
```

## LEGACY MODELS

| Model | Schema | 映射到 |
|-------|--------|--------|
| `Products` (ERP) | apps/erp/prisma/schema.prisma ⚠️ FROZEN | `DomainProduct` |
| `Product` (Web) | apps/web/prisma/schema.prisma ⚠️ FROZEN | `DomainProduct` |
| `ErpProduct` (Unified) | packages/db/schema.prisma | `DomainProduct` |
| `BrandProduct` (Unified) | packages/db/schema.prisma | `DomainProduct` |
| `RawMaterial` (ERP) | apps/erp/prisma/schema.prisma ⚠️ FROZEN | `DomainMaterial` |
| `Material` (Web) | apps/web/prisma/schema.prisma ⚠️ FROZEN | `DomainMaterial` |

## SERVICE LAYER

| Service | Methods | 自动检测 |
|---------|---------|----------|
| `ProductService` | list, getById, getBySlug, create, update, delete | 自动匹配 `prisma.products` / `.product` / `.erpProduct` / `.brandProduct` |
| `SeriesService` | list, getById, getBySlug | 自动匹配 `prisma.series` / `.erpSeries` / `.brandSeries` |
| `MaterialService` | list, getById | 自动匹配 `prisma.material` / `.rawMaterial` / `.erpMaterial` / `.brandMaterial` |

## RISK

| 风险 | 等级 | 说明 |
|------|------|------|
| remaining divergence | P2 | 底层 Prisma model 名仍不同，但被 Service 层隐藏 |
| Service 未在所有 app 中强制使用 | P2 | 需要逐步迁移现有代码 |
| Mapper 字段映射可能遗漏 | P3 | map() 函数已覆盖所有已知字段 |

---

## BUILD VERIFICATION

| App | Build | Domain Import |
|-----|-------|---------------|
| ERP | ✓ | `import { ProductService } from "@yunwu/db/domain"` |
| Web | ✓ | ✓ |
| Brand OS | ✓ | ✓ |

---

## SUCCESS CRITERIA

| 标准 | 状态 |
|------|------|
| 所有系统使用统一 Domain Model | ✅ 可用 |
| 不再区分 ERP/Brand/Web Product | ✅ DomainProduct 统一语义 |
| 业务语义统一 | ✅ 同名字段映射 |
| DB 保持稳定 | ✅ 零数据库变更 |
