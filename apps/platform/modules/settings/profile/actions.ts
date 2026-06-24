"use server";

/**
 * Profile Actions — update own name/email/password
 */
import { prisma } from "@yunwu/db";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";
import bcrypt from "bcryptjs";

type ActionResult = { ok: boolean; error?: string };

function formatError(e: unknown) {
  return e instanceof Error ? e.message : "操作失败";
}

export async function updateProfile(id: number, data: { name?: string; email?: string }): Promise<ActionResult> {
  try {
    const sets: Prisma.Sql[] = [];
    if (data.name !== undefined) sets.push(Prisma.sql`name = ${data.name.trim() || null}`);
    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();
      if (!email.includes("@")) return { ok: false, error: "请输入有效邮箱" };
      const existing = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id FROM users WHERE lower(email) = lower($1) AND id <> $2 AND COALESCE(status,'active') <> 'deleted' LIMIT 1`, email, id
      );
      if (existing.length > 0) return { ok: false, error: "邮箱已被其他用户使用" };
      sets.push(Prisma.sql`email = ${email}`);
    }
    if (sets.length === 0) return { ok: true };

    sets.push(Prisma.sql`updated_at = NOW()`);
    await prisma.$executeRaw(Prisma.sql`UPDATE users SET ${Prisma.join(sets, ", ")} WHERE id = ${id}`);

    try { await createAuditLog({ action: "PROFILE_UPDATE", system: "SETTINGS", module: "profile", targetId: id, description: "Updated profile" }); } catch {}
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatError(e) };
  }
}

export async function changePassword(
  id: number, currentPassword: string, newPassword: string
): Promise<ActionResult> {
  try {
    if (newPassword.length < 8) return { ok: false, error: "新密码至少8位" };

    const rows = await prisma.$queryRawUnsafe<{ password: string }[]>(
      `SELECT password FROM users WHERE id = $1 LIMIT 1`, id
    );
    if (!rows[0]) return { ok: false, error: "用户不存在" };

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return { ok: false, error: "当前密码不正确" };

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.$executeRawUnsafe(
      `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`, hash, id
    );

    try { await createAuditLog({ action: "PASSWORD_CHANGE", system: "SETTINGS", module: "profile", targetId: id, description: "Self password change" }); } catch {}
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatError(e) };
  }
}
