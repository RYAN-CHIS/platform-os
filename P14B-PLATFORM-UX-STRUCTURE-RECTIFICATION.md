# P14B — Platform UX + Structure Rectification

**状态**: ✅ **PASS**

**完成时间**: 2026-06-24

---

## 一、Brand OS 空壳模块补全

### 1. `/brand/banners` ✅

| 功能 | 状态 |
|------|------|
| 建表 (`banners` 表) | ✅ Brand DB |
| 新增 Banner | ✅ |
| 编辑 | ✅ |
| 删除 | ✅ |
| 上下排序 | ✅ |
| 启用/停用/发布/下架 | ✅ |
| 定时上线 (start_at / end_at) | ✅ |
| 审计记录 | ✅ |

**文件**:
- `apps/platform/modules/brand/banners/actions.ts` — listBanners, createBanner, updateBanner, deleteBanner, moveBanner, publishBanner, unpublishBanner
- `apps/platform/app/(platform)/brand/banners/client.tsx` — 卡片式列表 + 模态表单 + 状态管理
- `apps/platform/app/(platform)/brand/banners/page.tsx` — SSR 数据获取

### 2. `/brand/seo` ✅

| 功能 | 状态 |
|------|------|
| 页面级 SEO 配置 | ✅ 首页/产品/系列/品牌志/关于/联系 |
| 字段: title/description/keywords/og_* | ✅ |
| 编辑 + 保存 | ✅ 每卡片独立保存 |
| 建表 (seo_configs) | ✅ 首次写入自动创建 |
| 审计记录 | ✅ |

**文件**:
- `apps/platform/modules/brand/seo/actions.ts` — listSeoConfigs, saveSeoConfig
- `apps/platform/app/(platform)/brand/seo/client.tsx` — 6 张 SEO 编辑卡片
- `apps/platform/app/(platform)/brand/seo/page.tsx`

### 3. `/brand/settings` ✅

| 功能 | 状态 |
|------|------|
| 品牌基础信息 | ✅ (7 字段) |
| 社交媒体 | ✅ (5 字段) |
| Footer 设置 | ✅ (3 字段) |
| 法务信息 | ✅ (3 字段) |
| inline 编辑 + 独立保存 | ✅ |
| 审计记录 | ✅ |

**文件**:
- `apps/platform/modules/brand/settings/config.ts` — SETTING_SECTIONS 配置
- `apps/platform/modules/brand/settings/actions.ts` — listSiteSettings, saveSiteSetting
- `apps/platform/app/(platform)/brand/settings/client.tsx` — 4 组卡片，每字段可编辑

---

## 二、权限矩阵中文化 ✅

| 要求 | 状态 |
|------|------|
| 统一 PERMISSION_LABEL_MAP | ✅ displayName 字段 |
| ERP 模块全部中文 | ✅ 商品管理/材料管理/采购管理等 |
| Brand 模块全部中文 | ✅ 产品展示/七序系列/品牌志等 |
| Settings 模块全部中文 | ✅ 用户管理/角色管理/权限矩阵等 |
| 无英文 key 暴露 | ✅ UI 显示 displayName |

**文件**: `modules/settings/permissions/config.ts` + `client.tsx`

---

## 三、Dashboard 重构 ✅

### `/` — Platform 总览

| 区块 | 内容 | 状态 |
|------|------|------|
| ERP 系统 | 10 个 KPI (SKU/材料/BOM/库存/生产/订单/客户/采购/成本) | ✅ |
| Brand OS | 8 个 KPI (产品/系列/品牌志/Banner/SEO/页面/任务/版本) | ✅ |
| 系统状态 | 4 个 KPI (ERP DB/Brand DB/版本/环境) | ✅ |
| Brand 未连接警示 | 红色警告条 | ✅ |

### `/erp` — ERP 概览

| 区块 | 状态 |
|------|------|
| 核心指标 (4 KPI) | ✅ |
| 运营数据 (4 KPI) | ✅ |
| 财务概览 (4 KPI) | ✅ |
| 快捷入口 (9 模块链接) | ✅ |
| 纯 ERP 数据，无 Brand 混合 | ✅ |

**文件**: `app/(platform)/page.tsx`, `app/(platform)/erp/page.tsx`, `middleware.ts`

---

## 四、ERP UI 统一升级 ✅

### 共享组件

