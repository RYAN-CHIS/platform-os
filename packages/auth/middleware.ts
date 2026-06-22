import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SessionUser } from "./types";
import type { SystemDomain } from "@yunwu/db";

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return null;
  return {
    id: token.sub!,
    email: token.email!,
    name: (token.name as string) ?? null,
    role: (token.role as any) ?? "VIEWER",
    systems: (token.systems as SystemDomain[]) ?? [],
    permissions: (token.permissions as string[]) ?? [],
  };
}

export async function requireAuth(req: NextRequest): Promise<SessionUser | Response> {
  const user = await getSessionUser(req);
  if (!user) {
    return new NextResponse(JSON.stringify({ error: "未登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

export async function requirePermission(
  req: NextRequest,
  requiredPermission: string,
  requiredSystem?: SystemDomain,
): Promise<SessionUser | Response> {
  const user = await requireAuth(req);
  if (user instanceof Response) return user;

  // SUPER_ADMIN 拥有所有权限
  if (user.role === "SUPER_ADMIN") return user;

  // 系统域检查
  if (requiredSystem && !user.systems.includes(requiredSystem)) {
    return new NextResponse(JSON.stringify({ error: `无权访问 ${requiredSystem} 系统` }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 权限检查
  if (!user.permissions.includes(requiredPermission)) {
    return new NextResponse(JSON.stringify({ error: `权限不足，需要 ${requiredPermission}` }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return user;
}
