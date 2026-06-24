/**
 * Permission Items Actions — WO-P12D
 * Dynamic permission items stored in permission_items table
 */
"use server";

import { prisma } from "@yunwu/db";
import { createAuditLog } from "@/lib/audit";

export interface PermissionItem {
  id: number;
  name: string;
  code: string;
  module: string;
  type: string;
  description: string;
  created_at: string;
}

export interface CreatePermissionItemInput {
  name: string;
  code: string;
  module: string;
  type: string;
  description?: string;
  defaultRoles?: number[];
}

// ── Init table (idempotent) ──
async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS permission_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      module TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

// ── List all items ──
export async function listPermissionItems(): Promise<PermissionItem[]> {
  try {
    await ensureTable();
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, code, module, type, description, created_at
       FROM permission_items
       ORDER BY module ASC, id ASC`
    );
    return rows.map(r => ({
      ...r,
      created_at: r.created_at?.toISOString?.() || String(r.created_at || ''),
    }));
  } catch (e: any) {
    return [];
  }
}

// ── Create new permission item ──
export async function createPermissionItem(input: CreatePermissionItemInput): Promise<{ ok: boolean; error?: string }> {
  try {
    await ensureTable();
    // Check uniqueness
    const existing = await prisma.$queryRawUnsafe<{ cnt: string }[]>(
      `SELECT COUNT(*)::text as cnt FROM permission_items WHERE code = $1`, input.code
    );
    if (parseInt(existing[0].cnt) > 0) {
      return { ok: false, error: "权限代码已存在" };
    }

    // Also check against hardcoded ALL_MODULES
    const hardcodedCodes = [
      "erp.products","erp.materials","erp.bom","erp.purchase","erp.inventory",
      "erp.production","erp.orders","erp.customers","erp.costs","erp.supplier",
      "brand.products","brand.series","brand.journal","brand.home","brand.media",
      "brand.banners","brand.seo","brand.settings",
      "settings.users","settings.roles","settings.permissions","settings.audit","settings.system",
    ];
    if (hardcodedCodes.includes(input.code)) {
      return { ok: false, error: "该权限代码与系统内置模块冲突" };
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO permission_items (name, code, module, type, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      input.name, input.code, input.module, input.type, input.description || ''
    );

    // Audit
    try {
      await createAuditLog({
        action: "PERMISSION_ITEM_CREATE",
        system: "SETTINGS",
        module: "permissions",
        after: { name: input.name, code: input.code, module: input.module, type: input.type },
      });
    } catch {}

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Delete permission item ──
export async function deletePermissionItem(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT name, code FROM permission_items WHERE id = $1`, id
    );
    if (!rows.length) return { ok: false, error: "权限项不存在" };

    const item = rows[0];
    await prisma.$executeRawUnsafe(`DELETE FROM permission_items WHERE id = $1`, id);

    // Also remove this permission code from all roles
    await prisma.$executeRawUnsafe(
      `UPDATE roles SET permissions = permissions::jsonb - $1, updated_at = NOW() WHERE permissions::jsonb ? $1`,
      item.code
    );

    // Audit
    try {
      await createAuditLog({
        action: "PERMISSION_ITEM_DELETE",
        system: "SETTINGS",
        module: "permissions",
        before: { name: item.name, code: item.code },
      });
    } catch {}

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
