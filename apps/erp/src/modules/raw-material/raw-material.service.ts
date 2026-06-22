import { prisma } from "@/lib/prisma";
import type { PurchaseRecordInput } from "./types";

/**
 * 采购入库：创建采购记录 + 库存事务 + 更新材料库存和加权成本
 */
export async function purchaseIn(data: PurchaseRecordInput) {
  const material = await prisma.rawMaterial.findUnique({
    where: { id: data.materialId },
  });
  if (!material) throw new Error(`材料不存在: id=${data.materialId}`);

  const inventoryQuantity = data.purchaseQuantity * data.conversionRate;

  return await prisma.$transaction(async (tx) => {
    // 1. 创建采购记录
    const purchaseRecord = await tx.purchaseRecord.create({
      data: {
        materialId: data.materialId,
        purchaseDate: data.purchaseDate ?? new Date(),
        supplier: data.supplier,
        purchaseUnit: data.purchaseUnit,
        conversionRate: data.conversionRate,
        purchaseQuantity: data.purchaseQuantity,
        purchaseUnitPrice: data.purchaseUnitPrice,
        purchasePrice: data.purchasePrice,
        inventoryQuantity,
        unitCost: data.purchasePrice / inventoryQuantity,
        remark: data.remark,
      },
    });

    // 2. 计算加权平均成本
    const oldRemaining = material.remaining;
    const oldUnitCost = material.unitCost ?? 0;
    const newRemaining = oldRemaining + inventoryQuantity;
    const newUnitCost =
      oldRemaining === 0
        ? data.purchasePrice / inventoryQuantity
        : (oldRemaining * oldUnitCost + data.purchasePrice) / newRemaining;

    // 3. 创建库存事务（IN）
    await tx.inventoryTransaction.create({
      data: {
        materialId: data.materialId,
        type: "IN",
        quantity: inventoryQuantity,
        beforeQty: oldRemaining,
        afterQty: newRemaining,
        relatedDoc: `purchase_record_${purchaseRecord.id}`,
        remark: data.remark,
      },
    });

    // 4. 更新材料库存和成本
    await tx.rawMaterial.update({
      where: { id: data.materialId },
      data: {
        remaining: newRemaining,
        unitCost: newUnitCost,
      },
    });

    return purchaseRecord;
  });
}

/**
 * 库存扣减（生产领料等场景）
 */
export async function consumeMaterial(data: {
  materialId: number;
  quantity: number;
  relatedDoc?: string;
  remark?: string;
}) {
  const material = await prisma.rawMaterial.findUnique({
    where: { id: data.materialId },
  });
  if (!material) throw new Error(`材料不存在: id=${data.materialId}`);
  if (material.remaining < data.quantity) {
    throw new Error(
      `库存不足: ${material.name} 剩余 ${material.remaining}，需要 ${data.quantity}`
    );
  }

  const oldRemaining = material.remaining;
  const newRemaining = oldRemaining - data.quantity;

  return await prisma.$transaction(async (tx) => {
    await tx.inventoryTransaction.create({
      data: {
        materialId: data.materialId,
        type: "OUT",
        quantity: -data.quantity,
        beforeQty: oldRemaining,
        afterQty: newRemaining,
        relatedDoc: data.relatedDoc,
        remark: data.remark,
      },
    });

    await tx.rawMaterial.update({
      where: { id: data.materialId },
      data: { remaining: newRemaining },
    });
  });
}

/**
 * 库存调整（盘点调整）
 */
export async function adjustInventory(data: {
  materialId: number;
  newQuantity: number;
  remark?: string;
}) {
  const material = await prisma.rawMaterial.findUnique({
    where: { id: data.materialId },
  });
  if (!material) throw new Error(`材料不存在: id=${data.materialId}`);

  const oldRemaining = material.remaining;
  const diff = data.newQuantity - oldRemaining;

  return await prisma.$transaction(async (tx) => {
    await tx.inventoryTransaction.create({
      data: {
        materialId: data.materialId,
        type: "ADJUST",
        quantity: diff,
        beforeQty: oldRemaining,
        afterQty: data.newQuantity,
        relatedDoc: "inventory_adjust",
        remark: data.remark,
      },
    });

    await tx.rawMaterial.update({
      where: { id: data.materialId },
      data: { remaining: data.newQuantity },
    });
  });
}

/**
 * 获取材料列表（含库存）
 */
export async function getMaterials(params?: {
  status?: string;
  materialType?: string;
  keyword?: string;
}) {
  const where: any = {};
  if (params?.status) where.status = params.status;
  if (params?.materialType) where.materialType = params.materialType;
  if (params?.keyword) {
    where.OR = [
      { code: { contains: params.keyword } },
      { name: { contains: params.keyword } },
      { category: { contains: params.keyword } },
    ];
  }

  return await prisma.rawMaterial.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { purchaseRecords: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
}

/**
 * 获取库存事务历史
 */
export async function getInventoryTransactions(params?: {
  materialId?: number;
  type?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: any = {};
  if (params?.materialId) where.materialId = params.materialId;
  if (params?.type) where.type = params.type;
  if (params?.startDate || params?.endDate) {
    where.createdAt = {};
    if (params.startDate) where.createdAt.gte = params.startDate;
    if (params.endDate) where.createdAt.lte = params.endDate;
  }

  return await prisma.inventoryTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { material: { select: { code: true, name: true } } },
  });
}
