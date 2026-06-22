// ═══════════════════════════════════════════════════════════
// @yunwu/auth — Session Bridge
//
// 将 NextAuth session token 转换为 PlatformUser。
// 这是 auth 系统和 control plane 之间的桥梁。
// ═══════════════════════════════════════════════════════════

import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { createPlatformUser } from "./identity";
import type { PlatformUser } from "./identity";
import type { UserRole } from "../db/control/permission";
import type { SystemId } from "../db/control/system";

/**
 * 从 Next.js request 提取 PlatformUser
 */
export async function getPlatformUser(
  req: NextRequest,
  activeSystem?: SystemId,
): Promise<PlatformUser | null> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.sub) return null;

  return createPlatformUser({
    id: token.sub,
    email: (token.email as string) ?? "",
    name: (token.name as string) ?? null,
    role: (token.role as UserRole) ?? "VIEWER",
    activeSystem,
  });
}

/**
 * 获取 PlatformUser 或返回 401 Response
 */
export async function requirePlatformUser(
  req: NextRequest,
  activeSystem?: SystemId,
): Promise<PlatformUser | Response> {
  const user = await getPlatformUser(req, activeSystem);
  if (!user) {
    return new Response(
      JSON.stringify({ error: "未登录" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  return user;
}
