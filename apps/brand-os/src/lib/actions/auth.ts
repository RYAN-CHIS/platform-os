"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PERMISSIONS } from "@yunwu/platform";

/**
 * Unified Auth — Brand OS server actions.
 *
 * WO-P3A: Migrated from role-based to permission-based checks.
 * Backward compatible: old role strings still supported via template mapping.
 */

async function getAuthSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/admin/login");
  return session;
}

/** Check if user has a specific permission */
export async function requirePermission(permission: string) {
  const session = await getAuthSession();
  const permissions: string[] = (session.user as any).permissions || [];
  const role = (session.user as any).role as string;

  // SUPER_ADMIN always passes
  if (role === "SUPER_ADMIN") return session;
  // Check permission
  if (permissions.includes(permission)) return session;

  redirect("/admin");
}

/** Check if user has any of the given permissions */
export async function requireAnyPermission(permissions: string[]) {
  const session = await getAuthSession();
  const userPermissions: string[] = (session.user as any).permissions || [];
  const role = (session.user as any).role as string;

  if (role === "SUPER_ADMIN") return session;
  if (permissions.some((p) => userPermissions.includes(p))) return session;

  redirect("/admin");
}

/** Check if user has all of the given permissions */
export async function requireAllPermissions(permissions: string[]) {
  const session = await getAuthSession();
  const userPermissions: string[] = (session.user as any).permissions || [];
  const role = (session.user as any).role as string;

  if (role === "SUPER_ADMIN") return session;
  if (permissions.every((p) => userPermissions.includes(p))) return session;

  redirect("/admin");
}

// ═══════════════════════════════════════════
// Backward-compatible role checks
// These now delegate to permission checks internally.
// ═══════════════════════════════════════════

/** @deprecated Use requirePermission(PERMISSIONS.PLATFORM_ACCESS) instead */
export async function requireAnyRole() {
  return requirePermission(PERMISSIONS.PLATFORM_ACCESS);
}

/** @deprecated Use requirePermission() with specific permission */
export async function requireAdmin() {
  return requireAnyPermission([
    PERMISSIONS.BRAND_SERIES_EDIT,
    PERMISSIONS.BRAND_PRODUCT_EDIT,
    PERMISSIONS.BRAND_ARTICLE_EDIT,
  ]);
}

/** @deprecated Use requirePermission(PERMISSIONS.PLATFORM_ADMIN) instead */
export async function requireSuperAdmin() {
  return requirePermission(PERMISSIONS.PLATFORM_ADMIN);
}

/** Requires article.edit or page.edit */
export async function requireContentEditor() {
  return requireAnyPermission([
    PERMISSIONS.BRAND_ARTICLE_EDIT,
    PERMISSIONS.BRAND_PAGE_EDIT,
  ]);
}

/** Requires lead.view */
export async function requireLeadsAccess() {
  return requirePermission(PERMISSIONS.LEAD_VIEW);
}

/** Requires brand.series.edit or brand.product.edit */
export async function requireBrandEditor() {
  return requireAnyPermission([
    PERMISSIONS.BRAND_SERIES_EDIT,
    PERMISSIONS.BRAND_PRODUCT_EDIT,
  ]);
}
