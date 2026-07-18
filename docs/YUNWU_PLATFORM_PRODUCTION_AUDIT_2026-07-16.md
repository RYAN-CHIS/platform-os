# Yunwu Platform 生产数据治理与内容缺失全链路审计报告

> **审计日期**: 2026-07-16
> **审计方式**: 只读审计（代码审查 + Vercel API + 生产端点验证 + 日志分析）
> **审计人**: Claude Code (Read-Only Audit Mode)
> **生产域**: https://platform.yunwuorigin.com (Platform OS) / https://www.yunwuorigin.com (Storefront)

---

## 一、审计结论

**主要故障层级：F（Vercel 运行环境）+ D（应用查询与服务层构建失败）+ A（Schema 与 Client 生成脱节）**

**严重程度：P0（系统性故障）**

**一句话结论**：Platform OS **生产部署全面失效**（16 次连续构建失败），最新构建无法部署任何代码变更；Storefront（yunwu-origin）**数据库不可达**，所有依赖数据库的页面均返回 `PrismaClientInitializationError`，首页和品牌志直接 500 崩溃。两个生产项目均处于不可用或部分不可用状态，影响全部用户和运营。

---

## 二、生产基线

| 项目 | 值 |
|------|-----|
| **WORKDIR** | `/Users/ryan/Projects/active/platform-os` |
| **当前分支** | `main` (clean, up-to-date with origin/main) |
| **本地 HEAD** | `7cbcffd73f9acd25b61acfdb9279d5a49dd5eecc` |
| **origin/main** | `7cbcffd73f9acd25b61acfdb9279d5a49dd5eecc` ✅ 一致 |
| **Platform OS 最后成功 Build** | `4b15b89cd50e` — `refactor(brand-os): decommission legacy prisma client infrastructure` |
| **Platform OS 生产 Deployment commit** | `7cbcffd73f9acd25b61acfdb9279d5a49dd5eecc` (STATE: ERROR — 构建失败) |
| **Platform OS 生产域** | `https://platform.yunwuorigin.com` → Vercel Project `platform-os` |
| **Platform OS Vercel 项目 ID** | `prj_KyNN2wqLPlMfHsq0hYXU3Q6mP0EH` |
| **Storefront 生产域** | `https://www.yunwuorigin.com` → Vercel Project `yunwu-origin` |
| **Storefront 生产 SHA** | `bf8fe90aec227690bcd4c0b4e2834fceece57f4a` (STATE: READY — 但数据库不可达) |
| **Storefront Vercel 项目 ID** | `prj_hFRsSAfVhPovgGECvrkjOTPQBshM` |
| **数据库连接** | Brand DB (sg, `ep-morning-sun-*.neon.tech`) + ERP DB (us-east-2, `ep-polished-unit-*.neon.tech`) |

> 🔐 密钥状态：本地 `.env.local` 仍包含已吊销的 `neondb_owner` 凭证，生产 Vercel 环境变量已使用 `brand_app`/`erp_app` 角色密码。Storefront 生产环境 `DATABASE_URL` 为 Vercel 加密状态，无法校验其实际值，但运行时无法连接到数据库。

---

## 三、症状清单

| 模块 | 页面/API | 症状 | HTTP 状态 | 错误信息 | 影响范围 |
|------|----------|------|-----------|----------|----------|
| **Storefront 首页** | `/` | 页面完全崩溃，显示 Next.js 错误页 | **500** | `PrismaClientInitializationError: Can't reach database server at ep-morning-sun-...neon.tech:5432` (digest: 3326218210) | 全部访客 |
| **Storefront 品牌志** | `/journal` | 页面完全崩溃 | **500** | `PrismaClientInitializationError` (digest: 1427363049) | 全部访客 |
| **Storefront 器物** | `/products` | 页面返回 200 但数据库查询失败，无数据展示 | **200** (空数据) | `PrismaClientInitializationError` (digest: 3889712984) — 错误被 catch | 全部访客 |
| **Storefront 材料** | `/materials` | 页面返回 200 但无数据 | **200** (空数据) | `PrismaClientInitializationError` (digest: 370225559) — 错误被 catch | 全部访客 |
| **Storefront 七序** | `/series` | 页面返回 200 但无数据 | **200** (空数据) | 日志显示 info 级别 — 可能是静态缓存 | 全部访客 |
| **Platform OS 任何页面** | `/`, `/brand/*`, `/erp/*` | 正常使用旧构建，**无法部署新代码** | **200** (旧构建) | 生产部署 16 次连续 ERROR，无法更新任何变更 | 全部运营人员 |
| **Platform OS 构建** | Vercel Build | **构建失败** | — | `Module not found: Can't resolve '@prisma/brand-client'` (Turbopack 2 errors) | 全部部署流程 |
| **Platform OS 构建** | Vercel Build | 构建命令 `pnpm db:generate` 未生成 `@prisma/brand-client` | — | 构建脚本只运行 `pnpm --filter @yunwu/db generate`，缺少 `@yunwu/brand-db` | 全部部署流程 |

