import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * 获取材料详情（含采购记录和库存事务）
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const material = await prisma.rawMaterial.findUnique({
    where: { id: Number(id) },
    include: {
      purchaseRecords: {
        orderBy: { createdAt: "desc" },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!material) {
    return NextResponse.json({ error: "材料不存在" }, { status: 404 });
  }

  return NextResponse.json(material);
}

/**
 * 更新材料基本信息
 * 编辑时可同时更新 unitCost、remaining，并生成采购记录
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    const materialId = Number(id);

    // 基础字段更新
    const updateData: Record<string, unknown> = {
      code: data.code,
      name: data.name,
      category: data.category,
      materialType: data.materialType,
      specification: data.specification,
      inventoryUnit: data.inventoryUnit,
      status: data.status,
      shape: data.shape,
      beadsPerStrand: data.beadsPerStrand,
      weightPerStrand: data.weightPerStrand,
      defaultPurchaseUnit: data.defaultPurchaseUnit,
      defaultConversionRate: data.defaultConversionRate,
      supplier: data.supplier,
      remark: data.remark,
    };

    // 编辑模式：更新成本和库存
    if (data.unitCost !== undefined) {
      updateData.unitCost = data.unitCost;
    }
    if (data.remaining !== undefined) {
      updateData.remaining = data.remaining;
    }

    const material = await prisma.rawMaterial.update({
      where: { id: materialId },
      data: updateData,
    });

    // 如果有采购数据，生成采购记录 + 库存事务
    if (data.updatePurchase) {
      const p = data.updatePurchase;
      const inventoryQty = p.purchaseQuantity * p.conversionRate;
      const unitCost = inventoryQty > 0 ? p.purchasePrice / inventoryQty : null;

      await prisma.purchaseRecord.create({
        data: {
          materialId,
          purchaseDate: p.purchaseDate,
          supplier: p.supplier || null,
          purchaseUnit: p.purchaseUnit,
          conversionRate: p.conversionRate,
          purchaseQuantity: p.purchaseQuantity,
          purchaseUnitPrice: unitCost ? unitCost * p.conversionRate : null,
          purchasePrice: p.purchasePrice,
          inventoryQuantity: inventoryQty,
          unitCost: unitCost,
          remark: "编辑材料时更新",
        },
      });

      // 生成库存调整事务
      await prisma.inventoryTransaction.create({
        data: {
          materialId,
          type: "ADJUST",
          quantity: data.remaining,
          beforeQty: 0,
          afterQty: data.remaining,
          remark: "编辑材料时更新库存",
        },
      });
    }

    return NextResponse.json(material);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "材料编码已存在" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "更新材料失败" },
      { status: 500 }
    );
  }
}

/**
 * 删除材料（最高权限操作，后续接入权限管理）
 * 级联删除：关联的 BOM、库存事务、采购记录一并删除
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const materialId = Number(id);

    const material = await prisma.rawMaterial.findUnique({
      where: { id: materialId },
      select: { name: true },
    });

    if (!material) {
      return NextResponse.json({ error: "材料不存在" }, { status: 404 });
    }

    // 级联删除：BOM → 库存事务 → 采购记录 → 材料
    await prisma.$transaction([
      prisma.bom.deleteMany({ where: { materialId } }),
      prisma.inventoryTransaction.deleteMany({ where: { materialId } }),
      prisma.purchaseRecord.deleteMany({ where: { materialId } }),
      prisma.rawMaterial.delete({ where: { id: materialId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "删除材料失败" },
      { status: 500 }
    );
  }
}
