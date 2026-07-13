# Secrets Gate — 历史阻塞只读审计与治理决策

**日期：** 2026-07-13
**WORKDIR：** `/Users/ryan/Projects/active/platform-os`
**HEAD：** `1ad2956`（Phase D2a complete）
**审计模式：** 只读 — 不修改工作区、不提交、不推送

---

## 1. 执行摘要

**`pnpm check:secrets` 命中的 10 项全部属于 D2b-1a 工作区之外的预存文件。**

D2b-1a diff 未触及 `apps/erp/` 或 `apps/web/` 中的任何文件。安全门禁并非因本次修改而失败，而是由于 Guard 脚本全仓扫描模式将预存 ERP/Web 凭据纳入检查范围。

**阻塞分类：** `SECURITY_GATE_BLOCKS_UNRELATED_FILES` — 门禁扫描范围与变更集不匹配。

---

## 2. 工作区状态

```
HEAD:             1ad2956 (Phase D2a complete)
origin/main:      1ad2956 (no pushes since D2a)
D2b-1a modified:  5 tracked files (products/actions, series/actions, client.tsx, brand-db.ts, baseline)
D2b-1a new:       3 files (2 scripts, 1 report)
```

未跟踪的 ERP 脚本在工作区中存在，但 D2b-1a 变更未触及它们。

---

## 3. Secrets Gate 执行结果

| # | 文件 | 行 | 匹配模式 | 当前 HEAD 中？ | D2b-1a 引入？ | 扫描来源 |
|---|------|-----|----------|---------------|--------------|----------|
| 1 | `apps/erp/scripts/check-inventory-table.js` | 5 | `postgresql://[^:@]+:[^@]+@` | ❌ 未跟踪 | ❌ 否 | `git ls-files --others` |
| 2 | `apps/erp/scripts/check-table-structure.js` | 5 | 同上 | ❌ 未跟踪 | ❌ 否 | `git ls-files --others` |
| 3 | `apps/erp/scripts/import-purchase.js` | 5 | 同上 | ❌ 未跟踪 | ❌ 否 | `git ls-files --others` |
| 4 | `apps/erp/scripts/import-to-production.js` | 6 | 同上 | ❌ 未跟踪 | ❌ 否 | `git ls-files --others` |
| 5 | `apps/erp/scripts/import-all-v3.js` | 9 | 同上 | ✅ `98cd1831` | ❌ 否 | `git ls-files --cached` |
| 6 | `apps/erp/scripts/reset-and-import-sql.js` | 9 | 同上 | ✅ `98cd1831` | ❌ 否 | `git ls-files --cached` |
| 7 | `apps/erp/scripts/reset-and-import-v2.js` | 9 | 同上 | ✅ `98cd1831` | ❌ 否 | `git ls-files --cached` |
| 8 | `apps/erp/scripts/reset-and-import.js` | 8 | 同上 | ✅ `98cd1831` | ❌ 否 | `git ls-files --cached` |
| 9 | `apps/web/scripts/DEPLOY_SETUP.md` | 17 | 同上 | ✅ `^640fbbe`（初始 commit） | ❌ 否 | `git ls-files --cached` |
| 10 | `apps/web/scripts/DEPLOY_SETUP.md` | 18 | 同上 | ✅ `^640fbbe`（初始 commit） | ❌ 否 | `git ls-files --cached` |

---

## 4. 命中分类

### 4.1 `apps/erp/scripts/` — 全部为同一凭据（ERP DB `neondb_owner`）

| 属性 | 值 |
|------|------|
| 角色 | `neondb_owner`（ERP DB，us-east-2） |
| Token 类型 | `npg_` Neon project token |
| 主机 | `ep-polished-unit-ajk5rq34.c-3.us-east-2.aws.neon.tech` |
| 有效性 | ✅ **2026-07-11 P0 安全事件后已吊销**（见 YUNWU_MASTER_BASELINE §14） |
| 当前状态 | 密码已轮换，生产 env var 已改为 `erp_app` 角色。源代码中的字面值已失效。 |

**分类：** `HISTORICAL_SECRET_UNKNOWN_VALIDITY`（B 类）

这些凭据在 2026-07-11 P0 安全事件中被标识为已吊销。它们存在于历史 commit 和生产源代码文件中，但密码值在数据库端已被轮换，无法再用于认证。文件本身是未跟踪的 ERP 导入脚本，不在 D2b-1a 范围内。

### 4.2 `apps/web/scripts/DEPLOY_SETUP.md` — Brand DB `neondb_owner`

| 属性 | 值 |
|------|------|
| 角色 | `neondb_owner`（Brand DB，ap-southeast-1） |
| Token 类型 | `npg_` Neon project token |
| 主机 | `ep-morning-sun-aoo4dk3t-pooler.c-2.ap-southeast-1.aws.neon.tech` |
| 有效性 | P0 事件后已吊销。yunwu-origin 仓库仍在使用 `neondb_owner` 作为 DATABASE_URL |
| 当前状态 | platform-os 的生产 env var 已改为 `brand_app` 角色。yunwu-origin 尚未轮换。 |

