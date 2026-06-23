# Material P0 融合施工方案

> **日期**: 2026-06-24  
> **状态**: ⏳ 等待人工审批  
> **范围**: 仅 Material 模块 — 不涉及其他 6 个 ERP 模块

---

## 1. Material 当前 Platform 文件结构

```
apps/platform/app/(platform)/erp/materials/
├── page.tsx                          # 5行 — 路由代理 → MaterialsList
└── [id]/page.tsx                     # 60行 — 详情页 (采购记录表)

apps/platform/modules/erp/materials/
├── types.ts                          # 18行 — Material, MaterialFilters
├── validators.ts                     # 19行 — validateMaterialInput
├── actions.ts                        # 80行 — 5 CRUD (fetch to ERP API)
├── list.tsx                          # 58行 — 基础表格 (8列, 无搜索/排序/分页)
└── index.ts                          # 5行 — 导出

总计: 5 files, ~180 lines (不含路由)
```

**缺失功能**: 搜索框, 分类视图, 排序, 分页, 新建弹窗, 编辑弹窗, 采购入库弹窗, 材料消耗, 库存调整, 导出按钮, 刷新按钮, 成本脱敏

---

## 2. Legacy Material 文件结构

```
apps/erp/app/materials/
├── page.tsx                          # 38行 — SSR 权限检查 + 视图过滤
└── MaterialsClient.tsx               # 1238行 — 完整客户端

apps/erp/app/api/materials/
├── route.ts                          # 146行 — GET/POST
└── [id]/route.ts                     # 80行 — GET/PUT/DELETE

apps/erp/src/modules/raw-material/
├── raw-material.service.ts           # 195行 — purchaseIn, consumeMaterial, adjustInventory, getMaterials, getInventoryTransactions
└── types.ts                          # 24行 — PurchaseRecordInput, ConsumeMaterialInput, AdjustInventoryInput

apps/erp/hooks/
└── useSort.ts                        # 83行 — 通用排序 Hook

apps/erp/components/ui/
└── Modal.tsx                         # 56行 — 通用弹窗组件

总计: 7 files, ~1824 lines
```

---

## 3. 字段映射表

### Platform types.ts vs Legacy RawMaterial interface

| 字段 | Platform `types.ts` | Legacy `RawMaterial` | 差异 |
| --- | --- | --- | --- |
| id | ✅ number | ✅ number | — |
| code | ✅ string | ✅ string | — |
| name | ✅ string | ✅ string | — |
| category | ✅ string | ✅ string | — |
| materialType | ✅ string | ✅ string | Legacy 有 7 个 enum values, Platform 是 string |
| specification | ✅ string? | ✅ string? | — |
| inventoryUnit | ✅ string | ✅ string | — |
| remaining | ✅ number | ✅ number | — |
| unitCost | ✅ number? | ✅ number? | — |
| status | ✅ string | ✅ string | — |
| shape | ✅ string? | ✅ string? | — |
| beadsPerStrand | ✅ number? | ✅ number? | — |
| weightPerStrand | ✅ number? | ✅ number? | — |
| defaultPurchaseUnit | ✅ string? | ✅ string? | — |
| defaultConversionRate | ✅ number? | ✅ number? | — |
| supplier | ✅ string | ✅ string | — |
| remark | ✅ string? | ✅ string? | — |
| createdAt | ✅ string | ✅ Date | Platform 用 string (JSON), Legacy 用 Date |
| updatedAt | ✅ string | ❌ 未定义 | Platform 多一个 |

**结论**: 字段完全对齐。Platform 缺少的是 `PurchaseRecord` 和 `InventoryTransaction` 类型定义。

---

## 4. UI 组件拆分方案

### 目标：将 Legacy 1238行 MaterialsClient 拆分为可维护的组件

```
modules/erp/materials/
├── types.ts                          # 🆕 扩展：+PurchaseRecord, +InventoryTransaction
├── validators.ts                     # ✅ 保持
├── actions.ts                        # 🆕 重写：5 → 10+ actions
├── materials-client.tsx              # 🆕 主容器 (~200行): 状态管理 + 布局
├── material-table.tsx                # 🆕 表格组件 (~200行): 排序 + 分页 + 列配置
├── material-search.tsx               # 🆕 搜索栏 (~30行)
├── material-form.tsx                 # 🆕 新建/编辑表单 (~250行)
├── purchase-form.tsx                 # 🆕 采购入库表单 (~100行)
├── material-detail.tsx               # 🆕 详情页扩展 (~80行)
├── material-actions-bar.tsx          # 🆕 操作栏 (~40行): 导出/刷新/新增
└── index.ts                          # 🆕 导出

hooks/
└── useSort.ts                        # 🆕 从 Legacy 复制 (83行)

components/ui/
└── Modal.tsx                         # 🆕 从 Legacy 复制 (56行) → 放到 packages/ui/components/
```

