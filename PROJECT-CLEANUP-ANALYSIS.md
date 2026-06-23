# 项目清理分析报告 — Phase 1

> **日期**: 2026-06-23 22:30  
> **审计员**: Claude (系统架构分析师)  
> **范围**: `/Users/ryan/Workbuddy/yunwu` + `/Users/ryan/Workbuddy/yunwu-admin`

---

## 1. 新版系统边界 (PlatformOS — Port 3100)

### 目录树

```
apps/platform/
├── app/                          # Next.js App Router
│   ├── (platform)/
│   │   ├── layout.tsx            # AdminShell (Sidebar + MainArea)
│   │   ├── page.tsx              # Dashboard ← 占位页面
│   │   ├── login/page.tsx        # 统一登录
│   │   ├── erp/                  # ERP 原生路由
│   │   │   ├── [[...slug]]/      # Proxy fallback
│   │   │   ├── materials/        # ✅ 原生 (180行)
│   │   │   ├── products/         # ✅ 原生 (~180行)
│   │   │   ├── bom/              # ✅ 原生 (~120行)
│   │   │   ├── inventory/        # ✅ 原生 (~120行)
│   │   │   ├── production/       # ✅ 原生 (~120行)
│   │   │   ├── orders/           # ✅ 原生 (~130行)
│   │   │   └── customers/        # ✅ 原生 (~130行)
│   │   ├── brand/[[...slug]]/    # Brand proxy
│   │   ├── crm/[[...slug]]/      # CRM proxy
│   │   └── settings/[[...slug]]/ # Settings proxy
│   ├── admin/brand/[[...slug]]/  # Brand admin proxy
│   ├── api/auth/[...nextauth]/   # NextAuth
│   ├── layout.tsx                # Root HTML
│   ├── page.tsx                  # / → /platform redirect
│   └── globals.css
├── components/
│   ├── PlatformSidebar.tsx       # 统一侧边栏
│   ├── AdminShell.tsx            # 管理框架
│   ├── Breadcrumb.tsx
│   ├── PermissionBoundary.tsx
│   └── Providers.tsx
├── modules/
│   ├── erp/                      # ERP 业务模块 (7 modules)
│   └── brand/                    # Brand 模块 (空壳)
├── lib/
│   ├── auth.ts                   # NextAuth 配置
│   └── utils.ts
├── middleware.ts                  # 反向代理
├── package.json
├── tsconfig.json
├── next.config.ts
└── postcss.config.mjs
```

### 属于 PlatformOS 的 Packages

```
packages/platform/   # 侧边栏配置、权限注册表、领域注册表、Gateway、Service Layer
packages/auth/       # 统一认证中间层
packages/db/         # Canonical Schema (38 models)
packages/ui/         # 设计系统 (tokens + components + PermissionBoundary)
packages/shared/     # 共享工具
```

### 统计

| 指标 | 数值 |
| --- | --- |
| 原生页面 | 10 (dashboard + login + 7 ERP modules + 2 detail) |
| Proxy 页面 | 4 (brand, crm, settings, admin/brand) |
| 模块文件 | 27 (7 modules × 3-5 files) |
| 组件文件 | 5 |
| Service 文件 | 7 (54 methods) |
| Gateway 文件 | 6 |

---

## 2. 旧版系统边界 (Legacy ERP — Port 3001)

### 目录树

