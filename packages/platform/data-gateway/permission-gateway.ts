/**
 * Permission Gateway — Permission Templates + Audit
 * WO-P6AA: Completes gateway coverage for permission management.
 */
import { createPrisma } from "@yunwu/db";

export interface PermissionGateway {
  list(): Promise<unknown[]>;
  getTemplates(): Promise<unknown[]>;
  getTemplate(id: number): Promise<unknown>;
  createTemplate(data: { name: string; role: string; description?: string }): Promise<unknown>;
  deleteTemplate(id: number): Promise<void>;
  grantTemporary(userId: number, permissionId: number, expiresAt: Date, grantedBy?: number, reason?: string): Promise<unknown>;
  getAuditLog(filters?: { userId?: number; action?: string; limit?: number }): Promise<unknown[]>;
  getGroups(): Promise<unknown[]>;
}

export function createPermissionGateway(databaseUrl: string): PermissionGateway {
  const prisma = createPrisma();
  const db = prisma as any;

  return {
    async list() { return db.permission.findMany({ orderBy: { code: "asc" } }); },
    async getTemplates() { return db.permissionTemplate.findMany({ include: { items: { include: { permission: true } } } }); },
    async getTemplate(id) { return db.permissionTemplate.findUnique({ where: { id }, include: { items: { include: { permission: true } } } }); },
    async createTemplate(data) { return db.permissionTemplate.create({ data }); },
    async deleteTemplate(id) { await db.permissionTemplate.delete({ where: { id } }); },
    async grantTemporary(userId, permissionId, expiresAt, grantedBy, reason) { return db.temporaryPermission.create({ data: { userId, permissionId, expiresAt, grantedBy, reason } }); },
    async getAuditLog(filters) {
      const where: Record<string, unknown> = {};
      if (filters?.userId) where.userId = filters.userId;
      if (filters?.action) where.action = filters.action;
      return db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: filters?.limit || 100, include: { user: true } });
    },
    async getGroups() { return db.permissionGroup.findMany({ include: { permissions: true } }); },
  };
}
