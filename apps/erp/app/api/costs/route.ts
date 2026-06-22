import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * 获取成本核算和利润分析
 * 需要 cost.view 权限
 */
export async function GET(req: Request) {
  const auth = await requirePermission(PERMISSIONS.COST_VIEW);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const seriesId = searchParams.get("seriesId");
  const workId = searchParams.get("workId");

  // 构建 where 条件
  const skuWhere: any = {};
  if (status) skuWhere.status = status;
  if (workId) skuWhere.product = { workId: parseInt(workId) };
  if (seriesId) {
    skuWhere.product = {
      ...skuWhere.product,
      work: { seriesId: parseInt(seriesId) },
    };
  }

  // 获取所有 SKU 及其成本和价格
  const skus = await prisma.productSku.findMany({
    where: skuWhere,
    orderBy: { updatedAt: "desc" },
    include: {
      product: {
        include: { work: { include: { series: true } } },
      },
      cost: true,
    },
  });

  // 计算利润分析
  const analysis = skus.map((sku) => {
    const totalCost = sku.cost?.totalCost ?? 0;
    const price = sku.price ?? 0;
    const grossProfit = price - totalCost;
    const grossMargin =
      price > 0 ? Math.round((grossProfit / price) * 10000) / 100 : 0;

    return {
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
      packagingCost: sku.cost?.packagingCost ?? 0,
    };
  });

  return NextResponse.json(analysis);
}

/**
 * 更新人工成本和包装成本
 * 仅 Admin 可访问
 */
export async function POST(req: Request) {
  const auth = await requirePermission(PERMISSIONS.COST_EDIT);
  if (auth instanceof Response) return auth;

  try {
    const data = await req.json();

    if (!data.skuId) {
      return NextResponse.json({ error: "SKU ID不能为空" }, { status: 400 });
    }

    const laborCost = data.laborCost ?? 0;
    const packagingCost = data.packagingCost ?? 0;

    // 获取现有成本
    const existingCost = await prisma.productCost.findUnique({
      where: { skuId: parseInt(data.skuId) },
    });

    if (!existingCost) {
      return NextResponse.json(
        { error: "成本记录不存在，请先创建SKU" },
        { status: 404 }
      );
    }

    // 更新人工成本、包装成本并重新计算总成本
    const updatedCost = await prisma.productCost.update({
      where: { skuId: parseInt(data.skuId) },
      data: {
        laborCost,
        packagingCost,
        totalCost: existingCost.materialCost + laborCost + packagingCost,
      },
    });

    return NextResponse.json(updatedCost);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "更新成本失败" },
      { status: 500 }
    );
  }
}
