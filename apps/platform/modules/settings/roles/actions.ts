/**
 * Settings Roles Actions — WO-P12D
 * Full CRUD for /settings/roles
 */
"use server";

import { prisma } from "@yunwu/db";
import { createAuditLog } from "@/lib/audit";

export interface RoleRow {
  id: number;
  role_name: string;
  role_code: string;
  description: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleInput {
  roleName: string;
  roleCode: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}

export interface UpdateRoleInput {
  id: number;
  roleName?: string;
  roleCode?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
}

// ── List ──
export async function listRoles(q?: string): Promise<RoleRow[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, role_name, role_code, description, permissions::text as permissions,
            is_active, created_at, updated_at
     FROM roles
     ${q ? `WHERE role_name ILIKE $1 OR role_code ILIKE $1` : ''}
     ORDER BY id ASC`,
    ...(q ? [`%${q}%`] : [])
  );
  return rows.map(r => ({
    ...r,
    permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || []),
    is_active: r.is_active,
  }));
}

// ── Create ──
export async function createRole(input: CreateRoleInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const existing = await prisma.$queryRawUnsafe<{ cnt: string }[]>(
      `SELECT COUNT(*)::text as cnt FROM roles WHERE role_code = $1`, input.roleCode
    );
    if (parseInt(existing[0].cnt) > 0) {
      return { ok: false, error: "角色代码已存在" };
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO roles (role_name, role_code, description, permissions, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, NOW(), NOW())`,
      input.roleName, input.roleCode, input.description || '', JSON.stringify(input.permissions || []), input.isActive !== false
    );

    // Audit
    try {
      await createAuditLog({
        action: "ROLE_CREATE",
        system: "SETTINGS",
        module: "roles",
        after: { roleName: input.roleName, roleCode: input.roleCode, permissions: input.permissions || [] },
      });
    } catch {}

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Update ──
export async function updateRole(input: UpdateRoleInput): Promise<{ ok: boolean; error?: string }> {
  try {
    // Fetch before state
    const beforeRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, role_name, role_code, description, permissions::text as permissions, is_active FROM roles WHERE id = $1`,
      input.id
    );
    const before = beforeRows[0] || null;
    if (before && typeof before.permissions === 'string') {
      before.permissions = JSON.parse(before.permissions);
    }

    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (input.roleName !== undefined) { sets.push(`role_name = $${idx++}`); vals.push(input.roleName); }
    if (input.roleCode !== undefined) { sets.push(`role_code = $${idx++}`); vals.push(input.roleCode); }
    if (input.description !== undefined) { sets.push(`description = $${idx++}`); vals.push(input.description); }
    if (input.permissions !== undefined) { sets.push(`permissions = $${idx++}::jsonb`); vals.push(JSON.stringify(input.permissions)); }
    if (input.isActive !== undefined) { sets.push(`is_active = $${idx++}`); vals.push(input.isActive); }
    sets.push(`updated_at = NOW()`);

    vals.push(input.id);
    await prisma.$executeRawUnsafe(
      `UPDATE roles SET ${sets.join(", ")} WHERE id = $${idx}`,
      ...vals
    );

    // Audit
    try {
      const after = { ...before, ...input };
      await createAuditLog({
        action: "ROLE_UPDATE",
        system: "SETTINGS",
        module: "roles",
        targetId: input.id,
        before,
        after,
      });
    } catch {}

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Delete ──
export async function deleteRole(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    // Fetch before state
    const beforeRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, role_name, role_code, description, permissions::text as permissions, is_active FROM roles WHERE id = $1`,
      id
    );
    const before = beforeRows[0] || null;
    if (before && typeof before.permissions === 'string') {
      before.permissions = JSON.parse(before.permissions);
    }

    await prisma.$executeRawUnsafe(`DELETE FROM roles WHERE id = $1`, id);

    // Audit
    try {
      await createAuditLog({
        action: "ROLE_DELETE",
        system: "SETTINGS",
        module: "roles",
        targetId: id,
        before,
      });
    } catch {}

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Toggle active ──
export async function toggleRoleActive(id: number, active: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    // Fetch before state
    const beforeRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, role_name, role_code, is_active FROM roles WHERE id = $1`,
      id
    );
    const before = beforeRows[0] || null;

    await prisma.$executeRawUnsafe(
      `UPDATE roles SET is_active = $1, updated_at = NOW() WHERE id = $2`,
      active, id
    );

    // Audit
    try {
      const action = active ? 'ROLE_ENABLE' : 'ROLE_DISABLE';
      const after = { ...before, is_active: active };
      await createAuditLog({
        action,
        system: "SETTINGS",
        module: "roles",
        targetId: id,
        before,
        after,
      });
    } catch {}

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Duplicate ──
export async function duplicateRole(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT role_name, role_code, description, permissions::text as permissions FROM roles WHERE id = $1`, id
    );
    if (!rows.length) return { ok: false, error: "角色不存在" };
    const src = rows[0];
    const perms = typeof src.permissions === 'string' ? src.permissions : JSON.stringify(src.permissions || []);

    await prisma.$executeRawUnsafe(
      `INSERT INTO roles (role_name, role_code, description, permissions, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, true, NOW(), NOW())`,
      `${src.role_name} (副本)`, `${src.role_code}_copy_${Date.now()}`, src.description || '', perms
    );

    // Audit
    try {
      await createAuditLog({
        action: "ROLE_DUPLICATE",
        system: "SETTINGS",
        module: "roles",
        targetId: id,
        before: { roleName: src.role_name, roleCode: src.role_code },
        after: { roleName: `${src.role_name} (副本)`, roleCode: `${src.role_code}_copy_${Date.now()}` },
        description: `Duplicated role "${src.role_name}"`,
      });
    } catch {}

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
