import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * 获取 SKU 详情（包含BOM和成本）
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sku = await prisma.productSku.findUnique({
    where: { id: parseInt(id) },
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

  return NextResponse.json(sku);
}

/**
 * 更新 SKU 信息
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    const sku = await prisma.productSku.update({
      where: { id: parseInt(id) },
      data: {
        code: data.code,
        name: data.name,
        productId: data.productId,
        status: data.status,
        specification: data.specification,
        size: data.size,
        price: data.price,
        finishedStock: data.finishedStock,
        markupRatio: data.markupRatio,
        rarityLevel: data.rarityLevel,
        storyFactor: data.storyFactor,
      },
    });

    return NextResponse.json(sku);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "SKU编码已存在" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "更新SKU失败" },
      { status: 500 }
    );
  }
}

/**
 * 删除 SKU（最高权限操作，后续接入权限管理）
 * 级联删除：BOM → ProductCost → ProductSku
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const skuId = parseInt(id);

    await prisma.$transaction(async (tx) => {
      // 删除 BOM
      await tx.bom.deleteMany({ where: { skuId } });
      // 删除 ProductCost
      await tx.productCost.deleteMany({ where: { skuId } });
      // 删除 SKU
      await tx.productSku.delete({ where: { id: skuId } });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "删除SKU失败" },
      { status: 500 }
    );
  }
}
