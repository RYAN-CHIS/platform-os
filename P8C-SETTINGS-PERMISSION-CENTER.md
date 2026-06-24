# WO-P8C — Settings + Permission Center

> **日期**: 2026-06-24  
> **状态**: ✅ 完成

## 1. Data

| Entity | Count |
| --- | --- |
| Users | 7 (1 SUPER_ADMIN, 2 admin/operator, 4 viewer) |
| Permissions | 34 |
| Permission Groups | 16 |
| Permission Templates | 5 |

## 2. New Files

| File | Route | Purpose |
| --- | --- | --- |
| `app/(platform)/erp/settings/users/page.tsx` | `/erp/settings/users` | User list table (email, name, role, date) |
| `app/(platform)/erp/settings/permissions/page.tsx` | `/erp/settings/permissions` | Permission groups view (16 groups × codes) |
| `app/(platform)/erp/settings/system/page.tsx` | `/erp/settings/system` | System info (tables, users, env vars) |

## 3. Modified Files

| File | Change |
| --- | --- |
| `apps/platform/middleware.ts` | +`/erp/settings` in NATIVE_ERP_ROUTES |
| `packages/platform/config/sidebar.config.ts` | +系统管理 section (users, permissions, system sub-items) |

## 4. Build

✅ PASS

## 5. Known Issue

Canonical Schema `UserRole` enum mismatch with legacy DB. Legacy uses strings (`"admin"`, `"operator"`, `"viewer"`), Canonical expects enum (`SUPER_ADMIN`, `ERP_ADMIN`...). Pages use raw SQL queries to avoid enum errors. Fix needed in future Schema reconciliation.

## 6. ERP Module Status

| Module | Status |
| --- | --- |
| Materials | ✅ |
| Products | ✅ |
| BOM | ✅ |
| Inventory | ✅ |
| Production | ✅ |
| Orders | ✅ |
| Customers | ✅ |
| Costs | ✅ |
| **Settings** | ✅ **Done** |
| Media | 📋 |
| Import/Export | 📋 |