---

## 四、根因清单

### 根因 1（P0）：Platform OS 构建缺少 @prisma/brand-client 生成

| 字段 | 值 |
|------|-----|
| **根因编号** | RC-001 |
| **所属层级** | A (Schema/Client) + F (Vercel/构建) |
| **证据** | Vercel 构建日志：`Error: Turbopack build failed with 2 errors` → `Module not found: Can't resolve '@prisma/brand-client'`。`packages/brand-db/index.ts` 第 1 行和第 29 行从 `@prisma/brand-client` 导入。根 `pnpm db:generate` 只运行 `pnpm --filter @yunwu/db generate`，未包含 `pnpm --filter @yunwu/brand-db generate`。16 次连续构建失败均源于此。 |
| **受影响文件** | `packages/brand-db/index.ts`, `package.json` (`db:generate` 脚本), `packages/brand-db/schema.prisma` (output: `./node_modules/@prisma/brand-client`) |
| **受影响数据表** | 无（构建阶段，不涉及数据库） |
| **受影响页面** | Platform OS 所有页面（无法部署新代码） |
| **是否造成数据丢失** | 否 |
| **是否需要数据库修复** | 否 |
| **是否需要代码修复** | 是（构建脚本或生成策略） |
| **优先级** | **P0** |

### 根因 2（P0）：Storefront 生产数据库不可达

| 字段 | 值 |
|------|-----|
| **根因编号** | RC-002 |
| **所属层级** | F (Vercel/运行环境) |
| **证据** | Vercel Runtime Logs 明确显示每个请求都报 `PrismaClientInitializationError: Can't reach database server at ep-morning-sun-aoo4dk3t-pooler.c-2.ap-southeast-1.aws.neon.tech:5432`。自 10:04 UTC 起所有页面连续报错。首页 (`/`) 和品牌志 (`/journal`) 直接 500 崩溃；器物 (`/products`)、材料 (`/materials`) 由于错误被 catch 返回 200 空页面。DNS 解析正常，本地网络可连通服务器但凭据已吊销。 |
| **受影响文件** | 无（运行环境问题） |
| **受影响数据表** | 所有 Brand DB 表（`products`, `series`, `journal_posts`, `materials`, `banners`, `seo_configs`, `site_settings` 等） |
| **受影响页面** | Storefront 所有页面（`/`, `/products`, `/journal`, `/series`, `/materials`, `/about`, `/contact`） |
| **是否造成数据丢失** | 否（数据库本身应有数据） |
| **是否需要数据库修复** | 可能需要（检查 Neon 实例是否暂停） |
| **是否需要代码修复** | 可能不需要（如仅需恢复数据库连接） |
| **优先级** | **P0** |

### 根因 3（P1）：本地开发环境仍使用已吊销的 neondb_owner 凭据

