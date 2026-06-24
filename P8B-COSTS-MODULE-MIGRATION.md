# WO-P8B — Costs Module Migration

> **日期**: 2026-06-24  
> **状态**: ✅ 完成

## 1. Legacy Costs Source

`apps/erp/app/costs/page.tsx` — queries `product_skus` + `product_costs` via `ErpProductCost` table, computes gross margin per SKU.

## 2. Cost Formula

```
GrossProfit = price - totalCost
GrossMargin = (price - totalCost) / price × 100%

totalCost = materialCost + laborCost + packagingCost
  materialCost → sum of BOM lineCosts per SKU
  laborCost → manual entry
  packagingCost → manual entry
```

## 3. Data

| Metric | Value |
| --- | --- |
| SKUs with cost data | 33 / 104 (32%) |
| Total material cost | ¥7,127 |
| Total labor cost | ¥774 |
| Total cost | ¥7,901 |

## 4. New Files

| File | Purpose |
| --- | --- |
| `packages/platform/services/erp/costs.service.ts` | CostService — 4 methods (getProductCosts, calculateSkuCost, calculateBomCost, getSummary) |
| `apps/platform/app/(platform)/erp/costs/page.tsx` | Costs page with 4 KPI cards + DataTable (11 columns) |

## 5. Modified Files

| File | Change |
| --- | --- |
| `apps/platform/middleware.ts` | +`/erp/costs` in NATIVE_ERP_ROUTES |

## 6. Sidebar

Already configured: 成本核算 → `/erp/costs` ✅

## 7. Build

✅ PASS

## 8. ERP Module Status

| Module | Status |
| --- | --- |
| Materials | ✅ |
| Products | ✅ |
| BOM | ✅ |
| Inventory | ✅ |
| Production | ✅ |
| Orders | ✅ |
| Customers | ✅ |
| **Costs** | ✅ **Done** |
| Media | 📋 |
| Import/Export | 📋 |
| Settings | 📋 |
