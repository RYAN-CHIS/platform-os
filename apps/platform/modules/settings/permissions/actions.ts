/**
 * Settings Permissions Actions — WO-P12D
 * Matrix-based permission management for /settings/permissions
 */
"use server";

import { prisma } from "@yunwu/db";
import type { RoleRow } from "./config";
import { ALL_MODULES } from "./config";
import { createPermissionAudit } from "@/lib/audit";

// ── Get matrix data ──
export async function getPermissionMatrix(): Promise<{ roles: RoleRow[]; modules: typeof ALL_MODULES }> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, role_name, role_code, permissions::text as permissions, is_active FROM roles ORDER BY id ASC`
  );
  const roles = rows.map(r => ({
    ...r,
    permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || []),
  }));
  return { roles, modules: ALL_MODULES };
}

// ── Save matrix ──
export async function savePermissionMatrix(
  rolePermissions: { roleId: number; permissions: string[] }[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Fetch current permissions for all roles being updated
    const roleIds = rolePermissions.map(rp => rp.roleId);
    const placeholders = roleIds.map((_, i) => `$${i + 1}`).join(',');
    const currentRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, role_name, permissions::text as permissions FROM roles WHERE id IN (${placeholders})`,
      ...roleIds
    );

    // Build a map of current permissions
    const currentMap = new Map<number, { roleName: string; permissions: string[] }>();
    for (const row of currentRows) {
      const perms = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : (row.permissions || []);
      currentMap.set(row.id, { roleName: row.role_name, permissions: perms });
    }

    // Save new permissions
    for (const rp of rolePermissions) {
      await prisma.$executeRawUnsafe(
        `UPDATE roles SET permissions = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        JSON.stringify(rp.permissions), rp.roleId
      );

      // Compute diff and audit
      const current = currentMap.get(rp.roleId);
      if (current) {
        const oldPerms = new Set(current.permissions);
        const newPerms = new Set(rp.permissions);

        const addedPermissions = rp.permissions.filter(p => !oldPerms.has(p));
        const removedPermissions = current.permissions.filter(p => !newPerms.has(p));

        if (addedPermissions.length > 0 || removedPermissions.length > 0) {
          try {
            await createPermissionAudit({
              roleName: current.roleName,
              addedPermissions,
              removedPermissions,
              description: `Permission matrix updated for role "${current.roleName}"`,
            });
          } catch {}
        }
      }
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
