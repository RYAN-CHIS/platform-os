/**
 * Settings Users Actions — WO-P12D
 * Full CRUD for /settings/users
 */
"use server";

import { prisma } from "@yunwu/db";
import { Prisma } from "@prisma/client";
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

type DbUserRow = {
  id: number;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastLoginAt: Date | string | null;
};

type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  tempPassword?: string;
  cleanup?: {
    userPermissions: number;
    temporaryPermissions: number;
  };
};

const ACTIVE_STATUS = "active";
const DISABLED_STATUS = "disabled";
const DELETED_STATUS = "deleted";
const USER_STATUSES = new Set(["active", "inactive", "disabled", "suspended", "deleted"]);

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function toUserRow(row: DbUserRow): UserRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
    role: row.role,
    status: row.status,
    createdAt: toIso(row.createdAt) || "",
    updatedAt: toIso(row.updatedAt) || "",
    lastLoginAt: toIso(row.lastLoginAt),
  };
}

function assertUserId(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("无效用户 ID");
  }
}

function normalizeEmail(email: string) {
  const value = email.trim().toLowerCase();
  if (!value || !value.includes("@")) throw new Error("请输入有效邮箱");
  return value;
}

function normalizeRole(role: string | undefined) {
  const value = (role || "VIEWER").trim();
  if (!value) throw new Error("请选择用户角色");
  return value;
}

function normalizeStatus(status: string | undefined, fallback = ACTIVE_STATUS) {
  const value = (status || fallback).trim().toLowerCase();
  if (!USER_STATUSES.has(value)) {
    throw new Error(`不支持的用户状态: ${status}`);
  }
  return value;
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "用户操作失败，请稍后重试";
}

function toAuditUser(row: UserRow | null): Record<string, unknown> | null {
  return row ? { ...row } : null;
}

async function findUserById(
  tx: Prisma.TransactionClient,
  id: number,
  options: { includeDeleted?: boolean } = {}
): Promise<UserRow | null> {
  const deletedFilter = options.includeDeleted
    ? Prisma.sql``
    : Prisma.sql`AND COALESCE(status, ${ACTIVE_STATUS}) <> ${DELETED_STATUS}`;

  const rows = await tx.$queryRaw<DbUserRow[]>(Prisma.sql`
    SELECT id, email, name, avatar, role::text, COALESCE(status, ${ACTIVE_STATUS}) AS status,
           created_at AS "createdAt", updated_at AS "updatedAt", last_login_at AS "lastLoginAt"
    FROM users
    WHERE id = ${id} ${deletedFilter}
    LIMIT 1
  `);

  return rows[0] ? toUserRow(rows[0]) : null;
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
  const keyword = q?.trim();
  const where = keyword
    ? Prisma.sql`WHERE COALESCE(status, ${ACTIVE_STATUS}) <> ${DELETED_STATUS} AND (email ILIKE ${`%${keyword}%`} OR name ILIKE ${`%${keyword}%`})`
    : Prisma.sql`WHERE COALESCE(status, ${ACTIVE_STATUS}) <> ${DELETED_STATUS}`;

  const rows = await prisma.$queryRaw<DbUserRow[]>(Prisma.sql`
    SELECT id, email, name, avatar, role::text, COALESCE(status, ${ACTIVE_STATUS}) AS status,
           created_at AS "createdAt", updated_at AS "updatedAt", last_login_at AS "lastLoginAt"
    FROM users
    ${where}
    ORDER BY created_at DESC
    LIMIT 200
  `);
  return rows.map(toUserRow);
}

