import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/permissions";

// 角色默认权限代码
const ROLE_DEFAULT_CODES: Record<string, string[]> = {
  admin: [
    "dashboard.view", "product.view", "product.edit", "product.delete",
    "sku.view", "sku.edit", "sku.delete",
    "work.view", "work.edit", "work.delete",
    "material.view", "material.edit", "material.delete",
    "inventory.view", "inventory.edit",
    "bom.view", "bom.edit",
    "cost.view", "cost.edit", "profit.view",
    "production.view", "production.create", "production.edit",
    "order.view", "order.edit",
    "customer.view", "customer.edit",
    "user.view", "user.edit",
    "setting.view", "setting.edit",
    "import.data", "export.data", "super.admin",
  ],
  operator: [
    "dashboard.view", "product.view", "product.edit",
    "sku.view", "sku.edit", "work.view", "work.edit",
    "order.view", "order.edit", "customer.view", "customer.edit",
    "production.view", "production.create",
    "inventory.view", "bom.view", "material.view",
  ],
  viewer: ["dashboard.view", "product.view", "sku.view", "work.view"],
};

// PUT /api/users/[id] — 更新用户角色，并重算权限 + V3 审计日志
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if ((session.user as any).role !== "admin") {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
    }

    const body = await req.json();
    const { role } = body;

    if (role) {
      const normalizedRole = role === "staff" ? "operator" : role;
      if (!["admin", "operator", "viewer"].includes(normalizedRole)) {
        return NextResponse.json({ error: "无效的角色" }, { status: 400 });
      }
      if (String(userId) === (session.user as any).id) {
        return NextResponse.json({ error: "不能修改自己的角色" }, { status: 400 });
      }

      const actorId = parseInt((session.user as any).id);
      const oldRole = (await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role;

      // V3: 事务：更新角色 + 重算权限 + 审计日志
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { role: normalizedRole },
        });

        // 删除旧权限
        await tx.userPermission.deleteMany({ where: { userId } });

        // 分配新角色默认权限
        const codes = ROLE_DEFAULT_CODES[normalizedRole] || [];
        if (codes.length > 0) {
          const perms = await tx.permission.findMany({
            where: { code: { in: codes } },
            select: { id: true, code: true },
          });
          for (const perm of perms) {
            await tx.userPermission.create({
              data: { userId, permissionId: perm.id, type: "GRANT" },
            });
          }
        }

        // V3: 审计日志 — 角色变更
        await tx.permissionAuditLog.create({
          data: {
            userId: actorId,
            targetUserId: userId,
            action: "ROLE_CHANGE",
            permission: `${oldRole || "?"} → ${normalizedRole}`,
            reason: "角色变更",
          },
        });
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, name: true, avatar: true,
          role: true, permissions: true,
        },
      });

      return NextResponse.json({ success: true, user });
    }

    return NextResponse.json({ error: "没有需要更新的内容" }, { status: 400 });
  } catch (error) {
    console.error("更新用户失败:", error);
    return NextResponse.json({ error: "更新用户失败" }, { status: 500 });
  }
}

// DELETE /api/users/[id] — 删除用户 + V3 审计日志
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if ((session.user as any).role !== "admin") {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "无效的用户ID" }, { status: 400 });
    }

    if (String(userId) === (session.user as any).id) {
      return NextResponse.json({ error: "不能删除自己的账号" }, { status: 400 });
    }

    const actorId = parseInt((session.user as any).id);

    // V3: 事务：删除用户权限记录 + 审计日志 + 删除用户
    await prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId } });
      await tx.temporaryPermission.deleteMany({ where: { userId } });

      // 审计日志
      await tx.permissionAuditLog.create({
        data: {
          userId: actorId,
          targetUserId: userId,
          action: "REVOKE",
          permission: "ALL",
          reason: "用户被删除，所有权限已撤销",
        },
      });

      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ success: true, message: "用户已删除" });
  } catch (error) {
    console.error("删除用户失败:", error);
    return NextResponse.json({ error: "删除用户失败" }, { status: 500 });
  }
}
