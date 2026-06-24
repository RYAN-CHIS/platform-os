'use server';

import { prisma } from '@yunwu/db';
import { revalidatePath } from 'next/cache';
import { createCrudAudit, createAuditLog } from '@/lib/audit';

export async function updateCostLabor(id: number, laborCost: number) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_product_costs WHERE sku_id = $1`, id);
  const before = beforeRows[0] || null;

  const cost = await prisma.erpProductCost.findUnique({ where: { skuId: id } });
  if (!cost) throw new Error('成本记录不存在');

  const totalCost = Number(cost.materialCost) + laborCost + Number(cost.packagingCost);
  const updated = await prisma.erpProductCost.update({
    where: { skuId: id },
    data: { laborCost, totalCost },
  });

  try { await createCrudAudit({ action: 'UPDATE', system: 'ERP', module: 'costs', targetId: id, before, after: updated, description: `人工成本覆盖: ¥${laborCost}` }); } catch {}

  revalidatePath('/erp/costs');
  return updated;
}

export async function updateCostPackaging(id: number, packagingCost: number) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_product_costs WHERE sku_id = $1`, id);
  const before = beforeRows[0] || null;

  const cost = await prisma.erpProductCost.findUnique({ where: { skuId: id } });
  if (!cost) throw new Error('成本记录不存在');

  const totalCost = Number(cost.materialCost) + Number(cost.laborCost) + packagingCost;
  const updated = await prisma.erpProductCost.update({
    where: { skuId: id },
    data: { packagingCost, totalCost },
  });

  try { await createCrudAudit({ action: 'UPDATE', system: 'ERP', module: 'costs', targetId: id, before, after: updated, description: `包装成本覆盖: ¥${packagingCost}` }); } catch {}

  revalidatePath('/erp/costs');
  return updated;
}

export async function recalcAllCosts() {
  const skus = await prisma.erpProductSku.findMany({ select: { id: true } });
  for (const sku of skus) {
    const boms = await prisma.erpBom.findMany({ where: { skuId: sku.id } });
    const materialCost = boms.reduce((s, b) => s + Number(b.lineCost || 0), 0);
    const existing = await prisma.erpProductCost.findUnique({ where: { skuId: sku.id } });
    const laborCost = existing?.laborCost || 0;
    const packagingCost = existing?.packagingCost || 0;
    const totalCost = materialCost + laborCost + packagingCost;
    await prisma.erpProductCost.upsert({
      where: { skuId: sku.id },
      create: { skuId: sku.id, materialCost, laborCost, packagingCost, totalCost },
      update: { materialCost, totalCost },
    });
  }

  try { await createAuditLog({ action: 'COST_RECALCULATE', system: 'ERP', module: 'costs', description: `重算全部成本: ${skus.length} 个 SKU` }); } catch {}

  revalidatePath('/erp/costs');
  return { recalculated: skus.length };
}

export async function getCostSummary() {
  const costs = await prisma.erpProductCost.findMany();
  const totalMaterial = costs.reduce((s, c) => s + Number(c.materialCost), 0);
  const totalLabor = costs.reduce((s, c) => s + Number(c.laborCost), 0);
  const totalPackaging = costs.reduce((s, c) => s + Number(c.packagingCost), 0);
  const totalCost = costs.reduce((s, c) => s + Number(c.totalCost), 0);

  // Get total revenue estimate
  const skus = await prisma.erpProductSku.findMany({
    select: { price: true, finishedStock: true },
  });
  const totalRevenue = skus.reduce((s, sku) => s + Number(sku.price) * sku.finishedStock, 0);

  return {
    totalMaterial, totalLabor, totalPackaging, totalCost,
    totalRevenue,
    margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(1) : '0',
  };
}