// ── Create ──
export async function createUser(input: CreateUserInput): Promise<ActionResult> {
  try {
    const bcrypt = await import("bcryptjs");
    const email = normalizeEmail(input.email);
    const role = normalizeRole(input.role);
    const status = normalizeStatus(input.status);
    const name = input.name.trim() || null;
    const hash = await bcrypt.hash(input.password, 10);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.$queryRaw<{ id: number; status: string }[]>(Prisma.sql`
        SELECT id, COALESCE(status, ${ACTIVE_STATUS}) AS status
        FROM users
        WHERE lower(email) = lower(${email})
        LIMIT 1
      `);
      if (existing.length > 0) {
        throw new Error(existing[0].status === DELETED_STATUS ? "邮箱已存在于已删除用户，请先恢复或更换邮箱" : "邮箱已存在");
      }

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO users (email, password, name, role, status, created_at, updated_at)
        VALUES (${email}, ${hash}, ${name}, ${role}, ${status}, NOW(), NOW())
      `);
    });

    // Audit
    try {
      await createAuditLog({
        action: "USER_CREATE",
        system: "SETTINGS",
        module: "users",
        after: { email, name, role, status },
      });
    } catch {}

    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatError(e) };
  }
}

// ── Update ──
export async function updateUser(input: UpdateUserInput): Promise<ActionResult> {
  try {
    assertUserId(input.id);
    const email = input.email !== undefined ? normalizeEmail(input.email) : undefined;
    const role = input.role !== undefined ? normalizeRole(input.role) : undefined;
    const status = input.status !== undefined ? normalizeStatus(input.status) : undefined;

    const result = await prisma.$transaction(async (tx) => {
      const before = await findUserById(tx, input.id);
      if (!before) throw new Error("用户不存在或已删除");

      if (email !== undefined) {
        const existing = await tx.$queryRaw<{ id: number }[]>(Prisma.sql`
          SELECT id
          FROM users
          WHERE lower(email) = lower(${email}) AND id <> ${input.id}
          LIMIT 1
        `);
        if (existing.length > 0) throw new Error("邮箱已存在");
      }

      const sets: Prisma.Sql[] = [];
      if (input.name !== undefined) sets.push(Prisma.sql`name = ${input.name.trim() || null}`);
      if (email !== undefined) sets.push(Prisma.sql`email = ${email}`);
      if (role !== undefined) sets.push(Prisma.sql`role = ${role}`);
      if (status !== undefined) sets.push(Prisma.sql`status = ${status}`);
      if (input.avatar !== undefined) sets.push(Prisma.sql`avatar = ${input.avatar || null}`);
      sets.push(Prisma.sql`updated_at = NOW()`);

      await tx.$executeRaw(Prisma.sql`
        UPDATE users
        SET ${Prisma.join(sets, ", ")}
        WHERE id = ${input.id} AND COALESCE(status, ${ACTIVE_STATUS}) <> ${DELETED_STATUS}
      `);

      const after = await findUserById(tx, input.id);
      return { before, after };
    });

    // Audit
    try {
      await createAuditLog({
        action: "USER_UPDATE",
        system: "SETTINGS",
        module: "users",
        targetId: input.id,
        before: toAuditUser(result.before),
        after: toAuditUser(result.after),
      });
    } catch {}

    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatError(e) };
  }
}

// ── Delete ──
export async function deleteUser(id: number): Promise<ActionResult> {
  try {
    assertUserId(id);

    const result = await prisma.$transaction(async (tx) => {
      const before = await findUserById(tx, id);
      if (!before) throw new Error("用户不存在或已删除");

      const directPermissions = await tx.userPermission.deleteMany({ where: { userId: id } });
      const temporaryPermissions = await tx.temporaryPermission.deleteMany({ where: { userId: id } });

      await tx.$executeRaw(Prisma.sql`
        UPDATE users
        SET status = ${DELETED_STATUS},
            reset_token = NULL,
            reset_token_expiry = NULL,
            updated_at = NOW()
        WHERE id = ${id}
      `);

      return {
        before,
        cleanup: {
          userPermissions: directPermissions.count,
          temporaryPermissions: temporaryPermissions.count,
        },
      };
    });

    // Audit
    try {
      await createAuditLog({
        action: "USER_DELETE",
        system: "SETTINGS",
        module: "users",
        targetId: id,
        before: toAuditUser(result.before),
        after: { ...result.before, status: DELETED_STATUS },
        description: "Soft deleted user and removed active permission grants",
        extra: { cleanup: result.cleanup },
      });
    } catch {}

    return {
      ok: true,
      message: "用户已删除：账号已从列表隐藏，权限授权已清理，审计记录已保留",
      cleanup: result.cleanup,
    };
  } catch (e) {
    return { ok: false, error: formatError(e) };
  }
}

// ── Toggle status ──
export async function toggleUserStatus(id: number, status: string): Promise<ActionResult> {
  try {
    assertUserId(id);
    const nextStatus = normalizeStatus(status, DISABLED_STATUS);
    if (nextStatus === DELETED_STATUS) throw new Error("删除用户请使用删除操作");

    const result = await prisma.$transaction(async (tx) => {
      const before = await findUserById(tx, id);
      if (!before) throw new Error("用户不存在或已删除");

      if (nextStatus !== ACTIVE_STATUS) {
        await tx.temporaryPermission.deleteMany({ where: { userId: id } });
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE users
        SET status = ${nextStatus},
            reset_token = CASE WHEN ${nextStatus} = ${ACTIVE_STATUS} THEN reset_token ELSE NULL END,
            reset_token_expiry = CASE WHEN ${nextStatus} = ${ACTIVE_STATUS} THEN reset_token_expiry ELSE NULL END,
            updated_at = NOW()
        WHERE id = ${id} AND COALESCE(status, ${ACTIVE_STATUS}) <> ${DELETED_STATUS}
      `);

      const after = await findUserById(tx, id);
      return { before, after };
    });

    // Audit
    try {
      const action = nextStatus === ACTIVE_STATUS ? "USER_ENABLE" : "USER_DISABLE";
      await createAuditLog({
        action,
        system: "SETTINGS",
        module: "users",
        targetId: id,
        before: toAuditUser(result.before),
        after: toAuditUser(result.after),
      });
    } catch {}

    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatError(e) };
  }
}

// ── Reset password ──
export async function resetUserPassword(id: number): Promise<ActionResult> {
  try {
    assertUserId(id);
    const userRows = await prisma.$queryRaw<{ id: number; email: string; name: string | null; status: string }[]>(Prisma.sql`
      SELECT id, email, name, COALESCE(status, ${ACTIVE_STATUS}) AS status
      FROM users
      WHERE id = ${id} AND COALESCE(status, ${ACTIVE_STATUS}) <> ${DELETED_STATUS}
      LIMIT 1
    `);
    const user = userRows[0] || null;
    if (!user) return { ok: false, error: "用户不存在或已删除" };
    if (user.status !== ACTIVE_STATUS) return { ok: false, error: "该用户已禁用，不能重置密码" };

    // Audit - record the password reset event
    try {
      await createAuditLog({
        action: "PASSWORD_RESET",
        system: "SETTINGS",
        module: "users",
        targetId: id,
        before: { email: user.email, name: user.name },
        description: `Password reset for user ${user.email}`,
      });
    } catch {}

    // Generate temporary password and hash it
    const crypto = await import("crypto");
    const bcrypt = await import("bcryptjs");
    const tempPassword = crypto.randomBytes(4).toString("hex"); // 8-char hex
    const hash = await bcrypt.hash(tempPassword, 10);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE users SET password = ${hash}, updated_at = NOW() WHERE id = ${id}
    `);

    return { ok: true, tempPassword };
  } catch (e) {
    return { ok: false, error: formatError(e) };
  }
}