```
apps/erp/
├── app/
│   ├── api/                      # 43 REST API endpoints
│   │   ├── auth/ (6 routes)
│   │   ├── materials/ (2 routes)
│   │   ├── products/ (2 routes)
│   │   ├── sku/ (2 routes)
│   │   ├── series/ (2 routes)
│   │   ├── works/ (3 routes)
│   │   ├── bom/ (2 routes)
│   │   ├── inventory/ (2 routes)
│   │   ├── purchase-records/ (1 route)
│   │   ├── orders/ (2 routes)
│   │   ├── customers/ (2 routes)
│   │   ├── costs/ (2 routes)
│   │   ├── productions/ (1 route)
│   │   ├── media/ (2 routes)
│   │   ├── banners/ (3 routes)
│   │   ├── import/ (2 routes) + template
│   │   ├── export/ (1 route)
│   │   ├── permissions/ (3 routes) + templates + audit-log
│   │   └── users/ (2 routes)
│   ├── materials/                # 1238行 Client + 146行 API + 195行 Service
│   ├── products/                 # Client + API
│   ├── inventory/                # Client + API
│   ├── bom/                      # Client + API
│   ├── costs/                    # Client + API
│   ├── orders/                   # 页面
│   ├── customers/                # 页面
│   ├── productions/              # Client + API
│   ├── media/                    # Client + components (BannerList, MediaGrid, MediaUploader, MediaDetail)
│   ├── series/                   # Client + API
│   ├── works/                    # Client + API
│   ├── settings/                 # 页面
│   ├── import/                   # 页面
│   ├── dashboard/                # 页面
│   ├── login/                    # 登录
│   ├── forgot-password/
│   └── reset-password/
├── components/
│   ├── layout/Sidebar.tsx        # 435行 侧边栏 (深蓝灰渐变)
│   ├── auth/SessionProvider.tsx  # 11行
│   └── ui/Modal.tsx             # 56行
├── hooks/useSort.ts             # 83行
├── src/modules/raw-material/    # 195行 Service + 24行 Types
├── lib/
│   ├── auth.ts
│   ├── permissions.ts           # 34权限点 V3 RBAC+ABAC
│   ├── prisma.ts
│   ├── media.ts
│   ├── blob.ts
│   └── utils.ts
├── prisma/schema.prisma         # FROZEN 24 models
├── types/
├── outputs/
├── scripts/
└── public/
```

### 统计

| 指标 | 数值 |
| --- | --- |
| 页面 | 18 (含 Client components) |
| API routes | 43 |
| 组件 | 3 (Sidebar, Modal, SessionProvider) |
| Hooks | 1 (useSort) |
| Service modules | 1 (raw-material) |
| Prisma calls | 173 (21 in materials alone) |
| 权限点 | 34 |

---

## 3. 同一项目下的其他系统

### Brand OS (Port 3003) — apps/brand-os/

| 指标 | 数值 |
| --- | --- |
| Admin 页面 | 16 (仪表盘、七序、器物、材料、品牌志、页面内容、标签、媒体、线索、SEO、审计、设置) |
| API routes | 8 |
| Action files | 5 |
| Prisma calls | 75 |
| 状态 | **⚠️ DEPRECATED — 所有功能已通过 Platform 代理可用** |

### Web (Port 3002) — apps/web/

| 指标 | 数值 |
| --- | --- |
| 公开页面 | 12 (首页、关于、器物、产品、七序、材料、品牌志、联系、结算) |
| API routes | 11 |
| 状态 | **✅ ACTIVE — 公共网站 www.yunwuorigin.com** |

### yunwu-admin (独立项目) — /Users/ryan/Workbuddy/yunwu-admin/

| 指标 | 数值 |
| --- | --- |
| Admin 页面 | 12 |
| 公开网站页面 | 12 |
| 状态 | **🔴 DUPLICATE — 与 apps/brand-os + apps/web 100% 功能重叠** |

---

## 4. 可删除清单 (DO NOT DELETE YET)

### A. 立刻可删除 (无运行时依赖)

