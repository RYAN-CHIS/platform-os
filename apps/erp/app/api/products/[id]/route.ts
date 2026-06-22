import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * 获取产品详情（包含SKU和成本）
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await prisma.products.findUnique({
    where: { id: parseInt(id) },
    include: {
      work: { include: { series: true } },
      skus: {
        include: { cost: true },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "产品不存在" }, { status: 404 });
  }

  return NextResponse.json(product);
}

/**
 * 更新产品信息
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    const product = await prisma.products.update({
      where: { id: parseInt(id) },
      data: {
        code: data.code,
        name: data.name,
        workId: data.workId,
        status: data.status,
        description: data.description,
      },
    });

    return NextResponse.json(product);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "产品编码已存在" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "更新产品失败" },
      { status: 500 }
    );
  }
}

/**
 * 删除产品（最高权限操作，后续接入权限管理）
 * 级联删除：ProductCost → BOM → ProductSku → Products
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = parseInt(id);

    await prisma.$transaction(async (tx) => {
      // 获取该产品的所有 SKU
      const skus = await tx.productSku.findMany({
        where: { productId },
        select: { id: true },
      });
      const skuIds = skus.map((s) => s.id);

      // 删除关联的 BOM
      if (skuIds.length > 0) {
        await tx.bom.deleteMany({ where: { skuId: { in: skuIds } } });
        // 删除关联的 ProductCost
        await tx.productCost.deleteMany({ where: { skuId: { in: skuIds } } });
        // 删除 SKU
        await tx.productSku.deleteMany({ where: { productId } });
      }

      // 删除产品
      await tx.products.delete({ where: { id: productId } });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "删除产品失败" },
      { status: 500 }
    );
  }
}
