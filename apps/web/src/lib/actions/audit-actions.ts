"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./auth";

export type AuditEntry = {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: Date;
};

export async function getAuditLogs(params?: {
  userId?: string;
  action?: string;
  entityType?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin(); // 审计日志仅 ADMIN+ 可查看

  const { userId, action, entityType, page = 1, pageSize = 20 } = params || {};

  const where: any = {};
  if (userId)   where.userId    = userId;
  if (action)    where.action    = action;
  if (entityType) where.entityType = entityType;

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, total, page, pageSize };
}

export async function getAdminUsers() {
  await requireAdmin();
  return prisma.adminUser.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}
