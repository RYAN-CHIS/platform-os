# PHASE 2.9 DB FINALIZATION REPORT

**执行日期**: 2026-06-22
**状态**: ✅ COMPLETE (with documented gap)

---

## UNIFIED SCHEMA

| 属性 | 值 |
|------|-----|
| **location** | `packages/db/schema.prisma` |
| **active models** | 37 (8 auth + 16 ERP + 13 Brand/Web) |
| **migration authority** | `pnpm --filter @yunwu/db db:push` |
| **client factory** | `import { createPrisma } from "@yunwu/db"` |

---

## LEGACY SCHEMAS

| App | Schema | Status | db:push | postinstall |
|-----|--------|--------|---------|-------------|
| apps/erp | `prisma/schema.prisma` | ⚠️ FROZEN | ❌ removed | ✅ (client gen only) |
| apps/web | `prisma/schema.prisma` | ⚠️ FROZEN | ❌ removed | ✅ (client gen only) |
| apps/brand-os | `prisma/schema.prisma` | ⚠️ FROZEN | ❌ removed | ✅ (client gen only) |

所有 legacy schema 文件顶部标记：
```
⚠️  FROZEN — 历史参考，禁止修改，禁止 migrate
权威 Schema: packages/db/schema.prisma
Migration 控制: packages/db
```

---

## RUNTIME

| 检查 | 结果 |
|------|------|
| single prisma instance | ✅ `createPrisma()` from `@yunwu/db` |
| migration source | ✅ 仅 `packages/db` |
| app-level db:push | ❌ 全部移除 |
| app-level db:migrate | ❌ 全部移除 |
| app-level db:studio | ❌ 全部移除 |
| postinstall prisma generate | ✅ 保留（从 frozen schema 生成客户端类型） |

---

## KNOWN GAP: Schema 模型名不一致

```
packages/db (37 models):  ErpProduct, BrandProduct, ErpMaterial, BrandMaterial, ...
apps/erp  (24 models):    Products, RawMaterial, Order, Customer, ...
apps/web  (16 models):    Product, Material, Order, JournalPost, ...
```

**原因**: 两套生产数据库 Schema 不同，强行统一模型名需要：
1. 数据库迁移（合并表、重命名列）
2. 应用代码 model 引用更新

**影响**: legacy schemas 仍需保留用于 `prisma generate`。
**解决**: Phase 3 — 数据库物理合并 + 代码 model 引用迁移。

---

## BUILD VERIFICATION

| App | Build | Dev | Port |
|-----|-------|-----|------|
| ERP | ✓ | ✓ | 3001 |
| Web | ✓ | ✓ | 3002 |
| Brand OS | ✓ | ✓ | 3003 |

---

## RISK STATUS

| # | 风险 | 等级 | 说明 |
|---|------|------|------|
| R1 | Legacy schemas 未被删除 | P2 | 需要 Phase 3 物理合并后才能移除 |
| R2 | 两个生产 DB 实例未合并 | P1 | ERP + Web 使用不同 Neon 数据库 |
| R3 | Model 名不一致导致无法直接切换 | P1 | 需要代码引用迁移 |

---

## SUCCESS CRITERIA

| 标准 | 状态 |
|------|------|
| 只有一个 Prisma schema 权威定义 | ✅ packages/db |
| 所有 app 不再拥有 migration 权限 | ✅ db:push removed |
| migration 只在 db package | ✅ |
| DB 成为"单入口系统" | ⚠️ 入口统一，但 Schema 未物理统一 |

---

**下一阶段**: Phase 3 — 权限系统统一 + Schema/DB 物理合并