**总计新增**: 8 files, ~1000 lines

---

## 5. Server Actions / Service / Gateway 落点方案

### 新增加 actions:

| Action | 来源 | 实现 |
| --- | --- | --- |
| `listMaterials(filters)` | Platform 现有 | ✅ 保持 (via MaterialService.list) |
| `getMaterial(id)` | Platform 现有 | ✅ 保持 |
| `createMaterial(data)` | Legacy openEdit | 🆕 扩展：+ initialPurchase 逻辑 |
| `updateMaterial(id, data)` | Legacy saveMaterial | 🆕 扩展：+ updatePurchase 逻辑 |
| `deleteMaterial(id)` | Platform 现有 | ✅ 保持 |
| `purchaseIn(data)` | Legacy service | 🆕 新增 — 移植 purchaseIn() |
| `consumeMaterial(data)` | Legacy service | 🆕 新增 — 移植 consumeMaterial() |
| `adjustInventory(data)` | Legacy service | 🆕 新增 — 移植 adjustInventory() |
| `getInventoryTransactions(filters)` | Legacy service | 🆕 新增 |
| `exportMaterials()` | Legacy handleExport | 🆕 新增 |

### Service 层

```
packages/platform-core/services/erp/materials.service.ts
  ✅ 已有: list, getById, create, update, delete, getInventory, getStock
  🆕 新增: purchaseIn(data), consumeMaterial(data), adjustInventory(data), getTransactions(filters)
```

### Gateway 层

```
packages/platform-core/data-gateway/erp-gateway.ts
  ✅ 已有: materials.list, materials.getById, materials.getInventory, materials.getStock
  🆕 新增: materials.purchaseIn, materials.consume, materials.adjust, materials.getTransactions
```

### 调用链

```
UI Component
  → Server Action (modules/erp/materials/actions.ts)
    → MaterialService (packages/platform-core/services/erp/)
      → Prisma Client (ERP DB)
```

**禁止**: UI 直接调用 Gateway 或 Service（必须通过 Action）。

---

## 6. 权限与成本脱敏方案

### 权限点（已存在）

| Action | Permission |
| --- | --- |
| 查看材料列表 | `material.view` |
| 查看材料详情 | `material.view` |
| 新建材料 | `material.edit` |
| 编辑材料 | `material.edit` |
| 删除材料 | `material.delete` |
| 采购入库 | `material.edit` |
| 库存调整 | `inventory.edit` |
| 材料消耗 | `inventory.edit` |
| 导出 | `export.data` |

### 成本脱敏（从 Legacy 移植）

```typescript
// Legacy: canViewCost(role, perms)
// Platform: PERMISSIONS.COST_VIEW → 检查是否在 userPermissions 中

// 在 Server Action 中:
const showCost = permissions.includes(PERMISSIONS.COST_VIEW) || isAdmin;

// 传递到 Client:
<MaterialsClient materials={data} showCost={showCost} />
```

### 成本显示函数（从 Legacy 移植）

```typescript
// 采购库存: remaining / rate → display in purchaseUnit
function purchaseStock(remaining, purUnit, rate): string
// 核算库存: remaining + invUnit
function inventoryStock(remaining, invUnit): string  
// 采购单价: unitCost × rate
function purchaseUnitPrice(unitCost, rate): string
// 核算单价: unitCost
function inventoryUnitPrice(unitCost): string
```

---

## 7. 搜索、排序、分页方案

### 搜索

```typescript
// Legacy: 客户端过滤 (searchQuery state → filter before render)
// Platform: 保持客户端过滤 (数据量小，不需要服务端搜索)

// material-search.tsx
<input
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  placeholder="搜索编码或名称…"
/>
```

### 排序

