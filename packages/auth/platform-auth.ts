/**
 * Platform OS — Unified Auth Middleware
 *
 * Single auth layer for ERP + Brand + Platform.
 * All systems call these functions instead of implementing their own auth.
 *
 * WO-P2: Auth Unification
 */

import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { signFromToken } from "./sign-identity";
import type { PermissionCode } from "@yunwu/platform-core/config/permissions.config";
import { PERMISSIONS } from "@yunwu/platform-core/config/permissions.config";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface PlatformSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  tempPermissions?: { code: string; expiresAt: string }[];
}

export interface AuthResult {
  authenticated: boolean;
  session?: PlatformSession;
  error?: string;
  redirect?: NextResponse;
}

// ═══════════════════════════════════════════
// Session Management
// ═══════════════════════════════════════════

/**
 * Verify session and load user + permissions.
 * Use this at the start of every protected route/page.
 */
export async function verifySession(req: NextRequest): Promise<AuthResult> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/platform/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return {
      authenticated: false,
      error: "Not authenticated",
      redirect: NextResponse.redirect(loginUrl),
    };
  }

  const role = (token as any).role || "viewer";
  const basePermissions: string[] = (token as any).permissions || [];
  const tempPermissions: { code: string; expiresAt: string }[] =
    (token as any).tempPermissions || [];

  const session: PlatformSession = {
    userId: token.sub || "",
    email: (token.email as string) || "",
    name: (token.name as string) || "",
    role,
    permissions: computeEffectivePermissions(role, basePermissions, tempPermissions),
    tempPermissions,
  };

  return { authenticated: true, session };
}

/**
 * Compute effective permissions (base + unexpired temporary)
 */
export function computeEffectivePermissions(
  role: string,
  basePermissions: string[],
  tempPermissions: { code: string; expiresAt: string }[]
): string[] {
  const effective = new Set(basePermissions);
  const now = Date.now();

  for (const tp of tempPermissions) {
    if (new Date(tp.expiresAt).getTime() > now) {
      effective.add(tp.code);
    }
  }

  // SUPER_ADMIN gets everything
  if (role === "SUPER_ADMIN" || effective.has(PERMISSIONS.SUPER_ADMIN)) {
    return ["*"]; // wildcard = all permissions
  }

  return Array.from(effective);
}

// ═══════════════════════════════════════════
// Permission Checks
// ═══════════════════════════════════════════

/**
 * Require a specific permission. Returns 403 if missing.
 */
export function requirePermission(
  session: PlatformSession,
  permission: PermissionCode
): { allowed: true } | { allowed: false; error: NextResponse } {
  // SUPER_ADMIN bypass
  const role = (session as any)?.role || session.role || "";
  if (role === "SUPER_ADMIN") return { allowed: true };

  // Null-safe permissions
  const perms: string[] = Array.isArray(session.permissions) ? session.permissions : [];
  if (perms.includes("*")) return { allowed: true };
  if (perms.includes(permission)) return { allowed: true };

  return {
    allowed: false,
    error: NextResponse.json(
      { error: `权限不足，需要 ${permission}` },
      { status: 403 }
    ),
  };
}

/**
 * Require any of the given permissions.
 */
export function requireAnyPermission(
  session: PlatformSession,
  permissions: PermissionCode[]
): { allowed: true } | { allowed: false; error: NextResponse } {
  const role = (session as any)?.role || session.role || "";
  if (role === "SUPER_ADMIN") return { allowed: true };
  const perms: string[] = Array.isArray(session.permissions) ? session.permissions : [];
  if (perms.includes("*")) return { allowed: true };
  if (permissions.some((p) => perms.includes(p))) return { allowed: true };

  return {
    allowed: false,
    error: NextResponse.json(
      { error: `权限不足，需要以下任一权限: ${permissions.join(", ")}` },
      { status: 403 }
    ),
  };
}

/**
 * Require all of the given permissions.
 */
export function requireAllPermissions(
  session: PlatformSession,
  permissions: PermissionCode[]
): { allowed: true } | { allowed: false; error: NextResponse } {
  const role = (session as any)?.role || session.role || "";
  if (role === "SUPER_ADMIN") return { allowed: true };
  const perms: string[] = Array.isArray(session.permissions) ? session.permissions : [];
  if (perms.includes("*")) return { allowed: true };
  if (permissions.every((p) => perms.includes(p))) return { allowed: true };

  const missing = permissions.filter((p) => !perms.includes(p));
  return {
    allowed: false,
    error: NextResponse.json(
      { error: `权限不足，缺少: ${missing.join(", ")}` },
      { status: 403 }
    ),
  };
}

