# WO-P7A — Platform 接管 ERP 最小迁移审计

> **日期**: 2026-06-24  
> **审计方法**: 代码对比 + 配置对比 + 目录扫描

---

## 1. Platform vs ERP — 关键配置对比

### Schema 差异

| 维度 | Platform | ERP | 差异 |
| --- | --- | --- | --- |
| **Schema 文件** | 无独立 Schema | `apps/erp/prisma/schema.prisma` (FROZEN) | Platform 依赖 `packages/db/schema.prisma` (Canonical 38 models) |
| **实际表名** | 未部署 | `users`, `series`, `products`, `product_skus`, `raw_materials`, `orders`, `customers`... | ERP 使用旧命名 (无 erp_ prefix) |
| **Canonical 表名** | `ErpProduct`, `ErpProductSku`, `ErpMaterial`, `ErpOrder`, `ErpCustomer`... | — | Canonical 有 erp_ prefix |
| **model 数量** | 38 (Canonical) | 24 (FROZEN) | Canonical 多了 14 个 Brand 域模型 |

### 环境变量差异

| 变量 | Platform | ERP | 是否一致 |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✅ `ep-polished-unit-...` | ✅ `ep-polished-unit-...` | ✅ **一致 — 同库** |
| `NEXTAUTH_SECRET` | ✅ `DVhVrOdJ+zg...` | ✅ `DVhVrOdJ+zg...` | ✅ **一致** |
| `NEXTAUTH_URL` | `http://localhost:3100` | `http://localhost:3001` | ❌ 端口不同 |
| `ERP_USE_SERVICE_LAYER` | ✅ `true` | ✅ `true` | ✅ 一致 |

### Package 依赖差异

| 依赖 | Platform | ERP | 差异 |
| --- | --- | --- | --- |
| `@yunwu/db` | ✅ | ✅ | 一致 |
| `@yunwu/auth` | ✅ | ✅ | 一致 |
| `@yunwu/platform-core` | ✅ | ❌ | Platform 独有 |
| `prisma` (CLI) | ❌ | ✅ `^6.19.3` | Platform 缺少 prisma CLI |
| `@radix-ui/*` | ❌ | ✅ 8 packages | Platform 缺少 UI 组件 |
| `@vercel/blob` | ❌ | ✅ | ERP 有文件上传 |
| `xlsx` | ❌ | ✅ | ERP 有 Excel 导入导出 |
| `sharp` | ❌ | ✅ | ERP 有图片优化 |

---

## 2. Module Mapping

### ERP 页面 → Platform 对应位置

| ERP 模块 | ERP 页面 | Platform 路由 | 是否已迁移 |
| --- | --- | --- | --- |
| **Materials** | `apps/erp/app/materials/` | `/platform/erp/materials` | ✅ 已迁移 (180 行, 极简) |
| **Products** | `apps/erp/app/products/` | `/platform/erp/products` | ✅ 已迁移 (~180 行, 极简) |
| **BOM** | `apps/erp/app/bom/` | `/platform/erp/bom` | ✅ 已迁移 (~120 行) |
| **Inventory** | `apps/erp/app/inventory/` | `/platform/erp/inventory` | ✅ 已迁移 (~120 行) |
| **Production** | `apps/erp/app/productions/` | `/platform/erp/production` | ✅ 已迁移 (~120 行) |
| **Orders** | `apps/erp/app/orders/` | `/platform/erp/orders` | ✅ 已迁移 (~130 行) |
| **Customers** | `apps/erp/app/customers/` | `/platform/erp/customers` | ✅ 已迁移 (~130 行) |
| **Costs** | `apps/erp/app/costs/` | — | ❌ 未迁移 |
| **Works** | `apps/erp/app/works/` | — | ❌ 未迁移 |
| **Series** | `apps/erp/app/series/` | — | ❌ 未迁移 |
| **Media** | `apps/erp/app/media/` | — | ❌ 未迁移 |
| **Import** | `apps/erp/app/import/` | — | ❌ 未迁移 |
| **Dashboard** | `apps/erp/app/dashboard/` | `/platform` | ✅ 已迁移 |
| **Login** | `apps/erp/app/login/` | `/platform/login` | ✅ 已迁移 |
| **Settings** | `apps/erp/app/settings/` | — | ❌ 未迁移 |

### ERP API → Platform API 迁移映射

