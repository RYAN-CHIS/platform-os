'use server';

import { prisma } from '@yunwu/db';
import { revalidatePath } from 'next/cache';
import { createInventoryAudit } from '@/lib/audit';

export async function createInventoryTransaction(data: {
  materialId: number; type: 'IN' | 'OUT' | 'ADJUST';
  quantity: number; relatedDoc?: string; remark?: string;
}) {
  const material = await prisma.erpMaterial.findUnique({ where: { id: data.materialId } });
  if (!material) throw new Error('材料不存在');

  const beforeQty = material.remaining;
  let afterQty: number;

  if (data.type === 'IN') {
    afterQty = beforeQty + data.quantity;
  } else if (data.type === 'OUT') {
    afterQty = beforeQty - data.quantity;
    if (afterQty < 0) throw new Error(`库存不足: 当前 ${beforeQty}，需要 ${data.quantity}`);
  } else {
    // ADJUST
    afterQty = data.quantity;
  }

  const txn = await prisma.$transaction(async (tx: any) => {
    await tx.erpMaterial.update({
      where: { id: data.materialId },
      data: { remaining: afterQty },
    });
    return tx.erpInventoryTransaction.create({
      data: {
        materialId: data.materialId,
        type: data.type,
        quantity: data.type === 'ADJUST' ? Math.abs(afterQty - beforeQty) : data.quantity,
        beforeQty,
        afterQty,
        relatedDoc: data.relatedDoc || '',
        remark: data.remark || '',
      },
    });
  });

  const auditAction = data.type === 'ADJUST' ? 'INVENTORY_ADJUST' : data.type === 'IN' ? 'INVENTORY_IN' : 'INVENTORY_OUT';
  try {
    await createInventoryAudit({
      action: auditAction,
      materialName: material.name,
      quantity: data.type === 'ADJUST' ? Math.abs(afterQty - beforeQty) : data.quantity,
      beforeStock: beforeQty,
      afterStock: afterQty,
      description: `${data.type === 'IN' ? '入库' : data.type === 'OUT' ? '出库' : '盘点'} ${material.name}: ${beforeQty} → ${afterQty}`,
    });
  } catch {}

  revalidatePath('/erp/inventory');
  return txn;
}

export async function getMaterialStock() {
  return prisma.erpMaterial.findMany({
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true, remaining: true, inventoryUnit: true, status: true },
  });
}
