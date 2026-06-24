# WO-P8C-LAST — Force Sidebar Render Debug

> **日期**: 2026-06-24  
> **状态**: ✅ Debug deployed

## Debug 已添加

`apps/platform/components/PlatformSidebar.tsx` line ~145:

```typescript
if (typeof window !== "undefined") {
  console.log("[P8C-DEBUG] role:", role, "isAdmin:", isAdmin);
  console.log("[P8C-DEBUG] permissions:", permissions.slice(0, 5), "... total:", permissions.length);
  console.log("[P8C-DEBUG] enabledModules:", enabledModules);
  console.log("[P8C-DEBUG] visibleSections:", visibleSections.map(s => ({ key: s.key, label: s.label, items: s.items.length })));
}
```

## Sidebar Config Verified

```
Sections: dashboard(仪表盘), erp(ERP系统), brand(Brand OS), crm(CRM),
          analytics, supplier, finance, ai, settings(系统管理)

Brand OS: brand module, 7 items
  - 七序叙事, 器物展示, 材料研究, 品牌志(+子菜单), 页面内容, 标签系统, 媒体中心

Settings: 3 children
  - 用户管理, 权限配置, 系统状态
```

## 3100 Status

```
Restarted: PID 1624
Port: 3100 LISTEN
.next: Cleaned
```

## 下一步

打开浏览器 → `http://localhost:3100/platform` → 登录 → 打开 DevTools Console (F12)

查看 terminal 输出或 browser console:

```
[P8C-DEBUG] role: ...
[P8C-DEBUG] visibleSections: [...]
```

如果 `visibleSections` 包含 `{ key: "brand", label: "Brand OS", items: 7 }` → 数据正确，问题在 JSX render  
如果 `visibleSections` 不包含 brand → 权限过滤问题 (需要登录)
