# Brand DB 手动迁移记录

> 记录所有因 Prisma CLI 不兼容而手动执行的数据库变更。
> 目标数据库：`neondb` @ `ep-morning-sun-aoo4dk3t-pooler.c-2.ap-southeast-1.aws.neon.tech`
> 项目：允物 Brand OS (`yunwu-brand-os`)

---

## 迁移 #1: 添加 `sort_order` 列

| 项目 | 详情 |
|------|------|
| **执行时间** | 2026-06-24 10:20 GMT+8 |
| **执行人** | 迟硕（瑞安）via WO-P12B |
| **目标数据库** | Brand DB (`neondb`) |
| **原因** | P12B Brand CRUD 需要排序功能。`products` 和 `journal_posts` 表缺少 `sort_order` 列。`series` 表已有此列。 |
| **变更类型** | ALTER TABLE ADD COLUMN |

### SQL

```sql
-- 1. products 表
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- 2. journal_posts 表
ALTER TABLE journal_posts
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
```

### 影响表

| 表 | 变更 | 默认值 | 可空 |
|----|------|--------|------|
| `products` | + `sort_order INTEGER` | `0` | NOT NULL |
| `journal_posts` | + `sort_order INTEGER` | `0` | NOT NULL |

### 回滚方案

```sql
ALTER TABLE products DROP COLUMN IF EXISTS sort_order;
ALTER TABLE journal_posts DROP COLUMN IF EXISTS sort_order;
```

### 相关工单

- WO-P12B — Brand OS Action Bar + Minimal CRUD
- WO-P12C — Brand CRUD Browser Acceptance + DB Change Hardening

---

## Prisma 版本不兼容风险

| 项目 | 版本 |
|------|------|
| 项目 Prisma Client (`@prisma/client`) | 6.19.3 |
| 全局 Prisma CLI (`npx prisma`) | 7.8.0 |
| 兼容状态 | ❌ 不兼容 — `db push` / `generate` / `migrate` 均失败 |

### 短期方案（当前）

1. 使用 `$queryRawUnsafe` 执行所有 CRUD
2. 手动记录所有 schema 变更到此文档
3. 通过 `information_schema.columns` 校验实际表结构

### 长期方案

1. 统一 `@prisma/client` 和 `prisma` CLI 到同一版本（推荐 7.x）
2. 建立正式的 Prisma migration 流程 (`prisma migrate dev`)
3. 将 `schema.prisma` 作为唯一事实来源，所有变更通过 migration

### 已知 NOT NULL 列（无 DEFAULT）

这些列在 `$queryRawUnsafe` INSERT 时必须显式提供：

| 表 | 列名 | 类型 |
|----|------|------|
| `products` | `updated_at` | `timestamptz` |
| `series` | `updatedAt` | `timestamptz` |
| `journal_posts` | `updated_at` | `timestamptz` |
| `journal_posts` | `id` | `text` (CUID, 非自增) |

### 已知枚举差异

| 表 | 列 | Prisma Schema 枚举 | DB 实际值 |
|----|-----|-------------------|-----------|
| `journal_posts` | `status` | `PublishStatus` | `DRAFT` / `PUBLISHED` (大写) |
| `products` | `status` | `text` | `draft` / `PUBLISHED` / `inactive` (混合) |
| `products` | `object_category` | `ObjectCategory` | `BRACELET` / `PENDANT` 等 |

---

## 变更历史

| 日期 | 工单 | 变更 |
|------|------|------|
| 2026-06-24 | P12B / P12C | + `sort_order` on products, journal_posts |
