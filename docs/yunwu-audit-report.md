# Yunwu 项目清点与瘦身审计报告

> 审计时间：2026-06-23 22:22:35 CST (+0800)  
> 主审计仓库：`/Users/ryan/Workbuddy/yunwu`  
> Git 远端：`git@github.com:RYAN-CHIS/platform-os.git`  
> 当前提交：`f6b99d2`（2026-06-23，`chore: add vercel.json for Platform app deployment`）

## 1. 审计范围与限制

本次为只读审计。除新增本报告外，未删除文件、未修改业务代码、未读取或修改 `.env`/secrets、未启动或停止服务、未部署、未执行会写入 `.next` 或数据库的构建/测试/迁移命令。

操作系统限制了 `ps` 命令，因此进程结论主要来自 `lsof` 的进程工作目录、父子 PID、打开文件和监听端口。能确认运行目录与服务类型，但部分进程的完整命令行只能做有证据的推断。

审计开始时提供的工作目录 `/Users/ryan/Documents/允物` 是空目录。根据仓库名、远端、当天提交与目录结构，确定 `/Users/ryan/Workbuddy/yunwu` 为当前主项目。

## 2. 执行摘要

当前项目是一个 pnpm monorepo，包含 4 个 Next.js 应用和 5 个共享包。业务源码规模不大，磁盘占用主要来自可再生的 `.next` 与 `node_modules`。

主要结论：

1. 当前仓库约 `2.2G`，其中根 `node_modules` 约 `1.1G`，4 个应用的 `.next` 合计约 `1.0G`。
2. 当前仓库自身没有监听端口；有一套同远端历史工作副本仍在运行 Next.js，监听 `3000`。
3. Platform 同时存在“原生 ERP/Brand 路由”和“中间件反向代理旧应用”两套入口。中间件会遮蔽新原生路由，迁移状态不一致。
4. `apps/platform` 与 `packages/platform` 使用相同包名 `@yunwu/platform`；pnpm 实际匹配到两个包，这是高风险入口歧义。
5. `apps/platform/app/page.tsx` 与 `apps/platform/app/(platform)/page.tsx` 都映射公共路由 `/`，现有构建产物中两者均被编译，但路由清单只暴露一个 `/`。
6. `apps/web` 与 `apps/brand-os` 存在大量逐字节相同文件；共发现 30 组重复哈希、涉及 61 个文件。
7. 未发现任何测试文件或测试目录；目前无法靠自动化测试保障删除安全。
8. 同机另有约 `9G` 的 yunwu 独立仓库和历史快照，其中一份含未提交修改且正在运行，不应直接删除。
9. 最终复核时工作区已有 8 个修改文件和 15 个未跟踪项；清理前必须先确认并保存这些工作。
10. 审计过程中有其他任务并发写入：根 `package.json` 新增 `pg`、出现 `package-lock.json`、3 个密码重置脚本和另一份清理报告。本报告未覆盖或修改这些文件。

## 3. 当前项目结构

### 3.1 主要目录

| 路径 | 类型 | 用途 | 当前判断 |
| --- | --- | --- | --- |
| `apps/platform` | frontend + backend | Platform OS 统一管理入口；Next.js App Router、NextAuth、原生 ERP 页面、中间件代理 | 活跃，但入口冲突明显 |
| `apps/erp` | frontend + backend | ERP 独立应用；页面、API Route、Prisma、权限、媒体、库存、订单等 | 活跃；仍被 Platform 代理依赖 |
| `apps/web` | frontend + backend | 官网/独立站、SEO、商品展示、下单 API | 仍有部署入口；混有旧后台代码 |
| `apps/brand-os` | frontend + backend | Brand OS 独立后台和品牌 API | 注释称将废弃，但当前 Platform 仍依赖它 |
| `packages/auth` | backend/shared | 身份、会话、NextAuth、签名身份、权限中间件 | 活跃 |
| `packages/db` | backend/shared | 统一 Prisma 入口、Domain/Control/Fabric/Canonical 层、schema | 活跃，属于核心数据层 |
| `packages/platform` | shared domain | 侧边栏、权限配置、网关、服务层、主数据、CRM | 部分活跃，部分为未接线迁移代码 |
| `packages/ui` | frontend/shared | 统一 UI、设计 token、权限边界 | 活跃 |
| `packages/shared` | shared | 日期、金额、订单号工具 | 源码中无任何导入 |
| `docs` | docs | 审计与后续维护文档 | 本次新增 |

