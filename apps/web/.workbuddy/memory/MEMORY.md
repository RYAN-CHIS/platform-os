# 允物独立站后台管理系统 — 项目记忆

## 项目定位
本工作区专门用于允物（Yunwu）品牌独立站的**后台管理系统**开发，不涉及前台页面。
- 前台页面在主工作区 `/Users/ryan/WorkBuddy/2026-06-18-02-40-15/yunwu-origin/` 开发
- 本工作区只处理 `/src/app/admin/*`、API 路由、Prisma Schema、认证系统等后台相关内容

## 技术栈
- Next.js 15 App Router + TypeScript + Tailwind CSS
- Prisma ORM + Neon PostgreSQL
- NextAuth v4 (CredentialsProvider + JWT)
- Server Actions 模式
- Vercel Blob (图片存储)
- Vercel 部署

## 后台模块
| 路由 | 功能 |
|------|------|
| /admin | 仪表盘 |
| /admin/login | 登录页 |
| /admin/series | 七序体系 CRUD |
| /admin/objects | 器物体系 CRUD |
| /admin/products | 作品 CRUD |
| /admin/materials | 材料研究 CRUD |
| /admin/journal | 品牌志 CRUD |
| /admin/leads | 潜在线索管理 |
| /admin/media | 图片资产库 |
| /admin/seo | SEO 中心 |
| /admin/settings | 系统设置 |

## 预设管理员
admin@yunwuorigin.com / yunwu2025

## 启动命令
```bash
cd /Users/ryan/WorkBuddy/yunwu-admin && npm install && npm run dev
```

## 品牌速查
- 品牌名：允物 | 品牌哲学：见素抱朴
- 七序：芙初→栖迟→观复→游方→守拙→归心→藏真
- 五器物体系：见己/留痕/栖居/随行/传藏
- 核心约束：不以电商逻辑开发、不做促销/优惠券/秒杀功能
