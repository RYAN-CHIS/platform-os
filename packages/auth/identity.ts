// ═══════════════════════════════════════════════════════════
// @yunwu/auth — Platform Identity Layer
//
// 统一用户身份模型。不是 role-based，是 system-capability-based。
//
// PlatformUser {
//   access: {
//     erp:  { canRead, canWrite, canAdmin }
//     web:  { canRead, canWrite, canAdmin }
//     brand:{ canRead, canWrite, canAdmin }
//   }
// }
// ═══════════════════════════════════════════════════════════

import type { SystemId, ModelDomain } from "../db/control/system";
import type { AccessContext, UserRole } from "../db/control/permission";
import { getRoleCapabilities } from "../db/control/permission";
import { canSystemRead, canSystemWrite, canSystemAdmin } from "../db/control/system";

// ── System Capability（每个系统的具体能力）──
export interface SystemCapability {
  canRead: boolean;
  canWrite: boolean;
  canAdmin: boolean;
  /** 该系统中可访问的 models（细粒度）*/
  readableModels?: ModelDomain[];
  writableModels?: ModelDomain[];
}

// ── Platform User（统一身份）──
export interface PlatformUser {
  id: string;
  email: string;
  name: string | null;
  // 角色（用于初始能力计算，不作为运行时决策依据）
  role: UserRole;
  // 系统能力映射 — 这是运行时决策依据
  access: Partial<Record<SystemId, SystemCapability>>;
  // 当前活跃系统
  activeSystem: SystemId;
}

// ── 角色 → 系统能力映射器 ──
// 定义每个角色在三个系统中的默认能力

const ROLE_SYSTEM_ACCESS: Record<UserRole, Partial<Record<SystemId, SystemCapability>>> = {
  SUPER_ADMIN: {
    erp:  { canRead: true, canWrite: true, canAdmin: true },
    web:  { canRead: true, canWrite: true, canAdmin: true },
    brand:{ canRead: true, canWrite: true, canAdmin: true },
  },
  ERP_ADMIN: {
    erp:  { canRead: true, canWrite: true, canAdmin: true },
    web:  { canRead: true, canWrite: false, canAdmin: false },
    brand:{ canRead: false, canWrite: false, canAdmin: false },
  },
  BRAND_ADMIN: {
    erp:  { canRead: false, canWrite: false, canAdmin: false },
    web:  { canRead: true, canWrite: true, canAdmin: true },
    brand:{ canRead: true, canWrite: true, canAdmin: true },
  },
  WEB_ADMIN: {
    erp:  { canRead: false, canWrite: false, canAdmin: false },
    web:  { canRead: true, canWrite: true, canAdmin: true },
    brand:{ canRead: true, canWrite: false, canAdmin: false },
  },
  EDITOR: {
    erp:  { canRead: false, canWrite: false, canAdmin: false },
    web:  { canRead: true, canWrite: true, canAdmin: false },
    brand:{ canRead: true, canWrite: true, canAdmin: false },
  },
  VIEWER: {
    erp:  { canRead: false, canWrite: false, canAdmin: false },
    web:  { canRead: true, canWrite: false, canAdmin: false },
    brand:{ canRead: true, canWrite: false, canAdmin: false },
  },
};

// ── 工厂函数 ──

/**
 * 从角色 + 自定义覆盖创建 PlatformUser
 */
export function createPlatformUser(params: {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  /** 自定义系统覆盖（如临时权限升级）*/
  overrides?: Partial<Record<SystemId, Partial<SystemCapability>>>;
  activeSystem?: SystemId;
}): PlatformUser {
  const base = ROLE_SYSTEM_ACCESS[params.role] ?? ROLE_SYSTEM_ACCESS.VIEWER;
  const access = { ...base };

  // 应用覆盖
  if (params.overrides) {
    for (const [sys, caps] of Object.entries(params.overrides)) {
      access[sys as SystemId] = {
        ...(access[sys as SystemId] ?? { canRead: false, canWrite: false, canAdmin: false }),
        ...caps,
      };
    }
  }

  // 活跃系统：用户有权限的第一个系统
  const activeSystem = params.activeSystem ??
    (Object.keys(access) as SystemId[]).find((s) => access[s]?.canRead) ??
    "web";

  return {
    id: params.id,
    email: params.email,
    name: params.name ?? null,
    role: params.role,
    access,
    activeSystem,
  };
}

/**
 * 检查 PlatformUser 是否有指定系统的特定能力
 */
export function hasCapability(
  user: PlatformUser,
  system: SystemId,
  capability: keyof SystemCapability,
): boolean {
  return user.access[system]?.[capability] === true;
}

/**
 * 检查用户是否可以在指定系统操作指定 model
 */
export function canOperate(
  user: PlatformUser,
  system: SystemId,
  model: ModelDomain,
  action: "read" | "write" | "admin",
): boolean {
  // 1. 先检查用户在该系统是否有对应能力
  const cap = action === "read" ? "canRead" : "canWrite";
  if (!hasCapability(user, system, cap)) return false;

  // 2. 再检查系统本身是否支持该 model
  if (action === "read") return canSystemRead(system, model);
  return canSystemWrite(system, model);
}

/**
 * 用户是否可以切换到目标系统
 */
export function canSwitchSystem(
  user: PlatformUser,
  target: SystemId,
): boolean {
  return hasCapability(user, target, "canRead");
}

/**
 * 将 PlatformUser 降级为控制面 AccessContext
 */
export function toAccessContext(
  user: PlatformUser,
  system?: SystemId,
): AccessContext {
  return {
    userId: user.id,
    role: user.role,
    system: system ?? user.activeSystem,
    permissions: [],
  };
}