项目共跟踪约 436 个文件。主要有效文件数量：

| 模块 | 非构建文件数 | 说明 |
| --- | ---: | --- |
| `apps/brand-os` | 59 | 源码约 0.2 MiB |
| `apps/erp` | 123 | 源码约 0.86 MiB |
| `apps/platform` | 67 | 源码约 0.09 MiB |
| `apps/web` | 82 | 含约 7 MiB 图片资源 |
| `packages/*` | 88 | 共享层总代码量较小 |

### 3.2 Frontend

- 4 个应用均为 Next.js。
- `apps/platform`、`apps/erp` 使用 Next 16.2.9。
- `apps/web`、`apps/brand-os` 使用 `next ^15.0.0`。
- React 主版本均为 19，但精确版本不同。
- UI 同时存在 `packages/ui` 统一组件和 `apps/web`、`apps/brand-os` 内部复制组件。

### 3.3 Backend

没有独立 Python/Java/Go 后端。后端能力分布在：

- Next.js Route Handlers：`app/api/**/route.ts`
- Next.js Server Actions：`apps/*/src/lib/actions`、`apps/platform/modules/**/actions.ts`
- Prisma：`packages/db/schema.prisma` 与各旧应用 schema
- NextAuth：各应用认证入口与 `packages/auth`
- Platform 数据网关和 ERP Service Layer：`packages/platform`

### 3.4 Scripts

主要脚本：

- ERP：数据导出、种子、管理员种子、媒体视图、Blob 配置、产品同步。
- Web：一键部署、从旧 SQLite ERP 同步、Prisma seed。
- DB：schema lock 检查、SSOT SQL。
- 根目录：审计过程中并发出现 3 个未跟踪密码重置脚本：
  `scripts/reset-password.mjs`、`scripts/reset-password.ts`、`scripts/reset-pw.js`。

风险点：

- `apps/web/scripts/sync-from-erp.mjs`、`apps/web/prisma/seed.ts`、`apps/brand-os/seed.ts` 硬编码了已过期的本机路径：
  `/Users/ryan/WorkBuddy/2026-06-17-22-01-58/backend/prisma/dev.db`
- `apps/brand-os/seed.ts` 指向本应用不存在的 `scripts/sync-from-erp.mjs`。
- `apps/web/scripts/sync-from-erp.mjs` 使用 `better-sqlite3`，但 `apps/web/package.json` 未声明该依赖。
- `apps/web/scripts/deploy.sh` 会自动 `git add -A`、commit、push，且仍使用独立仓库时代的项目名和 npm 流程；不适合作为当前 monorepo 的默认部署入口。
- `apps/erp/scripts/setup-blob.sh` 会安装全局 CLI、修改 Vercel 环境并触发 redeploy；它不是死代码，但属于高副作用运维脚本。
- 3 个根密码重置脚本功能重复，且 `scripts/reset-pw.js` 命中“可能硬编码凭据”模式。未在报告中输出任何值；该文件不应提交，若值曾用于真实账号应立即轮换。

### 3.5 Configs

主要配置：

