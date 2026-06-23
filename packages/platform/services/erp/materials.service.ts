/**
 * MaterialService — ERP Materials business logic.
 * WO-P6C-Prime: Extracted from apps/erp/api/materials/*
 *
 * Uses @yunwu/db Prisma directly. Designed for server-side use only.
 * Platform app imports this via gateway → service → database.
 */
import { createPrisma } from "@yunwu/db";

const prisma = createPrisma();
const db = prisma as any;

export interface MaterialFilters { status?: string; materialType?: string; category?: string; keyword?: string; }
export interface MaterialInput { code: string; name: string; category?: string; materialType?: string; specification?: string; inventoryUnit?: string; remaining?: number; unitCost?: number; status?: string; supplier?: string; remark?: string; }

export const MaterialService = {
  async list(filters: MaterialFilters = {}) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.materialType) {
      const types = filters.materialType.split(",").map(t => t.trim()).filter(Boolean);
      if (types.length === 1) where.materialType = types[0];
      else if (types.length > 1) where.materialType = { in: types };
    }
    if (filters.category) where.category = { contains: filters.category };
    if (filters.keyword) {
      where.OR = [
        { code: { contains: filters.keyword } },
        { name: { contains: filters.keyword } },
        { category: { contains: filters.keyword } },
      ];
    }
    return db.erpMaterial.findMany({ where, orderBy: { code: "asc" } });
  },

  async getById(id: number) {
    const material = await db.erpMaterial.findUnique({
      where: { id },
      include: { purchaseRecords: { orderBy: { createdAt: "desc" } }, transactions: { orderBy: { createdAt: "desc" } } },
    });
    if (!material) throw new Error("材料不存在");
    return material;
  },

  async create(data: MaterialInput) {
    return db.erpMaterial.create({ data });
  },

  async update(id: number, data: Partial<MaterialInput>) {
    const existing = await db.erpMaterial.findUnique({ where: { id } });
    if (!existing) throw new Error("材料不存在");
    return db.erpMaterial.update({ where: { id }, data });
  },

  async delete(id: number) {
    const existing = await db.erpMaterial.findUnique({ where: { id } });
    if (!existing) throw new Error("材料不存在");
    await db.erpMaterial.delete({ where: { id } });
  },

  async getInventory(materialId: number) {
    return db.erpInventoryTransaction.findMany({ where: { materialId }, orderBy: { createdAt: "desc" } });
  },

  async getStock(materialId: number) {
    return db.erpMaterial.findUnique({ where: { id: materialId }, select: { remaining: true, name: true, inventoryUnit: true } });
  },
};
