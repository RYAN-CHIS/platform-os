# WO-P8E — Sidebar Real Runtime Fix

**日期**: 2026-06-24
**关联工单**: WO-P8D
**状态**: 代码修复已完成，等待浏览器验收

---

## 一、为什么 P8D 仍然不显示菜单

### 根因

`apps/platform/components/PlatformSidebar.tsx` 第 108-120 行：

```typescript
const { data: session } = useSession();
const role = (session?.user as any)?.role || "viewer";
const permissions: string[] = (session?.user as any)?.permissions || [];
const isAdmin = role === "admin" || ...;
const hasPerm = (code?: string) => {
  if (!code) return true;
  if (isAdmin) return true;
  return permissions.includes(code);
};
```

**问题**：`useSession()` 是异步的。首次渲染时 `session = undefined`，`role = "viewer"`，`permissions = []`，`isAdmin = false`。

此时 `hasPerm(...)` 对所有权限码返回 `false`，**所有带 `permission` 的菜单项被全部过滤**，`visibleSections` 为空数组。

Sidebar 渲染逻辑本身没问题，但 `visibleSections.map()` 遍历空数组，**只渲染了 Logo，没有菜单**。

### P8D 为什么没解决

P8D 只更新了 `sidebar.config.ts`（配置文件），但没有修改 `PlatformSidebar.tsx` 的运行时渲染逻辑。配置文件正确，但运行时权限过滤把全部菜单屏蔽了。

---

## 二、权限过滤已关闭

### 修改内容

`apps/platform/components/PlatformSidebar.tsx`：

```typescript
// WO-P8E: Temporarily disable permission filter — force show all menus
const isAdmin = true;
const hasPerm = (code?: string) => true;
```

### 效果

- `visibleSections` 现在包含所有 4 个 section
- Dashboard（1 项）、ERP（9 项）、Brand OS（10 项）、系统设置（3 项）全部显示
- 后续 SSO / 登录体系就位后，可以恢复权限过滤

---

## 三、visibleSections 现在有多少个 section

| Section | Key | Items |
|---------|------|-------|
| 总览 | `dashboard` | 1 |
| ERP 系统 | `erp` | 9 |
| Brand OS | `brand` | 10 |
| 系统设置 | `settings` | 3 |

**共 4 个 section，23 个菜单项。**

---

## 四、Sidebar 是否真实显示 ERP / Brand / Settings

### 代码状态：✅ 应可显示

- `isAdmin = true` → 所有 `hasPerm()` 返回 `true`
- `enabledModules` 包含 `"dashboard" | "erp" | "brand" | "settings"`
- `visibleSections` 计算逻辑已验证（4 个 section）

### 浏览器验收：待确认

Dev server 已运行（端口 3100），Turbopack Fast Refresh 已应用更改。
请访问 `http://localhost:3100/platform`，确认左侧菜单完整显示。

---

## 五、哪些 404 被修复

### 路由现状

所有 WO-P8E 要求的路由均有对应文件或 catch-all 路由：

| 路径 | 状态 |
|------|------|
| `/platform` | ✅ `app/(platform)/page.tsx` |
| `/erp/dashboard` | ✅ `app/(platform)/erp/dashboard/page.tsx` |
| `/erp/materials` | ✅ `app/(platform)/erp/materials/page.tsx` |
| `/erp/products` | ✅ `app/(platform)/erp/products/page.tsx` |
| `/erp/bom` | ✅ `app/(platform)/erp/bom/page.tsx` |
| `/erp/costs` | ✅ `app/(platform)/erp/costs/page.tsx` |
| `/erp/production` | ✅ `app/(platform)/erp/production/page.tsx` |
| `/erp/inventory` | ✅ `app/(platform)/erp/inventory/page.tsx` |
| `/erp/orders` | ✅ `app/(platform)/erp/orders/page.tsx` |
| `/erp/customers` | ✅ `app/(platform)/erp/customers/page.tsx` |
| `/brand/*` | ✅ `app/(platform)/brand/[[...slug]]/page.tsx` |
| `/settings/*` | ✅ `app/(platform)/settings/[[...slug]]/page.tsx` |

Dev server 日志确认：`GET /erp/materials 200`、`GET /erp/orders 200`。

---

## 六、Brand OS 当前是 native placeholder 还是 proxy 3003

### 当前状态：Native Placeholder

- `/brand/*` 由 `apps/platform` 内的 catch-all 路由直接处理
- Placeholder 页面已更新（WO-P8E），明确显示当前路径和 "placeholder" 状态
- **不依赖** `apps/brand-os`（端口 3003）

### Proxy 配置

`apps/platform/middleware.ts` 中仍有 `/admin/* → localhost:3003` 的代理配置，但 WO-P8E 的路由已迁移至 `/brand/*`，不再使用 `/admin/*`。

### 前台内容控制

当前 Brand OS 页面为 placeholder，**不能实际控制 `www.yunwuorigin.com` 前台内容**。
需要后续完整实现 Brand OS 功能页面（或重新启用 proxy 至运行的 Brand OS 服务）。

---

## 七、浏览器实测结果

### 待验收

我无法直接使用浏览器，请手动验证以下各项：

1. 打开 `http://localhost:3100/platform`
2. 确认左下角显示 `vP8E`
3. 确认左侧 Sidebar 显示 4 个分组（总览、ERP 系统、Brand OS、系统设置）
4. 确认 ERP 系统下有 9 个菜单项
5. 确认 Brand OS 下有 10 个菜单项
6. 确认系统设置下有 3 个菜单项
7. 点击任意菜单项，确认不 404
8. 确认页面标题/placeholder 正确显示

### Dev Server 日志（部分）

```
GET /platform 200 ✅
GET /erp/materials 200 ✅
GET /erp/orders 200 ✅
GET /logo.svg 200 ✅（已修复 404）
```

---

## 八、最终状态

```
Platform Runtime Status: ???
```

**需要浏览器验收后才能确定 PASS 或 FAIL。**

### 如果浏览器中菜单仍不显示

可能原因：
1. 浏览器缓存 → 清除缓存或硬刷新（Cmd+Shift+R）
2. Turbopack 未应用更改 → 重启 dev server
3. `usePathname` hook 名称错误 → 检查 Next.js 16 的 API

### 如果浏览器中菜单已显示

```
Platform Runtime Status: PASS
```

---

## 九、后续建议

1. **恢复权限过滤**（WO-P8E 完成后）：等 SSO / 登录体系就位后，把 `isAdmin` 改回根据 session 判断
2. **实现 Brand OS 功能页面**：当前是 placeholder，需要实际功能
3. **实现 Settings 功能页面**：当前是 placeholder
4. **清理 middleware.ts**：移除或更新 `/admin/*` proxy 配置

---

## 十、修改文件清单

| 文件 | 修改内容 |
|------|-----------|
| `apps/platform/components/PlatformSidebar.tsx` | 关闭权限过滤、`isAdmin=true`、`hasPerm=()=>true`、清理无用变量、版本 vP8E、logo 引用修复 |
| `packages/platform/config/permissions.config.ts` | 添加 `ERP_ACCESS` 权限（P8D 已完成）|
| `packages/platform/config/sidebar.config.ts` | 按 WO-P8D 重建完整配置（P8D 已完成）|
| `apps/platform/public/logo.svg` | 新建 SVG logo（修复 404）|
| `apps/platform/app/(platform)/brand/[[...slug]]/page.tsx` | 更新为明确 placeholder |
| `apps/platform/app/(platform)/settings/[[...slug]]/page.tsx` | 更新为明确 placeholder |
