import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { maskSkusForRole } from "@/lib/permissions";

/**
 * 获取 SKU 列表
 * 非 Admin 角色：不返回成本、材料单价等数据
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const productId = searchParams.get("productId");

  const where: any = {};
  if (status) where.status = status;
  if (productId) where.productId = parseInt(productId);

  const skus = await prisma.productSku.findMany({
    where,
    orderBy: { createdAt: "desc" },
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

  // 数据脱敏
  const role = await getSessionRole();
  const masked = maskSkusForRole(skus, role);

  return NextResponse.json(masked);
}

/**
 * 创建 SKU
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.code) {
      return NextResponse.json({ error: "SKU编码不能为空" }, { status: 400 });
    }
    if (!data.name) {
      return NextResponse.json({ error: "SKU名称不能为空" }, { status: 400 });
    }
    if (!data.productId) {
      return NextResponse.json({ error: "产品ID不能为空" }, { status: 400 });
    }

    const sku = await prisma.$transaction(async (tx) => {
      // 创建 SKU
      const newSku = await tx.productSku.create({
        data: {
          code: data.code,
          name: data.name,
          productId: parseInt(data.productId),
          status: data.status ?? "DESIGNING",
          specification: data.specification ?? "",
          size: data.size ?? "",
          price: data.price ?? 0,
          finishedStock: data.finishedStock ?? 0,
          markupRatio: data.markupRatio ?? 1.0,
          rarityLevel: data.rarityLevel ?? 1,
          storyFactor: data.storyFactor ?? 1.0,
        },
      });

      // 自动创建 ProductCost 记录
      await tx.productCost.create({
        data: {
          skuId: newSku.id,
          materialCost: 0,
          laborCost: 0,
          totalCost: 0,
        },
      });

      return newSku;
    });

    return NextResponse.json(sku);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "SKU编码已存在" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "创建SKU失败" },
      { status: 500 }
    );
  }
}
