# YUNWU SYSTEM MAP v2

> 生成日期：2026-06-22 21:24 CST
> Vercel Team: yunwu1
> 审计范围：全部 Vercel 项目 + 自定义域名

---

## 官网生产链路

| 属性 | 值 |
|---|---|
| **Vercel Project** | `yunwu-origin` |
| **Project ID** | `prj_hFRsSAfVhPovgGECvrkjOTPQBshM` |
| **生产域名** | `www.yunwuorigin.com` |
| **裸域** | `yunwuorigin.com` (待配置) |
| **GitHub** | `RYAN-CHIS/yunwu-origin` (main) |
| **Framework** | Next.js (Node 24.x) |
| **Build Command** | `npx prisma generate && next build` |
| **环境变量** | DATABASE_URL, DATABASE_URL_UNPOOLED, NEXTAUTH_SECRET, NEXTAUTH_URL |

```
DNS:
  www.yunwuorigin.com → Vercel DNS
  yunwuorigin.com     → 待配置 (建议 A 76.76.21.21)

部署链路:
  GitHub (RYAN-CHIS/yunwu-origin, main)
    └─→ Vercel (yunwu-origin)
          └─→ www.yunwuorigin.com
```

---

## ERP 生产链路

| 属性 | 值 |
|---|---|
| **Vercel Project** | `yunwu-brand-os` |
| **Project ID** | `prj_cHNi0Y2UPlzTscfirERqavdTBTvS` |
| **生产域名** | `erp.yunwuorigin.com` |
| **GitHub** | `RYAN-CHIS/yunwu-erp` (main) |
| **Framework** | Next.js (Node 24.x) |
| **环境变量** | DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL |

```
DNS:
  erp.yunwuorigin.com → CNAME → 01950ad7d7de71ca.vercel-dns-017.com

部署链路:
  GitHub (RYAN-CHIS/yunwu-erp, main)
    └─→ Vercel (yunwu-brand-os)
          └─→ erp.yunwuorigin.com
```

---

## 归档项目

| 属性 | 值 |
|---|---|
| **Vercel Project** | `archive-yunwu-erp` |
| **原名称** | `yunwu-erp` |
| **Project ID** | `prj_cr9cKUZ6BOOq7vOMupKvKNa7IWHz` |
| **归档日期** | 2026-06-22 21:22 CST |
| **归档原因** | 与 yunwu-brand-os 同一仓库重复部署，无自定义域名 |
| **GitHub** | ⛓️‍💥 已断开 (原 RYAN-CHIS/yunwu-erp) |
| **环境变量** | BLOB_STORE_ID, BLOB_WEBHOOK_PUBLIC_KEY, BLOB_READ_WRITE_TOKEN (保留) |
| **Deployment Protection** | SSO: all_except_custom_domains |

---

## 禁止删除项目

| 项目 | 原因 |
|---|---|
| **yunwu-brand-os** | 生产 ERP，承载 `erp.yunwuorigin.com` |
| **yunwu-origin** | 生产官网，承载 `www.yunwuorigin.com` |
| **archive-yunwu-erp** | 归档项目，保留部署历史和环境变量 |

---

## Vercel 项目全景

```
yunwu1 Team
├── yunwu-origin          🟢 生产官网     www.yunwuorigin.com
├── yunwu-brand-os        🟢 生产ERP      erp.yunwuorigin.com
└── archive-yunwu-erp     🗄️ 已归档       (无域名)
```

---

## 回滚方案

如需恢复 `archive-yunwu-erp`：

1. 重命名：`archive-yunwu-erp` → `yunwu-erp`
   ```
   vercel project rename archive-yunwu-erp yunwu-erp --scope yunwu1
   ```
2. 重新连接 GitHub（如需）：
   ```
   vercel git connect https://github.com/RYAN-CHIS/yunwu-erp --scope yunwu1
   ```
3. 环境变量已保留，无需恢复
