# MODEL CONVERGENCE MAP

## canonical_product → Legacy Tables

```
ProductCore
├── maps to: erp.products          (ERP: 进销存产品)
├── maps to: brand.products        (Brand: 品牌器物)
├── maps to: erp_products (unified) (统一 Schema)
└── maps to: brand_products (unified)
```

### Field Mapping

| ProductCore | erp.products | brand.products |
|-------------|-------------|----------------|
| cid | `erp:{id}` | `brand:{id}` |
| name | ✅ Products.name | ✅ BrandProduct.name |
| slug | ❌ (code 替代) | ✅ BrandProduct.slug |
| price | ✅ ProductSku.price | ✅ BrandProduct.costPrice |
| cost | ✅ ProductCost.totalCost | ❌ |
| inventory | ✅ ProductSku.finishedStock | ✅ BrandProduct.stock |
| status | ✅ LifecycleStatus | ✅ status string |
| seriesId | ✅ Works.seriesId | ✅ BrandProduct.seriesId |
| category | ❌ | ✅ ObjectCategory |
| coverImage | ❌ | ✅ BrandProduct.coverImage |
| description | ✅ Products.description | ❌ |
| story | ❌ | ✅ BrandProduct.story |
| media | ❌ | ❌ (需 join) |

### Conflicts

| 字段 | 冲突 | 解决 |
|------|------|------|
| `id` | ERP: int autoincrement, Brand: int autoincrement | Canonical: `{system}:{id}` |
| `status` | ERP: DRAFT/DESIGNING/READY/ACTIVE, Brand: draft/published | Canonical: draft/active/archived |
| `price` | ERP: via SKU, Brand: direct field | Canonical: unified `price` |
| `inventory` | ERP: SKU.finishedStock, Brand: Product.stock | Canonical: unified `inventory` |

## canonical_series → Legacy Tables

| SeriesCore | erp.series | brand.series |
|------------|-----------|--------------|
| cid | `erp:{id}` | `brand:{id}` |
| name | ✅ ErpSeries.name | ✅ BrandSeries.name |
| slug | ❌ (code 替代) | ✅ BrandSeries.slug |
| description | ❌ | ✅ BrandSeries.description |

## canonical_material → Legacy Tables

| MaterialCore | erp.raw_materials | brand.materials |
|-------------|-------------------|-----------------|
| cid | `erp:{id}` | `brand:{id}` |
| name | ✅ RawMaterial.name | ✅ Material.name |
| type | ✅ MaterialType | ✅ type string |
| inventory | ✅ remaining | ❌ |
| unitCost | ✅ unitCost | ❌ |

## Migration Readiness

| 条件 | 状态 |
|------|------|
| 所有字段有 Canonical 映射 | ✅ |
| ID 冲突已解决 (cid) | ✅ |
| Status 枚举已统一 | ✅ |
| mergeProductCore 支持跨系统合并 | ✅ |
| 物理 DB merge 前置条件满足 | ✅ — 就绪 Phase 4.5 |
