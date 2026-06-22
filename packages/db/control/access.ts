// ═══════════════════════════════════════════════════════════
// Control Plane — 统一访问控制引擎
//
// 所有 Domain Service 操作必须经过此层检查。
//
// 使用方式:
//   const check = guard(user).canWrite("product");
//   if (!check.allowed) throw new Error(check.reason);
// ═══════════════════════════════════════════════════════════

import type { SystemId, ActionType, ModelDomain } from "./system";
import { canSystemRead, canSystemWrite, canSystemAdmin } from "./system";
import type { AccessContext, AccessDecision } from "./permission";
import { getRoleCapabilities } from "./permission";

// ── 核心决策函数 ──

/**
 * 检查用户是否可访问指定系统的指定操作
 */
export function canAccess(
  user: AccessContext,
  system: SystemId,
  action: ActionType,
): AccessDecision {
  const caps = getRoleCapabilities(user.role);

  // 1. 角色是否允许访问该系统
  if (!caps.systems.includes(system)) {
    return {
      allowed: false,
      reason: `用户角色 ${user.role} 无权访问 ${system} 系统`,
    };
  }

  // 2. 角色是否允许该操作
  if (!caps.actions.includes(action)) {
    return {
      allowed: false,
      reason: `用户角色 ${user.role} 无权执行 ${action} 操作`,
    };
  }

  return { allowed: true };
}

/**
 * 检查用户对指定 model 是否有读权限
 */
export function canRead(
  user: AccessContext,
  model: ModelDomain,
): AccessDecision {
  // SUPER_ADMIN 全局通过
  if (user.role === "SUPER_ADMIN") return { allowed: true };

  // 系统级检查：当前用户所属系统是否有该 model 的读权限
  if (!canSystemRead(user.system, model)) {
    return {
      allowed: false,
      reason: `系统 ${user.system} 无权读取 ${model} 数据`,
    };
  }

  // 角色级检查
  const caps = getRoleCapabilities(user.role);
  if (!caps.actions.includes("read")) {
    return {
      allowed: false,
      reason: `角色 ${user.role} 无权执行读取操作`,
    };
  }

  return { allowed: true };
}

/**
 * 检查用户对指定 model 是否有写权限
 */
export function canWrite(
  user: AccessContext,
  model: ModelDomain,
): AccessDecision {
  if (user.role === "SUPER_ADMIN") return { allowed: true };

  if (!canSystemWrite(user.system, model)) {
    return {
      allowed: false,
      reason: `系统 ${user.system} 无权写入 ${model} 数据`,
    };
  }

  const caps = getRoleCapabilities(user.role);
  if (!caps.actions.includes("write")) {
    return {
      allowed: false,
      reason: `角色 ${user.role} 无权执行写入操作`,
    };
  }

  return { allowed: true };
}

/**
 * 检查用户对指定 model 是否有管理权限
 */
export function canAdmin(
  user: AccessContext,
  model: ModelDomain,
): AccessDecision {
  if (user.role === "SUPER_ADMIN") return { allowed: true };

  if (!canSystemAdmin(user.system, model)) {
    return {
      allowed: false,
      reason: `系统 ${user.system} 无权管理 ${model} 数据`,
    };
  }

  const caps = getRoleCapabilities(user.role);
  if (!caps.actions.includes("admin")) {
    return {
      allowed: false,
      reason: `角色 ${user.role} 无权执行管理操作`,
    };
  }

  return { allowed: true };
}

// ── Guard 构造器：链式 API ──
//
// 用法:
//   const decision = guard(user).for("product").write();
//   if (!decision.allowed) return error(decision.reason);

export function guard(user: AccessContext) {
  return {
    canAccess: (system: SystemId, action: ActionType) =>
      canAccess(user, system, action),

    forModel: (model: ModelDomain) => ({
      read: () => canRead(user, model),
      write: () => canWrite(user, model),
      admin: () => canAdmin(user, model),
    }),

    canRead: (m: ModelDomain) => canRead(user, m),
    canWrite: (m: ModelDomain) => canWrite(user, m),
    canAdmin: (m: ModelDomain) => canAdmin(user, m),
  };
}

// ── 中间件辅助：包装 Domain Service ──

/**
 * 创建受控的读操作 — 检查权限后执行
 */
export function withReadCheck<T>(
  user: AccessContext,
  model: ModelDomain,
  fn: () => Promise<T>,
): Promise<T> {
  const decision = canRead(user, model);
  if (!decision.allowed) {
    return Promise.reject(new Error(decision.reason));
  }
  return fn();
}

/**
 * 创建受控的写操作 — 检查权限后执行
 */
export function withWriteCheck<T>(
  user: AccessContext,
  model: ModelDomain,
  fn: () => Promise<T>,
): Promise<T> {
  const decision = canWrite(user, model);
  if (!decision.allowed) {
    return Promise.reject(new Error(decision.reason));
  }
  return fn();
}