- 根：`package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`tsconfig.base.json`
- 应用：`next.config.*`、`tsconfig.json`、`postcss.config.*`、`tailwind.config.*`
- 部署：`apps/{erp,platform,web}/vercel.json`
- CI：`apps/erp/.github/workflows/ci.yml`

审计开始后，根目录并发出现未跟踪 `package-lock.json`，同时根 `package.json` 新增 `pg`。这说明当前有人或其他任务正在使用 npm 改动依赖，和既有 pnpm 单仓产生双锁文件风险。

未发现：

- `docker-compose.yml`
- `compose.yml`
- `Dockerfile`
- PM2 `ecosystem.config.*`
- `Procfile`
- systemd service

### 3.6 Docs

仓库根目录有 23 份 Markdown 报告，总计约 `100K`。它们大多是阶段性迁移、构建和部署记录，磁盘收益很小，但会增加根目录噪音。

建议后续将仍有效的报告归档到 `docs/history/2026-06/`，不要在未核对结论前直接删除。

### 3.7 Tests

未发现：

- `tests/`、`test/`、`__tests__/`
- `*.test.*`
- `*.spec.*`

存在 CI 文件不等于存在测试。删除前至少应补充：

- 4 个应用的构建验证
- Platform/ERP/Brand/Web 核心路由 smoke test
- Prisma schema 与数据访问 smoke test

## 4. 磁盘占用

| 路径 | 约占用 | 是否可再生 |
| --- | ---: | --- |
| 根 `node_modules` | `1.1G` | 是 |
| `apps/platform/.next` | `179M` | 是 |
| `apps/erp/.next` | `204M` | 是 |
| `apps/brand-os/.next` | `265M` | 是 |
| `apps/web/.next` | `371M` | 是 |
| 根 `.next` | `8K` | 是 |
| Git 数据 | `12M` | 否，不建议动 |

`.next` 合计约 `1.0G`，是最安全的首批瘦身对象。各应用和包内的小型 `node_modules` 多为 pnpm 链接；主要空间仍在根 `node_modules`。

## 5. 当前运行进程

### 5.1 与 Yunwu 明确相关

| PID | 父 PID | 工作目录 | 端口 | 判断 |
| ---: | ---: | --- | --- | --- |
| 79859 | 1 | `/Users/ryan/Workbuddy/2026-06-22-22-55-34/apps/platform` | 无 | 已脱离原父进程的 Node 启动链父进程 |
| 79879 | 79859 | 同上 | 无 | Node 启动链中间进程 |
| 79885 | 79879 | 同上 | `*:3000` | 明确为 Next.js 进程；加载 Next 15 SWC，并持续写 `.next/trace` |
| 41146 | 41126 | `/Users/ryan/Workbuddy/2026-06-22-22-55-34` | 无 | Electron/Workbuddy 子 Node，未发现服务监听 |
| 52849 | 52719 | 同上 | 无 | Electron/Workbuddy 子 Node，未发现服务监听 |
| 62344 | 62015 | 同上 | 无 | Electron/Workbuddy 子 Node，未发现服务监听 |

重要判断：

- 正在运行的服务不属于当前主仓库，而属于历史工作副本：
  `/Users/ryan/Workbuddy/2026-06-22-22-55-34`
- 该副本远端同样是 `platform-os.git`，约 `2.7G`，工作区有大量未提交修改。
- 该副本的 `apps/platform/package.json` 声明 `dev/start` 使用 `3300`，但实际监听 `3000`。因此它很可能通过直接 `next dev`/`next start` 或其他未按 package script 的方式启动。
- PID 79859 的父 PID 已是 1，说明原始启动会话已退出，但服务链仍存活，属于典型“遗留服务”。

### 5.2 其他运行时

- Python：未发现与 yunwu 相关的 Python 进程。
- Docker：本机未安装或当前环境找不到 `docker` 命令。
- PM2：本机未安装或当前环境找不到 `pm2` 命令。
- 当前主仓库 `/Users/ryan/Workbuddy/yunwu`：未发现监听服务。

另有一个与 yunwu 无关的 OpenClaw Node 服务监听 `127.0.0.1:18789`，不应纳入 yunwu 清理。

## 6. 当前端口占用

### 6.1 Yunwu 约定端口

| 端口 | package script 约定 | 实际监听 | 结论 |
| ---: | --- | --- | --- |
| 3000 | 各应用默认 `next start` 端口 | 历史 Platform 副本 PID 79885 | 已占用，且来源不是当前仓库 |
| 3001 | ERP `next dev -p 3001` | 无 | 空闲 |
| 3002 | Web `next dev -p 3002` | 无 | 空闲 |
| 3003 | Brand OS `next dev -p 3003` | 无 | 空闲 |
| 3100 | 当前 Platform `next dev -p 3100` | 无 | 空闲 |

### 6.2 端口配置问题

4 个应用的 `dev` 脚本使用不同端口，但所有 `start` 脚本都是裸 `next start`，默认都会争用 `3000`。

这与 Platform 中间件期待 ERP `3001`、Brand OS `3003` 不一致。本地 production-mode 联调时会发生端口冲突或代理失败。

## 7. 核心代码入口

### 7.1 Monorepo 入口

| 入口 | 用途 | 使用状态 |
| --- | --- | --- |
| 根 `package.json` | 通过 pnpm filter 启动/构建 4 个应用 | 主入口，活跃 |
| `pnpm-workspace.yaml` | 注册 `apps/*`、`packages/*` | 主 workspace 配置，活跃 |
| `pnpm-lock.yaml` | 当前唯一被 Git 跟踪的主锁文件 | 活跃，应保留 |
| `tsconfig.base.json` | 共享 TS 配置 | 当前没有应用 `extends` 它，实际作用有限 |

### 7.2 应用入口

| 应用 | 开发入口 | 构建入口 | 部署/运行判断 |
| --- | --- | --- | --- |
| Platform | `pnpm dev:platform` → `next dev -p 3100` | `pnpm build:platform` | 近期提交、已关联 Vercel 项目 `platform`；活跃 |
| ERP | `pnpm dev:erp` → `next dev -p 3001` | Prisma generate + Next build | 独立应用仍被 Platform 代理依赖；不能删除 |
| Web | `pnpm dev:web` → `next dev -p 3002` | Next build | 官网仍有 Vercel 配置与部署脚本；需确认实际生产来源 |
| Brand OS | `pnpm dev:brand-os` → `next dev -p 3003` | Next build | 虽标记为待废弃，但 Platform `/admin` 仍代理到它 |

### 7.3 Platform 入口冲突

#### A. 重复 workspace 包名

以下两个 package 都叫 `@yunwu/platform@1.0.0`：

- `apps/platform/package.json`
- `packages/platform/package.json`

`pnpm --filter @yunwu/platform list --depth -1` 会同时返回两个包。与此同时，`apps/platform` 又声明依赖 `"@yunwu/platform": "workspace:*"`。

风险：

- filter 命令选择结果不唯一；
- 应用包可能形成名字上的自依赖；
- workspace link、IDE、部署平台对目标包的解析可能不一致；
- `@yunwu/platform/*` 导入意图是共享包，但包名冲突使审计和维护困难。

这是配置修复项，不是删除项。建议将应用包改名为 `@yunwu/platform-app` 或将共享包改名为 `@yunwu/platform-core`。

#### B. 双根路由

以下两个页面都对应公共 URL `/`：

- `apps/platform/app/page.tsx`：重定向到 `/platform`
- `apps/platform/app/(platform)/page.tsx`：Platform Dashboard

现有 `.next/server/app-paths-manifest.json` 中两者都被编译，`routes-manifest.json` 只暴露一个 `/`。这会产生入口遮蔽和行为不确定性。

需要先决定产品路由：

- 若 dashboard 应位于 `/`：删除或移动 redirect 页；
- 若 dashboard 应位于 `/platform`：应建立真实的 `app/platform/page.tsx`，而不是依赖 route group。

#### C. 原生路由被代理中间件遮蔽

`apps/platform/middleware.ts` 当前无条件执行：

- `/erp/*` → `http://localhost:3001` 或 `http://erp:3001`
- `/admin/*` → `http://localhost:3003` 或 `http://brand-os:3003`

但项目同时新增了：

- `apps/platform/app/(platform)/erp/**`
- `apps/platform/app/admin/brand/**`
- `apps/platform/modules/erp/**`
- `apps/platform/modules/brand/**`

因此：

- 新增的原生 ERP 页面在 `/erp/*` 下会先被中间件转发，无法成为真实运行入口；
- `/admin/brand/*` 页面也会被中间件转发到 Brand OS；
- “Platform 已原生化”与“Platform 继续代理旧应用”两种架构同时存在。

在 Vercel 场景下，生产地址 `http://erp:3001` 和 `http://brand-os:3003` 也没有 Docker/service discovery 配置支持，生产可达性存疑。

#### D. Vercel 配置不统一

- Platform 使用 pnpm。
- ERP/Web 的 `vercel.json` 强制 `npm install`。
- ERP/Web package 依赖包含 `workspace:*`，而根项目使用 `pnpm-workspace.yaml`，不是 npm workspace 配置。

ERP/Web 的 Vercel 入口很可能仍是独立仓库时代配置，需重新确认，不建议直接沿用。

### 7.4 Docker / PM2 / Server 入口

- 无 Docker/Compose 入口。
- 无 PM2 入口。
- 无独立 `server.ts`/`server.js` 自定义服务器。
- 服务入口全部由 Next.js CLI 和 Vercel 承担。

## 8. 疑似废弃代码与重复代码

### 8.1 静态分析方法

本次初始快照扫描了 342 个 JS/TS 源码文件，建立了相对路径、`@/` 与 `@yunwu/*` 静态 import/export 图。审计过程中并发新增的 3 个根密码脚本不在该引用图中。

限制：

- 动态拼接 import、运行时反射和外部调用可能无法识别；
- Next.js page/layout/route/middleware/robots/sitemap 作为框架入口单独保留；
- 没有测试，因此“无引用”不等于可以无验证删除。

### 8.2 可安全删除候选

以下项目证据较充分，但仍建议删除后执行构建与 smoke test。

| 候选 | 原因 | 风险 |
| --- | --- | --- |
| 当前仓库所有 `.next/` | Git ignored、构建可再生、当前仓库无运行服务 | 低 |
| 当前仓库 `node_modules/` | 可由 `pnpm install` 重建 | 低；需网络/锁文件可用 |
| `packages/db/client.ts` | 无引用；与 `packages/db/index.ts` 的 Prisma singleton 重复 | 低 |
| `apps/platform/components/PermissionBoundary.tsx` | 无引用；`packages/ui/permission-boundary.tsx` 已提供更完整版本 | 低 |
| `apps/brand-os/src/components/ui/*` | 静态图中全部不可达；与 Web 对应组件重复 | 低到中 |
| `apps/web/src/components/ui/Button.tsx` | 无引用；逐字节复制于 Brand OS | 低到中 |
| `apps/web/src/components/ui/ContentCard.tsx` | 无引用；逐字节复制于 Brand OS | 低到中 |
| `apps/web/src/components/ui/Tag.tsx` | 无引用；逐字节复制于 Brand OS | 低到中 |
| `apps/web/src/components/ui/index.ts` | 无引用 barrel | 低 |
| `apps/web/src/lib/audit-log.ts` | 无引用；Brand OS 有相同且活跃的副本 | 低到中 |
| `apps/web/src/lib/auth-helpers.ts` | 无引用；Brand OS 有相同副本 | 低到中 |
| `apps/web/src/lib/db.ts` | 无引用；另有 `src/lib/prisma.ts` 作为实际入口 | 低 |

### 8.3 需要确认的删除候选

| 候选 | 原因 | 风险 |
| --- | --- | --- |
| `apps/web/src/lib/actions/{audit-actions,content-actions,tag-actions,auth}.ts` | Web 没有对应后台页面，整个 action 子图从运行时入口不可达；Brand OS 中同名代码仍活跃 | 中 |
| `apps/platform/modules/erp/shared/service-factory.ts` | 无任何引用，feature flag 逻辑未接线 | 中；可能是迁移预留 |
| `packages/shared/` | 4 个应用声明依赖，但源码导入次数为 0；函数在 ERP 内另有本地实现 | 中 |
| `apps/brand-os/schema.prisma.v2lite-backup` | 备份文件、无引用、Git 已跟踪 | 中 |
| `apps/web/prisma/schema.backup.prisma` | 备份文件、无引用、Git 已跟踪 | 中 |
| `apps/web/prisma/schema.prisma.v2lite-backup` | 备份文件、无引用、Git 已跟踪 | 中 |
| `apps/erp/prisma/yunwu.db.backup.*` | 两个 60K SQLite 历史备份、无引用 | 中到高；需确认是否为唯一数据快照 |
| `apps/erp/prisma/seed-v1-products.ts` | 旧 V1 命名、无 package script、仅手动执行 | 中；可能仍是数据恢复资料 |
| `apps/erp/outputs/允物项目架构审计报告.md` | 旧报告且内容与当前审计重叠 | 低到中 |
| 根目录 23 份阶段报告 | 运行时无关，但包含迁移决策与回滚信息 | 中；优先归档，不直接删除 |

### 8.4 不建议删除

| 路径 | 原因 | 风险 |
| --- | --- | --- |
| `apps/erp` | Platform 中间件、dashboard 和多处 action 仍依赖 ERP `3001` | 高 |
| `apps/brand-os` | Platform `/admin` 和 API 仍代理 Brand OS `3003` | 高 |
| `packages/db` 的 Domain/Control/Fabric/Canonical 层 | 主 index 导出，且属于架构约束；不能只看直接导入数 | 高 |
| `packages/platform/services/erp/*` | 当前未接线，但刚于 2026-06-23 作为原生迁移目标加入 | 高 |
| `packages/platform/data-gateway/{import-export,media,permission,user}-gateway.ts` | 暂无调用，但属于新迁移覆盖层 | 高 |
| `packages/platform/crm/*` | 当前不可达，但 registry 中 CRM 仍是规划模块 | 高 |
| 各旧应用 `prisma/schema.prisma` | 现有阶段报告明确说明仍用于各应用 `prisma generate` | 高 |
| `pnpm-lock.yaml` | 当前唯一被 Git 跟踪的主锁文件 | 高 |
| 并发新增的 `package-lock.json` 与 3 个密码脚本 | 来源仍在活动中，且可能包含敏感操作/凭据 | 高；先确认创建者 |
| 当前有修改或未跟踪的文件 | 可能包含未保存工作 | 高 |

### 8.5 重复代码

共发现 30 组相同哈希，涉及 61 个文件。主要集中于 `apps/web` 和 `apps/brand-os`：

- `next.config.js`
- `tsconfig.json`
- `tailwind.config.js`
- `postcss.config.js`
- `src/styles/globals.css`
- `src/styles/tokens.css`
- auth、audit、db、Prisma helper
- admin/content/tag server actions
- UI components
- Prisma schema、migration、seed

建议方向：

1. Web 只保留公开站点逻辑。
2. Brand OS 只保留后台逻辑，直至迁移到 Platform。
3. 真正共享的 auth、UI、tokens、Prisma helper 下沉到 `packages/*`。
4. 不要继续复制文件保持“同步”，否则会持续漂移。

## 9. 外部重复仓库与历史快照

同机发现以下 yunwu 相关目录：

| 路径 | 约占用 | 远端/身份 | 状态 |
| --- | ---: | --- | --- |
| `/Users/ryan/Workbuddy/yunwu` | `2.2G` | `platform-os.git` | 当前主仓库 |
| `/Users/ryan/Workbuddy/yunwu-admin` | `1.8G` | `yunwu-origin.git` | 与目录名不一致；有未跟踪文件 |
| `/Users/ryan/yunwu-brand-os` | `2.1G` | `yunwu-erp.git` | 与目录名不一致；本地领先远端 1 提交 |
| `/Users/ryan/Workbuddy/2026-06-22-14-13-20/yunwu-erp` | `1.6G` | `yunwu-erp.git` | 历史副本 |
| `/Users/ryan/Workbuddy/2026-06-22-14-13-20/yunwu-origin` | `17M` | `yunwu-origin.git` | 历史副本 |
| `/Users/ryan/Workbuddy/2026-06-18-02-40-15/yunwu-origin` | `766M` | `yunwu-origin.git` | 历史副本 |
| `/Users/ryan/Workbuddy/2026-06-22-22-55-34` | `2.7G` | `platform-os.git` | 有未提交修改，且当前正在运行 |

主仓库之外约有 `9G` 重复/历史工作目录。这是比仓库内备份文件更大的瘦身机会，但风险也最高。

其中：

- 当前 `apps/web` 与 `yunwu-admin` 仅有少量文件差异，明显来自同一代码线。
- 当前 `apps/erp` 与 `/Users/ryan/yunwu-brand-os` 也高度相似。
- 运行中的 `2026-06-22-22-55-34` 不应在停止进程、提交或导出未提交改动前删除。

## 10. 建议删除清单与风险等级

### 风险定义

| 等级 | 含义 |
| --- | --- |
| L0 | 可再生缓存；确认没有进程使用后可直接清理 |
| L1 | 无引用或明确重复；删除后需要构建验证 |
| M | 需要产品/迁移状态确认，或可能作为恢复资料 |
| H | 当前仍有运行依赖、未提交改动或数据风险；不建议删除 |

### 建议清单

| 优先级 | 对象 | 预计收益 | 风险 | 建议 |
| ---: | --- | ---: | --- | --- |
| 1 | 当前仓库全部 `.next` | 约 `1.0G` | L0 | 可安全删除；本次未执行 |
| 2 | 当前仓库根 `node_modules` | 约 `1.1G` | L0 | 仅在确认可重新安装依赖时删除 |
| 3 | `packages/db/client.ts` | 很小 | L1 | 删除后 typecheck/build |
| 4 | 未引用的 Platform PermissionBoundary | 很小 | L1 | 统一使用 `packages/ui` |
| 5 | Web/Brand OS 未引用复制组件与 helper | 很小 | L1 | 按引用图分批删除 |
| 6 | Web 旧后台 actions | 很小 | M | 确认 Web 不再承载后台后删除 |
| 7 | schema/SQLite backup | 约 `150K` | M/H | 先打 Git tag，并确认数据恢复需求 |
| 8 | `packages/shared` | 很小 | M | 先移除声明依赖并验证 4 个应用 |
| 9 | 根阶段报告 | 约 `100K` | M | 归档到 docs，不追求磁盘收益 |
| 10 | 外部历史仓库/快照 | 约 `9G` | H | 逐个保存 diff、停止进程、压缩归档后再删 |

## 11. 下一步清理计划

### Phase 0：保护现场

1. 保存最终复核时的 8 个修改文件与 15 个未跟踪项。
2. 对 `/Users/ryan/Workbuddy/2026-06-22-22-55-34` 导出 `git diff` 和未跟踪文件清单。
3. 确认 PID 79885 是否仍需保留；停止前先记录其用途。
4. 为三个相关远端分别记录最新提交和本地领先/落后状态。
5. 确认并发新增的根 `package-lock.json`、`pg` 依赖和 3 个密码重置脚本由谁创建；不要提交可能含凭据的脚本。

### Phase 1：零业务风险瘦身

1. 清理当前主仓库 `.next`。
2. 如依赖可可靠重装，清理重复 `node_modules`。
3. 将根目录阶段报告移动到 `docs/history/2026-06/`。
4. 清理 `.DS_Store`、旧 trace、临时产物等 Git ignored 文件。

### Phase 2：修正入口，再删代码

1. 解决两个 `@yunwu/platform` 包名冲突。
2. 明确 `/` 与 `/platform` 的唯一页面入口。
3. 在“原生 Platform 路由”和“代理 ERP/Brand OS”之间选择唯一运行策略。
4. 统一 4 个应用的 dev/start 端口。
5. 统一 Vercel 安装器为 pnpm，并从 monorepo 根管理部署。

### Phase 3：删除低风险死代码

1. 删除 `packages/db/client.ts`。
2. 删除未引用的本地 PermissionBoundary。
3. 删除 Web/Brand OS 中确认不可达的复制组件和 helper。
4. 每批删除后执行受影响应用的 typecheck、build 和 route smoke test。

### Phase 4：应用收敛

1. 若 Platform 原生 ERP 已接管，逐路由切断 `/erp` 代理。
2. 若 Platform 原生 Brand 已接管，逐路由切断 `/admin` 代理。
3. 只有在生产流量、API、后台任务都完成迁移后，才删除 `apps/erp` 或 `apps/brand-os`。
4. 将共享代码迁入 `packages/auth`、`packages/ui`、`packages/platform`，避免再次复制。

### Phase 5：清理外部副本

对每个历史目录执行：

1. 确认无运行进程。
2. 确认 Git 工作区干净，或将 diff/未跟踪文件归档。
3. 确认远端已有对应提交。
4. 优先压缩归档 7 天，再做永久删除。

## 12. 最终结论

当前最大的“瘦身”收益不是删业务源码，而是：

1. 清理约 `2.1G` 的可再生缓存与依赖；
2. 收敛 Platform 的双入口和代理/原生双架构；
3. 处理约 `9G` 的外部重复仓库与历史快照。

业务代码删除应放在入口修正之后。特别是 `apps/erp`、`apps/brand-os` 和新加入的 Platform service/gateway 层，目前都不具备整目录安全删除条件。
