"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";

interface PermissionBoundaryProps {
  /** Required permission code */
  permission?: string;
  /** Require admin role */
  requireAdmin?: boolean;
  /** Custom no-access message */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * PermissionBoundary — 统一权限边界组件
 *
 * Wraps content that requires specific permissions.
 * Renders children only if user has the required permission.
 */
export default function PermissionBoundary({
  permission,
  requireAdmin = false,
  fallback,
  children,
}: PermissionBoundaryProps) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "viewer";
  const permissions: string[] = (session?.user as any)?.permissions || [];

  // Admin bypass
  const isAdmin = role === "admin" || role === "super_admin" || permissions.includes("super.admin");

  // Admin check
  if (requireAdmin && !isAdmin) {
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-4xl mb-4">🔒</p>
              <p className="text-lg text-stone-500">需要管理员权限</p>
              <p className="text-sm text-stone-400 mt-2">请联系系统管理员获取访问权限</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // Permission check
  if (permission && !isAdmin && !permissions.includes(permission)) {
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-4xl mb-4">🔒</p>
              <p className="text-lg text-stone-500">权限不足</p>
              <p className="text-sm text-stone-400 mt-2">
                需要权限: <code className="bg-stone-100 px-1 rounded">{permission}</code>
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}
