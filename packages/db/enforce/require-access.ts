// ═══════════════════════════════════════════════════════════
// Enforcement Layer — 硬拦截函数
//
// 每个 API route 必须调用此函数进行权限校验。
// 不通过则 throw，无 fallback。
//
// 用法:
//   const ctx = requireSystemAccess(user, "erp", "product", "write");
// ═══════════════════════════════════════════════════════════

import {
  canAccess,
  canRead,
  canWrite,
  canAdmin,
  guard,
} from "../control/access";
import type { SystemId, ActionType, ModelDomain } from "../control/system";
import type { AccessContext } from "../control/permission";

/**
 * 系统访问硬拦截。不通过则 throw。
 */
export function requireSystemAccess(
  user: AccessContext,
  system: SystemId,
  action: ActionType,
): AccessContext {
  const decision = canAccess(user, system, action);
  if (!decision.allowed) {
    throw new AccessDeniedError(decision.reason!);
  }
  return user;
}

/**
 * 模型读权限硬拦截
 */
export function requireReadAccess(
  user: AccessContext,
  model: ModelDomain,
): AccessContext {
  const decision = canRead(user, model);
  if (!decision.allowed) {
    throw new AccessDeniedError(decision.reason!);
  }
  return user;
}

/**
 * 模型写权限硬拦截
 */
export function requireWriteAccess(
  user: AccessContext,
  model: ModelDomain,
): AccessContext {
  const decision = canWrite(user, model);
  if (!decision.allowed) {
    throw new AccessDeniedError(decision.reason!);
  }
  return user;
}

/**
 * 模型管理权限硬拦截
 */
export function requireAdminAccess(
  user: AccessContext,
  model: ModelDomain,
): AccessContext {
  const decision = canAdmin(user, model);
  if (!decision.allowed) {
    throw new AccessDeniedError(decision.reason!);
  }
  return user;
}

/**
 * 组合检查：系统 + 模型 + 操作 三重校验
 */
export function requireAccess(
  user: AccessContext,
  system: SystemId,
  model: ModelDomain,
  action: "read" | "write" | "admin",
): AccessContext {
  // Step 1: 系统级
  requireSystemAccess(user, system, action);
  // Step 2: 模型级
  if (action === "read") requireReadAccess(user, model);
  if (action === "write") requireWriteAccess(user, model);
  if (action === "admin") requireAdminAccess(user, model);
  return user;
}

// ── 错误类型 ──

export class AccessDeniedError extends Error {
  public readonly code = "ACCESS_DENIED";
  public readonly statusCode = 403;

  constructor(reason: string) {
    super(reason);
    this.name = "AccessDeniedError";
  }
}
