import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * 获取单个 BOM 条目
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bom = await prisma.bom.findUnique({
    where: { id: parseInt(id) },
    include: {
      sku: { select: { code: true, name: true } },
      material: { select: { code: true, name: true, unitCost: true } },
    },
  });

  if (!bom) {
    return NextResponse.json({ error: "BOM条目不存在" }, { status: 404 });
  }

  return NextResponse.json(bom);
}

/**
 * 更新 BOM 条目
 * 自动重新计算 lineCost 和 product cost
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    // 获取现有 BOM 条目
    const existingBom = await prisma.bom.findUnique({
      where: { id: parseInt(id) },
      include: { material: true },
    });

    if (!existingBom) {
      return NextResponse.json({ error: "BOM条目不存在" }, { status: 404 });
    }

    // 计算新的 lineCost
    const quantity = data.quantity ?? existingBom.quantity;
    const unitPrice =
      data.unitPrice !== undefined
        ? data.unitPrice
        : existingBom.unitPrice ?? existingBom.material.unitCost ?? 0;
    const lineCost = quantity * (unitPrice > 0 ? unitPrice : 0);

    // 使用事务确保一致性
    const result = await prisma.$transaction(async (tx) => {
      // 更新 BOM 条目
      const bom = await tx.bom.update({
        where: { id: parseInt(id) },
        data: {
          quantity,
          unitPrice: unitPrice > 0 ? unitPrice : null,
          lineCost,
          ...(data.materialId && { materialId: parseInt(data.materialId) }),
        },
      });

      // 重新计算该 SKU 的材料成本
      const allBomItems = await tx.bom.findMany({
        where: { skuId: existingBom.skuId },
      });
      const totalMaterialCost = allBomItems.reduce(
        (sum, item) => sum + (item.lineCost ?? 0),
        0
      );

      // 更新 ProductCost
      const existingCost = await tx.productCost.findUnique({
        where: { skuId: existingBom.skuId },
      });

      if (existingCost) {
        await tx.productCost.update({
          where: { skuId: existingBom.skuId },
          data: {
            materialCost: totalMaterialCost,
            totalCost: totalMaterialCost + existingCost.laborCost,
          },
        });
      }

      return bom;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "更新BOM失败" },
      { status: 500 }
    );
  }
}

/**
 * 删除 BOM 条目
 * 自动重新计算 product cost
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取 BOM 条目（用于获取 skuId）
    const bom = await prisma.bom.findUnique({
      where: { id: parseInt(id) },
    });

    if (!bom) {
      return NextResponse.json({ error: "BOM条目不存在" }, { status: 404 });
    }

    const skuId = bom.skuId;

    // 使用事务确保一致性
    await prisma.$transaction(async (tx) => {
      // 删除 BOM 条目
      await tx.bom.delete({
        where: { id: parseInt(id) },
      });

      // 重新计算该 SKU 的材料成本
      const allBomItems = await tx.bom.findMany({
        where: { skuId },
      });
      const totalMaterialCost = allBomItems.reduce(
        (sum, item) => sum + (item.lineCost ?? 0),
        0
      );

      // 更新 ProductCost
      const existingCost = await tx.productCost.findUnique({
        where: { skuId },
      });

      if (existingCost) {
        await tx.productCost.update({
          where: { skuId },
          data: {
            materialCost: totalMaterialCost,
            totalCost: totalMaterialCost + existingCost.laborCost,
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "删除BOM失败" },
      { status: 500 }
    );
  }
}