| 字段 | 值 |
|------|-----|
| **根因编号** | RC-003 |
| **所属层级** | F (环境变量) |
| **证据** | `apps/platform/.env.local` 中的 `DATABASE_URL`、`DIRECT_DATABASE_URL`、`BRAND_DATABASE_URL` 仍使用 `neondb_owner:npg_*` 格式。连接测试确认 `password authentication failed`。基线文档 14.1 节记录这些凭据已在 2026-07-11 P0 事件中吊销。 |
| **受影响文件** | `apps/platform/.env.local` |
| **受影响数据表** | 无（凭据已吊销，无法连接） |
| **受影响页面** | 本地开发环境所有依赖数据库的页面 |
| **是否造成数据丢失** | 否 |
| **是否需要数据库修复** | 否 |
| **是否需要代码修复** | 是（更新本地 .env 中的数据库 URL） |
| **优先级** | **P1** |

### 根因 4（P1）：Storefront 构建含 `prisma db push --accept-data-loss` 对生产库存在风险

| 字段 | 值 |
|------|-----|
| **根因编号** | RC-004 |
| **所属层级** | A (Schema) + F (构建) |
| **证据** | 基线文档 8.2 节：yunwu-origin 构建命令为 `npx prisma generate && npx prisma db push --accept-data-loss && next build`。每次部署执行 `db push` 可能修改生产库结构。当前 Storefront 数据库连接已不可用，但修复后 deploy 时会再次执行 `db push`。 |
| **受影响文件** | yunwu-origin 构建配置（Vercel build command） |
| **受影响数据表** | 所有共享的 Brand DB 表 |
| **是否造成数据丢失** | 潜在可能（`--accept-data-loss` 标志） |
| **是否需要数据库修复** | 否 |
| **是否需要代码修复** | 是（移除 `db push` 或改为只在 staging 执行） |
| **优先级** | **P1** |

---

## 五、数据完整性报告

> ⚠️ **无法直接读取生产数据库**：所有数据库凭据（包括 revoked 的 neondb_owner 和 Vercel 加密凭据）均无法用于读查询。以下数据基于最后一次成功构建可读的数据结构分析和 Vercel 日志推断。

| 检查项 | 状态 | 说明 |
|-------|------|------|
| **Brand DB (Singapore) 核心表记录数** | ❌ 无法查询 | 数据库不可达，无法执行 `SELECT count(*)` |
| **ERP DB (US-East) 核心表记录数** | ❌ 无法查询 | 凭据已吊销，无法连接 |
| **产品表 `products` 记录数** | ❌ 未知 | Platform OS 旧构建的 Brand 页面可能显示数据，但无法验证最新状态 |
| **记录异常下降** | ❌ 无法确认 | Storefront 无法连接数据库，但暂不意味着数据丢失 |
| **外键关系断裂** | ❌ 无法确认 | 需要数据库查询验证 `series_id`、`erp_product_id` 等字段的引用完整性 |
| **重复记录** | ❌ 无法确认 | 需要数据库查询 |
| **Draft / Review / Approved / Published 状态分布** | ❌ 无法确认 | 需要数据库查询 |
| **已发布产品缺少封面的数量** | ❌ 无法确认 | 需要数据库查询 |

> **补救建议**：修复数据库连接后，立即执行只读 SQL 全面扫描 `products`、`series`、`materials`、`journal_posts`、`banners` 表的记录数、null 关键字段数、孤儿记录数和状态分布。

---

## 六、Schema 差异报告

### Brand DB Schema 对比（yunwu-origin storefront vs packages/brand-db）

两个 Prisma schema 映射到 **同一 Brand DB 实例（Singapore）** 但使用不同的 Prisma 客户端和字段命名约定。

