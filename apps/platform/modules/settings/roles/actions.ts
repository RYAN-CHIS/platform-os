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

// ── Standard roles definition (single source of truth) ──
const STANDARD_ROLES = [
  { role_name: "超级管理员", role_code: "SUPER_ADMIN", description: "拥有所有系统权限" },
  { role_name: "ERP 管理员", role_code: "ERP_ADMIN", description: "管理 ERP 系统，包括材料、产品、BOM、库存、生产、销售、采购等" },
  { role_name: "品牌管理员", role_code: "BRAND_ADMIN", description: "管理 Brand OS，包括产品展示、七序系列、材料展示、品牌志、媒体素材、Banner、SEO、页面设置" },
  { role_name: "网站管理员", role_code: "WEB_ADMIN", description: "管理网站展示、页面配置、SEO、Banner 与前台发布内容" },
  { role_name: "编辑员", role_code: "EDITOR", description: "负责内容编辑、品牌志、媒体素材、产品展示维护" },
  { role_name: "运营员", role_code: "OPERATOR", description: "负责日常业务操作，包括材料、库存、订单、生产记录等" },
  { role_name: "查看员", role_code: "VIEWER", description: "只读查看权限" },
] as const;

const STANDARD_CODES = STANDARD_ROLES.map(r => r.role_code);

// ── Default permissions per standard role ──
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    "erp.products", "erp.materials", "erp.bom", "erp.purchase", "erp.inventory",
    "erp.production", "erp.orders", "erp.customers", "erp.costs", "erp.supplier",
    "brand.products", "brand.series", "brand.journal", "brand.home", "brand.media",
    "brand.banners", "brand.seo", "brand.settings",
    "settings.users", "settings.roles", "settings.permissions", "settings.audit", "settings.system",
  ],
  ERP_ADMIN: [
    "erp.products", "erp.materials", "erp.bom", "erp.purchase", "erp.inventory",
    "erp.production", "erp.orders", "erp.customers", "erp.costs", "erp.supplier",
    "brand.products", "brand.series", "brand.journal", "brand.media",
    "settings.audit",
  ],
  BRAND_ADMIN: [
    "brand.products", "brand.series", "brand.journal", "brand.home", "brand.media",
    "brand.banners", "brand.seo", "brand.settings",
    "erp.products",
  ],
  WEB_ADMIN: [
    "brand.products", "brand.series", "brand.home", "brand.media",
    "brand.banners", "brand.seo", "brand.settings",
  ],
  EDITOR: [
    "brand.products", "brand.series", "brand.journal", "brand.media",
  ],
  OPERATOR: [
    "erp.materials", "erp.inventory", "erp.production", "erp.orders",
    "erp.purchase", "erp.customers",
    "erp.products",
  ],
  VIEWER: [],
};

// ── Seed standard roles (idempotent) ──
export async function seedStandardRoles(): Promise<{ ok: boolean; migrated: number; seeded: number; permissionsSet: number }> {
  let migrated = 0;
  let seeded = 0;
  let permissionsSet = 0;

  try {
    // 1. Delete old roles that don't match standard codes
    const oldRoles = await prisma.$queryRawUnsafe<{ id: number; role_code: string }[]>(
      `SELECT id, role_code FROM roles ORDER BY id`
    );

    const existingCodes = new Set(oldRoles.map(r => r.role_code));
    const newCodes = new Set(STANDARD_CODES);

    // Delete roles that are not standard
    for (const old of oldRoles) {
      if (!newCodes.has(old.role_code)) {
        await prisma.$executeRawUnsafe(`DELETE FROM roles WHERE id = $1`, old.id);
        migrated++;
      }
    }

    // 2. Insert missing standard roles with default permissions
    for (const role of STANDARD_ROLES) {
      if (!existingCodes.has(role.role_code)) {
        const perms = DEFAULT_PERMISSIONS[role.role_code] || [];
        await prisma.$executeRawUnsafe(
          `INSERT INTO roles (role_name, role_code, description, permissions, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4::jsonb, true, NOW(), NOW())`,
          role.role_name, role.role_code, role.description, JSON.stringify(perms)
        );
        seeded++;
      }
    }

    // 3. For existing roles with empty permissions, set defaults
    for (const role of STANDARD_ROLES) {
      if (existingCodes.has(role.role_code)) {
        const rows = await prisma.$queryRawUnsafe<{ permissions: string }[]>(
          `SELECT permissions::text as permissions FROM roles WHERE role_code = $1 AND (permissions IS NULL OR permissions::text = '[]'::text OR permissions::text = 'null')`,
          role.role_code
        );
        if (rows.length > 0) {
          const perms = DEFAULT_PERMISSIONS[role.role_code] || [];
          await prisma.$executeRawUnsafe(
            `UPDATE roles SET permissions = $1::jsonb, updated_at = NOW() WHERE role_code = $2`,
            JSON.stringify(perms), role.role_code
          );
          permissionsSet++;
        }
      }
    }

    return { ok: true, migrated, seeded, permissionsSet };
  } catch (e: any) {
    return { ok: false, migrated, seeded, permissionsSet };
  }
}

// ── List roles for select dropdown ──
export async function listRolesForSelect(): Promise<{ value: string; label: string }[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ role_code: string; role_name: string }[]>(
      `SELECT role_code, role_name FROM roles WHERE is_active = true ORDER BY id ASC`
    );
    return rows.map(r => ({ value: r.role_code, label: r.role_name }));
  } catch {
    return STANDARD_ROLES.map(r => ({ value: r.role_code, label: r.role_name }));
  }
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