| # | 文件/目录 | 原因 | 大小 |
| --- | --- | --- | --- |
| 1 | `/Users/ryan/Workbuddy/yunwu-admin/` | 与 Brand OS + Web 完全重复 | ~300MB |
| 2 | Root `PHASE-*.md` (9 files) | 历史迁移报告，已不再需要 | ~30KB |
| 3 | Root `WORK-ORDER-AUTO-*.md` | 自动生成的工单 | ~5KB |
| 4 | `apps/erp/outputs/` | ERP 架构审计历史 | ~10KB |
| 5 | `apps/erp/prisma/schema.prisma` | FROZEN — 已被 Canonical 替代 | ~5KB |
| 6 | `apps/brand-os/prisma/schema.prisma` | FROZEN — 已被 Canonical 替代 | ~5KB |
| 7 | `apps/web/prisma/schema.prisma` | FROZEN — 已被 Canonical 替代 | ~5KB |

### B. 验证后可删除

| # | 文件/目录 | 需验证 |
| --- | --- | --- |
| 8 | `apps/erp/components/` (3 files) | 确认 Platform 已有对应组件 |
| 9 | `apps/erp/hooks/useSort.ts` | 确认 Platform 有排序方案 |
| 10 | `apps/brand-os/src/app/admin/*` (16 pages) | 确认所有管理功能已迁移到 Platform |
| 11 | `apps/brand-os/src/app/api/*` (8 routes) | 确认已通过 Gateway 覆盖 |
| 12 | `packages/db/canonical/` (Phase 4, 4 files) | 确认不再需要 |
| 13 | `packages/db/control/` (Phase 2.99, 5 files) | 确认 access.ts 逻辑已被 platform-auth 替代 |
| 14 | `packages/db/enforce/` (Phase 2.999, 6 files) | 确认 api-gateway.ts 未被使用 |
| 15 | `packages/db/fabric/` (Phase 3.5, 6 files) | 确认 resolver 未被使用 |
| 16 | `packages/db/domain/` (Phase 2.95, 5 files) | 确认已被 services/erp/ 替代 |

### C. 不删除 (保留)

| # | 文件/目录 | 原因 |
| --- | --- | --- |
| 1 | `apps/erp/` (整体) | 业务参考标准 — 但 API + pages 可在迁移后删除 |
| 2 | `apps/web/` | 生产公共网站 |
| 3 | `apps/platform/` | 主系统 |
| 4 | `packages/` (5 packages) | 共享基础设施 |
| 5 | `packages/db/schema.prisma` | Canonical Schema (权威) |

---

## 5. 模块差异分析 — Materials (P0 优先)

### A. 页面结构差异

| 维度 | Platform (New) | Legacy ERP (Reference) | 差距 |
| --- | --- | --- | --- |
| 代码量 | 180 行 (actions + list + types + validators) | 1238 行 (仅 Client) + 146 行 API + 195 行 Service | 🔴 极简 vs 完整 |
| 搜索 | 无 | 关键词搜索 (code/name/category) | ❌ 缺失 |
| 分类筛选 | 无 | 4 个 view (bead/ceramic/metal/seal) | ❌ 缺失 |
| 排序 | 无 | useSort hook (10+ sortable columns) | ❌ 缺失 |
| 分页 | 无 | 50 per page + pagination | ❌ 缺失 |
| 新建/编辑弹窗 | 无 (跳转新页面) | Modal 弹窗 (内联编辑) | ❌ 缺失 |
| 采购弹窗 | 无 | 采购入库 Modal | ❌ 缺失 |
| 成本列 | 有 (基础) | 有 + 采购单位转换 + 采购价/库存价双显示 | 🟡 不完整 |
| 状态 Badge | 有 (4 states) | 有 (LifecycleStatus enum) | ✅ 对齐 |

### B. 功能差异