| Prisma 模型/字段 | 生产数据库实际结构 | 差异 | 影响 | 建议处理方式 |
|-------------------|-------------------|------|------|-------------|
| `products` 表字段名 | 数据库列：`series_id`, `object_category`, `erp_product_id`, `publish_status` 等 | Storefront schema 用 `seriesId` + `@map` 形式 vs brand-db 部分用 `seriesId` + `@map` 一致 | 两者都映射到正确的列，代码层面兼容 | 无需修复（命名风格差异在 Prisma 层已处理） |
| `products.remaining_qty` | 数据库列：`remaining_qty` (nullable) | 两者都使用 `remainingQty Int? @map("remaining_qty")` | ✅ 一致 | 无需操作 |
| `series.status` | 数据库列：`status` (VarChar, nullable) | Brand-db: `status String? @default("DRAFT")`、ERP: `status String?` | 类型一致 | 无需操作 |
| `journal_posts` category enum | 数据库：`JournalCategory` enum | 两边 enum 值一致（`OBJECT, MATERIAL, CRAFT, DONGHAI, CREATION, PHILOSOPHY`） | ✅ 一致 | 无需操作 |
| `banners` 新增列 | 手动 SQL 迁移添加了 `published_at`, `subtitle`, `btn_text`, `mobile_image_url` | 所有 schema 均已包含这 4 列 | ✅ 一致 | 无需操作 |
| Storefront `Material` vs Brand-db `LegacyBrandMaterial` | 同一 `materials` 表 | Storefront 的 Material 只有 12 字段（缺少 `slug`, `category`, `type`, `short_desc`, `sort_order`, `cover_image`, `detail_images`, `seo_*`, `erp_material_id` 等） | **P1**: Storefront 材料页可能缺少品牌端新增的字段，显示不完整 | 同步 storefront schema |
| Storefront `admin_users` | 数据库表 `admin_users` | 两者都存在但映射方式不同 | ✅ 兼容 | 无需操作 |
| ERP Schema 中的 `BrandProduct` vs Brand-db `LegacyBrandProduct` | 不同数据库（US-East vs Singapore） | 完全不同的数据库实例和项目，关系不大 | 无影响 | 无需操作 |

### Platform OS ERP Schema vs Brand DB Schema

| 差异点 | 说明 |
|--------|------|
| `packages/db/schema.prisma` (ERP) 含 41 模型 | 包含 ERP 核心表 + Brand 遗留模型（`BrandSeries`, `BrandProduct`, `BrandMaterial` 等） |
| `packages/brand-db/schema.prisma` (Brand) 含 22 模型 | 规范 Brand 运行时模型，output 到 `@prisma/brand-client` |
| 两者在多个模型上有重叠但用途不同 | ERP schema 中的 `BrandProduct` 映射到 ERP 数据库 US-East，Brand-db 中的 `LegacyBrandProduct` 映射到 Brand 数据库 Singapore — 这是两个独立的数据库 |
| **核心问题** | Brand OS 已迁移到 `@yunwu/brand-db`，但构建脚本未生成对应的 client |

---

## 七、修复分组

### P0：系统性故障（必须立即修复）

| # | 问题 | 所属层级 | 影响 |
|---|------|---------|------|
| P0-1 | Platform OS 构建缺少 `@prisma/brand-client` 生成 | A+F | 16 次部署失败，无法部署任何代码变更 |
| P0-2 | Storefront 生产数据库不可达 | F | 所有页面数据缺失/崩溃 |

### P1：严重功能影响

| # | 问题 | 所属层级 | 影响 |
|---|------|---------|------|
| P1-1 | 本地开发环境使用已吊销凭据 | F | 本地无法连接数据库开发和调试 |
| P1-2 | Storefront 构建含 `prisma db push --accept-data-loss` | A+F | 每次部署可能修改生产库结构 |
| P1-3 | 生产数据库凭据一致性未知 | F | Vercel 中 Storefront `DATABASE_URL` 具体值无法确认 |
| P1-4 | Storefront `Material` 模型字段不足 | A | 材料页展示可能不完整 |

### P2：预防性改进

| # | 问题 | 所属层级 | 影响 |
|---|------|---------|------|
| P2-1 | 缺失数据完整性基线扫描 | B | 无法确认生产数据完整性 |
| P2-2 | Storefront 不使用 `brand_app` 应用角色 | F | 过度授权（`neondb_owner`）风险 |
| P2-3 | 双重 Prisma 客户端策略增加维护复杂度 | A | 构建流程脆弱性 |

---

## 八、最小修复计划

### 修复 1（P0-1）：修复 Platform OS 构建

