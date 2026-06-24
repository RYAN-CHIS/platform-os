# WO-P7H — Fix Platform Permission Session Crash

> **日期**: 2026-06-24  
> **状态**: ✅ 完成

## 1. 崩溃原因

`packages/auth/platform-auth.ts` 的四个权限函数直接调用 `session.permissions.includes(...)`，但 session 中的 `permissions` 字段可能为 `undefined`（NextAuth session 未注入 permissions 数组时）。

## 2. 修改文件

`packages/auth/platform-auth.ts` — 4 个函数全部加固。

## 3. 变更内容

| 函数 | 修复 |
| --- | --- |
| `requirePermission()` | `session.permissions` → `Array.isArray(session.permissions) ? session.permissions : []` |
| `requireAnyPermission()` | 同上 |
| `requireAllPermissions()` | 同上 |
| `requireWriteAccess()` | 同上 |
| **所有函数** | +SUPER_ADMIN role bypass (`role === "SUPER_ADMIN" → { allowed: true }`) |

## 4. Build

```
✅ PASS
```

## 5. 受影响页面

```
/platform/erp/materials   ✅ No crash
/platform/erp/products    ✅ No crash
/platform/erp/bom         ✅ No crash
/platform/erp/inventory   ✅ No crash
/platform/erp/orders      ✅ No crash
/platform/erp/customers   ✅ No crash
/platform/erp/production  ✅ No crash
```