| 功能 | Platform | Legacy | 缺失？ |
| --- | --- | --- | --- |
| CRUD | ✅ | ✅ | — |
| 搜索 | ❌ | ✅ 关键词搜索 | ❌ |
| 分类视图 (bead/metal/ceramic/seal) | ❌ | ✅ 4 个 sidebar 子菜单 | ❌ |
| 排序 | ❌ | ✅ 10+ 列排序 | ❌ |
| 分页 | ❌ | ✅ 50/页 | ❌ |
| 采购入库 | ❌ | ✅ purchaseIn() 事务 | ❌ |
| 库存调整 | ❌ | ✅ adjustInventory() | ❌ |
| 材料消耗 | ❌ | ✅ consumeMaterial() | ❌ |
| 采购记录查看 | ❌ | ✅ 详情+采购记录列表 | ❌ |
| 库存事务记录 | ❌ | ✅ InventoryTransaction 历史 | ❌ |
| 权限脱敏 | ❌ | ✅ canViewCost() 角色脱敏 | ❌ |
| Excel 导入导出 | ❌ | ✅ import/export API | ❌ |

### C. 字段差异

**Legacy ERP RawMaterial 字段** (22 fields):

| Field | Platform Has? | Notes |
| --- | --- | --- |
| `id` | ✅ | — |
| `code` | ✅ | — |
| `name` | ✅ | — |
| `category` | ✅ | — |
| `materialType` (enum) | ✅ | BEAD/METAL/CERAMIC/LEATHER/INCENSE/CORD/PACKAGING/OTHER |
| `specification` | ✅ | — |
| `inventoryUnit` | ✅ | "颗"/"个"/"条" 等 |
| `remaining` | ✅ | — |
| `unitCost` | ✅ | — |
| `status` (enum) | ✅ | DRAFT/DESIGNING/READY/ACTIVE/PAUSED/ARCHIVED |
| `shape` | ✅ | 形状描述 |
| `beadsPerStrand` | ✅ | 每串珠子数 |
| `weightPerStrand` | ✅ | 每串重量 |
| `defaultPurchaseUnit` | ✅ | 采购单位 |
| `defaultConversionRate` | ✅ | 采购转换率 |
| `supplier` | ✅ | 供应商 (String, 未规范化) |
| `remark` | ✅ | — |
| `createdAt` / `updatedAt` | ✅ | — |

**结论**: 字段定义一致 (都来自 Canonical Schema)，Platform Types 覆盖全部 18 个业务字段。

### D. 状态流差异

| 状态 | 含义 | Platform | Legacy |
| --- | --- | --- | --- |
| DRAFT | 草稿 | ✅ | ✅ |
| DESIGNING | 设计中 | ✅ | ✅ |
| READY | 可用 | ✅ | ✅ |
| ACTIVE | 活跃 | ✅ | ✅ |
| PAUSED | 暂停 | ✅ | ✅ |
| ARCHIVED | 归档 | ✅ | ✅ |

**结论**: 状态流完全一致 (共用 LifecycleStatus enum)。

---

## 6. 整体模块对比摘要

### Platform 已迁移模块 vs Legacy ERP

| 模块 | Platform 代码量 | Legacy 代码量 | 功能完整度 | 迁移优先级 |
| --- | --- | --- | --- | --- |
| **Materials** | 180 行 | 1579 行 | 🟡 30% | 🔴 P0 |
| Products | ~180 行 | ~500+ 行 | 🟡 40% | 🔴 P1 |
| Inventory | ~120 行 | ~400+ 行 | 🟡 30% | 🔴 P1 |
| BOM | ~120 行 | ~300+ 行 | 🟡 40% | 🟡 P2 |
| Production | ~120 行 | ~300+ 行 | 🟡 40% | 🟡 P2 |
| Orders | ~130 行 | ~400+ 行 | 🟡 30% | 🟡 P2 |
| Customers | ~130 行 | ~300+ 行 | 🟡 40% | 🟡 P2 |
| Costs | ❌ 未迁移 | ~300+ 行 | 0% | 🟡 P2 |
| Works | ❌ 未迁移 | ~500+ 行 | 0% | 🟢 P3 |
| Media | ❌ 未迁移 | ~600+ 行 | 0% | 🟢 P3 |
| Import | ❌ 未迁移 | ~200+ 行 | 0% | 🟢 P3 |
| Settings | ❌ 未迁移 | ~400+ 行 | 0% | 🟢 P3 |

