import { prisma } from "@/lib/prisma";
import ProductionsClient from "./ProductionsClient";

export const dynamic = 'force-dynamic';

export default async function ProductionsPage() {
  const records = await prisma.productionRecord.findMany({
    orderBy: { createdAt: "desc" },
    include: { sku: true },
  });

  // 手动获取 sku → product → work → series
  const recordsWithRelations = await Promise.all(
    records.map(async (r) => {
      const sku = r.sku;
      const product = await prisma.products.findUnique({ where: { id: sku.productId } });
      const work = product ? await prisma.works.findUnique({ where: { id: product.workId } }) : null;
      const series = work ? await prisma.series.findUnique({ where: { id: work.seriesId } }) : null;
      return {
        id: r.id,
        skuCode: sku.code,
        skuName: sku.name,
        seriesName: series?.name || "",
        workName: work?.name || "",
        quantity: r.quantity,
        materialCost: r.materialCost,
        laborCost: r.laborCost,
        packagingCost: r.packagingCost,
        totalCost: r.totalCost,
        unitCost: r.unitCost,
        remark: r.remark,
        createdAt: r.createdAt.toISOString(),
      };
    })
  );

  const skus = await prisma.productSku.findMany({
    where: { status: { in: ["READY", "ACTIVE"] }, boms: { some: {} } },
    orderBy: { code: "asc" },
    include: { boms: { include: { material: true } }, cost: true },
  });

  // 手动获取 sku → product → work → series
  const skusWithRelations = await Promise.all(
    skus.map(async (s) => {
      const product = await prisma.products.findUnique({ where: { id: s.productId } });
      const work = product ? await prisma.works.findUnique({ where: { id: product.workId } }) : null;
      const series = work ? await prisma.series.findUnique({ where: { id: work.seriesId } }) : null;
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        seriesName: series?.name || "",
        workName: work?.name || "",
        finishedStock: s.finishedStock,
        price: s.price,
        boms: s.boms.map((b) => ({
          materialId: b.materialId,
          materialName: b.material.name,
          quantity: b.quantity,
          inventoryUnit: b.material.inventoryUnit,
          remaining: b.material.remaining,
        })),
      };
    })
  );

  return (
    <ProductionsClient
      records={recordsWithRelations}
      skus={skusWithRelations}
    />
  );
}
