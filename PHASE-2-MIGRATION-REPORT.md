# PHASE 2 MIGRATION REPORT

**执行日期**: 2026-06-22
**迁移范围**: yunwu-erp → apps/erp, yunwu-origin → apps/web

---

## STATUS

| App | 状态 | 端口 | Build | Dev | 说明 |
|-----|------|------|-------|-----|------|
| **ERP** | ✅ RUNNING | 3001 | ✓ | ✓ | Next.js 16.2.9 (Turbopack) |
| **Web** | ✅ RUNNING | 3002 | ✓ | ✓ | Next.js 15.5.19 (独立站 + Admin) |
| **Brand OS** | ⚠️ EMBEDDED | — | — | — | 目前嵌入 apps/web/src/app/admin/ |

---

## ISSUES

### Import Errors
无。所有模块解析正常。

### Build Errors
无阻塞性错误。ERP 有一个已知 type warning（`next-auth` JWT 类型扩展），不影响运行。

### Runtime Errors
无。两个系统独立启动并响应 HTTP 200。

### TypeScript
- ERP: 1 type warning (pre-existing, `PrismaClient.user` 类型扩展)
- Web: 零错误

---

## DEPENDENCIES

### Broken Links
无。无跨 app 引用。

### Missing Modules
无。

### Cross-App Coupling
**无跨系统耦合。** 验证通过 grep 无跨 app import。

---

## DB

### Migration Status

| 层 | 状态 | Models | 位置 |
|----|------|--------|------|
| apps/erp | 独立运行 | 24 | `apps/erp/prisma/schema.prisma` |
| apps/web | 独立运行 | 16 | `apps/web/prisma/schema.prisma` |
| packages/db | 统一目标 | 37 | `packages/db/schema.prisma` (设计态) |

**注意**：当前每个 app 仍使用各自的 Prisma schema（兼容模式）。两套生产数据库未受影响。统一 Schema 在 packages/db 中已就绪，待后续迁移。

---

## VERIFIED

- [x] ERP 独立启动
- [x] Web 独立启动
- [x] 不依赖其他 app runtime
- [x] 无 module not found
- [x] 无跨系统 import
- [x] 生产数据库未受影响
- [x] 无 Prisma reset / drop
- [x] 所有功能保留（无删除）

---

## BRAND OS 说明

apps/brand-os 目录已创建但为空。Brand OS 管理功能当前存在于 apps/web/src/app/admin/（原 yunwu-origin 后台）。

原因：yunwu-origin 是前后台一体化应用（`(site)` + `admin`），拆分需要重构架构，违反 Phase 2 的"不允许重构架构"原则。拆分将在后续 Phase 中执行。

---

## 下一步（需审批）

| 优先级 | 任务 | 风险 |
|--------|------|------|
| P1 | 将统一 Schema (packages/db) 作为 apps 的实际 Prisma 数据源 | P0（影响数据库） |
| P2 | 拆分 apps/web 中的 admin 到 apps/brand-os | P1（架构变更） |
| P2 | 安装 @yunwu/auth 替换各 app 的独立 auth | P1（影响认证） |
| P3 | Vercel 项目指向新的 monorepo apps/ | P1（影响部署） |
