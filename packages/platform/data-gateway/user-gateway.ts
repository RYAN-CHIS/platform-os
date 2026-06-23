/**
 * User Gateway — Platform User + Permission Management
 * WO-P6AA: Completes gateway coverage for user/permission module.
 */
import { createPrisma } from "@yunwu/db";

export interface UserGateway {
  list(filters?: { role?: string }): Promise<unknown[]>;
  getById(id: number): Promise<unknown>;
  create(data: { email: string; name: string; password: string; role: string }): Promise<unknown>;
  update(id: number, data: Record<string, unknown>): Promise<unknown>;
  delete(id: number): Promise<void>;
  assignTemplate(userId: number, templateId: number): Promise<void>;
  assignPermission(userId: number, permissionId: number, type?: string): Promise<void>;
  removePermission(userId: number, permissionId: number): Promise<void>;
  getPermissions(userId: number): Promise<unknown[]>;
}

export function createUserGateway(databaseUrl: string): UserGateway {
  const prisma = createPrisma();
  const db = prisma as any;

  return {
    async list(filters) {
      const where: Record<string, unknown> = {};
      if (filters?.role) where.role = filters.role;
      return db.user.findMany({ where, orderBy: { createdAt: "desc" } });
    },
    async getById(id) { return db.user.findUnique({ where: { id }, include: { userPermissions: { include: { permission: true } } } }); },
    async create(data) { return db.user.create({ data: { email: data.email, name: data.name, password: data.password, role: data.role } }); },
    async update(id, data) { return db.user.update({ where: { id }, data }); },
    async delete(id) { await db.user.delete({ where: { id } }); },
    async assignTemplate(userId, templateId) {
      const template = await db.permissionTemplate.findUnique({ where: { id: templateId }, include: { items: { include: { permission: true } } } });
      if (!template) throw new Error("Template not found");
      await db.userPermission.deleteMany({ where: { userId } });
      for (const item of template.items) {
        await db.userPermission.create({ data: { userId, permissionId: item.permissionId, type: "GRANT" } });
      }
    },
    async assignPermission(userId, permissionId, type = "GRANT") {
      await db.userPermission.upsert({ where: { userId_permissionId: { userId, permissionId } }, create: { userId, permissionId, type }, update: { type } });
    },
    async removePermission(userId, permissionId) { await db.userPermission.deleteMany({ where: { userId, permissionId } }); },
    async getPermissions(userId) { return db.userPermission.findMany({ where: { userId }, include: { permission: true } }); },
  };
}
