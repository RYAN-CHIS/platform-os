# PHASE 2.99 CONTROL PLANE REPORT

**执行日期**: 2026-06-22
**状态**: ✅ COMPLETE

---

## SYSTEM BOUNDARIES

```
packages/db/control/
├── system.ts       # 系统能力矩阵
├── permission.ts   # 角色定义 + 访问上下文
├── access.ts       # 核心引擎: canAccess / canRead / canWrite / guard
├── domain-guard.ts # Domain Service 包装层
└── index.ts        # Barrel exports
```

### 系统能力矩阵

| Model | ERP read | ERP write | Web read | Web write | Brand read | Brand write |
|-------|----------|-----------|----------|-----------|------------|-------------|
| product | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| material | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| order | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| customer | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| inventory | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| production | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| bom | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| journal | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| seo | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| contact | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| media | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| banner | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| user | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| permission | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## ACCESS RULES

### 读规则
- **ERP**: product, material, order, customer, media, inventory, production, bom, sku, work, cost, journal, user, audit
- **Web**: product, material, media, journal, seo, page, tag, banner
- **Brand**: product, material, media, journal, seo, page, tag, banner, contact, audit

### 写规则
- **ERP**: product, material, order, customer, media, inventory, production, bom, sku, work, cost
- **Web**: contact (表单提交)
- **Brand**: product, material, media, journal, seo, page, tag, banner

### 角色层级
```
SUPER_ADMIN  → erp+web+brand  (read/write/delete/admin)
ERP_ADMIN    → erp            (read/write/delete/admin)
BRAND_ADMIN  → brand+web      (read/write/admin)
WEB_ADMIN    → web            (read/write/admin)
EDITOR       → web+brand      (read/write)
VIEWER       → web            (read)
```

## DOMAIN HOOKS

| Service | 受控方法 | 包装函数 |
|---------|----------|----------|
| ProductService | list, getById, getBySlug | withReadCheck(user, "product") |
| ProductService | create, update, delete | withWriteCheck(user, "product") |
| SeriesService | list, getById, getBySlug | withReadCheck(user, "series") |
| MaterialService | list, getById | withReadCheck(user, "material") |

### 使用示例
```ts
import { ProductService } from "@yunwu/db/domain";
import { guardProductService, ANONYMOUS_CONTEXT } from "@yunwu/db/control";

const service = new ProductService(prisma);

// 公共页面：只读
const public = guardProductService(service, {
  ...ANONYMOUS_CONTEXT, system: "web"
});
const { items } = await public.list(); // ✅ withReadCheck

// ERP 后台：读写
const admin = guardProductService(service, {
  userId: 1, role: "ERP_ADMIN", system: "erp"
});
await admin.create({ name: "新品" }); // ✅ withWriteCheck
```

## RISK

| 风险 | 等级 | 说明 |
|------|------|------|
| remaining ambiguity | P3 | 细粒度权限码待 Phase 3 完整 RBAC |
| guard 未强制使用 | P2 | 需在 API 层逐步接入 |
| WEB write contact | P3 | 需额外限流/验证（API 层） |

---

## BUILD VERIFICATION

| App | Build | Control Import |
|-----|-------|----------------|
| ERP | ✓ | `import { guard } from "@yunwu/db/control"` |
| Web | ✓ | ✓ |
| Brand OS | ✓ | ✓ |

---

## SUCCESS CRITERIA

| 标准 | 状态 |
|------|------|
| 系统访问有规则层 | ✅ SYSTEM_CAPABILITIES |
| Domain layer 受控 | ✅ guardProductService 等 |
| 三系统权限边界清晰 | ✅ 14-model 矩阵 |
| DB 不动 | ✅ 零 schema 变更 |
| 架构开始"可治理化" | ✅ control plane 就绪 |
