# Database Discovery Report — WO-Database-Discovery

> **审计日期**: 2026-06-23

---

## 1. Database Inventory

### Database A: Brand/Web DB ✅ Accessible

| Field | Value |
| --- | --- |
| **Host** | `ep-morning-sun-aoo4dk3t-pooler.c-2.ap-southeast-1.aws.neon.tech` |
| **Provider** | Neon (Serverless PostgreSQL) |
| **Region** | Singapore (aws-ap-southeast-1) |
| **Database** | `neondb` |
| **User** | `neondb_owner` |
| **Tables** | 17 (Brand content only) |
| **ERP Tables** | ❌ **NONE** (0 erp_* tables) |
| **Brand Tables** | 1 (`brand_product_content` — added by WO-P4A) |

### Database B: ERP Production ❌ No Access

| Field | Value |
| --- | --- |
| **Host** | `ep-polished-unit-ajk5rq34.us-east-2.aws.neon.tech` |
| **Provider** | Neon |
| **Region** | US-East (aws-us-east-2) |
| **Status** | ❌ Connection refused (wrong credentials or defunct) |

### Database C: ERP Staging ❌ No Access

| Field | Value |
| --- | --- |
| **Host** | `ep-divine-sun-ajtlfa39.us-east-2.aws.neon.tech` |
| **Provider** | Neon |
| **Region** | US-East |
| **Status** | ❌ Connection refused (wrong credentials or defunct) |

---

## 2. Database Contents (Database A — only one accessible)

| Table | Rows | Type |
| --- | --- | --- |
| `admin_users` | 2 | Brand auth |
| `audit_logs` | 0 | Empty |
| `brand_product_content` | 5 | WO-P4A migration |
| `contact_leads` | 1 | CRM lead |
| `journal_posts` | 6 | Brand content |
| `products` | 5 | Brand display products |
| `series` | 7 | Brand narrative |
| Rest (10 tables) | 0 | Empty |

---

## 3. Gap Analysis

| What Platform ERP Needs | Available? | Source |
| --- | --- | --- |
| `erp_materials` | ❌ | Needs ERP DB access |
| `erp_products` / `erp_product_skus` | ❌ | Needs ERP DB access |
| `erp_orders` | ❌ | Needs ERP DB access |
| `erp_customers` | ❌ | Needs ERP DB access |
| `erp_bom` | ❌ | Needs ERP DB access |
| `erp_inventory_transactions` | ❌ | Needs ERP DB access |
| `erp_production_records` | ❌ | Needs ERP DB access |
| `users` (canonical) | ❌ | Uses `admin_users` instead |
| `brand_product_content` | ✅ 5 rows | Present |
| `brand_series` (content) | ✅ 7 rows | Present |

---

## 4. Conclusion

# 🔴 DATABASE BLOCKED

**根因**: ERP 数据库凭据不可用。当前可访问的数据库 (Singapore) 仅有 Brand 内容数据，不含任何 ERP 业务表。

**Platform ERP 当前状态**: 代码完整（7 个模块，54 个 Service 方法），但**无法连接到 ERP 数据源**。

## Required Actions

| Priority | Action |
| --- | --- |
| 🔴 P0 | 获取 ERP 生产数据库凭据（`ep-polished-unit-ajk5rq34`） |
| 🟡 P1 | 或将 Brand/Web DB 作为统一数据库，通过 Canonical Schema 部署 ERP 表 |
| 🟡 P1 | 配置 Vercel 环境变量 `DATABASE_URL` 指向 ERP 数据库 |
| 🟢 P2 | 验证 `ERP_USE_SERVICE_LAYER=true` 可正常工作 |

## For Vercel Deployment

需要设置的环境变量：
```
DATABASE_URL=postgresql://neondb_owner:<ERP_PASSWORD>@<ERP_HOST>/neondb?sslmode=require
DIRECT_DATABASE_URL=postgresql://neondb_owner:<ERP_PASSWORD>@<ERP_DIRECT_HOST>/neondb?sslmode=require
NEXTAUTH_SECRET=<generated>
NEXTAUTH_URL=https://app.yunwu.com
ERP_USE_SERVICE_LAYER=true
```

> **状态**: 🔴 Blocked — 需要 ERP 数据库凭据才能继续部署
