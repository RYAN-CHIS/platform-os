import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * 获取单个 SKU 的成本和利润分析
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const skuId = parseInt(id);

  const sku = await prisma.productSku.findUnique({
    where: { id: skuId },
    include: {
      product: {
        include: { work: { include: { series: true } } },
      },
      cost: true,
      boms: {
        include: { material: true },
      },
    },
  });

  if (!sku) {
    return NextResponse.json({ error: "SKU不存在" }, { status: 404 });
  }

  const totalCost = sku.cost?.totalCost ?? 0;
  const price = sku.price ?? 0;
  const grossProfit = price - totalCost;
  const grossMargin =
    price > 0 ? Math.round((grossProfit / price) * 10000) / 100 : 0;

  return NextResponse.json({
    skuId: sku.id,
    skuCode: sku.code,
    skuName: sku.name,
    specification: sku.specification,
    size: sku.size,
    status: sku.status,
    seriesName: sku.product.work.series.name,
    workName: sku.product.work.name,
    productName: sku.product.name,
    price,
    totalCost,
    grossProfit,
    grossMargin,
    finishedStock: sku.finishedStock,
    markupRatio: sku.markupRatio ?? 1,
    rarityLevel: sku.rarityLevel ?? 1,
    storyFactor: sku.storyFactor ?? 1,
    materialCost: sku.cost?.materialCost ?? 0,
    laborCost: sku.cost?.laborCost ?? 0,
    boms: sku.boms,
  });
}
