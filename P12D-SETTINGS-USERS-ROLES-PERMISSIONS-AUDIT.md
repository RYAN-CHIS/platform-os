# P12D — Settings Users / Roles / Permissions / Audit Logs

**工单**: WO-P12D  
**状态**: PASS  
**日期**: 2026-06-24  

---

## 一、Users CRUD — PASS

### 页面
`/settings/users` — 从只读升级为完整 CRUD

### 支持操作
| 操作 | 状态 | 实现方式 |
|------|------|----------|
| 新增用户 | ✅ | Modal Form → `INSERT INTO users` |
| 编辑用户 | ✅ | Modal Form → `UPDATE users SET ...` |
| 禁用/启用用户 | ✅ | 状态切换 active ↔ inactive |
| 删除用户 | ✅ | 确认后 `DELETE FROM users` |
| 重置密码 | ⚠️ | 占位（返回"下一版本接入"） |
| 搜索用户 | ✅ | ActionBar 防抖搜索（email/name ILIKE） |
| 导出 CSV | ✅ | ActionBar Blob+BOM 导出 |

### 字段
name, email, avatar, role, status, createdAt, updatedAt, lastLoginAt

### DB 变更
- `users.status VARCHAR(20) DEFAULT 'active'` — 新增
- `users.last_login_at TIMESTAMP` — 新增
- 现有用户自动设为 `status = 'active'`

### 现有用户（7 人）
admin@yunwu.com (SUPER_ADMIN), 990642928@qq.com (viewer), viewer@yunwu.com (viewer), operator@yunwu.com (operator), 3319506586@qq.com (筱晨, operator), 13901321670@139.com (Helen, operator), chishuovip@163.com (迟硕, admin)

---

## 二、Roles CRUD — PASS

### 页面
`/settings/roles` — 全新页面

### 支持操作
| 操作 | 状态 | 实现方式 |
|------|------|----------|
| 新增角色 | ✅ | Modal Form → `INSERT INTO roles` |
| 编辑角色 | ✅ | Modal Form → `UPDATE roles SET ...` |
| 删除角色 | ✅ | 确认后 `DELETE FROM roles` |
| 启用/禁用角色 | ✅ | `is_active` toggle |
| 复制角色 | ✅ | `INSERT ... SELECT` + 副本后缀 |
| 搜索 | ✅ | ActionBar ILIKE 搜索 |

### 默认角色（4 个）
| 角色 | 代码 | 权限数 |
|------|------|--------|
| 超级管理员 | Admin | 22 模块全权限 |
| 管理员 | Manager | 16 模块（无 Settings 权限） |
| 操作员 | Operator | 6 模块 |
| 访客 | Viewer | 6 模块（只读覆盖） |

### DB 变更
- **新建表** `roles` (id, role_name, role_code, description, permissions JSONB, is_active, created_at, updated_at)

---

## 三、Permissions Matrix — PASS

### 页面
`/settings/permissions` — 从静态列表升级为交互式权限矩阵

### 矩阵结构
- **行**: 22 个模块（ERP 9 + Brand 8 + Settings 5）
- **列**: 活跃角色（is_active = true）
- **格子**: 可点击复选框（✓/空）
- **保存**: "保存权限矩阵" 按钮 → `UPDATE roles SET permissions = $1::jsonb`

### UI 特性
- 按域分组（ERP / BRAND / SETTINGS），每组有"全选/清空"快捷按钮
- 每个角色列有独立的"全选/清空"
- 更新直接写入 `roles.permissions` JSONB 字段
- 刷新后数据保留

### 模块清单
ERP: erp.products, erp.materials, erp.bom, erp.purchase, erp.inventory, erp.production, erp.orders, erp.customers, erp.costs  
Brand: brand.products, brand.series, brand.journal, brand.home, brand.media, brand.banners, brand.seo, brand.settings  
Settings: settings.users, settings.roles, settings.permissions, settings.audit, settings.system

---

## 四、Audit Logs — PASS

### 页面
`/settings/audit` — 全新页面

### 功能
| 功能 | 状态 |
|------|------|
| 日志列表 | ✅ 读取 audit_logs 表 |
| 搜索 | ✅ 全文 ILIKE 搜索 |
| 按模块过滤 | ✅ entity_type 下拉 |
| 按操作过滤 | ✅ action 下拉（CREATE/UPDATE/DELETE/...） |
| 按用户过滤 | ✅ user_id 下拉 |
| 按时间过滤 | ✅ from/to 日期选择 |
| 导出 CSV | ✅ ActionBar 导出 |
| 显示 IP | ✅ audit_logs.ip 列 |
| 显示 User Agent | ✅ audit_logs.user_agent 列 |

### DB 变更
- **新建表** `audit_logs` (id, user_id, action, system, entity_type, entity_id, details, ip, user_agent, created_at)
- 已创建索引: user_id, (system, entity_type, entity_id), created_at

### 记录哪些操作
`createAuditLog()` 函数可被任何模块调用：
- 用户新增/编辑/删除
- 角色修改/权限修改
- Brand CRUD
- ERP CRUD
- 状态切换
- 删除操作

### 验证
- 直接 SQL 插入测试日志 → 页面刷新后可见 ✅
- 含有 CREATE/users 操作记录 ✅

---

## 五、System Configuration — PASS

### 页面
`/settings/system` — 增强为可编辑配置页

### 运行时状态显示
| 项目 | 显示 |
|------|------|
| ERP DB 状态 | ✅ 已连接 / 未连接 |
| Brand DB 状态 | ✅ 已连接 / 未连接 |
| 当前环境 | ✅ NODE_ENV |
| 当前版本 | ✅ vP12D |
| 数据统计 | ✅ 用户数/ERP产品/Brand产品/品牌志/订单 |
| 环境变量检查 | ✅ DATABASE_URL / BRAND_DATABASE_URL |

