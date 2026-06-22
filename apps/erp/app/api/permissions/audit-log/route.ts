/**
 * GET /api/permissions/audit-log
 * V3 审计日志查询
 * 需要 user.view 权限
 *
 * Query params:
 *   targetUserId - 按被修改用户筛选
 *   userId - 按操作人筛选
 *   action - 按操作类型筛选 (GRANT/REVOKE/TEMP_GRANT/TEMP_EXPIRE/TEMPLATE_APPLY/ROLE_CHANGE)
 *   page - 页码 (默认1)
 *   limit - 每页数量 (默认50)
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

const ACTION_LABELS: Record<string, string> = {
  GRANT: "授权",
  REVOKE: "撤销",
  TEMP_GRANT: "临时授权",
  TEMP_EXPIRE: "临时权限过期",
  TEMPLATE_APPLY: "应用模板",
  ROLE_CHANGE: "角色变更",
};

export async function GET(req: Request) {
  const auth = await requirePermission(PERMISSIONS.USER_VIEW);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("targetUserId");
  const userId = searchParams.get("userId");
  const action = searchParams.get("action");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

  const where: any = {};
  if (targetUserId) where.targetUserId = parseInt(targetUserId);
  if (userId) where.userId = parseInt(userId);
  if (action) where.action = action;

  try {
    const [logs, total] = await Promise.all([
      prisma.permissionAuditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.permissionAuditLog.count({ where }),
    ]);

    // 获取被修改用户信息批量查询
    const targetUserIds = [...new Set(logs.map((l) => l.targetUserId))];
    const targetUsers = await prisma.user.findMany({
      where: { id: { in: targetUserIds } },
      select: { id: true, name: true, email: true },
    });
    const targetUserMap = new Map(targetUsers.map((u) => [u.id, u]));

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        actor: log.actor
          ? { id: log.actor.id, name: log.actor.name || log.actor.email }
          : null,
        targetUser: targetUserMap.get(log.targetUserId) || { id: log.targetUserId },
        action: log.action,
        actionLabel: ACTION_LABELS[log.action] || log.action,
        permission: log.permission,
        reason: log.reason,
        createdAt: log.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "查询失败" }, { status: 500 });
  }
}
