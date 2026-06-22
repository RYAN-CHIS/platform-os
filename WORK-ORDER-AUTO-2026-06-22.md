# 🏭 System Diagnosis & Work Order
**Auto-generated**: 2026-06-22 | **Analyzer**: Claude V2 (System Scheduler)

---

## GIT STATE

```
Branch:   N/A (no git init in monorepo)
Last Commit: N/A
Risk:     monorepo 尚未 git init → 无版本控制
```

---

## DIAGNOSIS

### A. Cross-Module Pollution

**CLEAN** ✅

Zero imports between `apps/erp`, `apps/web`, `apps/brand-os`. Module boundaries enforced.

### B. Schema Conflicts

**2 CONFLICTS FOUND** ⚠️

| Model | ERP Schema | Web Schema | Conflict |
|-------|-----------|------------|----------|
| `Order` | 17 fields (orderNo, paymentStatus, channel...) | 5 fields (orderNo, productName, quantity...) | Same table name, different columns |
| `Series` | 5 fields (code, name, sortOrder) | 10 fields (slug, description, coverImage...) | Same table name, different columns |

**Root cause**: Two separate databases. Canonical layer designed (Phase 4) but not applied.

### C. UI/API Consistency

**MISMATCH** ⚠️

| System | Pages | API Groups | Status |
|--------|-------|-----------|--------|
| ERP | 18 | 18 | Aligned ✅ |
| Web | 12 | 6 | Aligned ✅ |
| Brand OS | 17 | 0 (uses Web APIs) | Orphan ⚠️ |

`apps/web/src/app/api/admin/upload` still exists in Web after Brand OS extraction. Should be in Brand OS.

### D. Duplicate Logic

**HIGH DUPLICATION** 🔴

| Concept | ERP Implementation | Web Implementation | Domain Service Available? |
|---------|-------------------|-------------------|--------------------------|
| Product list | `prisma.products.findMany()` | `prisma.product.findMany()` | ✅ ProductService.list() |
| Series list | `prisma.series.findMany()` | `prisma.series.findMany()` | ✅ SeriesService.list() |
| Order create | `prisma.order.create()` | `prisma.order.create()` | ❌ |
| Material list | `prisma.materials.findMany()` | `prisma.material.findMany()` | ✅ MaterialService.list() |

**4 duplicated concepts × 0 Domain Service usages. Package layer designed but unused.**

### E. Package Adoption Rate

**CRITICAL GAP** 🔴

| Package | Designed | Files Using | Adoption |
|---------|----------|-------------|----------|
| `@yunwu/db` | ✅ | 3 (only prisma.ts) | 3% |
| `@yunwu/auth` | ✅ | 0 | 0% |
| Domain Services | ✅ | 0 | 0% |
| Data Fabric | ✅ | 0 | 0% |
| Canonical Core | ✅ | 0 | 0% |

**53 API files still use direct `prisma.model.*` calls. Zero files use Domain Services.**

---

## RISK ANALYSIS

| # | Risk | Severity | Impact |
|---|------|----------|--------|
| R1 | No git in monorepo | P0 | 代码无版本控制，无法回滚 |
| R2 | 53 API files bypass domain layer | P1 | 数据访问不可控，权限无法落地 |
| R3 | Brand OS has no API routes | P1 | 管理后台无后端支撑 |
| R4 | Duplicate product/series/order logic | P2 | 维护成本翻倍 |
| R5 | Schema name conflict (Order, Series) | P2 | Phase 4.5 物理合库时必冲突 |

---

## ARCHITECTURE HEALTH: YELLOW

```
设计层: ████████████████████ 100% (Phase 2→4 完整)
运行层: ████░░░░░░░░░░░░░░░░  18% (packages 存在但未使用)
```

**问题不是缺少设计，而是运行代码未接入设计层。**

---

## WORK ORDER (可直接执行)

### WO-1: Git Init [P0 — 立即]

```bash
cd ~/Workbuddy/yunwu
git init
git add -A
git commit -m "yunwu monorepo: Phase 1-4 architecture + app migration"
```

### WO-2: API Gateway 接入 [P1 — 本周]

目标：将所有 API route 接入 `@yunwu/db` 的 Domain Services。

**范围**：53 个直接 prisma 调用的 API 文件。

**第一步 — ERP 接入（最高优先级）**：
```
apps/erp/app/api/products/route.ts
  → import { ProductService } from "@yunwu/db/domain"
  → const svc = new ProductService(prisma)
  → svc.list() 替代 prisma.products.findMany()

apps/erp/app/api/series/route.ts
  → import { SeriesService } from "@yunwu/db/domain"

apps/erp/app/api/materials/route.ts
  → import { MaterialService } from "@yunwu/db/domain"
```

**执行**：每个 API route 改动 3-5 行（导入 + 替换调用），2 小时可完成全部 ERP API。

### WO-3: Brand OS API 独立化 [P1 — 本周]

```
apps/web/src/app/api/admin/upload → apps/brand-os/src/app/api/
```

Brand OS 需要自己的 API routes。从 Web 中迁移 `admin/` 相关 API。

### WO-4: Auth 接入 [P2 — 下周]

```
apps/erp/middleware.ts → import { requirePlatformUser } from "@yunwu/auth"
apps/web/src/middleware.ts → import { getPlatformUser } from "@yunwu/auth"
apps/brand-os/src/middleware.ts → import { requirePlatformUser } from "@yunwu/auth"
```

### WO-5: Physical DB Merge Readiness Check [P2 — 下下周]

```
Phase 4.5 prep:
- Verify CONVERGENCE-MAP.md field coverage
- Audit Order/Series name conflicts
- Plan migration script
```

---

## SUMMARY

```
✅ Module isolation enforced
✅ Package design complete (20 TS files across 6 packages)
⚠️  Schema conflicts: Order, Series (2)
🔴 Adoption gap: 0% Domain Service usage
🔴 No git tracking
🔴 Brand OS has no API backend

Next action: git init → API Gateway adoption (ERP first)
```
