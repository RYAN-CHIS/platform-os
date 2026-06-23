/**
 * ERP Gateway — Runtime Implementation
 *
 * Connects to ERP database (Neon US-East).
 * Provides typed access to all ERP master data entities.
 *
 * WO-P3A: Gateway Runtime
 */

import { createPrisma } from "@yunwu/db";

// Inline types to avoid circular import
interface ErpGateway {
  materials: { list(filters?: Record<string,unknown>): Promise<unknown[]>; getById(id: number): Promise<unknown>; getInventory(materialId: number): Promise<unknown[]> };
  products: { list(filters?: Record<string,unknown>): Promise<unknown[]>; getById(id: number): Promise<unknown>; getSkus(productId: number): Promise<unknown[]> };
  bom: { list(skuId?: number): Promise<unknown[]> };
  inventory: { list(materialId?: number): Promise<unknown[]>; getStock(materialId: number): Promise<unknown> };
  production: { list(skuId?: number): Promise<unknown[]> };
  orders: { list(filters?: Record<string,unknown>): Promise<unknown[]>; getById(id: number): Promise<unknown> };
  customers: { list(filters?: Record<string,unknown>): Promise<unknown[]>; getById(id: number): Promise<unknown> };
  costs: { getBySku(skuId: number): Promise<unknown> };
}

/**
 * Create ERP Gateway instance.
 *
 * Usage:
 *   const erp = createErpGateway(process.env.ERP_DATABASE_URL!);
 *   const materials = await erp.materials.list({ category: "bead" });
 */
export function createErpGateway(databaseUrl: string): ErpGateway {
  const prisma = createPrisma();

  return {
    materials: {
      async list(filters?: ErpMaterialFilters) {
        const where: Record<string, unknown> = {};
        if (filters?.category) where.category = filters.category;
        if (filters?.materialType) where.materialType = filters.materialType;
        if (filters?.status) where.status = filters.status;
        return (prisma as any).erpMaterial.findMany({ where, orderBy: { name: "asc" } });
      },
      async getById(id: number) {
        return (prisma as any).erpMaterial.findUnique({
          where: { id },
          include: { transactions: true, purchaseRecords: true },
        });
      },
      async getInventory(materialId: number) {
        return (prisma as any).erpInventoryTransaction.findMany({
          where: { materialId },
          orderBy: { createdAt: "desc" },
        });
      },
    },

    products: {
      async list(filters?: ErpProductFilters) {
        const where: Record<string, unknown> = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.workId) where.workId = filters.workId;
        return (prisma as any).erpProduct.findMany({
          where,
          include: { skus: true, work: { include: { series: true } } },
          orderBy: { code: "asc" },
        });
      },
      async getById(id: number) {
        return (prisma as any).erpProduct.findUnique({
          where: { id },
          include: {
            skus: { include: { cost: true, boms: { include: { material: true } } } },
            work: { include: { series: true } },
          },
        });
      },
      async getSkus(productId: number) {
        return (prisma as any).erpProductSku.findMany({
          where: { productId },
          orderBy: { code: "asc" },
        });
      },
    },

    bom: {
      async list(skuId?: number) {
        const where = skuId ? { skuId } : {};
        return (prisma as any).erpBom.findMany({
          where,
          include: { material: true, sku: true },
        });
      },
    },

    inventory: {
      async list(materialId?: number) {
        const where = materialId ? { materialId } : {};
        return (prisma as any).erpInventoryTransaction.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 100,
        });
      },
      async getStock(materialId: number) {
        const material = await (prisma as any).erpMaterial.findUnique({
          where: { id: materialId },
          select: { remaining: true, name: true, inventoryUnit: true },
        });
        return material;
      },
    },

    production: {
      async list(skuId?: number) {
        const where = skuId ? { skuId } : {};
        return (prisma as any).erpProductionRecord.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 100,
        });
      },
    },

    orders: {
      async list(filters?: ErpOrderFilters) {
        const where: Record<string, unknown> = {};
        if (filters?.status) where.status = filters.status;
        if (filters?.customerId) where.customerId = filters.customerId;
        if (filters?.channel) where.channel = filters.channel;
        return (prisma as any).erpOrder.findMany({
          where,
          include: { customer: true },
          orderBy: { createdAt: "desc" },
          take: 100,
        });
      },
      async getById(id: number) {
        return (prisma as any).erpOrder.findUnique({
          where: { id },
          include: { customer: true },
        });
      },
    },

    customers: {
      async list(filters?: Record<string, unknown>) {
        return (prisma as any).erpCustomer.findMany({
          where: filters || {},
          orderBy: { createdAt: "desc" },
        });
      },
      async getById(id: number) {
        return (prisma as any).erpCustomer.findUnique({
          where: { id },
          include: { orders: true },
        });
      },
    },

    costs: {
      async getBySku(skuId: number) {
        return (prisma as any).erpProductCost.findUnique({
          where: { skuId },
        });
      },
    },
  };
}
