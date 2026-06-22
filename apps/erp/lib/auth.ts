/**
 * 允物 ERP — 服务端认证工具 V3
 *
 * V3 支持临时权限、模板权限计算。
 * 用于 API Route 和 Server Component 中获取当前用户会话。
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  normalizeRole,
  Role,
  PermissionCode,
  PERMISSIONS,
  PermissionSet,
  createPermissionSetFromCodes,
  computeEffectivePermissions,
} from "@/lib/permissions";
import type { PermissionStore } from "@/lib/permissions";

/** Session 中存储的用户信息 */
export interface SessionUser {
  id: string;
  role: Role;
  permissions: PermissionStore;
}

/**
 * 从服务端获取完整会话信息（含 role + permissions）
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    const user = session.user as any;
    return {
      id: user.id || "",
      role: normalizeRole(user.role),
      permissions: user.permissions || [],
    };
  } catch {
    return null;
  }
}

/**
 * 从服务端获取当前用户角色（兼容 V1）
 */
export async function getSessionRole(): Promise<Role | null> {
  const user = await getSessionUser();
  return user?.role ?? null;
}

/**
 * 从服务端获取当前用户权限列表
 */
export async function getSessionPermissions(): Promise<PermissionStore> {
  const user = await getSessionUser();
  return user?.permissions ?? [];
}

/**
 * 创建当前用户的 PermissionSet（含模板 + 临时权限）
 */
export async function getSessionPermissionSet(): Promise<PermissionSet> {
  const user = await getSessionUser();
  if (!user) return new PermissionSet([]);
  return createPermissionSetFromCodes(user.permissions);
}

/**
 * API Route 专用：验证用户已登录并返回完整会话信息
 * 未登录 → Response 401
 */
export async function requireAuth(): Promise<SessionUser | Response> {
  const user = await getSessionUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "未登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/**
 * API Route 专用：验证用户拥有指定权限
 * 无权限 → Response 403
 */
export async function requirePermission(code: PermissionCode): Promise<SessionUser | Response> {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const permSet = new PermissionSet(auth.permissions);
  if (!permSet.has(code)) {
    return new Response(JSON.stringify({ error: `权限不足，需要 ${code}` }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return auth;
}

/**
 * API Route 专用：验证用户为 Admin
 * 不是 Admin → Response 403
 */
export async function requireAdmin(): Promise<SessionUser | Response> {
  return requirePermission(PERMISSIONS.SETTING_EDIT);
}

/**
 * API Route 专用：要求用户至少是 Operator（可编辑）
 * Viewer → Response 403
 */
export async function requireEditor(): Promise<SessionUser | Response> {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  if (auth.role === Role.VIEWER) {
    return new Response(JSON.stringify({ error: "权限不足，访客只读" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return auth;
}

/**
 * Server Component 专用：检查是否有成本查看权限
 */
export async function checkCostView(): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;
  if (user.role === Role.ADMIN) return true;
  if (user.permissions.includes(PERMISSIONS.COST_VIEW)) return true;
  if (user.permissions.includes(PERMISSIONS.SUPER_ADMIN)) return true;
  return false;
}

/**
 * Server Component 专用：检查是否有指定权限
 */
export async function checkPermission(code: PermissionCode): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;
  if (user.role === Role.ADMIN) return true;
  if (user.permissions.includes(PERMISSIONS.SUPER_ADMIN)) return true;
  return user.permissions.includes(code);
}

/**
 * V3: 实时刷新用户有效权限（包含模板 + 临时权限）
 * 用于需要最新权限数据的场景
 */
export async function refreshEffectivePermissions(userId: number, role: string): Promise<string[]> {
  return computeEffectivePermissions(userId, role);
}
