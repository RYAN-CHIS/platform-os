/**
 * /api/permissions/templates
 * V3 权限模板 CRUD
 * 需要 user.edit 权限（管理员）
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, writeAuditLog, getTemplatePermissionCodes } from "@/lib/permissions";

/**
 * GET /api/permissions/templates
 * 获取所有权限模板
 */
export async function GET(req: Request) {
  const auth = await requirePermission(PERMISSIONS.USER_VIEW);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const withPermissions = searchParams.get("withPermissions");

  const where: any = {};
  if (role) where.role = role;

  const templates = await prisma.permissionTemplate.findMany({
    where,
    include: withPermissions === "true"
      ? { items: { include: { permission: { include: { group: true } } } } }
      : undefined,
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(templates.map((t) => ({
    id: t.id,
    name: t.name,
    role: t.role,
    description: t.description,
    createdAt: t.createdAt,
    permissionCount: (t as any).items?.length || 0,
    permissions: withPermissions === "true"
      ? (t as any).items?.map((i: any) => ({
          code: i.permission.code,
          name: i.permission.name,
          group: i.permission.group?.name || null,
        }))
      : undefined,
  })));
}

/**
 * POST /api/permissions/templates
 * 创建新的权限模板
 * Body: { name, role, description, permissionCodes: ["cost.view", ...] }
 */
export async function POST(req: Request) {
  const auth = await requirePermission(PERMISSIONS.USER_EDIT);
  if (auth instanceof Response) return auth;

  try {
    const { name, role, description, permissionCodes } = await req.json();

    if (!name || !role) {
      return NextResponse.json({ error: "name 和 role 为必填项" }, { status: 400 });
    }

    if (!["admin", "operator", "viewer"].includes(role)) {
      return NextResponse.json({ error: "无效的角色" }, { status: 400 });
    }

    // 创建模板
    const template = await prisma.$transaction(async (tx) => {
      const tmpl = await tx.permissionTemplate.create({
        data: { name, role, description: description || null },
      });

      if (Array.isArray(permissionCodes) && permissionCodes.length > 0) {
        const perms = await tx.permission.findMany({
          where: { code: { in: permissionCodes } },
          select: { id: true },
        });
        for (const perm of perms) {
          await tx.permissionTemplateItem.create({
            data: { templateId: tmpl.id, permissionId: perm.id },
          });
        }
      }

      return tmpl;
    });

    return NextResponse.json({
      success: true,
      template: { id: template.id, name: template.name, role: template.role },
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "创建模板失败" }, { status: 500 });
  }
}

/**
 * PUT /api/permissions/templates?id=1
 * 更新权限模板
 * Body: { name?, description?, permissionCodes? }
 */
export async function PUT(req: Request) {
  const auth = await requirePermission(PERMISSIONS.USER_EDIT);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id 为必填项" }, { status: 400 });
  }

  try {
    const { name, description, permissionCodes } = await req.json();

    await prisma.$transaction(async (tx) => {
      if (name || description !== undefined) {
        await tx.permissionTemplate.update({
          where: { id: parseInt(id) },
          data: {
            ...(name ? { name } : {}),
            ...(description !== undefined ? { description } : {}),
          },
        });
      }

      if (Array.isArray(permissionCodes)) {
        // 清除旧权限 → 写入新权限
        await tx.permissionTemplateItem.deleteMany({
          where: { templateId: parseInt(id) },
        });

        const perms = await tx.permission.findMany({
          where: { code: { in: permissionCodes } },
          select: { id: true },
        });
        for (const perm of perms) {
          await tx.permissionTemplateItem.create({
            data: { templateId: parseInt(id), permissionId: perm.id },
          });
        }
      }
    });

    const updatedCodes = await getTemplatePermissionCodes(parseInt(id));

    return NextResponse.json({ success: true, permissionCount: updatedCodes.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "更新模板失败" }, { status: 500 });
  }
}

/**
 * DELETE /api/permissions/templates?id=1
 * 删除权限模板
 */
export async function DELETE(req: Request) {
  const auth = await requirePermission(PERMISSIONS.USER_EDIT);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id 为必填项" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.permissionTemplateItem.deleteMany({ where: { templateId: parseInt(id) } });
    await tx.permissionTemplate.delete({ where: { id: parseInt(id) } });
  });

  return NextResponse.json({ success: true });
}
