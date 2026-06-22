import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(req: Request) {
  const auth = await requirePermission(PERMISSIONS.PRODUCTION_VIEW);
  if (auth instanceof Response) return auth;
  const { searchParams } = new URL(req.url);
  const skuId = searchParams.get("skuId");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: any = {};
  if (skuId) where.skuId = parseInt(skuId);

  const records = await prisma.productionRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { sku: true },
  });

  // 手动获取 sku → product → work → series 数据
  const result = await Promise.all(
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

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const auth = await requirePermission(PERMISSIONS.PRODUCTION_CREATE);
  if (auth instanceof Response) return auth;

  try {
    const data = await req.json();

    if (!data.skuId) {
      return NextResponse.json({ error: "SKU ID不能为空" }, { status: 400 });
    }
    if (!data.quantity || data.quantity <= 0) {
      return NextResponse.json({ error: "生产数量必须大于0" }, { status: 400 });
    }

    const skuId = parseInt(data.skuId);
    const quantity = parseInt(data.quantity);
    const laborCost = data.laborCost ?? 0;
    const packagingCost = data.packagingCost ?? 0;

    const sku = await prisma.productSku.findUnique({
      where: { id: skuId },
      include: {
        product: { include: { work: true } },
        boms: { include: { material: true } },
        cost: true,
      },
    });

    if (!sku) return NextResponse.json({ error: "SKU不存在" }, { status: 400 });
    if (!sku.boms || sku.boms.length === 0) {
      return NextResponse.json({ error: "该SKU未配置BOM，无法计算材料消耗" }, { status: 400 });
    }

    const materialChecks = sku.boms.map((bom) => {
      const consumeQty = bom.quantity * quantity;
      if (bom.material.remaining < consumeQty) {
        throw new Error(
          `材料「${bom.material.name}」库存不足：需要 ${consumeQty}${bom.material.inventoryUnit}，当前库存 ${bom.material.remaining}${bom.material.inventoryUnit}`
        );
      }
      return {
        materialId: bom.materialId,
        consumeQty,
        unitCost: bom.material.unitCost ?? 0,
      };
    });

    const materialCost = materialChecks.reduce((sum, m) => sum + m.consumeQty * m.unitCost, 0);
    const totalCost = materialCost + laborCost + packagingCost;
    const unitCost = quantity > 0 ? totalCost / quantity : 0;

    const result = await prisma.$transaction(async (tx) => {
      for (const mc of materialChecks) {
        const material = await tx.rawMaterial.findUnique({ where: { id: mc.materialId } });
        if (!material) throw new Error(`材料ID ${mc.materialId} 不存在`);
        const beforeQty = material.remaining;
        const afterQty = beforeQty - mc.consumeQty;
        await tx.rawMaterial.update({ where: { id: mc.materialId }, data: { remaining: afterQty } });
        await tx.inventoryTransaction.create({
          data: {
            materialId: mc.materialId,
            type: "OUT",
            quantity: mc.consumeQty,
            beforeQty,
            afterQty,
            relatedDoc: `PROD-${sku.code}`,
            remark: `生产 ${sku.code} × ${quantity}`,
          },
        });
      }

      const record = await tx.productionRecord.create({
        data: { skuId, quantity, materialCost, laborCost, packagingCost, totalCost, unitCost, remark: data.remark || null },
      });

      await tx.productSku.update({ where: { id: skuId }, data: { finishedStock: { increment: quantity } } });

      const existingCost = await tx.productCost.findUnique({ where: { skuId } });
      if (existingCost) {
        await tx.productCost.update({
          where: { skuId },
          data: { materialCost, laborCost, packagingCost, totalCost, updatedAt: new Date() },
        });
      } else {
        await tx.productCost.create({ data: { skuId, materialCost, laborCost, packagingCost, totalCost } });
      }

      return record;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "创建生产记录失败" },
      { status: 500 }
    );
  }
}
