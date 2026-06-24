# WO-P11B Phase 1 — Broken Fix + Dashboard Restore

> **日期**: 2026-06-24  
> **工单**: WO-P11B — Phase 1: Fix Broken + Restore Dashboard  
> **方法**: 全量文件修复 + curl 双验证  
> **状态**: Phase 1 完成，待浏览器验证

---

## 一、执行摘要

| Task | Status | Notes |
| --- | --- | --- |
| Dashboard 恢复真实数据 | ✅ FIXED | actions.ts model 名称修复，页面更新 |
| ERP 采购管理页面 | ✅ CREATED | `/erp/purchase` 创建，sidebar 添加入口 |
| Brand Banner 页面 broken | ✅ FIXED | 显示 BLOCKED_BY_SCHEMA，不 404/500 |
| 清理重复 settings 入口 | ✅ FIXED | `/erp/settings/*` → redirect to `/settings/*` |

---

## 二、Dashboard 恢复真实数据

### 问题诊断

**原状态**: `apps/platform/modules/dashboard/actions.ts` 使用错误的 Prisma model 名称

| 错误用法 | 正确名称 | 来源 |
| --- | --- | --- |
| `prisma.erpInventoryFlow` | `prisma.erpInventoryTransaction` | schema.prisma: `model ErpInventoryTransaction` |
| `prisma.erpProduction` | `prisma.erpProductionRecord` | schema.prisma: `model ErpProductionRecord` |
| `brandPrisma.products` | `brandPrisma.brandProduct` | schema.prisma: `model BrandProduct` |
| `brandPrisma.series` | `brandPrisma.brandSeries` | schema.prisma: `model BrandSeries` |
| `brandPrisma.journal_posts` | `brandPrisma.brandJournalPost` | schema.prisma: `model BrandJournalPost` |
| `brandPrisma.banners` | `brandPrisma.brandBanner` | schema.prisma: `model BrandBanner` |

### 修复内容

**文件**: `apps/platform/modules/dashboard/actions.ts`

1. 修正所有 ERP model 名称（`ErpInventoryTransaction`, `ErpProductionRecord`）
2. 修正所有 Brand model 名称（`BrandProduct`, `BrandSeries`, `BrandJournalPost`, `BrandBanner` 等）
3. 新增 `purchaseCount` 和 `totalPurchase` KPI
4. Brand KPI 增加 `bannerTableExists` 和 `bannerError` 字段
5. `getSystemStatus()` 增加真实 DB 连接检测（`$queryRaw SELECT 1`）

**文件**: `apps/platform/app/(platform)/page.tsx`

1. 显示新增 KPI（采购记录、媒体素材）
2. Banner 卡片显示 "N/A" + "表缺失" 子标题（当表不存在时）
3. 添加 amber 警告条（当 banner 表不存在时）
4. 显示真实时间戳（`sys.timestamp`）

### KPI 数据验证

**ERP DB (US-East)**:

```
products           104
product_skus       104
raw_materials       68
bom                 33
inventory_trans...   70
production_records    1
orders               0
customers            0
purchase_records     2  ← 新增
product_costs       33
```

**Brand DB (Singapore)**:

```
products   5  (BrandProduct)
series     7  (BrandSeries)
journal    6  (BrandJournalPost)
page_co... 0  (BrandPageContent)
seo_con... 0  (BrandSeoConfig)
media      0  (BrandMediaAsset)
banners    TABLE DOES NOT EXIST  ← BLOCKED
```

---

## 三、ERP 采购管理页面

### 创建内容

**文件**: `apps/platform/app/(platform)/erp/purchase/page.tsx`

- 真实查询 `ErpPurchaseRecord` + `ErpMaterial`（关联材料名称）
- 显示字段：ID / 材料 / 供应商 / 采购数量 / 单价 / 总价 / 库存数量 / 单位成本 / 日期
- 分页功能（每页 20 条）
- 空状态提示（当无数据时）
- 表结构说明（`<details>` 折叠）

**文件**: `packages/platform/config/sidebar.config.ts`

- 添加 `采购管理` 菜单项（ERP 系统 → 采购管理 → `/erp/purchase`）
- 图标：`Truck`
- 权限：`PERMISSIONS.PURCHASE_VIEW`

**文件**: `packages/platform/config/permissions.config.ts`

- 新增权限：
  - `PURCHASE_VIEW: "purchase.view"`
  - `PURCHASE_EDIT: "purchase.edit"`

### `purchase_records` 表结构

```sql
id                Int        @id @default(autoincrement())
materialId        Int
purchaseDate      DateTime   @default(now()) @map("purchase_date")
supplier          String?
purchaseUnit      String
conversionRate    Float
purchaseQuantity  Float
purchaseUnitPrice Float?     @map("purchase_unit_price")
purchasePrice     Float
inventoryQuantity Float      @map("inventory_quantity")
unitCost          Float?
remark            String?
createdAt         DateTime   @default(now()) @map("created_at")
material          ErpMaterial @relation(fields: [materialId], references: [id])
```

---

## 四、Brand Banner 页面修复

### 问题诊断

**原状态**: `apps/platform/app/(platform)/brand/banners/page.tsx` 使用 `prisma.erpBanner`（错误 DB）+ try-catch 静默失败 → 空状态

**根本原因**: Brand DB 中 `banners` 表不存在（未执行 migration）

### 修复内容

**文件**: `apps/platform/app/(platform)/brand/banners/page.tsx`

1. 改用 `brandPrisma.brandBanner.count()`（正确 DB）
2. 捕获"表不存在"错误，设置 `tableExists = false`
3. 显示 **BLOCKED_BY_SCHEMA** 状态卡片（amber 背景）
4. 解释前台 Banner 控制链路（① Brand OS → ② Brand DB banners 表 → ③ 前台 API）
5. 提供解决建议（`<details>` 折叠，包含 migration 命令）

