import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import CostsClient from "./CostsClient";

export const dynamic = 'force-dynamic';

export default async function CostsPage() {
  const session = await getServerSession(authOptions);
  const permissions: string[] = (session?.user as any)?.permissions || [];

  // 检查 COST_VIEW 权限
  if (!permissions.includes(PERMISSIONS.COST_VIEW) && !permissions.includes("super.admin")) {
    redirect("/dashboard?error=permission_denied");
  }

  const skus = await prisma.productSku.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      product: {
        include: { work: { include: { series: true } } },
      },
      cost: true,
    },
  });

  const list = skus.map((sku) => {
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
      status: sku.status as string,
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

  return <CostsClient list={list} />;
}
