import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { writeAuditLog, ALL_PERMISSION_CODES } from "@/lib/permissions";

// 角色默认权限代码（V2/V3 兼容）
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

// GET /api/users — 获取用户列表（管理员）
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if ((session.user as any).role !== "admin") {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
        // V3: 包含临时权限计数
        _count: {
          select: {
            temporaryPermissions: {
              where: { expiresAt: { gt: new Date() } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // V3: 扩展用户信息含临时权限数
    return NextResponse.json(
      users.map((u) => ({
        ...u,
        tempPermissionCount: u._count.temporaryPermissions,
        _count: undefined,
      }))
    );
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
  }
}

// POST /api/users — 创建用户（管理员），自动分配角色默认权限 + 审计日志
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    if ((session.user as any).role !== "admin") {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { email, password, name, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码为必填项" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少6位" }, { status: 400 });
    }

    const normalizedRole = role === "staff" ? "operator" : role;
    if (normalizedRole && !["admin", "operator", "viewer"].includes(normalizedRole)) {
      return NextResponse.json({ error: "无效的角色" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const finalRole = normalizedRole || "operator";
    const actorId = parseInt((session.user as any).id);

    // V3: 创建用户并分配默认权限 + 审计日志
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || email.split("@")[0],
          role: finalRole,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      // 分配角色默认权限
      const codes = ROLE_DEFAULT_CODES[finalRole] || [];
      if (codes.length > 0) {
        const perms = await tx.permission.findMany({
          where: { code: { in: codes } },
          select: { id: true, code: true },
        });
        for (const perm of perms) {
          await tx.userPermission.create({
            data: { userId: newUser.id, permissionId: perm.id, type: "GRANT" },
          });
          // V3: 审计日志
          await tx.permissionAuditLog.create({
            data: {
              userId: actorId,
              targetUserId: newUser.id,
              action: "GRANT",
              permission: perm.code,
              reason: `创建用户(${finalRole})自动授权`,
            },
          });
        }
      }

      return newUser;
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error("创建用户失败:", error);
    return NextResponse.json({ error: "创建用户失败" }, { status: 500 });
  }
}
