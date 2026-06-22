/**
 * POST /api/permissions/temp-grant
 * V3 临时授权
 * Body: { userId, permission, expiresIn (秒), reason }
 * 需要 user.edit 权限
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, writeAuditLog } from "@/lib/permissions";

export async function POST(req: Request) {
  const auth = await requirePermission(PERMISSIONS.USER_EDIT);
  if (auth instanceof Response) return auth;

  try {
    const { userId, permission, expiresIn, reason } = await req.json();
    const actorId = parseInt(auth.id);

    if (!userId || !permission || !expiresIn) {
      return NextResponse.json(
        { error: "userId, permission, expiresIn 为必填项" },
        { status: 400 }
      );
    }

    const uid = parseInt(userId);

    // 验证用户存在
    const targetUser = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, role: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 验证权限代码存在
    const perm = await prisma.permission.findUnique({
      where: { code: permission },
    });
    if (!perm) {
      return NextResponse.json({ error: `权限点 ${permission} 不存在` }, { status: 400 });
    }

    // 验证过期时间范围（1分钟 ~ 24小时）
    const minExpiry = 60; // 1分钟
    const maxExpiry = 86400; // 24小时
    if (expiresIn < minExpiry || expiresIn > maxExpiry) {
      return NextResponse.json(
        { error: "过期时间范围为 1分钟 ~ 24小时 (60 ~ 86400 秒)" },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresIn * 1000);

    // 检查是否已有同一权限的临时授权
    const existing = await prisma.temporaryPermission.findFirst({
      where: {
        userId: uid,
        permissionId: perm.id,
        expiresAt: { gt: now },
      },
    });

    if (existing) {
      // 已有未过期的临时授权，更新过期时间
      await prisma.temporaryPermission.update({
        where: { id: existing.id },
        data: { expiresAt, reason: reason || null, grantedBy: actorId },
      });
    } else {
      // 创建新的临时授权
      await prisma.temporaryPermission.create({
        data: {
          userId: uid,
          permissionId: perm.id,
          expiresAt,
          grantedBy: actorId,
          reason: reason || null,
        },
      });
    }

    // V3: 写审计日志
    await writeAuditLog(actorId, uid, "TEMP_GRANT", permission, reason);

    // 返回剩余时间
    const remainingMs = expiresAt.getTime() - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / 60000);

    return NextResponse.json({
      success: true,
      tempGrant: {
        userId: uid,
        permission,
        expiresAt: expiresAt.toISOString(),
        remainingMinutes,
        reason: reason || null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "操作失败" }, { status: 500 });
  }
}

/**
 * GET /api/permissions/temp-grant?userId=1
 * 获取用户的临时权限列表
 */
export async function GET(req: Request) {
  const auth = await requirePermission(PERMISSIONS.USER_VIEW);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    // 返回所有未过期的临时权限
    const allTemp = await prisma.temporaryPermission.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: { permission: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { expiresAt: "asc" },
    });
    return NextResponse.json(allTemp.map((t) => ({
      id: t.id,
      userId: t.userId,
      userName: t.user.name || t.user.email,
      permission: t.permission.code,
      permissionName: t.permission.name,
      grantedAt: t.grantedAt,
      expiresAt: t.expiresAt,
      reason: t.reason,
      remainingMinutes: Math.ceil((t.expiresAt.getTime() - Date.now()) / 60000),
    })));
  }

  const uid = parseInt(userId);
  const now = new Date();
  const tempPerms = await prisma.temporaryPermission.findMany({
    where: {
      userId: uid,
      expiresAt: { gt: now },
    },
    include: { permission: true },
    orderBy: { expiresAt: "asc" },
  });

  return NextResponse.json(tempPerms.map((t) => ({
    id: t.id,
    permission: t.permission.code,
    permissionName: t.permission.name,
    grantedAt: t.grantedAt,
    expiresAt: t.expiresAt,
    reason: t.reason,
    remainingMinutes: Math.ceil((t.expiresAt.getTime() - Date.now()) / 60000),
  })));
}

/**
 * DELETE /api/permissions/temp-grant?id=1
 * 手动撤销临时权限
 */
export async function DELETE(req: Request) {
  const auth = await requirePermission(PERMISSIONS.USER_EDIT);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id 为必填项" }, { status: 400 });
  }

  const tempPerm = await prisma.temporaryPermission.findUnique({
    where: { id: parseInt(id) },
    include: { permission: true },
  });

  if (!tempPerm) {
    return NextResponse.json({ error: "临时权限不存在" }, { status: 404 });
  }

  await prisma.temporaryPermission.delete({ where: { id: parseInt(id) } });

  // 审计日志
  await writeAuditLog(
    parseInt(auth.id),
    tempPerm.userId,
    "TEMP_EXPIRE",
    tempPerm.permission.code,
    "手动撤销"
  );

  return NextResponse.json({ success: true });
}
