'use server';

import { prisma } from '@yunwu/db';
import { revalidatePath } from 'next/cache';
import { createCrudAudit, createAuditLog } from '@/lib/audit';

export async function createBom(data: {
  skuId: number; materialId: number; quantity: number;
}) {
  const material = await prisma.erpMaterial.findUnique({ where: { id: data.materialId } });
  if (!material) throw new Error('材料不存在');

  const unitPrice = material.unitCost || 0;
  const lineCost = unitPrice * data.quantity;

  const bom = await prisma.erpBom.create({
    data: {
      skuId: data.skuId,
      materialId: data.materialId,
      quantity: data.quantity,
      unitPrice,
      lineCost,
      materialCodeSnapshot: material.code,
      materialNameSnapshot: material.name,
    },
  });

  try { await createCrudAudit({ action: 'CREATE', system: 'ERP', module: 'bom', targetId: bom.id, after: bom }); } catch {}

  // Recalculate SKU material cost
  await recalcSkuCost(data.skuId);
  revalidatePath('/erp/bom');
  return bom;
}

export async function updateBom(id: number, data: { quantity: number }) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_boms WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const existing = await prisma.erpBom.findUnique({
    where: { id },
    include: { material: true },
  });
  if (!existing) throw new Error('BOM 条目不存在');

  const unitPrice = existing.material?.unitCost || existing.unitPrice || 0;
  const lineCost = unitPrice * data.quantity;

  const bom = await prisma.erpBom.update({
    where: { id },
    data: { quantity: data.quantity, unitPrice, lineCost },
  });

  try { await createCrudAudit({ action: 'UPDATE', system: 'ERP', module: 'bom', targetId: id, before, after: bom }); } catch {}

  await recalcSkuCost(existing.skuId);
  revalidatePath('/erp/bom');
  return bom;
}

export async function deleteBom(id: number) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_boms WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const existing = await prisma.erpBom.findUnique({ where: { id } });
  if (!existing) throw new Error('BOM 条目不存在');

  await prisma.erpBom.delete({ where: { id } });
  await recalcSkuCost(existing.skuId);

  try { await createCrudAudit({ action: 'DELETE', system: 'ERP', module: 'bom', targetId: id, before }); } catch {}

  revalidatePath('/erp/bom');
}

async function recalcSkuCost(skuId: number) {
  const boms = await prisma.erpBom.findMany({ where: { skuId } });
  const materialCost = boms.reduce((s, b) => s + Number(b.lineCost || 0), 0);

  const existing = await prisma.erpProductCost.findUnique({ where: { skuId } });
  const laborCost = existing?.laborCost || 0;
  const packagingCost = existing?.packagingCost || 0;
  const totalCost = materialCost + laborCost + packagingCost;

  await prisma.erpProductCost.upsert({
    where: { skuId },
    create: { skuId, materialCost, laborCost, packagingCost, totalCost },
    update: { materialCost, totalCost },
  });
}

export async function getSkus() {
  return prisma.erpProductSku.findMany({
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true },
  });
}

export async function getMaterials() {
  return prisma.erpMaterial.findMany({
    where: { status: { not: 'ARCHIVED' } },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true, inventoryUnit: true, unitCost: true },
  });
}

export async function recalcAllCosts() {
  const skus = await prisma.erpProductSku.findMany({ select: { id: true } });
  for (const sku of skus) {
    await recalcSkuCost(sku.id);
  }

  try { await createAuditLog({ action: 'COST_RECALCULATE', system: 'ERP', module: 'costs', description: `重算全部成本: ${skus.length} 个 SKU` }); } catch {}

  revalidatePath('/erp/costs');
  revalidatePath('/erp/bom');
  return { recalculated: skus.length };
}
