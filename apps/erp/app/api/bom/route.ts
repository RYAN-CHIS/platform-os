import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSessionRole } from "@/lib/auth";
import { canViewCost } from "@/lib/permissions";

/**
 * 获取 BOM 列表
 * 非 Admin 角色：不返回材料 unitCost
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const skuId = searchParams.get("skuId");

  const where: any = {};
  if (skuId) where.skuId = parseInt(skuId);

  const boms = await prisma.bom.findMany({
    where,
    orderBy: { id: "asc" },
    include: {
      sku: { select: { code: true, name: true } },
      material: { select: { code: true, name: true, unitCost: true } },
    },
  });

  // 数据脱敏：非 Admin 隐藏材料单价和行成本
  const role = await getSessionRole();
  if (!canViewCost(role)) {
    const masked = boms.map((bom) => ({
      ...bom,
      material: { code: bom.material.code, name: bom.material.name },
      lineCost: undefined,
      unitPrice: undefined,
    }));
    return NextResponse.json(masked);
  }

  return NextResponse.json(boms);
}

/**
 * 创建 BOM 条目
 * 自动计算 lineCost 和 product cost
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.skuId) {
      return NextResponse.json({ error: "SKU ID不能为空" }, { status: 400 });
    }
    if (!data.materialId) {
      return NextResponse.json({ error: "材料ID不能为空" }, { status: 400 });
    }
    if (!data.quantity || data.quantity <= 0) {
      return NextResponse.json({ error: "用量必须大于0" }, { status: 400 });
    }

    // 获取材料和 SKU 信息（用于快照和成本计算）
    const material = await prisma.rawMaterial.findUnique({
      where: { id: parseInt(data.materialId) },
    });
    if (!material) {
      return NextResponse.json({ error: "材料不存在" }, { status: 400 });
    }

    const sku = await prisma.productSku.findUnique({
      where: { id: parseInt(data.skuId) },
    });
    if (!sku) {
      return NextResponse.json({ error: "SKU不存在" }, { status: 400 });
    }

    // 计算 lineCost
    const unitPrice = data.unitPrice ?? material.unitCost ?? 0;
    const lineCost = data.quantity * unitPrice;

    // 使用事务确保 BOM 和成本计算一致性
    const result = await prisma.$transaction(async (tx) => {
      // 创建 BOM 条目
      const bom = await tx.bom.create({
        data: {
          skuId: parseInt(data.skuId),
          materialId: parseInt(data.materialId),
          quantity: data.quantity,
          unitPrice: unitPrice > 0 ? unitPrice : null,
          lineCost,
          materialCodeSnapshot: material.code,
          materialNameSnapshot: material.name,
        },
      });

      // 重新计算该 SKU 的材料成本
      const allBomItems = await tx.bom.findMany({
        where: { skuId: parseInt(data.skuId) },
      });
      const totalMaterialCost = allBomItems.reduce(
        (sum, item) => sum + (item.lineCost ?? 0),
        0
      );

      // 更新或创建 ProductCost
      const existingCost = await tx.productCost.findUnique({
        where: { skuId: parseInt(data.skuId) },
      });

      if (existingCost) {
        await tx.productCost.update({
          where: { skuId: parseInt(data.skuId) },
          data: {
            materialCost: totalMaterialCost,
            totalCost: totalMaterialCost + existingCost.laborCost,
          },
        });
      } else {
        await tx.productCost.create({
          data: {
            skuId: parseInt(data.skuId),
            materialCost: totalMaterialCost,
            laborCost: 0,
            totalCost: totalMaterialCost,
          },
        });
      }

      return bom;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "该SKU已包含此材料，请使用更新操作" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "创建BOM失败" },
      { status: 500 }
    );
  }
}
