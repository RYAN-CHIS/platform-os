// ═══════════════════════════════════════════════════════════
// Control Plane — 权限常量与用户上下文
//
// Phase 2.99: 轻量级规则引擎。Phase 3 升级为完整 RBAC。
// ═══════════════════════════════════════════════════════════

import type { SystemId, ActionType } from "./system";

// ── 用户角色 ──
export type UserRole = "SUPER_ADMIN" | "ERP_ADMIN" | "BRAND_ADMIN" | "WEB_ADMIN" | "EDITOR" | "VIEWER";

// ── 访问上下文 ──
export interface AccessContext {
  userId: number | string;
  role: UserRole;
  system: SystemId;        // 当前操作的系统
  permissions?: string[];  // 细粒度权限码（Phase 3 启用）
}

// ── 权限结果 ──
export interface AccessDecision {
  allowed: boolean;
  reason?: string;
}

// ── 默认上下文（未认证用户）──
export const ANONYMOUS_CONTEXT: AccessContext = {
  userId: "anonymous",
  role: "VIEWER",
  system: "web",
};

// ── 角色权限矩阵 ──
const ROLE_CAPABILITIES: Record<UserRole, { systems: SystemId[]; actions: ActionType[] }> = {
  SUPER_ADMIN: {
    systems: ["erp", "web", "brand"],
    actions: ["read", "write", "delete", "admin"],
  },
  ERP_ADMIN: {
    systems: ["erp"],
    actions: ["read", "write", "delete", "admin"],
  },
  BRAND_ADMIN: {
    systems: ["brand", "web"],
    actions: ["read", "write", "admin"],
  },
  WEB_ADMIN: {
    systems: ["web"],
    actions: ["read", "write", "admin"],
  },
  EDITOR: {
    systems: ["web", "brand"],
    actions: ["read", "write"],
  },
  VIEWER: {
    systems: ["web"],
    actions: ["read"],
  },
};

export function getRoleCapabilities(role: UserRole) {
  return ROLE_CAPABILITIES[role];
}
