'use server';

import { prisma } from '@yunwu/db';
import { revalidatePath } from 'next/cache';
import { createCrudAudit, createStatusAudit, createInventoryAudit } from '@/lib/audit';

export async function createProduction(data: {
  skuId: number; quantity: number; laborCost?: number;
  packagingCost?: number; remark?: string;
}) {
  const sku = await prisma.erpProductSku.findUnique({
    where: { id: data.skuId },
    include: { cost: true },
  });
  if (!sku) throw new Error('SKU 不存在');

  // Calculate estimated costs from BOM
  const boms = await prisma.erpBom.findMany({
    where: { skuId: data.skuId },
    include: { material: true },
  });
  const materialCost = boms.reduce((s, b) => s + Number(b.lineCost || 0) * data.quantity, 0);
  const laborCost = data.laborCost ?? 0;
  const packagingCost = data.packagingCost ?? 0;
  const totalCost = materialCost + laborCost + packagingCost;
  const unitCost = data.quantity > 0 ? totalCost / data.quantity : 0;

  const record = await prisma.erpProductionRecord.create({
    data: {
      skuId: data.skuId,
      quantity: data.quantity,
      materialCost,
      laborCost,
      packagingCost,
      totalCost,
      unitCost,
      remark: data.remark || '',
    },
    include: { sku: { select: { code: true, name: true } } },
  });

  try { await createCrudAudit({ action: 'CREATE', system: 'ERP', module: 'production', targetId: record.id, after: record }); } catch {}

  revalidatePath('/erp/production');
  return record;
}

export async function startProduction(id: number) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_production_records WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const record = await prisma.erpProductionRecord.findUnique({
    where: { id },
    include: { sku: true },
  });
  if (!record) throw new Error('生产记录不存在');
  if ((record as any).status !== 'draft') throw new Error('只能启动草稿状态的生产单');

  // Deduct BOM materials from inventory
  const boms = await prisma.erpBom.findMany({
    where: { skuId: record.skuId },
    include: { material: true },
  });

  if (boms.length === 0) throw new Error('此 SKU 没有 BOM，无法扣料');

  const deductions: Array<{ materialId: number; materialName: string; qty: number; beforeQty: number; afterQty: number }> = [];

  await prisma.$transaction(async (tx: any) => {
    for (const bom of boms) {
      const deductedQty = bom.quantity * record.quantity;
      const material = await tx.erpMaterial.findUnique({ where: { id: bom.materialId } });
      if (!material || material.remaining < deductedQty) {
        throw new Error(`材料 ${bom.materialNameSnapshot} 库存不足: 需要 ${deductedQty}，当前 ${material?.remaining || 0}`);
      }
      const after = material.remaining - deductedQty;
      await tx.erpMaterial.update({
        where: { id: bom.materialId },
        data: { remaining: after },
      });
      await tx.erpInventoryTransaction.create({
        data: {
          materialId: bom.materialId,
          type: 'OUT',
          quantity: deductedQty,
          beforeQty: material.remaining,
          afterQty: after,
          relatedDoc: `PRODUCTION-${id}`,
          remark: `生产领料: ${record.sku.name} (生产单#${id})`,
        },
      });
      deductions.push({
        materialId: bom.materialId,
        materialName: bom.materialNameSnapshot,
        qty: deductedQty,
        beforeQty: material.remaining,
        afterQty: after,
      });
    }
    await tx.erpProductionRecord.update({
      where: { id },
      data: { status: 'in_progress' } as any,
    });
  });

  // Status change audit
  try { await createStatusAudit({ system: 'ERP', module: 'production', targetId: id, before: before || { status: 'draft' }, after: { status: 'in_progress' } }); } catch {}

  // Inventory audit for each deduction
  for (const d of deductions) {
    try { await createInventoryAudit({ action: 'PRODUCTION_START', materialName: d.materialName, quantity: d.qty, beforeStock: d.beforeQty, afterStock: d.afterQty, productionId: id, description: `生产领料: ${d.materialName} -${d.qty}` }); } catch {}
  }

  revalidatePath('/erp/production');
  revalidatePath('/erp/inventory');
  return { record, deductions };
}