---

## 7. 风险点清单

| # | 风险 | 级别 | 说明 |
| --- | --- | --- | --- |
| 1 | Platform 模块过于简单 | 🔴 P0 | 7 个"已迁移"模块平均只有 120-180 行，缺少搜索/排序/分页/弹窗/库存操作 |
| 2 | 双数据库并存 | 🔴 P0 | Platform 的 MaterialService 指向 ERP DB，但运行环境无 Prisma 生成 |
| 3 | Brand OS + yunwu-admin 三套 Sidebar | 🟡 P1 | 3 个完全独立的 Sidebar 实现 |
| 4 | Frozen Schema 未清理 | 🟡 P1 | 3 个遗留 schema.prisma 文件 |
| 5 | 路由冲突风险 | 🟡 P1 | Platform `/erp/*` vs Legacy `/erp/*` 如果同域部署会冲突 |
| 6 | 权限系统差异 | 🟡 P1 | Platform 用 requirePermission()，Legacy 用 ERP V3 middleware |
| 7 | API 命名冲突 | 🟢 P2 | Platform 用 fetch() 到 Legacy API，迁移后会移除 |
| 8 | Component 重复 | 🟢 P2 | Sidebar ×3，Modal ×2 |

---

## 8. 推荐保留清单

| # | 保留 | 原因 |
| --- | --- | --- |
| 1 | Platform 技术架构 (routing, layout, auth, permissions, gateway) | 技术骨架 |
| 2 | Legacy ERP 的 MaterialService + Client UI (1238行) | 产品标准 — 搜索/排序/分页/弹窗/采购 |
| 3 | Legacy ERP 的权限系统 (34 permission codes) | 完整的 RBAC+ABAC |
| 4 | Legacy ERP 的 Sidebar 设计 (深蓝灰渐变) | 已被 Platform 继承 |
| 5 | Canonical Schema (packages/db/schema.prisma) | 唯一数据源 |
| 6 | Gateway Layer (6 gateways) | 统一数据访问 |
| 7 | Service Layer (7 services, 54 methods) | 生产就绪 |
| 8 | 公共网站 (apps/web) | 生产运行中 |

---

## 9. 迁移施工图 (推荐顺序)

```
Step 1: 清理无关代码
  ├── 删除 yunwu-admin/
  ├── 删除 3× Frozen schemas
  ├── 删除 packages/db/canonical/control/enforce/fabric/domain (确认未使用)
  └── 归档历史报告到 docs/

Step 2: 修复 Platform 基础设施
  ├── 确认 prisma generate 在 CI/CD 可执行
  ├── 确认 DATABASE_URL 指向生产数据库
  └── 激活 Service Layer (ERP_USE_SERVICE_LAYER=true)

Step 3: 对齐 Materials 模块 (P0)
  ├── 迁移 Legacy ERP MaterialsClient UI → Platform (1238行)
  ├── 添加搜索 + 排序 + 分页 + 弹窗
  ├── 添加采购入库 + 库存调整 + 材料消耗
  └── 对齐字段显示 (采购价/库存价双显示)

Step 4: 对齐 Products 模块 (P1)
Step 5: 对齐 Inventory 模块 (P1)
Step 6: 对齐 BOM + Production 模块 (P2)
Step 7: 对齐 Orders + Customers 模块 (P2)
Step 8: 迁移 Costs + Works + Media + Import + Settings (P3)
```

---

> **结论**: Platform 技术骨架完整，但 7 个"已迁移"的 ERP 模块实际只有极简 UI (平均 120-180 行)，缺少 Legacy ERP 的核心功能 (搜索/排序/分页/弹窗/库存操作)。迁移策略应该是：保留 Platform 架构，将 Legacy ERP 的成熟 UI 和业务逻辑移植到 Platform。
