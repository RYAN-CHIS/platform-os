"use client";

import { ReactNode, createContext, useContext } from "react";
import { useSession } from "next-auth/react";
import type { PermissionCode } from "@yunwu/platform";

// ═══════════════════════════════════════════
// Permission Context (for cascading permission checks)
// ═══════════════════════════════════════════

interface PermissionContextValue {
  userPermissions: string[];
  isAdmin: boolean;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
  hasAllPermissions: (codes: string[]) => boolean;
}

const PermissionContext = createContext<PermissionContextValue>({
  userPermissions: [],
  isAdmin: false,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
});

/** Hook to access permission context from any component */
export function usePermission(): PermissionContextValue {
  return useContext(PermissionContext);
}

// ═══════════════════════════════════════════
// PermissionProvider — wraps the app
// ═══════════════════════════════════════════

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const permissions: string[] = (session?.user as any)?.permissions || [];
  const role = (session?.user as any)?.role || "viewer";

  const isAdmin =
    role === "SUPER_ADMIN" ||
    permissions.includes("*") ||
    permissions.includes("super.admin");

  const hasPermission = (code: string): boolean => {
    if (isAdmin) return true;
    return permissions.includes(code);
  };

  const hasAnyPermission = (codes: string[]): boolean => {
    if (isAdmin) return true;
    return codes.some((c) => permissions.includes(c));
  };

  const hasAllPermissions = (codes: string[]): boolean => {
    if (isAdmin) return true;
    return codes.every((c) => permissions.includes(c));
  };

  return (
    <PermissionContext.Provider
      value={{ userPermissions: permissions, isAdmin, hasPermission, hasAnyPermission, hasAllPermissions }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

// ═══════════════════════════════════════════
// PermissionBoundary Component
// ═══════════════════════════════════════════

type FallbackMode = "hide" | "disable" | "message";

interface PermissionBoundaryProps {
  /** Single required permission */
  permission?: PermissionCode | string;
  /** Require ALL of these permissions */
  requireAll?: (PermissionCode | string)[];
  /** Require ANY of these permissions */
  requireAny?: (PermissionCode | string)[];
  /** Require admin role */
  requireAdmin?: boolean;
  /** Fallback behavior */
  fallbackMode?: FallbackMode;
  /** Custom no-access message (fallbackMode="message") */
  fallback?: ReactNode;
  /** When disabled, apply this className */
  disabledClassName?: string;
  children: ReactNode;
}

/**
 * PermissionBoundary — Unified access control component.
 *
 * Supports:
 *   - Single permission: <PermissionBoundary permission="orders.edit">
 *   - Multiple (ANY):   <PermissionBoundary requireAny={["a", "b"]}>
 *   - Multiple (ALL):   <PermissionBoundary requireAll={["a", "b"]}>
 *   - Admin only:       <PermissionBoundary requireAdmin>
 *
 * Fallback modes:
 *   - "hide" (default): don't render children
 *   - "disable": render with opacity + pointer-events-none
 *   - "message": render access-denied message
 */
export default function PermissionBoundary({
  permission,
  requireAll,
  requireAny,
  requireAdmin,
  fallbackMode = "hide",
  fallback,
  disabledClassName = "opacity-50 pointer-events-none",
  children,
}: PermissionBoundaryProps) {
  const { data: session } = useSession();
  const permissions: string[] = (session?.user as any)?.permissions || [];
  const role = (session?.user as any)?.role || "viewer";

  const isAdmin =
    role === "SUPER_ADMIN" ||
    permissions.includes("*") ||
    permissions.includes("super.admin");

  // Admin check
  if (requireAdmin && !isAdmin) {
    if (fallbackMode === "hide") return null;
    if (fallbackMode === "disable") {
      return <div className={disabledClassName}>{children}</div>;
    }
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-stone-400">需要管理员权限</p>
          </div>
        )}
      </>
    );
  }

  // Admin bypass
  if (isAdmin) return <>{children}</>;

  // Check permissions
  let hasAccess = true;

  if (permission) {
    hasAccess = permissions.includes(permission);
  } else if (requireAll) {
    hasAccess = requireAll.every((p) => permissions.includes(p));
  } else if (requireAny) {
    hasAccess = requireAny.some((p) => permissions.includes(p));
  }

  if (!hasAccess) {
    if (fallbackMode === "hide") return null;
    if (fallbackMode === "disable") {
      return <div className={disabledClassName}>{children}</div>;
    }
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-2xl mb-2">🔒</p>
              <p className="text-sm text-stone-400">
                {permission
                  ? `需要权限: ${permission}`
                  : `权限不足`}
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}

/**
 * Convenience wrapper: only show if user has ANY of the given permissions.
 */
export function AnyPermission({
  permissions: requiredPermissions,
  children,
  fallbackMode = "hide",
}: {
  permissions: (PermissionCode | string)[];
  children: ReactNode;
  fallbackMode?: FallbackMode;
}) {
  return (
    <PermissionBoundary requireAny={requiredPermissions} fallbackMode={fallbackMode}>
      {children}
    </PermissionBoundary>
  );
}

/**
 * Convenience wrapper: only show if user has ALL of the given permissions.
 */
export function AllPermissions({
  permissions: requiredPermissions,
  children,
  fallbackMode = "hide",
}: {
  permissions: (PermissionCode | string)[];
  children: ReactNode;
  fallbackMode?: FallbackMode;
}) {
  return (
    <PermissionBoundary requireAll={requiredPermissions} fallbackMode={fallbackMode}>
      {children}
    </PermissionBoundary>
  );
}
