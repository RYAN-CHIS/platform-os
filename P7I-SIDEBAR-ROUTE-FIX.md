# WO-P7I — Fix Platform Sidebar Links

> **日期**: 2026-06-24  
> **状态**: ✅ 完成

## 1. 修改文件

`packages/platform/config/sidebar.config.ts` — 1 行修改

## 2. 修复的 href

| Menu Item | Before | After | Reason |
| --- | --- | --- | --- |
| 生产记录 | `/erp/productions` | `/erp/production` | 路由是 `app/(platform)/erp/production/page.tsx` — 单数 |

## 3. 已验证正确的 hrefs

| 菜单 | href | 对应路由 | 状态 |
| --- | --- | --- | --- |
| 材料管理 | `/erp/materials` | `erp/materials/page.tsx` | ✅ |
| 产品/SKU | `/erp/products` | `erp/products/page.tsx` | ✅ |
| BOM 清单 | `/erp/bom` | `erp/bom/page.tsx` | ✅ |
| 库存池 | `/erp/inventory` | `erp/inventory/page.tsx` | ✅ |
| 生产记录 | `/erp/production` | `erp/production/page.tsx` | ✅ Fixed |
| 订单管理 | `/erp/orders` | `erp/orders/page.tsx` | ✅ |
| 客户管理 | `/erp/customers` | `erp/customers/page.tsx` | ✅ |

## 4. 残留检查

```
/platform/erp  → 0 results ✅
/erp/productions → 0 results ✅
```

## 5. Build

✅ PASS

## 6. 中间件 NATIVE_ERP_ROUTES 一致

```
NATIVE_ERP_ROUTES = [
  "/erp/materials",      ✅ matches sidebar
  "/erp/products",       ✅ matches sidebar
  "/erp/bom",            ✅ matches sidebar
  "/erp/inventory",      ✅ matches sidebar
  "/erp/production",     ✅ matches sidebar (now)
  "/erp/orders",         ✅ matches sidebar
  "/erp/customers",      ✅ matches sidebar
]
```