/**
 * Check if viewer/read-only — block writes.
 */
export function requireWriteAccess(
  session: PlatformSession,
  method: string
): { allowed: true } | { allowed: false; error: NextResponse } {
  const role = (session as any)?.role || session.role || "";
  if (role === "SUPER_ADMIN") return { allowed: true };
  const perms: string[] = Array.isArray(session.permissions) ? session.permissions : [];
  if (perms.includes("*")) return { allowed: true };
  if (role === "viewer" && ["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    return {
      allowed: false,
      error: NextResponse.json(
        { error: "权限不足，访客只读" },
        { status: 403 }
      ),
    };
  }
  return { allowed: true };
}

// ═══════════════════════════════════════════
// Platform Identity (shared signature)
// ═══════════════════════════════════════════

/**
 * Sign the session for cross-app trust.
 */
export function signPlatformIdentity(session: PlatformSession): string {
  return signFromToken(
    {
      sub: session.userId,
      email: session.email,
      role: session.role,
      permissions: session.permissions,
    },
    "platform",
    process.env.YUNWU_PLATFORM_SECRET || "yunwu-dev-secret"
  );
}

/**
 * Add signed identity header to response.
 */
export function injectIdentityHeader(
  response: NextResponse,
  signedToken: string
): NextResponse {
  response.headers.set("x-yunwu-user", signedToken);
  return response;
}

// ═══════════════════════════════════════════
// Page-level Permission Check
// ═══════════════════════════════════════════

/** Permission required for each page path */
export const PAGE_PERMISSION_MAP: Record<string, PermissionCode> = {
  // ERP pages
  "/erp/dashboard": PERMISSIONS.DASHBOARD_VIEW,
  "/erp/materials": PERMISSIONS.MATERIAL_VIEW,
  "/erp/products": PERMISSIONS.PRODUCT_VIEW,
  "/erp/bom": PERMISSIONS.BOM_VIEW,
  "/erp/inventory": PERMISSIONS.INVENTORY_VIEW,
  "/erp/productions": PERMISSIONS.PRODUCTION_VIEW,
  "/erp/costs": PERMISSIONS.COST_VIEW,
  "/erp/orders": PERMISSIONS.ORDER_VIEW,
  "/erp/customers": PERMISSIONS.CUSTOMER_VIEW,
  "/erp/works": PERMISSIONS.WORK_VIEW,
  "/erp/series": PERMISSIONS.WORK_VIEW,
  "/erp/media": PERMISSIONS.MEDIA_VIEW,
  "/erp/import": PERMISSIONS.IMPORT_DATA,
  "/erp/settings": PERMISSIONS.SETTING_VIEW,

  // Brand pages
  "/admin/series": PERMISSIONS.BRAND_SERIES_VIEW,
  "/admin/objects": PERMISSIONS.BRAND_PRODUCT_VIEW,
  "/admin/materials": PERMISSIONS.BRAND_MATERIAL_VIEW,
  "/admin/journal": PERMISSIONS.BRAND_ARTICLE_VIEW,
  "/admin/content": PERMISSIONS.BRAND_PAGE_EDIT,
  "/admin/tags": PERMISSIONS.BRAND_TAG_VIEW,
  "/admin/media": PERMISSIONS.MEDIA_VIEW,
  "/admin/seo": PERMISSIONS.BRAND_SEO_VIEW,
  "/admin/leads": PERMISSIONS.LEAD_VIEW,
  "/admin/audit": PERMISSIONS.SETTING_VIEW,
  "/admin/settings": PERMISSIONS.SETTING_EDIT,

  // Platform pages
  "/platform": PERMISSIONS.PLATFORM_ACCESS,
};

/** Match a pathname to its required permission */
export function getPagePermission(pathname: string): PermissionCode | undefined {
  const sorted = Object.keys(PAGE_PERMISSION_MAP).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (pathname.startsWith(key)) {
      return PAGE_PERMISSION_MAP[key];
    }
  }
  return undefined;
}
