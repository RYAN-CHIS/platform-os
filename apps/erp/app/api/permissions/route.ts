import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, writeAuditLog } from "@/lib/permissions";

/**
 * GET /api/permissions?userId=1
 * 获取用户当前拥有的权限点列表（含 type 信息）
 * 需要 user.view 权限
 */
export async function GET(req: Request) {
  const auth = await requirePermission(PERMISSIONS.USER_VIEW);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const groupBy = searchParams.get("groupBy");

  if (!userId) {
    // 返回所有权限点定义（含分组信息）
    const allPerms = await prisma.permission.findMany({
      include: { group: true },
      orderBy: [{ groupId: { sort: "asc", nulls: "last" } }, { code: "asc" }],
    });
    return NextResponse.json(allPerms);
  }

  const uid = parseInt(userId);

  // 返回指定用户的权限点（含 type）
  const userPerms = await prisma.userPermission.findMany({
    where: { userId: uid },
    include: { permission: { include: { group: true } } },
    orderBy: { permission: { code: "asc" } },
  });

  // 返回分组格式（兼容 V3 前端）
  if (groupBy === "category") {
    const groups: Record<string, any[]> = {};
    for (const up of userPerms) {
      const gname = up.permission.group?.name || "其他";
      if (!groups[gname]) groups[gname] = [];
      groups[gname].push({
        code: up.permission.code,
        name: up.permission.name,
        type: up.type,
        groupId: up.permission.groupId,
      });
    }
    return NextResponse.json(Object.entries(groups).map(([group, perms]) => ({ group, permissions: perms })));
  }

  return NextResponse.json(userPerms.map((up) => ({
    id: up.permission.id,
    code: up.permission.code,
    name: up.permission.name,
    type: up.type,
    group: up.permission.group,
  })));
}

/**
 * POST /api/permissions
 * 批量更新用户权限
 * Body V2: { userId, add: ["cost.view"], remove: ["material.view"] }
 * Body V3 模板应用: { userId, applyTemplate: templateId }
 * V3: 支持 GRANT/REVOKE type，自动写审计日志
 * 需要 user.edit 权限
 */
export async function POST(req: Request) {
  const auth = await requirePermission(PERMISSIONS.USER_EDIT);
  if (auth instanceof Response) return auth;

  try {
    const { userId, add, remove, applyTemplate } = await req.json();
    const actorId = parseInt(auth.id);

    if (!userId) {
      return NextResponse.json({ error: "userId 不能为空" }, { status: 400 });
    }

    const uid = parseInt(userId);

    // 检查目标用户是否是 admin（admin 权限不可被修改）
    const targetUser = await prisma.user.findUnique({
      where: { id: uid },
      select: { role: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }
    if (targetUser.role === "admin") {
      return NextResponse.json({ error: "管理员权限不可在此修改" }, { status: 403 });
    }

    // ─── V3: 应用模板 ───
    if (applyTemplate) {
      const template = await prisma.permissionTemplate.findUnique({
        where: { id: parseInt(applyTemplate) },
        include: { items: { include: { permission: true } } },
      });
      if (!template) {
        return NextResponse.json({ error: "模板不存在" }, { status: 404 });
      }

      const templateCodes = template.items.map((i) => i.permission.code);

      await prisma.$transaction(async (tx) => {
        // 清除用户原有自定义权限
        await tx.userPermission.deleteMany({ where: { userId: uid } });

        // 写入模板权限（同步到 user_permissions）
        const perms = await tx.permission.findMany({
          where: { code: { in: templateCodes } },
          select: { id: true, code: true },
        });
        for (const perm of perms) {
          await tx.userPermission.create({
            data: { userId: uid, permissionId: perm.id, type: "GRANT" },
          });
          // 审计日志
          await tx.permissionAuditLog.create({
            data: {
              userId: actorId,
              targetUserId: uid,
              action: "TEMPLATE_APPLY",
              permission: perm.code,
              reason: `应用模板：${template.name}`,
            },
          });
        }
      });

      return NextResponse.json({
        success: true,
        message: `已应用模板「${template.name}」，共 ${template.items.length} 个权限`,
      });
    }

    // ─── V2/V3: 手动添加/移除权限 ───

    // 添加权限（type=GRANT）
    if (Array.isArray(add) && add.length > 0) {
      const permsToAdd = await prisma.permission.findMany({
        where: { code: { in: add } },
        select: { id: true, code: true },
      });
      for (const perm of permsToAdd) {
        await prisma.userPermission.upsert({
          where: {
            userId_permissionId: { userId: uid, permissionId: perm.id },
          },
          create: { userId: uid, permissionId: perm.id, type: "GRANT" },
          update: { type: "GRANT" },
        });
        // V3: 写审计日志
        await writeAuditLog(actorId, uid, "GRANT", perm.code);
      }
    }

    // 移除权限（type=REVOKE — 标记为撤销，而非物理删除）
    if (Array.isArray(remove) && remove.length > 0) {
      const permsToRemove = await prisma.permission.findMany({
        where: { code: { in: remove } },
        select: { id: true, code: true },
      });
      for (const perm of permsToRemove) {
        // V3: upsert 为 REVOKE 而非 delete（保留记录以便审计）
        await prisma.userPermission.upsert({
          where: {
            userId_permissionId: { userId: uid, permissionId: perm.id },
          },
          create: { userId: uid, permissionId: perm.id, type: "REVOKE" },
          update: { type: "REVOKE" },
        });
        // V3: 写审计日志
        await writeAuditLog(actorId, uid, "REVOKE", perm.code);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "操作失败" }, { status: 500 });
  }
}
