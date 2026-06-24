'use server';

import { prisma } from '@yunwu/db';
import { revalidatePath } from 'next/cache';
import { createCrudAudit, createStatusAudit, createInventoryAudit } from '@/lib/audit';

export async function createPurchase(data: {
  materialId: number; purchaseDate?: string; supplier?: string;
  purchaseUnit?: string; conversionRate?: number;
  purchaseQuantity: number; purchaseUnitPrice?: number; remark?: string;
}) {
  const material = await prisma.erpMaterial.findUnique({ where: { id: data.materialId } });
  if (!material) throw new Error('材料不存在');

  const unit = data.purchaseUnit || material.defaultPurchaseUnit || '个';
  const rate = data.conversionRate || material.defaultConversionRate || 1;
  const unitPrice = data.purchaseUnitPrice || 0;
  const invQty = data.purchaseQuantity * rate;
  const price = data.purchaseQuantity * unitPrice;

  const record = await prisma.erpPurchaseRecord.create({
    data: {
      materialId: data.materialId,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
      supplier: data.supplier || material.supplier || '',
      purchaseUnit: unit,
      conversionRate: rate,
      purchaseQuantity: data.purchaseQuantity,
      purchaseUnitPrice: unitPrice,
      purchasePrice: price,
      inventoryQuantity: invQty,
      unitCost: invQty > 0 ? price / invQty : 0,
      remark: data.remark || '',
    },
    include: { material: { select: { name: true } } },
  });

  try { await createCrudAudit({ action: 'CREATE', system: 'ERP', module: 'purchase', targetId: record.id, after: record }); } catch {}

  revalidatePath('/erp/purchase');
  return record;
}

export async function updatePurchase(id: number, data: {
  supplier?: string; purchaseUnitPrice?: number;
  purchaseQuantity?: number; unitPrice?: number; remark?: string;
}) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_purchase_records WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const existing = await prisma.erpPurchaseRecord.findUnique({
    where: { id },
    include: { material: true },
  });
  if (!existing) throw new Error('采购记录不存在');
  if ((existing as any).status === 'received') throw new Error('已入库的采购单不可修改');

  const qty = data.purchaseQuantity ?? existing.purchaseQuantity;
  const unitPrice = data.purchaseUnitPrice ?? existing.purchaseUnitPrice ?? 0;
  const price = qty * unitPrice;
  const invQty = qty * (existing.conversionRate || 1);

  const record = await prisma.erpPurchaseRecord.update({
    where: { id },
    data: {
      supplier: data.supplier ?? existing.supplier,
      purchaseUnitPrice: data.purchaseUnitPrice ?? existing.purchaseUnitPrice,
      purchaseQuantity: data.purchaseQuantity ?? existing.purchaseQuantity,
      purchasePrice: price,
      inventoryQuantity: invQty,
      unitCost: invQty > 0 ? price / invQty : 0,
      remark: data.remark ?? existing.remark,
    },
  });

  try { await createCrudAudit({ action: 'UPDATE', system: 'ERP', module: 'purchase', targetId: id, before, after: record }); } catch {}

  revalidatePath('/erp/purchase');
  return record;
}

export async function cancelPurchase(id: number) {
  const existing = await prisma.erpPurchaseRecord.findUnique({
    where: { id },
    include: { material: { select: { name: true } } },
  });
  if (!existing) throw new Error('采购记录不存在');
  if ((existing as any).status === 'received') throw new Error('已入库的采购单不可取消');

  const oldStatus = (existing as any).status || 'pending';

  await prisma.erpPurchaseRecord.update({
    where: { id },
    data: { status: 'cancelled' } as any,
  });

  try { await createStatusAudit({ system: 'ERP', module: 'purchase', targetId: id, before: { status: oldStatus }, after: { status: 'cancelled' }, description: `取消采购单: ${existing.material.name}` }); } catch {}

  revalidatePath('/erp/purchase');
}

export async function confirmReceive(id: number) {
  const existing = await prisma.erpPurchaseRecord.findUnique({
    where: { id },
    include: { material: true },
  });
  if (!existing) throw new Error('采购记录不存在');
  if ((existing as any).status === 'received') throw new Error('已入库，不可重复确认');
  if ((existing as any).status === 'cancelled') throw new Error('已取消的采购单不可入库');

  const invQty = existing.inventoryQuantity;
  const material = existing.material;
  const beforeQty = material.remaining;
  const afterQty = beforeQty + invQty;

  // Transaction: update material stock + create inventory transaction + update purchase status
  await prisma.$transaction(async (tx: any) => {
    await tx.erpMaterial.update({
      where: { id: existing.materialId },
      data: { remaining: afterQty },
    });
    await tx.erpInventoryTransaction.create({
      data: {
        materialId: existing.materialId,
        type: 'IN',
        quantity: invQty,
        beforeQty,
        afterQty,
        relatedDoc: `PURCHASE-${id}`,
        remark: `采购入库: ${material.name} (采购单#${id})`,
      },
    });
    await tx.erpPurchaseRecord.update({
      where: { id },
      data: { status: 'received' } as any,
    });
    // Update material unit cost (weighted average)
    if (invQty > 0 && existing.purchasePrice > 0) {
      const newUnitCost = existing.purchasePrice / invQty;
      await tx.erpMaterial.update({
        where: { id: existing.materialId },
        data: { unitCost: newUnitCost },
      });
    }
  });

  const afterMaterial = await prisma.erpMaterial.findUnique({ where: { id: existing.materialId } });

  // Status change audit
  try { await createStatusAudit({ system: 'ERP', module: 'purchase', targetId: id, before: { status: (existing as any).status || 'pending' }, after: { status: 'received' }, description: `采购入库确认: ${material.name}` }); } catch {}

  // Inventory audit
  try { await createInventoryAudit({ action: 'PURCHASE_RECEIVED', materialName: material.name, quantity: invQty, beforeStock: beforeQty, afterStock: afterMaterial?.remaining ?? afterQty, purchaseId: id, description: `采购入库: ${material.name} +${invQty}` }); } catch {}

  revalidatePath('/erp/purchase');
  revalidatePath('/erp/inventory');
  return { beforeQty, afterQty: afterMaterial?.remaining };
}

export async function deletePurchase(id: number) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_purchase_records WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const existing = await prisma.erpPurchaseRecord.findUnique({ where: { id } });
  if (!existing) throw new Error('采购记录不存在');
  if ((existing as any).status === 'received') throw new Error('已入库的采购单不可删除');
  await prisma.erpPurchaseRecord.delete({ where: { id } });

  try { await createCrudAudit({ action: 'DELETE', system: 'ERP', module: 'purchase', targetId: id, before }); } catch {}

  revalidatePath('/erp/purchase');
}

export async function getMaterialsForSelect() {
  return prisma.erpMaterial.findMany({
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true, inventoryUnit: true, supplier: true },
  });
}
