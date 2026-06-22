import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { purchaseIn } from "@/src/modules/raw-material/raw-material.service";

/**
 * 获取采购记录列表
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const materialId = searchParams.get("materialId");

  const where: any = {};
  if (materialId) where.materialId = parseInt(materialId);

  const list = await prisma.purchaseRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      material: {
        select: { code: true, name: true, inventoryUnit: true },
      },
    },
  });

  return NextResponse.json(list);
}

/**
 * 创建采购记录（触发采购入库）
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    // 验证必填字段
    if (!data.materialId) {
      return NextResponse.json({ error: "材料ID不能为空" }, { status: 400 });
    }
    if (!data.purchaseUnit) {
      return NextResponse.json({ error: "采购单位不能为空" }, { status: 400 });
    }
    if (!data.purchaseQuantity || data.purchaseQuantity <= 0) {
      return NextResponse.json({ error: "采购数量必须大于0" }, { status: 400 });
    }
    if (!data.purchasePrice || data.purchasePrice <= 0) {
      return NextResponse.json({ error: "采购总价必须大于0" }, { status: 400 });
    }

    const purchaseRecord = await purchaseIn({
      materialId: parseInt(data.materialId),
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      supplier: data.supplier,
      purchaseUnit: data.purchaseUnit,
      conversionRate: parseFloat(data.conversionRate) || 1,
      purchaseQuantity: parseFloat(data.purchaseQuantity),
      purchaseUnitPrice: data.purchaseUnitPrice
        ? parseFloat(data.purchaseUnitPrice)
        : undefined,
      purchasePrice: parseFloat(data.purchasePrice),
      remark: data.remark,
    });

    return NextResponse.json(purchaseRecord);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "创建采购记录失败" },
      { status: 500 }
    );
  }
}
