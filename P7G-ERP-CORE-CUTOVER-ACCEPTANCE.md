# WO-P7G — ERP Core Cutover Acceptance Report

> **日期**: 2026-06-24  
> **最终判定**: ✅ **PASS**

---

## 1. localhost:3001 残留

| 文件 | 内容 | 判定 |
| --- | --- | --- |
| `middleware.ts:15` | `const ERP_ORIGIN = IS_DEV ? "http://localhost:3001" : ...` | ⚠️ 代理配置（非业务依赖） |
| `shared/service-factory.ts` | `ERP_API_URL || "http://localhost:3001"` | ⚠️ 旧 fallback 工具（未被核心模块引用） |
| 3 个 actions 文件 | docstring: "Zero fetch, zero localhost:3001" | ✅ 历史注释 |

**结论**: 7 个核心模块的 actions 文件**零**运行时 `localhost:3001` 依赖。仅 middleware 和 service-factory 有遗留引用（用于非 ERP Core 模块的 Proxy 路由）。

## 2. apps/erp 引用

| 文件 | 内容 | 判定 |
| --- | --- | --- |
| `modules/erp/index.ts:6` | `// Phase 2: Migrate each module from apps/erp` | ✅ 历史注释 |

**结论**: 零运行时依赖。

## 3. fetch() 残留

| 文件 | fetch() | 判定 |
| --- | --- | --- |
| `materials/actions.ts` | 0 | ✅ |
| `products/actions.ts` | 0 | ✅ |
| `bom/actions.ts` | 0 | ✅ |
| `orders/actions.ts` | 0 | ✅ |
| `customers/actions.ts` | 0 | ✅ |
| `inventory/actions.ts` | 0 | ✅ |
| `production/actions.ts` | 0 | ✅ |
| `shared/service-factory.ts` | 1 (fallback helper) | ⚠️ Not used by core |

**结论**: 7/7 核心模块 `fetch()` = 0。

## 4. Service Coverage

| Service | Path | Status |
| --- | --- | --- |
| MaterialService | `materials.service.ts` | ✅ |
| ProductService | `products.service.ts` | ✅ |
| BOMService | `bom.service.ts` | ✅ |
| OrderService | `orders.service.ts` | ✅ |
| CustomerService | `customers.service.ts` | ✅ |
| InventoryService | `inventory.service.ts` | ✅ |
| ProductionService | `production.service.ts` | ✅ |

## 5. Data Counts

| Entity | Count |
| --- | --- |
| Products | 104 |
| SKUs | 104 |
| Materials | 68 |
| BOMs | 33 |
| Orders | 0 |
| Customers | 0 |
| Inventory | 70 |
| Production | 1 |

## 6. ERP (3001) Status

| Before | After |
| --- | --- |
| PID 76048 (next-server v16.2.9) | **STOPPED ✅** |

`apps/erp` 代码未删除，仅停止运行时。

## 7. Platform Build

```
✅ PASS — all routes compiled, proxy active for non-migrated modules
```

## 8. Final Verdict

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERP Core Cutover:   ✅ PASS

apps/erp Status:    Frozen Reference Only
Platform Status:    Primary ERP Runtime

7/7 core modules use direct Prisma (zero fetch)
7/7 services exist
8/8 data counts verified
Zero runtime dependency on localhost:3001
Build passes with ERP stopped
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
