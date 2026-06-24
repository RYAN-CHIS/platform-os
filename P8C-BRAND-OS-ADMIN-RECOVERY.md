# WO-P8C — Brand OS Admin Recovery for Platform 3100

> **日期**: 2026-06-24  
> **状态**: ✅ 完成

## 1. 恢复的侧边栏入口

| 菜单 | 路径 | Proxy | 状态 |
| --- | --- | --- | --- |
| Brand OS > 七序叙事 | `/admin/series` | → Brand OS :3003 | ✅ |
| Brand OS > 器物展示 | `/admin/objects` | → Brand OS :3003 | ✅ |
| Brand OS > 材料研究 | `/admin/materials` | → Brand OS :3003 | ✅ |
| Brand OS > 品牌志 | `/admin/journal` + `/new` | → Brand OS :3003 | ✅ |
| Brand OS > 页面内容 | `/admin/content` | → Brand OS :3003 | ✅ |
| Brand OS > 标签系统 | `/admin/tags` | → Brand OS :3003 | ✅ |
| Brand OS > 媒体中心 | `/admin/media` | → Brand OS :3003 | ✅ |
| Brand OS > SEO 配置 | `/admin/seo` | → Brand OS :3003 | ✅ |

## 2. Brand OS 当前模式

**Proxy** — Platform 3100 通过 middleware 将 `/admin/*` 代理到 Brand OS (port 3003)。Brand OS 连接 Database A (Singapore)。

## 3. 数据库确认

| App | 数据库 | 用途 |
| --- | --- | --- |
| `apps/platform` | Database B (ERP US-East) | ERP 核心 |
| `apps/web` | Database A (Singapore) | 公共网站 yunwuorigin.com |
| `apps/brand-os` | Database A (Singapore) | 网页管理后台 |

Brand OS 和 Web 共享 Database A，正确连接前台数据库。

## 4. Dashboard 新增

| 卡片 | 数据源 |
| --- | --- |
| Brand OS / 网页管理 | Database A — 系列 7, 产品 5, 品牌志 6, 媒体 0 |

## 5. Brand 页面可访问性

| URL | 状态 |
| --- | --- |
| `/admin/series` | ✅ Proxy → Brand OS |
| `/admin/objects` | ✅ Proxy → Brand OS |
| `/admin/materials` | ✅ Proxy → Brand OS |
| `/admin/journal` | ✅ Proxy → Brand OS |
| `/admin/content` | ✅ Proxy → Brand OS |
| `/admin/tags` | ✅ Proxy → Brand OS |
| `/admin/media` | ✅ Proxy → Brand OS |
| `/admin/seo` | ✅ Proxy → Brand OS |
| `/admin/leads` | ✅ Proxy → Brand OS |
| `/admin/audit` | ✅ Proxy → Brand OS |
| `/admin/settings` | ✅ Proxy → Brand OS |

## 6. Build

✅ PASS

## 7. 待后续原生迁移

| 页面 | 当前 | 计划 |
| --- | --- | --- |
| 品牌志创建/编辑 | Proxy | WO-P8D 原生迁移 |
| 媒体上传 | Proxy | WO-P8D 原生迁移 |
| SEO 批量管理 | Proxy | WO-P8D 原生迁移 |
| 页面内容编辑 | Proxy | WO-P8D 原生迁移 |
