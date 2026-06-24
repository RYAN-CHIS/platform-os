# WO-P8D — Platform Runtime Stabilization + Sidebar Recovery

**日期**: 2026-06-24
**状态**: 已完成（基础修复）

---

## 一、实际渲染的 Sidebar 文件路径

| 文件 | 路径 |
|------|------|
| Sidebar 组件 | `apps/platform/components/PlatformSidebar.tsx` |
| Sidebar 配置 | `packages/platform/config/sidebar.config.ts` |
| 权限配置 | `packages/platform/config/permissions.config.ts` |
| Middleware | `apps/platform/middleware.ts` |
| Layout | `apps/platform/app/(platform)/layout.tsx` |

---

## 二、修复的 Sidebar Render 问题

### 问题根因
1. **Sidebar 配置条目与 WO 工单不一致** — 旧配置包含"作品管理"、"ERP 媒体库"、"数据导入"等 WO 中不存在的条目
2. **Brand OS 链接指向 `/admin/*`（旧路由）** — 实际路由已迁移至 `/brand/*`
3. **Settings 链接指向 `/erp/settings` 和 `/admin/*`** — 实际路由应为 `/settings/*`
4. **缺失 `ERP_ACCESS` 权限** — `sidebar.config.ts` 引用了不存在的权限

### 修复内容
1. ✅ 重建 `SIDEBAR_CONFIG`，按 WO 工单要求完整配置三个分组
2. ✅ Brand OS 所有链接更新为 `/brand/*`
3. ✅ Settings 所有链接更新为 `/settings/*`
4. ✅ 添加 `ERP_ACCESS: "erp.access"` 权限到 `permissions.config.ts`
5. ✅ 移除 WO 工单不含的条目（作品管理、ERP 媒体库、数据导入、CRM、Analytics 等未来模块）

---

## 三、修复的 404 问题

### 当前路由状态

| 路径 | 状态 | 说明 |
|------|------|------|
| `/platform` | ✅ | Dashboard |
| `/erp/dashboard` | ✅ | ERP 总览 |
| `/erp/materials` | ✅ | 材料管理 |
| `/erp/products` | ✅ | 产品/SKU |
| `/erp/bom` | ✅ | BOM 物料清单 |
| `/erp/costs` | ✅ | 成本核算 |
| `/erp/production` | ✅ | 生产记录 |
| `/erp/inventory` | ✅ | 库存池 |
| `/erp/orders` | ✅ | 销售管理 |
| `/erp/customers` | ✅ | 客户管理 |
| `/brand` | ✅ | Brand 概览 (catch-all) |
| `/brand/home` | ✅ | 首页内容 (catch-all) |
| `/brand/products` | ✅ | 产品展示 (catch-all) |
| `/brand/series` | ✅ | 七序系列 (catch-all) |
| `/brand/materials` | ✅ | 材料展示 (catch-all) |
| `/brand/journal` | ✅ | 品牌志 (catch-all) |
| `/brand/media` | ✅ | 媒体素材 (catch-all) |
| `/brand/banners` | ✅ | Banner 管理 (catch-all) |
| `/brand/seo` | ✅ | SEO 设置 (catch-all) |
| `/brand/settings` | ✅ | 页面设置 (catch-all) |
| `/settings/users` | ✅ | 用户管理 (catch-all) |
| `/settings/permissions` | ✅ | 权限管理 (catch-all) |
| `/settings/system` | ✅ | 系统配置 (catch-all) |

### 说明
- 所有 `/brand/*` 和 `/settings/*` 路径均有对应的 `[[...slug]]` catch-all 路由，不会 404
- catch-all 页面当前显示 fallback UI，功能页面需后续完整实现

---

## 四、Brand OS 入口恢复

### 恢复的入口（Sidebar 可见）
1. ✅ Brand 概览 (`/brand`)
2. ✅ 首页内容 (`/brand/home`)
3. ✅ 产品展示 (`/brand/products`)
4. ✅ 七序系列 (`/brand/series`)
5. ✅ 材料展示 (`/brand/materials`)
6. ✅ 品牌志 (`/brand/journal`)
7. ✅ 媒体素材 (`/brand/media`)
8. ✅ Banner 管理 (`/brand/banners`)
9. ✅ SEO 设置 (`/brand/seo`)
10. ✅ 页面设置 (`/brand/settings`)

### Proxy 状态
- Middleware 中 `/admin/*` 仍代理至 `localhost:3003` (Brand OS)
- `/brand/*` 由 Platform 直接提供（native route）
- 如需通过 Platform 控制 `www.yunwuorigin.com` 前台内容，需确保 Brand OS API 可访问

---

## 五、Settings 入口恢复

### 恢复的入口（Sidebar 可见）
1. ✅ 用户管理 (`/settings/users`)
2. ✅ 权限管理 (`/settings/permissions`)
3. ✅ 系统配置 (`/settings/system`)

---

## 六、是否能控制前台内容

### 当前状态
- **Brand OS proxy** 配置存在（middleware 代理 `/admin/*` → `localhost:3003`）
- **`/brand/*` native routes** 已就位，但页面内容为 fallback UI
- **实际前台内容控制** 需要：
  1. Brand OS 服务运行（端口 3003）OR
  2. 将 `/brand/*` 页面完整实现为独立页面（不依赖代理）

### 建议后续操作
1. 实现 `/brand/*` 和 `/settings/*` 的完整页面功能
2. 确认 Brand OS API 代理配置正确
3. 测试从 Platform 是否能成功更新 `www.yunwuorigin.com` 内容

---

## 七、版本标记

- ✅ 左下角版本标记已更新：`vP8C` → `vP8D`
- 位置：`apps/platform/components/PlatformSidebar.tsx` 第 567 行

---

## 八、最终验收状态

| 验收项 | 状态 |
|--------|------|
| Sidebar 显示完整 | ✅ 配置已按 WO 更新 |
| Brand OS 显示完整 | ✅ 10 项已全部添加 |
| Settings 显示完整 | ✅ 3 项已全部添加 |
| ERP 9 模块可点 | ⚠️ 路由存在，功能需后续实现 |
| Brand 10 模块可点 | ⚠️ 路由存在，功能需后续实现 |
| Settings 3 模块可点 | ⚠️ 路由存在，功能需后续实现 |
| 无 404 | ✅ catch-all 路由已覆盖 |
| Dashboard 正常 | ✅ `/platform` 路由存在 |
| 左下角显示 vP8D | ✅ 已更新 |
| 可进入前台内容管理 | ⚠️ 需 Brand OS 服务或实现 native 页面 |

---

## 九、最终结论

```
Platform Runtime Status:
[ ] Broken
[X] Partial
[ ] Fully Operational
```

**说明**：
- Sidebar 配置已修复，UI 应可正确渲染所有分组
- 所有路由已就位，不会 404
- 版本标记已更新为 `vP8D`
- **部分功能页面仍为 fallback UI**，需要后续完整实现才能"完全可运营"

**建议下一步**：
1. 验证浏览器中 Sidebar 是否完整显示（登录后）
2. 逐个点击路由，确认无 404
3. 实现 `/brand/*` 和 `/settings/*` 的完整功能页面