| ERP API | Platform 对应 | 状态 |
| --- | --- | --- |
| `api/materials/*` (2 routes) | 无 — 通过 Server Action + Service Layer | ✅ 间接覆盖 |
| `api/products/*` (2 routes) | 无 — 通过 Server Action + Service Layer | ✅ 间接覆盖 |
| `api/sku/*` (2 routes) | 无 — 通过 Server Action + Service Layer | ✅ 间接覆盖 |
| `api/bom/*` (2 routes) | 无 — 通过 Server Action + Service Layer | ✅ 间接覆盖 |
| `api/inventory/*` (2 routes) | 无 — 通过 Server Action + Service Layer | ✅ 间接覆盖 |
| `api/productions/*` (1 route) | 无 — 通过 Server Action + Service Layer | ✅ 间接覆盖 |
| `api/orders/*` (2 routes) | 无 — 通过 Server Action + Service Layer | ✅ 间接覆盖 |
| `api/customers/*` (2 routes) | 无 — 通过 Server Action + Service Layer | ✅ 间接覆盖 |
| `api/costs/*` (2 routes) | 无 | ❌ 未覆盖 |
| `api/works/*` (3 routes) | 无 | ❌ 未覆盖 |
| `api/series/*` (2 routes) | 无 | ❌ 未覆盖 |
| `api/media/*` (2 routes) | 无 | ❌ 未覆盖 |
| `api/banners/*` (3 routes) | 无 | ❌ 未覆盖 |
| `api/import/*` (2 routes) | 无 | ❌ 未覆盖 |
| `api/export/*` (1 route) | 无 | ❌ 未覆盖 |
| `api/purchase-records/*` (1 route) | 无 — 通过 Service Layer | ✅ 间接覆盖 |
| `api/users/*` (2 routes) | 无 | ❌ 未覆盖 |
| `api/permissions/*` (4 routes) | 无 | ❌ 未覆盖 |
| `api/auth/*` (6 routes) | `api/auth/[...nextauth]` (1 route) | ✅ 迁移 |

---

## 3. Missing Modules (Platform 缺失)

```
1. Costs         — 成本核算页面 + API
2. Works         — 作品管理页面 + API
3. Series        — 七序管理页面 + API
4. Media         — 媒体管理页面 + API (含 Banner 管理)
5. Import/Export — 数据导入导出页面 + API
6. Settings      — 系统设置页面 + API (用户管理、权限管理)
7. Dashboard     — ERP 仪表盘 (Platform 有基础版)
```

---

## 4. Platform API 现状

```
Platform API: 仅 1 个 endpoint — /api/auth/[...nextauth]/route.ts

所有 ERP 业务 API (43 routes) 在 Platform 中不存在。
Platform 转而使用 Server Actions (modules/erp/*/actions.ts) + MaterialService/ProductService 等。
这是架构上的有意选择 — Server Actions 替代 REST API。
```

---

## 5. 迁移顺序（推荐）

```
Phase 1: 补齐 Platform 依赖
  ├── 添加 prisma CLI (apps/platform/package.json)
  ├── 添加 @radix-ui/* (Modal, Dialog, Select, Tabs)
  ├── 添加 xlsx (Excel import/export)
  └── 添加 @vercel/blob (文件上传)

Phase 2: 迁移 Costs 模块
  └── 成本核算页面 + Service + actions

Phase 3: 迁移 Works + Series 模块
  └── 作品管理 + 七序管理

Phase 4: 迁移 Media 模块
  └── 媒体管理 + Banner 管理

Phase 5: 迁移 Import/Export 模块
  └── 数据导入导出

Phase 6: 迁移 Settings 模块
  └── 用户管理 + 权限管理

Phase 7: 增强已迁移模块
  └── Materials (搜索/排序/分页/弹窗/采购 — WO-P2B 方案)
  └── Products (同上)
  └── Inventory (同上)
  └── Orders (同上)
```

---

## 6. Blockers

### Schema 不兼容

| 问题 | 详情 |
| --- | --- |
| 表名差异 | ERP 用 `raw_materials` / `products` / `orders`，Canonical 期望 `erp_materials` / `erp_products` / `erp_orders` |
| User 表差异 | ERP 用 `role: String`，Canonical 用 `role: UserRole enum` + `systems: SystemDomain[]` |
| 影响 | Platform 的 Canonical Prisma Client 会期望 erp_* 前缀表名，但 ERP DB 中是无前缀的旧表名 |

### API 不兼容

| 问题 | 详情 |
| --- | --- |
| Platform 无 REST API | 所有业务逻辑通过 Server Actions，不是 REST |
| ERP 有完整 REST API | 43 routes — 如果前端需要直接调用，需要补充 |
| 影响 | 外部集成 (如小程序) 需要 REST API，Platform 需考虑补充 |

### 可直接复用

| 组件 | 来源 | 状态 |
| --- | --- | --- |
| `useSort.ts` | `apps/erp/hooks/` | ✅ 可直接复制 |
| `Modal.tsx` | `apps/erp/components/ui/` | ✅ 可直接复制 |
| `raw-material.service.ts` | `apps/erp/src/modules/` | ✅ 已移植到 `packages/platform-core/services/erp/materials.service.ts` |
| `MaterialsClient.tsx` (1238 行) | `apps/erp/app/materials/` | ⚠️ 需要拆解后迁移 |
| `permissions.ts` (V3) | `apps/erp/lib/` | ✅ 已整合到 `permissions.config.ts` |

### 必须重写

| 组件 | 原因 |
| --- | --- |
| 所有 api/route.ts | Platform 架构是 Server Actions，不复制 REST API |
| Settings 页面 | ERP 使用 Legacy V3 权限 UI，需适配 Platform 的 PermissionBoundary |
| Media 上传 | ERP 使用 Vercel Blob，Platform 需决定存储方案 |