**验收标准**:

- ✅ 不 404
- ✅ 不 500
- ✅ 不是 placeholder
- ✅ 真实说明状态（BLOCKED_BY_SCHEMA）

---

## 五、清理重复 Settings 路由

### 问题诊断

**原状态**:

```
apps/platform/app/(platform)/settings/      → users, permissions, system
apps/platform/app/(platform)/erp/settings/ → users, permissions, system  (重复)
```

### 修复内容

**文件**: `apps/platform/app/(platform)/erp/settings/users/page.tsx`

- 重写为 `redirect("/settings/users")`

**文件**: `apps/platform/app/(platform)/erp/settings/permissions/page.tsx`

- 重写为 `redirect("/settings/permissions")`

**文件**: `apps/platform/app/(platform)/erp/settings/system/page.tsx`

- 重写为 `redirect("/settings/system")`

**Sidebar 配置**: `packages/platform/config/sidebar.config.ts`

- ✅ 只有 `/settings/*` 入口
- ❌ 无 `/erp/settings/*` 入口

---

## 六、Middleware 修复

### 问题诊断

**原状态**: `/erp/purchase` 返回 500

**根本原因**: `middleware.ts` 的 `NATIVE_ERP_ROUTES` 白名单不包含 `/erp/purchase` → 被 proxy 到 `localhost:3001`（未运行）→ 500

### 修复内容

**文件**: `apps/platform/middleware.ts`

- 添加 `/erp/purchase` 到 `NATIVE_ERP_ROUTES` 数组
- 现在所有 9 个 ERP 原生路由都不会被代理

---

## 七、curl 验证结果

| Route | HTTP | Content | Status |
| --- | --- | --- | --- |
| `/platform` | 200 | "ERP 系统" + "Brand OS" + KPI 卡片 | ✅ REAL |
| `/erp/purchase` | 200 | "采购管理" + 表格/空状态 | ✅ REAL |
| `/brand/banners` | 200 | "BLOCKED_BY_SCHEMA" + migration 说明 | ✅ BLOCKED (正确) |
| `/settings/users` | 200 | 用户表格 | ✅ REAL |
| `/settings/permissions` | 200 | 权限列表（DB + 配置） | ✅ REAL |
| `/settings/system` | 200 | 运行时信息 + 数据统计 | ✅ REAL |

---

## 八、剩余 P11A 缺口

### ERP 系统

| Module | Status | Notes |
| --- | --- | --- |
| 材料管理 | ✅ REAL | 68 rows |
| 产品/SKU | ✅ REAL | 104/104 rows |
| BOM 清单 | ✅ REAL | 33 rows |
| 库存池 | ✅ REAL | 70 rows |
| 生产记录 | ✅ REAL | 1 row |
| 订单管理 | ✅ REAL | 0 rows |
| 客户管理 | ✅ REAL | 0 rows |
| 成本核算 | ✅ REAL | 33 rows |
| **采购管理** | ✅ **NEW** | **2 records** |
| 七序(制造) | ❌ MISSING | series 7 rows |
| 作品管理 | ❌ MISSING | works 34 rows |

### Brand OS

| Module | Status | Notes |
| --- | --- | --- |
| 首页管理 | ⚠️ PARTIAL | 静态占位符 |
| 品牌志 | ⚠️ PARTIAL | Read-only |
| 七序系列 | ⚠️ PARTIAL | Read-only |
| 产品展示 | ⚠️ PARTIAL | list+delete |
| 材料展示 | ❌ PLACEHOLDER | 0 rows |
| 图片/媒体 | ❌ PLACEHOLDER | 0 rows |
| Banner | ❌ BLOCKED | 表不存在 |
| SEO | ❌ PLACEHOLDER | 0 rows |
| 页面内容 | ❌ PLACEHOLDER | 0 rows |

### 系统设置

| Module | Status | Notes |
| --- | --- | --- |
| 用户管理 | ✅ REAL | 7 users |
| 权限矩阵 | ✅ REAL | 34 codes |
| 系统配置 | ✅ REAL | env vars |
| 角色管理 | ❌ MISSING | DB has roles |
| 审计日志 | ❌ MISSING | DB has audit_logs |

---

## 九、验收

### 自动验证 (curl)

```
✅ /platform          200  Dashboard 有真实 KPI
✅ /erp/purchase     200  采购管理页面正常
✅ /brand/banners    200  BLOCKED_BY_SCHEMA 正确显示
✅ /settings/users   200  用户管理正常
✅ /settings/permissions 200 权限管理正常
✅ /settings/system  200  系统配置正常
```

### 待浏览器验证

1. 登录 `http://localhost:3100/login`
2. 访问 `/platform`，确认 KPI 显示**非零**数值
3. 访问 `/erp/purchase`，确认显示采购记录表格
4. 访问 `/brand/banners`，确认显示 **BLOCKED_BY_SCHEMA** 警告
5. 点击侧边栏 **采购管理**，确认路由正确跳转

---

## 十、结论

```
P11B Phase 1: PASS (curl 验证)
```

**条件**: 浏览器验证通过后，最终状态为 **PASS**。

**剩余工作**:

- Phase 2: 升级 Brand OS PARTIAL → REAL（CRUD）
- Phase 2: 创建 七序(制造) + 作品管理页面
- Phase 3: Brand Banner migration（创建 banners 表）
- Phase 4: 角色管理 + 审计日志页面

---

**生成时间**: 2026-06-24 03:49 GMT+8  
**生成者**: WorkBuddy AI  
**工单**: WO-P11B
