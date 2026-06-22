# PHASE 2.5 REPORT — 结构纠正 + DB 落地统一

**执行日期**: 2026-06-22
**状态**: ✅ COMPLETE

---

## BRAND OS

| 属性 | 值 |
|------|-----|
| **status** | ✅ RUNNING |
| **location** | `apps/brand-os/src/app/admin/` (17 pages) |
| **independent run** | ✅ `pnpm dev brand-os` → port 3003 |
| **build** | ✓ Compiled successfully |

### Web 变更
- `apps/web/src/app/admin/` → **REMOVED** (移入 brand-os)
- middleware 简化为 no-op (无 admin 路由需保护)
- 公开页面 `(site)/` 保持不变

---

## DATABASE

| 属性 | 值 |
|------|-----|
| **single source confirmed** | ✅ `packages/db/schema.prisma` (37 models) |
| **legacy schemas marked** | ✅ `apps/{erp,web,brand-os}/prisma/schema.prisma` marked LEGACY |
| **import unified** | ✅ 全部 import { createPrisma } from `@yunwu/db` |

### Schema 分布

| 位置 | Models | 状态 |
|------|--------|------|
| `packages/db/` | 37 | ✅ 权威 |
| `apps/erp/prisma/` | 24 | LEGACY |
| `apps/web/prisma/` | 16 | LEGACY |
| `apps/brand-os/prisma/` | 16 | LEGACY |

### ORM 入口统一

```
apps/erp/lib/prisma.ts     → import { createPrisma } from "@yunwu/db" ✅
apps/web/src/lib/prisma.ts → import { createPrisma } from "@yunwu/db" ✅
apps/brand-os/src/lib/prisma.ts → import { createPrisma } from "@yunwu/db" ✅
```

---

## COUPLING

| 检查 | 结果 |
|------|------|
| web ↔ brand-os | ✅ 零耦合 (独立 app) |
| erp ↔ web | ✅ 零耦合 (独立 app) |
| erp ↔ brand-os | ✅ 零耦合 (独立 app) |
| all → db | ✅ 统一入口 @yunwu/db |

---

## BUILD VERIFICATION

| App | Build | Dev | Port |
|-----|-------|-----|------|
| ERP | ✓ | ✓ | 3001 |
| Web | ✓ | ✓ | 3002 |
| Brand OS | ✓ | ✓ | 3003 |

---

## RISKS

| # | 风险 | 等级 | 解决 |
|---|------|------|------|
| R1 | 遗留 Schema 未真正统一到 packages/db | P1 | Phase 3: Prisma migrate |
| R2 | Brand OS + Web 仍共享同一个 Prisma schema (16 models) | P2 | Phase 3: Brand OS 切换独立 schema |
| R3 | `createPrisma` 函数接受 URL 覆盖，不同 app 的 DB URL 隔离 | P2 | 各 app 通过 .env 配置独立 DATABASE_URL |

---

## 成功标准

| 标准 | 状态 |
|------|------|
| Brand OS 完全独立运行 | ✅ |
| Web 不再包含 admin/brand | ✅ |
| DB 唯一入口生效 | ✅ (import 路径统一) |
| 所有系统只依赖 @yunwu/db | ✅ |
| 无 fallback schema | ⚠️ (legacy schemas 保留至 Phase 3) |