```typescript
// 从 Legacy 复制 useSort.ts 到 apps/platform/hooks/useSort.ts
// 使用方式:
const { sorted, sortKey, sortDir, toggleSort } = useSort(materials);

// 表头渲染函数 (从 Legacy 复制 renderSortTh)
function renderSortTh(label, key): JSX.Element
function renderSortThRight(label, key): JSX.Element  // 数字右对齐
function renderSortThCenter(label, key): JSX.Element  // 居中
```

### 分页

```typescript
const PAGE_SIZE = 50;
const [currentPage, setCurrentPage] = useState(1);
const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

// 分页控件
<div className="flex items-center gap-2">
  <button onClick={prevPage} disabled={currentPage === 1}><ChevronLeft /></button>
  <span>{currentPage} / {totalPages}</span>
  <button onClick={nextPage} disabled={currentPage === totalPages}><ChevronRight /></button>
</div>
```

---

## 8. Modal 新建/编辑方案

### 从 Legacy 移植 Modal 组件

```
packages/ui/components/modal.tsx  (从 apps/erp/components/ui/Modal.tsx 移植)
```

### 新建材料弹窗

```
打开: setModalOpen(true), setEditing(null), setForm(emptyMaterialForm())
表单字段: code, name, category, materialType(select), specification,
          inventoryUnit(select), status(select), shape, beadsPerStrand,
          weightPerStrand, defaultPurchaseUnit, defaultConversionRate,
          supplier, remark, initialPurchasePrice, initialPurchaseQuantity
提交: POST /api/materials → createMaterial action
```

### 编辑材料弹窗

```
打开: setModalOpen(true), setEditing(m), setForm(populate from m)
表单字段: 同上（预填）
提交: PUT /api/materials/:id → updateMaterial action
```

### 弹窗组件 Props

```typescript
interface MaterialFormProps {
  open: boolean;
  onClose: () => void;
  editing: RawMaterial | null;
  onSubmit: (data: MaterialFormData) => Promise<void>;
  showCost: boolean;
}
```

---

## 9. 采购入库、库存调整、材料消耗方案

### 采购入库弹窗

```
打开: setPurchaseModalOpen(true), setSelectedMaterial(m)
表单字段: purchaseDate, supplier, purchaseUnit, conversionRate,
          purchaseQuantity, purchaseUnitPrice, purchasePrice, remark
提交: POST /api/purchase-records → purchaseIn action
自动: 加权平均成本计算 + 库存事务(IN) + 材料库存更新
```

### 库存调整 (Ad-Hoc)

```
// 从行内操作触发（详情页或表格内）
// 调用 adjustInventory action
adjustInventory({ materialId, newQuantity, remark })
```

### 材料消耗 (Ad-Hoc)

```
// 从行内操作触发
// 调用 consumeMaterial action
consumeMaterial({ materialId, quantity, relatedDoc, remark })
```

### Service 层实现

```typescript
// packages/platform-core/services/erp/materials.service.ts
export const MaterialService = {
  // ... existing methods
  purchaseIn: async (data: PurchaseRecordInput) => { /* 移植 Legacy 代码 */ },
  consumeMaterial: async (data: ConsumeMaterialInput) => { /* 移植 Legacy 代码 */ },
  adjustInventory: async (data: AdjustInventoryInput) => { /* 移植 Legacy 代码 */ },
  getTransactions: async (filters: {materialId?, type?, startDate?, endDate?}) => { /* 移植 Legacy 代码 */ },
};
```

---

## 10. Excel 导入导出方案

### 导出（优先实现）

```typescript
// Legacy: window.open("/api/export?type=materials", "_blank")
// Platform: Server Action → MaterialService 查询 → CSV 生成

export async function exportMaterials(): Promise<Response> {
  const materials = await MaterialService.list();
  const csv = convertToCsv(materials);  // 或用 npm 包 papaparse
  return new Response(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=materials.csv" }
  });
}
```

### 导入（后续实现）

```typescript
// 使用 Legacy 的 import API (保持 Proxy)
// 或实现 Platform 原生导入 (下一阶段)
```

---

## 11. 每一步修改文件清单

### Step 1: 基础设施 (~30 min)

| # | 操作 | 文件 | 变更 |
| --- | --- | --- | --- |
| 1.1 | 复制 | `apps/platform/hooks/useSort.ts` | 🆕 从 `apps/erp/hooks/useSort.ts` |
| 1.2 | 复制 | `packages/ui/components/modal.tsx` | 🆕 从 `apps/erp/components/ui/Modal.tsx` |
| 1.3 | 扩展 | `modules/erp/materials/types.ts` | +PurchaseRecord, +InventoryTransaction, +MaterialFormData, +PurchaseFormData |
| 1.4 | 扩展 | `packages/platform-core/services/erp/materials.service.ts` | +purchaseIn, +consumeMaterial, +adjustInventory, +getTransactions |