| 字段 | 值 |
|------|-----|
| **修改对象** | `package.json` 的 `db:generate` 脚本 |
| **代码修复** | 将 `pnpm db:generate` 从 `pnpm --filter @yunwu/db generate` 改为 `pnpm --filter @yunwu/db generate && pnpm --filter @yunwu/brand-db generate` |
| **是否需要 migration** | 否 |
| **是否需要备份** | 否（纯构建脚本变更） |
| **是否需要停机** | 否 |
| **验证方式** | 本地执行 `pnpm db:generate` 确认两个 Prisma client 均生成；Vercel Preview 部署验证构建通过 |
| **回滚方式** | `git revert`；或保留旧部署（当前旧构建仍在运行） |
| **推荐执行者** | Claude Code |

### 修复 2（P0-2）：恢复 Storefront 数据库连接

| 字段 | 值 |
|------|-----|
| **修改对象** | Storefront Vercel 项目环境变量 `DATABASE_URL` |
| **修复方式** | 检查 Neon 控制台确认数据库状态（是否暂停）、确认生产 DATABASE_URL 凭据正确、Vercel 重新部署触发 `bf8fe90` 构建 |
| **是否需要 migration** | 否 |
| **是否需要备份** | 否 |
| **是否需要停机** | 已停机 |
| **验证方式** | 部署后访问 `https://www.yunwuorigin.com` 确认首页正常展示 |
| **回滚方式** | Vercel Rollback |
| **推荐执行者** | WorkBuddy（Neon + Vercel 操作） |

### 修复 3（P1-1）：更新本地环境变量

| 字段 | 值 |
|------|-----|
| **修改对象** | `apps/platform/.env.local` 和 `yunwu-origin/.env` |
| **代码修复** | 用 Vercel 中可用的 `brand_app`/`erp_app` 连接字符串替换已吊销的 `neondb_owner` 凭据 |
| **是否需要 migration** | 否 |
| **是否需要备份** | 否（备份当前 .env.local） |
| **是否需要停机** | 否 |
| **验证方式** | `psql` 测试连接或 `pnpm dev` 验证 |
| **回滚方式** | 恢复 `.env.local.bak` |
| **推荐执行者** | Codex（获取 Vercel env 值并更新本地文件） |

### 修复 4（P1-2）：移除 Storefront 构建中的 `prisma db push`

| 字段 | 值 |
|------|-----|
| **修改对象** | Yunwu-origin Vercel 构建命令 |
| **代码修复** | 将构建命令从 `npx prisma generate && npx prisma db push --accept-data-loss && next build` 改为 `npx prisma generate && next build`；或者使用 read-only role 的 DATABASE_URL 并改为 `prisma db push --dry-run` |
| **是否需要 migration** | 否 |
| **是否需要备份** | 否 |
| **是否需要停机** | 否 |
| **验证方式** | Vercel Preview 部署验证 |
| **回滚方式** | 修改回原有构建命令 |
| **推荐执行者** | Claude Code |

---

## 九、禁止事项

本次修复中严禁以下操作：

1. **❌ 禁止执行 `prisma db push`** 到生产数据库（包括 platform-os 和 storefront）
2. **❌ 禁止执行 `prisma migrate deploy`** 到生产数据库
3. **❌ 禁止先修改 production 再补 migration** — 必须有回滚方案
4. **❌ 禁止重跑全量 seed** — 可能覆盖已有产品数据
5. **❌ 禁止覆盖已有产品数据** — 不允许 UPDATE/DELETE 无 WHERE 条件的操作
6. **❌ 禁止用空数据 fallback 掩盖问题** — 必须真实修复而不是给空数组
7. **❌ 禁止直接修改 Vercel 生产环境变量** 而不在本地记录变更
8. **❌ 禁止假设数据库字段或数据已经正确** — 必须通过只读 SQL 核查
9. **❌ 禁止 checkout、merge、reset 或修改 Git 分支** — 只读审计模式
10. **❌ 禁止重新部署 platform-os** — 直到修复验证通过

---

## 十、下一步执行顺序

