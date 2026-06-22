# PHASE 3.5 DATA FABRIC REPORT

**执行日期**: 2026-06-22
**状态**: ✅ COMPLETE

---

## UNIFIED MODELS

| Model | Location | Fields |
|-------|----------|--------|
| `UnifiedProduct` | `packages/db/fabric/types.fab.ts` | id, name, status + erp{} + brand{} + web{} |
| `UnifiedSeries` | `packages/db/fabric/types.fab.ts` | id, name, sortOrder + erp{} + brand{} + web{} |
| `UnifiedMaterial` | `packages/db/fabric/types.fab.ts` | id, name + erp{} + brand{} + web{} |
| `UnifiedOrder` | `packages/db/fabric/types.fab.ts` | id, orderNo, status, amount + erp{} + brand{} + web{} |

## VIEW LAYERS

同一份数据，三种视图：

```
UnifiedProduct ─┬─ resolveErpProduct()  → ErpProductView  (库存/成本/生产)
                ├─ resolveWebProduct()  → WebProductView  (价格/图片/SEO)
                └─ resolveBrandProduct()→ BrandProductView(故事/情感/叙事)
```

### ERP View (`ErpProductView`)
```
✅ code, workId, specification     ← 生产标识
✅ skus, costs, profitMargin        ← 成本核算
✅ stockStatus, finishedStock       ← 库存状态
❌ story, inspiration, theme        ← 不可见
❌ seo, gallery, tags               ← 不可见
```

### Web View (`WebProductView`)
```
✅ salePrice, coverImage, inStock   ← 购买决策
✅ seo.title, seo.description       ← SEO 优化
✅ seriesName, objectCategory       ← 分类导航
❌ costs, supplier, markupRatio     ← 不可见
❌ materialCode, workId             ← 不可见
```

### Brand View (`BrandProductView`)
```
✅ theme, story, inspiration        ← 品牌叙事
✅ materials[], keywords[]          ← 内容标签
✅ contentScore (0-10)              ← 内容完整度
✅ hasFullStory                     ← 是否有完整故事
❌ costs, inventory, skus           ← 不可见
❌ price, stock                     ← 不可见
```

## RESOLVERS

| Function | Input | Output |
|----------|-------|--------|
| `toUnifiedProduct(raw)` | `DomainProduct` | `UnifiedProduct` |
| `resolveProduct(system, raw)` | `SystemId` + `DomainProduct` | `ErpProductView` \| `WebProductView` \| `BrandProductView` |
| `resolveSeries(system, raw)` | `SystemId` + `DomainSeries` | system-specific `SeriesView` |
| `resolveMaterial(system, raw)` | `SystemId` + `DomainMaterial` | system-specific `MaterialView` |

## CONTROL PLANE INTEGRATION

```ts
// 先检查权限，再解析视图
import { safeResolveProduct } from "@yunwu/db/fabric";

const view = safeResolveProduct(platformUser, "erp", raw, resolveProduct);
// → 无权限 throw AccessDeniedError
// → 有权限 return ErpProductView
```

## SEMANTIC COMPLETENESS

| 数据维度 | ERP | Web | Brand |
|----------|-----|-----|-------|
| 标识 (id/name) | ✅ | ✅ | ✅ |
| 库存/成本 | ✅ | ❌ | ❌ |
| 价格/图片 | ❌ | ✅ | ❌ |
| 故事/情感 | ❌ | ❌ | ✅ |
| SEO | ❌ | ✅ | ❌ |
| 生产 | ✅ | ❌ | ❌ |
| 内容评分 | ❌ | ❌ | ✅ |

## BUILD VERIFICATION

| App | Build | Fabric Import |
|-----|-------|---------------|
| ERP | ✓ | `resolveProduct("erp", ...)` |
| Web | ✓ | `resolveProduct("web", ...)` |
| Brand OS | ✓ | `resolveProduct("brand", ...)` |

## RISK

| 风险 | 等级 | 说明 |
|------|------|------|
| semantic mismatch | P3 | ERP `Material` vs Brand `Material` 字段名不同但语义相同 → 已统一 |
| resolver 未强制使用 | P2 | 现有 API 仍直接返回 domain 数据 |
| gallery JSON parse | P3 | 假设 gallery 是 JSON string，实际可能是数组 |

---

**数据不再"解释分裂"。一个实体，三种视图，语义统一。**