### Step 2: UI 组件 (~2h)

| # | 操作 | 文件 | 变更 |
| --- | --- | --- | --- |
| 2.1 | 新建 | `modules/erp/materials/material-search.tsx` | 🆕 搜索框组件 |
| 2.2 | 新建 | `modules/erp/materials/material-form.tsx` | 🆕 新建/编辑表单 (250行) |
| 2.3 | 新建 | `modules/erp/materials/purchase-form.tsx` | 🆕 采购入库表单 (100行) |
| 2.4 | 新建 | `modules/erp/materials/material-table.tsx` | 🆕 表格 + 排序 + 分页 (200行) |
| 2.5 | 新建 | `modules/erp/materials/material-actions-bar.tsx` | 🆕 操作栏 (40行) |
| 2.6 | 重建 | `modules/erp/materials/materials-client.tsx` | 🆕 主容器 (200行) |
| 2.7 | 更新 | `modules/erp/materials/index.ts` | 导出新组件 |

### Step 3: Actions 扩展 (~1h)

| # | 操作 | 文件 | 变更 |
| --- | --- | --- | --- |
| 3.1 | 重写 | `modules/erp/materials/actions.ts` | +purchaseIn, +consumeMaterial, +adjustInventory, +exportMaterials, +getTransactions |
| 3.2 | 更新 | `packages/platform-core/data-gateway/erp-gateway.ts` | +purchaseIn, +consume, +adjust, +getTransactions |

### Step 4: 路由更新 (~30 min)

| # | 操作 | 文件 | 变更 |
| --- | --- | --- | --- |
| 4.1 | 更新 | `app/(platform)/erp/materials/page.tsx` | 使用新 MaterialsClient |
| 4.2 | 更新 | `app/(platform)/erp/materials/[id]/page.tsx` | 扩展详情页 |

### Step 5: 验证 (~30 min)

| # | 操作 | 命令 |
| --- | --- | --- |
| 5.1 | Build | `pnpm --filter @yunwu/platform-app build` |
| 5.2 | Lint | 手动检查 import 路径 |
| 5.3 | 功能测试 | 启动 dev → 访问 /platform/erp/materials |

---

## 12. 风险点

| # | 风险 | 级别 | 缓解 |
| --- | --- | --- | --- |
| 1 | `@yunwu/platform-core` 包重命名后 import 路径错误 | 🔴 P0 | Step 5 验证所有 import |
| 2 | `useSort` 依赖 `Record<string, any>` 类型 | 🟡 P1 | TypeScript 严格模式兼容 |
| 3 | Modal 组件硬编码颜色 (inline styles) | 🟡 P1 | 后续 Phase 迁移到 Design Tokens |
| 4 | Server Actions 需要 MaterialService → Prisma | 🔴 P0 | 确保 `ERP_USE_SERVICE_LAYER=true` 或 `DATABASE_URL` 可用 |
| 5 | 导入导出 API 路径变更 (`/api/export` → Platform route) | 🟡 P2 | 先复用 Legacy proxy，后续原生化 |
| 6 | 分页逻辑冲突（客户端排序 vs 服务端排序） | 🟢 P3 | 数据量小 (< 1000条)，客户端排序足够 |

---

## 13. 回滚方案

如果 Step 1-5 出现不可修复的阻塞：

```bash
# 1. 回退所有新建文件
git checkout -- apps/platform/hooks/useSort.ts
rm -f apps/platform/modules/erp/materials/material-{search,form,table,actions-bar,client}.tsx
rm -f packages/ui/components/modal.tsx

# 2. 恢复 actions
git checkout -- apps/platform/modules/erp/materials/actions.ts

# 3. 恢复 service
git checkout -- packages/platform-core/services/erp/materials.service.ts

# 4. 验证 build
pnpm --filter @yunwu/platform-app build
```

**回滚后**: Platform 回到当前简易 Materials (180行)，Legacy ERP 保持完整 Materials (1238行)。

---

> **等待审批**: 以上方案确认后，进入 WO-P2B-Execute 阶段逐 Step 实施。每个 Step 完成后验证 build + route。
