# PHASE 3 PLATFORM RUNTIME REPORT

**执行日期**: 2026-06-22
**状态**: ✅ COMPLETE

---

## IDENTITY

### Platform User Model (`packages/auth/identity.ts`)

```
PlatformUser {
  id: string
  email: string
  name: string | null
  role: UserRole           ← 用于初始能力计算
  access: {                ← 运行时决策依据（system-capability-based）
    erp:  { canRead, canWrite, canAdmin }
    web:  { canRead, canWrite, canAdmin }
    brand:{ canRead, canWrite, canAdmin }
  }
  activeSystem: SystemId   ← 当前活跃系统
}
```

### 角色 → 系统能力映射

| 角色 | ERP | Web | Brand |
|------|-----|-----|-------|
| SUPER_ADMIN | RWX | RWX | RWX |
| ERP_ADMIN | RWX | R-- | --- |
| BRAND_ADMIN | --- | RWX | RWX |
| WEB_ADMIN | --- | RWX | R-- |
| EDITOR | --- | RW- | RW- |
| VIEWER | --- | R-- | R-- |

### Session Bridge

```
NextAuth JWT → getPlatformUser(req) → PlatformUser
                                    → buildRequestContext(user, sys) → RequestContext
                                    → toAccessContext(user) → AccessContext → Control Plane
```

---

## GATEWAY

### API Gateway 标准化（`packages/db/enforce/api-gateway.ts`）

```ts
// Phase 3 推荐入口：platformGateway (system-capability-based)
platformGateway(platformUser, "erp", "product", "write", async (ctx) => {
  // ctx.platformUser — 完整用户
  // ctx.access       — control plane 格式
  // ctx.system       — 当前系统
  return Response.json(...);
});

// Phase 2 兼容入口：apiGatewayWithUser (role-based)
apiGatewayWithUser(accessContext, "erp", "product", "write", handler);
```

### Enforcement 状态

| 组件 | 状态 |
|------|------|
| `platformGateway()` | ✅ system-capability-based |
| `apiGateway()` | ✅ 兼容 Phase 2 |
| `requireAccess()` | ✅ 三重校验 |
| `AccessDeniedError` | ✅ HTTP 403 |

---

## SYSTEM FLOW

### 跨系统用户流动

```
ERP_ADMIN → ERP (读写) → Web (只读查看产品) ✅
BRAND_ADMIN → Brand (全权限) → Web (全权限) ✅
VIEWER → Web (只读) → Brand (只读) ✅
ERP_ADMIN → Brand (无权限) ❌ (预期行为)
```

### 用户升级路径

```
VIEWER → 申请 → ERP_ADMIN (临时权限)
WEB_ADMIN → 升级 → BRAND_ADMIN (角色变更)
EDITOR → 转岗 → ERP_ADMIN (重分配系统)
```

---

## CAPABILITIES

### System-Capability Model（非 Role-Based）

权限决策流程：
```
1. PlatformUser.access[system].canWrite?  ← 用户在该系统的能力
2. SYSTEM_CAPABILITIES[system].canWrite.includes(model) ← 系统本身的模型限制
3. → 两者都通过 → 允许操作
```

### 与 Role-Based 的区别

| | Role-Based (Phase 2) | System-Capability (Phase 3) |
|---|---|---|
| 决策依据 | `user.role === "ADMIN"` | `user.access.erp.canWrite === true` |
| 跨系统 | 仅 SUPER_ADMIN | 每个用户可配多系统 |
| 粒度 | 角色 → 操作 | 系统 → 能力 → 模型 |
| 可扩展 | 需加角色 | 调整 capability map |

---

## DELIVERABLES

```
packages/auth/
├── identity.ts       ← PlatformUser + createPlatformUser + canOperate
├── session.ts        ← getPlatformUser + requirePlatformUser
├── user-context.ts   ← buildRequestContext + switchSystem + getAvailableModels
├── nextauth.ts       ← NextAuth config (legacy)
├── middleware.ts      ← getSessionUser (legacy)
└── index.ts          ← Barrel exports

packages/db/enforce/
├── api-gateway.ts    ← + platformGateway() (Phase 3)
├── require-access.ts ← requireAccess + AccessDeniedError
├── with-guard.ts     ← withGuard + ensureGuarded
└── index.ts          ← Barrel exports
```

---

## BUILD VERIFICATION

| App | Build | ID Layer | Gateway |
|-----|-------|----------|---------|
| ERP | ✓ | PlatformUser | platformGateway |
| Web | ✓ | ✅ | ✅ |
| Brand OS | ✓ | ✅ | ✅ |

---

## RISK

| 风险 | 等级 | 说明 |
|------|------|------|
| Legacy role-based middleware 仍在使用 | P2 | `requireAuth`/`requirePermission` 未迁移到 PlatformUser |
| API routes 未接入 platformGateway | P2 | Phased migration |
| 跨系统 session 同步 | P3 | 用户切换系统时需刷新 JWT |

---

## SUCCESS CRITERIA

| 标准 | 状态 |
|------|------|
| 一个身份系统 | ✅ PlatformUser |
| 一个 API Gateway | ✅ platformGateway |
| 三系统可流动用户 | ✅ SystemCapability map |
| 平台级结构成立 | ✅ Auth → Identity → Gateway → Control → Domain → DB |
