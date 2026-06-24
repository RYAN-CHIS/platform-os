/**
 * Settings Users Actions — WO-P12D
 * Full CRUD for /settings/users
 */
"use server";

import { prisma } from "@yunwu/db";
import { createAuditLog } from "@/lib/audit";

// ── Types ──
export interface UserRow {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: string;
  status?: string;
}

export interface UpdateUserInput {
  id: number;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  avatar?: string;
}

// ── List ──
export async function listUsers(q?: string): Promise<UserRow[]> {
  const rows = await prisma.$queryRawUnsafe<UserRow[]>(
    `SELECT id, email, name, avatar, role::text, COALESCE(status, 'active') as status,
            created_at as "createdAt", updated_at as "updatedAt", last_login_at as "lastLoginAt"
     FROM users
     ${q ? `WHERE email ILIKE $1 OR name ILIKE $1` : ''}
     ORDER BY created_at DESC
     LIMIT 200`,
    ...(q ? [`%${q}%`] : [])
  );
  return rows;
}

// ── Create ──
export async function createUser(input: CreateUserInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash(input.password, 10);
    const status = input.status || "active";

    // Check duplicate
    const existing = await prisma.$queryRawUnsafe<{ cnt: string }[]>(
      `SELECT COUNT(*)::text as cnt FROM users WHERE email = $1`, input.email
    );
    if (parseInt(existing[0].cnt) > 0) {
      return { ok: false, error: "邮箱已存在" };
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO users (email, password, name, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4::"UserRole", $5, NOW(), NOW())`,
      input.email, hash, input.name, input.role, status
    );

    // Audit
    try {
      await createAuditLog({
        action: "USER_CREATE",
        system: "SETTINGS",
        module: "users",
        after: { email: input.email, name: input.name, role: input.role, status },
      });
    } catch {}

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Update ──
export async function updateUser(input: UpdateUserInput): Promise<{ ok: boolean; error?: string }> {
  try {
    // Fetch before state
    const beforeRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, name, role, COALESCE(status, 'active') as status FROM users WHERE id = $1`,
      input.id
    );
    const before = beforeRows[0] || null;

    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (input.name !== undefined) { sets.push(`name = $${idx++}`); vals.push(input.name); }
    if (input.email !== undefined) { sets.push(`email = $${idx++}`); vals.push(input.email); }
    if (input.role !== undefined) { sets.push(`role = $${idx++}::"UserRole"`); vals.push(input.role); }
    if (input.status !== undefined) { sets.push(`status = $${idx++}`); vals.push(input.status); }
    if (input.avatar !== undefined) { sets.push(`avatar = $${idx++}`); vals.push(input.avatar); }
    sets.push(`updated_at = NOW()`);

    vals.push(input.id);
    await prisma.$executeRawUnsafe(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${idx}`,
      ...vals
    );

    // Audit
    try {
      const after = { ...before, ...input };
      await createAuditLog({
        action: "USER_UPDATE",
        system: "SETTINGS",
        module: "users",
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
export async function deleteUser(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    // Fetch before state
    const beforeRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, name, role, COALESCE(status, 'active') as status FROM users WHERE id = $1`,
      id
    );
    const before = beforeRows[0] || null;

    await prisma.$executeRawUnsafe(`DELETE FROM users WHERE id = $1`, id);

    // Audit
    try {
      await createAuditLog({
        action: "USER_DELETE",
        system: "SETTINGS",
        module: "users",
        targetId: id,
        before,
      });
    } catch {}

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Toggle status ──
export async function toggleUserStatus(id: number, status: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // Fetch before state
    const beforeRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, name, role, COALESCE(status, 'active') as status FROM users WHERE id = $1`,
      id
    );
    const before = beforeRows[0] || null;

    await prisma.$executeRawUnsafe(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2`,
      status, id
    );

    // Audit
    try {
      const action = status === 'active' ? 'USER_ENABLE' : 'USER_DISABLE';
      const after = { ...before, status };
      await createAuditLog({
        action,
        system: "SETTINGS",
        module: "users",
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

// ── Reset password ──
export async function resetUserPassword(id: number): Promise<{ ok: boolean; error?: string }> {
  // Fetch user for audit
  const userRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, email, name FROM users WHERE id = $1`,
    id
  );
  const user = userRows[0] || null;

  // Audit - record the password reset event
  try {
    await createAuditLog({
      action: "PASSWORD_RESET",
      system: "SETTINGS",
      module: "users",
      targetId: id,
      before: user ? { email: user.email, name: user.name } : null,
      description: `Password reset requested for user ${user?.email || id}`,
    });
  } catch {}

  return { ok: false, error: "密码重置功能将在下一版本中接入" };
}