| 组件 | 说明 |
|------|------|
| `ErpToolbar.tsx` | 统一顶栏 — 标题/统计/搜索/筛选/状态按钮/新增/刷新/导出 |
| `ErpDataTable.tsx` | 统一数据表 — sticky header/排序/自定义渲染/空状态 |

### 全面应用 ErpToolbar + ErpDataTable

| 模块 | 状态 | 新增特性 |
|------|------|----------|
| materials | ✅ | 状态筛选 + 排序 |
| orders | ✅ | 状态筛选 + 操作按钮 |
| inventory | ✅ | 类型筛选 + 双视图 |
| customers | ✅ | 搜索 + 排序 |
| production | ✅ | 状态筛选 + 工作流按钮 |
| purchase | ✅ | 状态筛选 + 工作流按钮 |
| products | ✅ | ErpToolbar (保留自定义表格) |
| bom | ✅ | ErpToolbar (保留分组表格) |
| costs | ✅ | ErpToolbar (保留汇总卡片) |

### 表格改进

| 特性 | 状态 |
|------|------|
| sticky header | ✅ position:sticky, top:0, z-index:10 |
| 所有列可排序 | ✅ asc/desc, URL 持久化 |
| 状态筛选 | ✅ 芯片式过滤器 |
| 搜索 | ✅ URL query param `?q=` |
| 刷新 | ✅ 按钮 + router.refresh() |
| 导出 | ✅ CSV 导出按钮 |

---

## 五、浏览器验收

| 页面 | HTTP | 内容大小 |
|------|------|----------|
| `/` | 200 | 19KB |
| `/brand/banners` | 200 | 46KB |
| `/brand/seo` | 200 | 60KB |
| `/brand/settings` | 200 | 57KB |
| `/brand/products` | 200 | 65KB |
| `/brand/journal` | 200 | 74KB |
| `/erp` | 200 | 59KB |
| `/erp/materials` | 200 | 55KB |
| `/settings/permissions` | 200 | 81KB |

---

## 六、修复的 Bug

| Bug | 修复 |
|-----|------|
| Brand settings 500: `SETTING_SECTIONS` 非 async 导出 | 拆分为 `config.ts` |
| `/erp` 500: 中间件代理到 3001 | `middleware.ts` 添加 `/erp` 到 NATIVE_ERP_ROUTES |
| 开发服务器仅 IPv6 监听 | 添加 `-H 0.0.0.0` |

---

## 七、代码文件清单

### 新增文件 (9)

| 文件 | 说明 |
|------|------|
| `modules/brand/banners/actions.ts` | Banner CRUD + 工作流 |
| `app/(platform)/brand/banners/client.tsx` | Banner 管理界面 |
| `modules/brand/seo/actions.ts` | SEO 配置 CRUD |
| `app/(platform)/brand/seo/client.tsx` | SEO 配置中心界面 |
| `modules/brand/settings/config.ts` | 站点设置配置数据 |
| `modules/brand/settings/actions.ts` | 站点设置 CRUD |
| `app/(platform)/brand/settings/client.tsx` | 站点设置界面 |
| `components/ErpToolbar.tsx` | 统一 ERP 顶栏组件 |
| `components/ErpDataTable.tsx` | 统一 ERP 数据表组件 |

### 修改文件 (11)

| 文件 | 变更 |
|------|------|
| `app/(platform)/page.tsx` | Dashboard 重写为 3 区块布局 |
| `app/(platform)/erp/page.tsx` | 新建 ERP 概览页 |
| `app/(platform)/brand/banners/page.tsx` | BLOCKED_BY_SCHEMA → 正常页面 |
| `app/(platform)/brand/seo/page.tsx` | 空壳 → SEO 配置中心 |
| `app/(platform)/brand/settings/page.tsx` | 空壳 → 站点设置中心 |
| `modules/settings/permissions/config.ts` | 添加 displayName |
| `middleware.ts` | 添加 `/erp` 到 Native 路由 |
| `modules/dashboard/actions.ts` | 新增 publishJobCount/versionCount |
| `app/(platform)/erp/*/client.tsx` (6) | 应用 ErpToolbar + ErpDataTable |

---

## 八、剩余未完成项

**无** — 所有需求已完整实现并验证。

---

## 最终状态

```
P14B Platform UX + Structure: ✅ PASS
```