### 可编辑配置（6 项）
| 配置项 | 默认值 | 编辑方式 |
|--------|--------|----------|
| siteName | 允物 Platform OS | 文本输入 |
| maintenanceMode | false | 下拉开关 |
| defaultLanguage | zh-CN | 文本输入 |
| defaultCurrency | CNY | 文本输入 |
| timezone | Asia/Shanghai | 文本输入 |
| uploadLimit | 10 | 数字输入 |

### DB 变更
- **新建表** `system_configs` (id, key UNIQUE, value, description, updated_at)

---

## 六、统一 Action Bar

所有 Settings 页面统一使用 `apps/platform/components/ActionBar.tsx`：
- 搜索 ✅
- 筛选 ✅
- 刷新 ✅
- CSV 导出 ✅

新增按钮在各页面内独立渲染（不使用 ActionBar 的新增 Modal，而是页面级 Modal Form）。

---

## 七、Middleware 与路由

- `/settings/*` 已加入 middleware 白名单（NextResponse.next()）
- Sidebar 配置更新：新增"角色管理"、"权限矩阵"、"审计日志"入口
- Sidebar 图标：UserCog（角色）、ScrollText（审计）

---

## 八、文件变更清单

### 新建文件
```
apps/platform/modules/settings/users/actions.ts       — 用户 CRUD server actions
apps/platform/modules/settings/roles/actions.ts        — 角色 CRUD server actions
apps/platform/modules/settings/permissions/actions.ts  — 权限矩阵 server actions
apps/platform/modules/settings/permissions/config.ts   — 权限常量和类型
apps/platform/modules/settings/audit/actions.ts        — 审计日志查询 + 写入
apps/platform/modules/settings/system/actions.ts       — 系统配置 CRUD

apps/platform/app/(platform)/settings/users/client.tsx     — 用户管理交互 UI
apps/platform/app/(platform)/settings/roles/client.tsx     — 角色管理交互 UI
apps/platform/app/(platform)/settings/roles/page.tsx       — 角色管理服务端
apps/platform/app/(platform)/settings/permissions/client.tsx — 权限矩阵交互 UI
apps/platform/app/(platform)/settings/audit/client.tsx     — 审计日志交互 UI
apps/platform/app/(platform)/settings/audit/page.tsx       — 审计日志服务端
apps/platform/app/(platform)/settings/system/client.tsx    — 系统配置交互 UI
```

### 修改文件
```
apps/platform/app/(platform)/settings/users/page.tsx  — 重写为数据驱动
apps/platform/app/(platform)/settings/permissions/page.tsx — 重写为矩阵数据驱动
apps/platform/app/(platform)/settings/system/page.tsx — 重写为配置驱动
apps/platform/middleware.ts  — 添加 /settings/* 路由
apps/platform/components/PlatformSidebar.tsx — 添加 UserCog 图标
apps/platform/modules/dashboard/actions.ts — 修复语法错误（多余括号）
packages/platform/config/sidebar.config.ts — 添加角色/审计菜单项 + 修复 MODULE_LABELS
packages/platform/config/sidebar.config.ts — 修复 SideBarChild → SidebarChild 拼写
```

### DB 变更（直接 SQL）
```sql
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
CREATE TABLE roles (...);
CREATE TABLE system_configs (...);
CREATE TABLE audit_logs (...);
```

---

## 九、浏览器验收结果

| 测试项 | 结果 |
|--------|------|
| GET /settings/users → 200 | ✅ 7 用户数据正常渲染 |
| GET /settings/roles → 200 | ✅ 4 角色 + 权限数组正常渲染 |
| GET /settings/permissions → 200 | ✅ 矩阵结构正常渲染 |
| GET /settings/audit → 200 | ✅ 审计日志列表渲染（含测试数据） |
| GET /settings/system → 200 | ✅ 系统状态 + 可编辑配置渲染 |
| Users 新增 → Modal Form | ✅ 真实 INSERT 到 DB |
| Users 编辑 → Modal Form | ✅ 真实 UPDATE |
| Users 禁用/启用 | ✅ status toggle |
| Users 删除 | ✅ DELETE FROM users |
| Users 搜索 | ✅ ILIKE 防抖搜索 |
| Roles 新增/编辑/删除 | ✅ CRUD 完整 |
| Roles 复制 | ✅ INSERT ... SELECT |
| Roles 启用/禁用 | ✅ is_active toggle |
| Permissions 矩阵编辑 | ✅ 复选框交互 |
| Permissions 保存 | ✅ UPDATE roles SET permissions |
| Audit 筛选（模块/用户/操作/时间） | ✅ 多维过滤 |
| System 配置编辑保存 | ✅ UPDATE system_configs |
| CSV 导出（全部页面） | ✅ ActionBar BOM 导出 |
| 页面刷新后数据保留 | ✅ Server-side re-fetch |

---

## 十、最终状态

```text
P12D Settings System: PASS
```

### 完成项
1. ✅ Users CRUD 真实可用（新增/编辑/禁用/删除/搜索/导出）
2. ✅ Roles CRUD 真实可用（新增/编辑/复制/禁用/删除）
3. ✅ Permissions 矩阵真实可编辑并写入 DB
4. ✅ Audit table 已创建并支持日志记录和查询
5. ✅ System 配置可编辑并持久化
6. ✅ 全部 5 个页面渲染真实 DB 数据
7. ✅ ActionBar 统一应用于所有 Settings 页面
8. ✅ Middleware 白名单已更新

### 仅占位项
- ⚠️ 密码重置：返回"下一版本接入"（User 表有 resetToken/resetTokenExpiry 字段，需实现邮件发送）

### 无未完成项