export async function completeProduction(id: number) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_production_records WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const record = await prisma.erpProductionRecord.findUnique({
    where: { id },
    include: { sku: true },
  });
  if (!record) throw new Error('生产记录不存在');
  if ((record as any).status !== 'in_progress') throw new Error('只能完成"进行中"状态的生产单');

  const beforeStock = record.sku.finishedStock;
  const afterStock = beforeStock + record.quantity;

  await prisma.$transaction(async (tx: any) => {
    // Add to finished stock
    await tx.erpProductSku.update({
      where: { id: record.skuId },
      data: { finishedStock: afterStock },
    });
    // Update production status
    await tx.erpProductionRecord.update({
      where: { id },
      data: { status: 'completed' } as any,
    });
    // Update product cost
    await tx.erpProductCost.upsert({
      where: { skuId: record.skuId },
      create: {
        skuId: record.skuId,
        materialCost: record.materialCost,
        laborCost: record.laborCost,
        packagingCost: record.packagingCost,
        totalCost: record.totalCost,
      },
      update: {
        materialCost: record.materialCost,
        laborCost: record.laborCost,
        packagingCost: record.packagingCost,
        totalCost: record.totalCost,
      },
    });
  });

  // Status change audit
  try { await createStatusAudit({ system: 'ERP', module: 'production', targetId: id, before: before || { status: 'in_progress' }, after: { status: 'completed' } }); } catch {}

  // Inventory audit for finished goods
  try { await createInventoryAudit({ action: 'PRODUCTION_COMPLETE', productName: record.sku.name, skuCode: record.sku.code, quantity: record.quantity, beforeStock, afterStock, productionId: id, description: `完成生产: ${record.sku.name} x${record.quantity}, 成品库存 ${beforeStock} → ${afterStock}` }); } catch {}

  revalidatePath('/erp/production');
  revalidatePath('/erp/inventory');
  return { beforeStock, afterStock };
}

export async function cancelProduction(id: number) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_production_records WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const record = await prisma.erpProductionRecord.findUnique({
    where: { id },
    include: { sku: { select: { name: true } } },
  });
  if (!record) throw new Error('生产记录不存在');
  if ((record as any).status === 'completed') throw new Error('已完成的生产单不可取消');

  // If in_progress, need to reverse material deductions
  if ((record as any).status === 'in_progress') {
    const boms = await prisma.erpBom.findMany({
      where: { skuId: record.skuId },
    });
    await prisma.$transaction(async (tx: any) => {
      for (const bom of boms) {
        const deductedQty = bom.quantity * record.quantity;
        const material = await tx.erpMaterial.findUnique({ where: { id: bom.materialId } });
        if (material) {
          const after = material.remaining + deductedQty;
          await tx.erpMaterial.update({
            where: { id: bom.materialId },
            data: { remaining: after },
          });
          await tx.erpInventoryTransaction.create({
            data: {
              materialId: bom.materialId,
              type: 'IN',
              quantity: deductedQty,
              beforeQty: material.remaining,
              afterQty: after,
              relatedDoc: `PRODUCTION-CANCEL-${id}`,
              remark: `取消生产退料: ${record.sku.name} (生产单#${id})`,
            },
          });
        }
      }
      await tx.erpProductionRecord.update({
        where: { id },
        data: { status: 'cancelled' } as any,
      });
    });
  } else {
    await prisma.erpProductionRecord.update({
      where: { id },
      data: { status: 'cancelled' } as any,
    });
  }

  try { await createStatusAudit({ system: 'ERP', module: 'production', targetId: id, before: before || { status: (record as any).status }, after: { status: 'cancelled' }, description: `取消生产单: ${record.sku.name} x${record.quantity}` }); } catch {}

  revalidatePath('/erp/production');
  revalidatePath('/erp/inventory');
}

export async function updateProduction(id: number, data: {
  quantity?: number; laborCost?: number; packagingCost?: number; remark?: string;
}) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_production_records WHERE id = $1`, id);
  const beforeData = beforeRows[0] || null;

  const record = await prisma.erpProductionRecord.findUnique({ where: { id } });
  if (!record) throw new Error('生产记录不存在');
  if ((record as any).status !== 'draft') throw new Error('只能编辑草稿状态的生产单');

  const qty = data.quantity ?? record.quantity;
  const laborCost = data.laborCost ?? record.laborCost;
  const packagingCost = data.packagingCost ?? record.packagingCost;

  // Recalculate material cost
  const boms = await prisma.erpBom.findMany({ where: { skuId: record.skuId } });
  const materialCost = boms.reduce((s, b) => s + Number(b.lineCost || 0) * qty, 0);
  const totalCost = materialCost + laborCost + packagingCost;
  const unitCost = qty > 0 ? totalCost / qty : 0;

  const updated = await prisma.erpProductionRecord.update({
    where: { id },
    data: {
      quantity: qty,
      laborCost,
      packagingCost,
      materialCost,
      totalCost,
      unitCost,
      remark: data.remark ?? record.remark,
    },
  });

  try { await createCrudAudit({ action: 'UPDATE', system: 'ERP', module: 'production', targetId: id, before: beforeData, after: updated }); } catch {}

  revalidatePath('/erp/production');
  return updated;
}

export async function deleteProduction(id: number) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_production_records WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const record = await prisma.erpProductionRecord.findUnique({ where: { id } });
  if (!record) throw new Error('生产记录不存在');
  if ((record as any).status !== 'draft') throw new Error('只能删除草稿状态的生产单');
  await prisma.erpProductionRecord.delete({ where: { id } });

  try { await createCrudAudit({ action: 'DELETE', system: 'ERP', module: 'production', targetId: id, before }); } catch {}

  revalidatePath('/erp/production');
}

export async function getSkusForSelect() {
  return prisma.erpProductSku.findMany({
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true, finishedStock: true },
  });
}
