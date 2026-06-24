/** CostService — WO-P8B: SKU/BOM/Material cost analysis. */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient() as any;

export interface CostRow {
  skuId: number; skuCode: string; skuName: string;
  specification: string|null; size: string|null; status: string;
  seriesName: string; workName: string; productName: string;
  price: number; totalCost: number; grossProfit: number; grossMargin: number;
  finishedStock: number; markupRatio: number; rarityLevel: number; storyFactor: number;
  materialCost: number; laborCost: number; packagingCost: number;
}

export const CostService = {
  async getProductCosts(): Promise<CostRow[]> {
    const skus = await db.erpProductSku.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        product: { include: { work: { include: { series: true } } } },
        cost: true,
      },
    });
    return skus.map((sku: any) => {
      const tc = sku.cost?.totalCost ?? 0;
      const price = sku.price ?? 0;
      const gp = price - tc;
      return {
        skuId: sku.id, skuCode: sku.code, skuName: sku.name,
        specification: sku.specification, size: sku.size, status: sku.status,
        seriesName: sku.product.work.series.name, workName: sku.product.work.name,
        productName: sku.product.name, price, totalCost: tc,
        grossProfit: gp, grossMargin: price > 0 ? Math.round((gp / price) * 10000) / 100 : 0,
        finishedStock: sku.finishedStock, markupRatio: sku.markupRatio ?? 1,
        rarityLevel: sku.rarityLevel ?? 1, storyFactor: sku.storyFactor ?? 1,
        materialCost: sku.cost?.materialCost ?? 0, laborCost: sku.cost?.laborCost ?? 0,
        packagingCost: sku.cost?.packagingCost ?? 0,
      };
    });
  },

  async calculateSkuCost(skuId: number) {
    const sku = await db.erpProductSku.findUnique({
      where: { id: skuId }, include: { cost: true, boms: { include: { material: true } } },
    });
    if (!sku) throw new Error("SKU not found");
    const bomMaterialCost = sku.boms.reduce((sum: number, b: any) => sum + (b.lineCost || 0), 0);
    const labor = sku.cost?.laborCost ?? 0;
    const packaging = sku.cost?.packagingCost ?? 0;
    const total = bomMaterialCost + labor + packaging;
    const price = sku.price ?? 0;
    return { skuCode: sku.code, skuName: sku.name, bomMaterialCost, labor, packaging, total, price, grossMargin: price > 0 ? Math.round(((price - total) / price) * 10000) / 100 : 0 };
  },

  async calculateBomCost(skuId: number) {
    const boms = await db.erpBom.findMany({ where: { skuId }, include: { material: true } });
    return boms.map((b: any) => ({ materialCode: b.materialCodeSnapshot, materialName: b.materialNameSnapshot, quantity: b.quantity, unitPrice: b.unitPrice, lineCost: b.lineCost }));
  },

  async getSummary() {
    const costs = await db.erpProductCost.findMany({ include: { sku: true } });
    const totalMaterialCost = costs.reduce((s: number, c: any) => s + (c.materialCost || 0), 0);
    const totalLaborCost = costs.reduce((s: number, c: any) => s + (c.laborCost || 0), 0);
    const totalPackagingCost = costs.reduce((s: number, c: any) => s + (c.packagingCost || 0), 0);
    const totalCost = costs.reduce((s: number, c: any) => s + (c.totalCost || 0), 0);
    const totalPrice = costs.reduce((s: number, c: any) => s + ((c.sku?.price) || 0), 0);
    return { totalMaterialCost, totalLaborCost, totalPackagingCost, totalCost, totalPrice, grossMargin: totalPrice > 0 ? Math.round(((totalPrice - totalCost) / totalPrice) * 10000) / 100 : 0, count: costs.length };
  },
};
