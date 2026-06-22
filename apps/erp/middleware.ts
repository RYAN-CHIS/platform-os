import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { signFromToken } from "@yunwu/auth";
import {
  PAGE_PERMISSION_MAP,
  API_PERMISSION_MAP,
  PERMISSIONS,
} from "@/lib/permissions";

export const runtime = "nodejs";

/** 判断路径是否匹配任一映射 key */
function matchPathPrefix(
  map: Record<string, any>,
  pathname: string
): { matched: boolean; key?: string; value?: any } {
  const sorted = Object.keys(map).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (pathname.startsWith(key)) {
      return { matched: true, key, value: map[key] };
    }
  }
  return { matched: false };
}

/** 检查权限列表是否包含 SUPER_ADMIN */
function isSuperAdmin(permissions: string[] | undefined): boolean {
  return Array.isArray(permissions) && permissions.includes("super.admin");
}

/**
 * V3: 计算实时有效权限
 * 合并基础权限 + 未过期的临时权限
 */
function getEffectivePermissions(
  basePermissions: string[],
  tempPermissions: { code: string; expiresAt: string }[] | undefined
): string[] {
  const effective = new Set(basePermissions);
  const now = Date.now();

  // 合并未过期的临时权限
  if (Array.isArray(tempPermissions)) {
    for (const tp of tempPermissions) {
      if (new Date(tp.expiresAt).getTime() > now) {
        effective.add(tp.code);
      }
    }
  }

  return Array.from(effective);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // Allow NextAuth API routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo")
  ) {
    return NextResponse.next();
  }

  // Allow login, forgot-password, reset-password pages
  if (
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    return NextResponse.next();
  }

  // ─── 认证检查 ───
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (token as any).role || "viewer";
  const basePermissions: string[] = (token as any).permissions || [];
  const tempPermissions: { code: string; expiresAt: string }[] = (token as any).tempPermissions || [];

  // Phase 3 / WO-4.1: Signed Platform Identity (HMAC-SHA256)
  const signedToken = signFromToken(
    { sub: token.sub, email: token.email as string, role, permissions: basePermissions },
    "erp",
    process.env.YUNWU_PLATFORM_SECRET || "yunwu-dev-secret",
  );

  // ─── 页面路由权限检查 ───
  const pageMatch = matchPathPrefix(PAGE_PERMISSION_MAP, pathname);
  if (pageMatch.matched && pageMatch.key) {
    const requiredPermission = pageMatch.value as string;
    if (!superAdmin) {
      if (!effectivePermissions.includes(requiredPermission)) {
        const dashboardUrl = new URL("/dashboard", request.url);
        dashboardUrl.searchParams.set("error", "permission_denied");
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  // ─── API 路由权限检查 ───
  if (pathname.startsWith("/api/")) {
    const apiMatch = matchPathPrefix(API_PERMISSION_MAP, pathname);
    if (apiMatch.matched && apiMatch.value) {
      const apiPerms = apiMatch.value as Record<string, string>;
      const requiredPermission = apiPerms[method] || apiPerms["GET"];

      if (requiredPermission && !superAdmin) {
        if (!effectivePermissions.includes(requiredPermission)) {
          return new NextResponse(
            JSON.stringify({ error: `权限不足，需要 ${requiredPermission}` }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    // Viewer 通用写保护
    if (role === "viewer" && ["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      return new NextResponse(
        JSON.stringify({ error: "权限不足，访客只读" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // WO-4.1: Inject signed platform identity token
  const response = NextResponse.next();
  response.headers.set("x-yunwu-user", signedToken);
  return response;
}

export const config = {
  matcher: ["/((?!api/auth|_next|favicon\\.svg|logo\\.png).*)"],
};
