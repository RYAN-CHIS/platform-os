# WO-P9B — Brand Dual Database Bridge

> **日期**: 2026-06-25  
> **状态**: ✅ Complete — Brand core pages connected to real data

## 1. Dual Database Architecture

```
Platform (3100)
  ├─ ERP Modules → DATABASE_URL (Neon US-East) → 18 tables ✅
  └─ Brand Pages → BRAND_DATABASE_URL (Neon Singapore) → 17 tables ✅
```

## 2. Brand Services Created

| Service | Methods | Target Table | Verified |
| --- | --- | --- | --- |
| `BrandProductService` | list, count, getBySku | `products` (Brand DB) | ✅ 5 rows |
| `BrandSeriesService` | list, count | `series` (Brand DB) | ✅ 7 rows |
| `BrandJournalService` | list, count | `journal_posts` (Brand DB) | ✅ 6 rows |

## 3. Fixed Pages

| Page | Before | After | Data |
| --- | --- | --- | --- |
| `/brand/products` | Broken (brandProduct → non-existent table) | Direct Brand DB | ✅ 5 products |
| `/brand/series` | Broken (brandSeries → non-existent table) | Direct Brand DB | ✅ 7 series |
| `/brand/journal` | Broken (journalPosts → wrong DB) | Direct Brand DB | ✅ 6 posts |
| `/brand/banners` | Placeholder | Placeholder | 📋 |
| `/brand/home` | Placeholder | Placeholder | 📋 |
| `/brand/materials` | Placeholder | Placeholder | 📋 |
| `/brand/media` | Placeholder | Placeholder | 📋 |
| `/brand/seo` | Placeholder | Placeholder | 📋 |
| `/brand/settings` | Placeholder | Placeholder | 📋 |

## 4. Build

✅ PASS (dynamic `await import("@prisma/client")` — runtime only)

## 5. Remaining

| Module | Status |
| --- | --- |
| Brand Banners | 📋 Needs own service |
| Brand Materials | 📋 Needs own service |
| Brand Media | 📋 Needs own service |
| Brand SEO | 📋 Needs own service |
| Brand Settings | 📋 Needs own service |
| Frontend sync | 🔴 Platform changes → Web frontend still needs verification |