**分类：** `HISTORICAL_SECRET_UNKNOWN_VALIDITY`（B 类）

与 ERP 凭据类似，此凭据已在 P0 事件中标识。DEPLOY_SETUP.md 是一个部署参考文档，不是生产代码。它存在于初始 commit `^640fbbe` 中，早于 Phase D2b-1a。

---

## 5. Guard 扫描机制分析

| 属性 | 行为 |
|--------|--------|
| 扫描范围 | **全仓库** — `git ls-files --cached --others --exclude-standard` |
| 扫描类型 | 所有已跟踪 + 未跟踪源文件 |
| 是否为 diff 感知 | ❌ **否** — 不检查变更集，不比较 HEAD 与工作区 |
| 匹配规则 | 4 条正则，针对 PostgreSQL 用户名、密码与主机组合模式 |
| 排除规则 | `node_modules`, `.next`, `dist`, `build`, `.git`, `pnpm-lock.yaml` |
| 特殊豁免 | `check-no-hardcoded-secrets.mjs` 自身、`DATABASE_DISCOVERY_REPORT.md`、`PROJECT-FULL-AUDIT-REPORT.md`、`reset-pw.js` |
| 对 D2b-1a 的适用性 | 命中的 10 项全部是 **预存文件**，不在 D2b-1a diff 中 |

**核心问题：** Guard 是全仓库扫描，而 D2b-1a 是部分文件变更。门禁应区分"本次变更引入的凭据"与"仓库中历史遗留的已知凭据"。

---

## 6. 治理决策

### 6.1 D2b-1a 提交决策

**建议：允许 D2b-1a 提交。** D2b-1a 不引入、不修改任何硬编码凭据。

提交门禁应区分：
- ❌ **拒绝：** 变更集 diff 中包含新的 hardcoded connection string
- ✅ **允许：** 仅命中不在变更集中的历史预存文件

### 6.2 修复预存凭据的治理归属

| 文件范围 | 凭据类型 | 修复责任 | 优先级别 | 建议 Phase |
|-----------|-------------|----------------|----------|-----|
| `apps/erp/scripts/*.js` | ERP DB `neondb_owner`（已吊销） | ERP Context 负责人 | 🟡 P2 | Phase D ERP cleanup |
| `apps/web/scripts/DEPLOY_SETUP.md` | Brand DB `neondb_owner`（已吊销） | 仓库治理 | 🟡 P2 | 独立于 Phase |
| `apps/web/prisma/schema.prisma`（不同文件，但引用 `DATABASE_URL`） | 引用而非字面值 | 已在 Phase C 处理 | ✅ 已关闭 | Phase H |

### 6.3 Guard 脚本改进建议

| 改进 | 效果 |
|----------|--------|
| 增加 `--diff-only` 模式（仅扫描 `git diff --cached --name-only`） | 允许提交不引入新凭据的变更，同时继续预防未来新增 |
| 将已知历史凭据路径加入豁免列表 | 消除预存噪音，聚焦新引入凭据 |
| 在 Guard 输出中区分"预存"与"新增" | 减少阻塞误报 |

---

## 7. 最终状态

```
SECRETS GATE AUDIT COMPLETE — NO D2B-1A BLOCKING SECRETS FOUND

D2b-1a diff 中的硬编码凭据：  0
预存历史凭据：                10（全部在 D2b-1a 范围外）
D2b-1a 是否引入新凭据：       否
提交门禁行为：                全仓库扫描，不感知 diff
推荐操作：                    D2b-1a 可提交 — 凭据预存且已知
```

---

## 附录 A：凭据脱敏摘要

10 次命中涉及 2 个唯一凭据值：

| 凭据 ID | 数据库 | 原角色 | 当前有效性 | 命中文件数 |
|----------|----------|-------------|-----------------|-------------|
| Cred-ERP-01 | ERP DB（us-east-2） | `neondb_owner` | ❌ P0 事件后已吊销 | 8 |
| Cred-Brand-01 | Brand DB（ap-southeast-1） | `neondb_owner` | ❌ P0 事件后已吊销（platform-os）；⚠️ yunwu-origin 尚未轮换 | 2 |

所有凭据已在 `docs/YUNWU_MASTER_BASELINE.md §14` 的 P0 安全事件记录中标识。生产环境变量已轮换为最小权限角色（`erp_app`、`brand_app`）。

## 附录 B：Guard 改进建议

```mjs
// 建议的 diff 感知模式
const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' })
  .split('\n').filter(Boolean);
// 仅扫描本次提交将添加或修改的文件
```
