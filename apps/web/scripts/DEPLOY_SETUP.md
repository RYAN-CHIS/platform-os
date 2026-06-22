# 允物官网 — V1.2 部署检查清单

> ✅ 数据库迁移已完成（Neon PostgreSQL）
> ✅ 代码已推送到 GitHub（main 分支）
> ⚠️ 需要在 Vercel Dashboard 设置环境变量
> ✅ 设置后 Git Push 即可自动上线

---

## ⚠️ 唯一需要手动的步骤：设置 Vercel 环境变量

打开 Vercel Dashboard → 允物项目 → Settings → Environment Variables
添加以下 2 个环境变量（Production 环境）：

| 变量名 | 值 |
|--------|-----|
| DATABASE_URL | postgresql://neondb_owner:npg_uDbxK58hWIRf@ep-morning-sun-aoo4dk3t-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require |
| DIRECT_DATABASE_URL | postgresql://neondb_owner:npg_uDbxK58hWIRf@ep-morning-sun-aoo4dk3t.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require |

> ⚠️ DATABASE_URL 是连接池 URL（pooler），DIRECT_DATABASE_URL 是直连 URL

---

## 已完成工作

| 步骤 | 状态 |
|------|------|
| Neon PostgreSQL 数据库创建（新加坡） | ✅ |
| Prisma Schema 迁移到 PostgreSQL | ✅ |
| 数据库 Schema 推送 | ✅ |
| Prisma Migration 文件生成 | ✅ |
| ERP 数据同步（19 件作品） | ✅ |
| Journal 文章预置（4 篇） | ✅ |
| 本地构建验证（30 routes） | ✅ |
| 移除 vercel.json 中硬编码的 SQLite URL | ✅ |
| 创建 deploy.sh 一键部署脚本 | ✅ |
| 添加 npm run deploy 命令 | ✅ |
| Git 推送 | ✅ |

---

## 日常部署流程

```bash
# 方式一：一键部署
npm run deploy

# 方式二：手动分步
npm run build      # 本地构建验证
git add -A
git commit -m "备注"
git push           # 推送后 Vercel 自动上线
```

---

## 数据库信息

- **提供商**：Neon (Serverless PostgreSQL)
- **项目 ID**：red-flower-63232801
- **区域**：aws-ap-southeast-1（新加坡）
- **分支**：main (br-square-river-aoxyphvc)
- **管理控制台**：https://console.neon.tech