```
Step 1: [NEON] 检查 Neon 控制台确认 Brand DB (Singapore) 状态
     → 是否因免费计划暂停（auto-suspend）
     → 如果是，通过 Neon 控制台唤醒
     → 确认 storefront 生产 DATABASE_URL 凭据有效

Step 2: [VERCEL] 更新 Storefront Vercel 环境变量
     → 确认 DATABASE_URL 为有效凭据
     → 如使用 neondb_owner 需提供 brand_app 或新建 brand_reader 角色
     → 重新部署 yunwu-origin (commit bf8fe90)
     → 验证首页 / /products / /journal 正常展示

Step 3: [CODE] 修复 Platform OS 构建脚本
     → package.json: db:generate 添加 pnpm --filter @yunwu/brand-db generate
     → 本地运行 pnpm db:generate 验证两个 client 均生成
     → 使用 Vercel Preview 部署验证构建通过

Step 4: [ENV] 更新本地开发环境变量
     → apps/platform/.env.local 使用有效的 brand_app/erp_app 凭据
     → yunwu-origin/.env 使用有效的 Databse URL
     → 验证 pnpm dev 可正常连接数据库

Step 5: [BUILD] 修复 Platform OS 后首次部署
     → 确保 db:generate 修复后提交
     → Vercel 触发部署 (git push)
     → 验证所有 Brand 页面可正常加载

Step 6: [SCHEMA] 同步 Storefront Material 模型
     → 确保 Material 模型包含品牌端新增的字段
     → prisma generate → prisma validate（不执行 db push）

Step 7: [DATA] 执行数据完整性扫描
     → 连接修复后对 Brand DB 执行只读 SQL
     → 检查 products, series, journal_posts, materials 记录数、null 字段、孤儿记录
     → 生成数据完整性报告

Step 8: [SECURITY] 为 Storefront 创建只读 role
     → Neon 创建 brand_reader 角色（只读 SELECT）
     → 替换 storefront DATABASE_URL
     → 更新基线文档

Step 9: [BUILD] 移除 Storefront db push
     → 修改构建命令，移除 --accept-data-loss

Step 10: [DEPLOY] 回归验证
     → Platform OS: ERP Dashboard, Brand Dashboard, 产品列表/详情, 系列, 材料, Journal, Media, BOM, SKU, 库存, 订单, 客户, Cross-Sell, Ritual Taxonomy
     → Storefront: 首页, 器物, 品牌志, 七序, 材料, 关于
```

---

## 附录 A：Vercel 部署历史摘要

```
Platform OS 成功部署（最后）：4b15b89cd50e — refactor(brand-os): decommission legacy prisma client infrastructure
Platform OS 失败部署（首次）：03bc3d9f5069 — refactor(platform): establish brand db adapter and migrate low-risk reads
Platform OS 失败部署（最近）：7cbcffd73f9acd25b61acfdb9279d5a49dd5eecc — docs(platform): establish isolated brand database staging
                     全部 16 次 → ERROR (BUILD_UTILS_SPAWN_1: build exited with 1)

Storefront 当前部署：bf8fe90aec22 — feat(storefront): 接入后台统一 Banner 数据源
                     状态：READY，但运行时数据库不可达
```

## 附录 B：Vercel 环境变量核对

| 变量 | Platform OS Production | Storefront Production | 本地 .env.local |
|------|----------------------|----------------------|-----------------|
| `DATABASE_URL` | ✅ 已设置 (erp_app) | ✅ 已设置 (加密) | ❌ 已吊销 (neondb_owner) |
| `DIRECT_DATABASE_URL` | ✅ 已设置 | ✅ 已设置 (加密) | ❌ 已吊销 (neondb_owner) |
| `BRAND_DATABASE_URL` | ✅ 已设置 (brand_app) | N/A | ❌ 已吊销 (neondb_owner) |
| `NEXTAUTH_URL` | ✅ | ✅ | ✅ |
| `NEXTAUTH_SECRET` | ✅ | ✅ | ✅ |
| `BLOB_STORE_ID` | ✅ | ❌ 未设置 (storefront 不需要) | ✅ |
| `BLOB_READ_WRITE_TOKEN` | ✅ | ❌ 未设置 | ✅ |

---

*本报告为只读审计结论，未对代码、数据库、部署或环境变量做任何修改。*
*可直接作为 ChatGPT / Claude Code / Codex / WorkBuddy / OpenClaw 工单拆分的输入。*
