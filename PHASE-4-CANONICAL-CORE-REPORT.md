# PHASE 4 CANONICAL CORE REPORT

**执行日期**: 2026-06-22
**状态**: ✅ COMPLETE

---

## CANONICAL MODELS

### ProductCore (`packages/db/canonical/product.core.ts`)

```ts
ProductCore {
  cid: string       // "erp:123" | "brand:456" — canonical ID
  name: string      // 统一名称
  slug: string      // URL slug
  price: number     // 销售价
  cost: number      // 成本
  inventory: number // 库存（跨系统汇总）
  status: "draft" | "active" | "archived"
  coverImage?: string
  media: CoreMediaRef[]
  gallery: string[]
  description?: string
  story?: string
  _sources: SystemId[]  // 数据来源追踪
  _lastSource: SystemId
}
```

### SeriesCore
```ts
SeriesCore { cid, name, slug, description, coverImage, sortOrder, isActive, productCount }
```

### MaterialCore
```ts
MaterialCore { cid, name, type, description, image, inventory, unitCost, unit, origin, supplier }
```

---

## FRACTURE RESOLVED

### Semantic Drift — 已解决

| 之前 | 之后 |
|------|------|
| ERP `Products.price` vs Brand `Product.costPrice` vs Web `Product.salePrice` | `ProductCore.price` (唯一事实) |
| ERP `LifecycleStatus` enum vs Brand `status` string | `ProductCore.status: draft/active/archived` |
| ERP `Products.id` vs Brand `Product.id` (冲突) | `ProductCore.cid: "erp:123"` / `"brand:456"` |
| ERP 无 story, Brand 无 inventory | `ProductCore` 包含两者 |
| 同一产品在两个系统中独立存在 | `mergeProductCore(a, b)` 跨系统合并 |

---

## SYSTEM DEPENDENCY

```
ERP ──→ ProductCore (write: inventory, cost)
          ↑
Web ──→ ProductCore (read: price, image, slug)
          ↑
Brand ─→ ProductCore (write: story, gallery, description)
```

### 数据流

```
ERP write inventory → mapErpProductToCanonical() → ProductCore
Brand write story   → mapBrandProductToCanonical() → ProductCore
                     ↓
              mergeProductCore(erp, brand)
                     ↓
              resolveProductFromCore("web", core) → WebProductView
```

---

## NEXT STEP

### Physical DB Merge Readiness: ✅ READY

| 条件 | 状态 |
|------|------|
| 所有字段有 Canonical 映射 | ✅ CONVERGENCE-MAP.md |
| ID 冲突解决方案就绪 | ✅ `{system}:{id}` |
| Status 枚举已统一 | ✅ draft/active/archived |
| 跨系统合并函数 | ✅ mergeProductCore |
| 映射器 (Domain→Canonical) | ✅ 三系统 × 三模型 |
| Fabric 支持 Canonical 输入 | ✅ resolver-core.ts |

**Phase 4.5 可开始物理数据库合并。**

---

## BUILD VERIFICATION

| App | Build | Canonical Import |
|-----|-------|-----------------|
| ERP | ✓ | `mapToProductCanonical(raw, "erp")` |
| Web | ✓ | `resolveProductFromCore(core, "web")` |
| Brand OS | ✓ | `resolveProductFromCore(core, "brand")` |

---

## 完整数据流 (Phase 2→4)

```
┌─ Legacy DB Tables ──────────────────────────┐
│  erp.products  brand.products  erp.materials │
└────────────────┬────────────────────────────┘
                 │ DomainProduct (Phase 2.95)
                 ▼
┌─ Canonical Core (Phase 4) ───────────────────┐
│  ProductCore  SeriesCore  MaterialCore        │
│  cid: "erp:123"  _sources: [erp, brand]      │
└────────────────┬────────────────────────────┘
                 │ resolveProductFromCore()
                 ▼
┌─ Data Fabric (Phase 3.5) ────────────────────┐
│  ErpProductView  WebProductView  BrandView    │
└──────────────────────────────────────────────┘
```

---

**数据语义完全统一。一个 Canonical Product，三种视图。已就绪物理 DB 合并。**
