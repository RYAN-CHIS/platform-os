'use server';

import { prisma } from '@yunwu/db';
import { revalidatePath } from 'next/cache';
import { createCrudAudit, createStatusAudit } from '@/lib/audit';

export async function createMaterial(data: Record<string, any>) {
  // Compute fields
  let costPerUsageUnit = data.costPerUsageUnit ?? 0;
  if (!costPerUsageUnit && data.totalPieces && data.totalPieces > 0) {
    const totalPrice = data.purchaseTotalPrice || data.purchasePrice || 0;
    costPerUsageUnit = totalPrice / data.totalPieces;
  }

  const m = await prisma.erpMaterial.create({
    data: {
      code: String(data.code || ''),
      name: String(data.name || ''),
      category: String(data.category || ''),
      materialType: 'BEAD',
      specification: String(data.specification || ''),
      inventoryUnit: '颗',
      unitCost: parseFloat(data.costPerUsageUnit || data.unitCost || 0),
      status: data.status || 'ACTIVE',
      shape: String(data.shape || ''),
      beadsPerStrand: parseInt(data.beadsPerStrand || data.strandBeadCount || 0),
      weightPerStrand: parseFloat(data.weightPerStrand || 0),
      supplier: String(data.supplier || ''),
      purchaseMethod: String(data.purchaseMethod || ''),
      pricingMethod: String(data.pricingMethod || 'by_weight'),
      purchaseQty: parseFloat(data.purchaseQty || 0),
      unitPrice: parseFloat(data.unitPrice || data.pricePerGram || 0),
      pricingUnit: String(data.pricingUnit || ''),
      totalWeightG: parseFloat(data.totalWeightG || data.totalWeight || 0),
      totalPieces: parseInt(data.totalPieces || data.beadCount || 0),
      pricePerGram: parseFloat(data.pricePerGram || data.gramPrice || 0),
      gramPrice: parseFloat(data.pricePerGram || data.gramPrice || 0),
      costPerUsageUnit: costPerUsageUnit || 0,
      purchaseTotalPrice: parseFloat(data.purchaseTotalPrice || data.purchasePrice || 0),
      beadCount: parseInt(data.totalPieces || data.beadCount || 0),
      totalWeight: parseFloat(data.totalWeightG || data.totalWeight || 0),
      strandCount: parseInt(data.strandCount || data.purchaseQty || 0),
      strandPrice: parseFloat(data.strandPrice || 0),
      purchasePrice: parseFloat(data.purchaseTotalPrice || data.purchasePrice || 0),
      safetyStock: parseInt(data.safetyStock || 0),
      remark: String(data.remark || ''),
      usageUnit: String(data.usageUnit || '颗'),
    },
  });

  try { await createCrudAudit({ action: 'CREATE', system: 'ERP', module: 'materials', targetId: m.id, after: m }); } catch {}

  revalidatePath('/erp/materials');
  return m;
}

export async function updateMaterial(id: number, data: Record<string, any>) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM raw_materials WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const updateData: any = {};
  const copyField = (key: string, dbKey?: string) => {
    if (data[key] !== undefined) updateData[dbKey || key] = data[key];
  };
  copyField('code'); copyField('name'); copyField('category');
  copyField('specification'); copyField('shape'); copyField('remark');
  copyField('supplier'); copyField('purchaseMethod', 'purchase_method');
  copyField('pricingMethod', 'pricing_method');
  copyField('purchaseQty', 'purchase_qty');
  copyField('unitPrice', 'unit_price');
  copyField('pricingUnit', 'pricing_unit');
  copyField('totalWeightG', 'total_weight_g');
  copyField('totalPieces', 'total_pieces');
  copyField('pricePerGram', 'price_per_gram');
  copyField('gramPrice', 'gram_price');
  copyField('purchaseTotalPrice', 'purchase_total_price');
  copyField('beadCount', 'bead_count');
  copyField('totalWeight', 'total_weight');
  copyField('strandCount', 'strand_count');
  copyField('strandPrice', 'strand_price');
  copyField('usageUnit', 'usage_unit');
  copyField('purchasePrice', 'purchase_price');
  copyField('safetyStock', 'safety_stock');
  copyField('unitCost', 'unit_cost');
  copyField('inventoryUnit', 'inventory_unit');
  copyField('beadsPerStrand', 'beads_per_strand');
  copyField('weightPerStrand', 'weight_per_strand');
  copyField('status');
  copyField('costPerUsageUnit', 'cost_per_usage_unit');
  // materialType
  if (data.materialType !== undefined) updateData.materialType = data.materialType;

  const m = await prisma.erpMaterial.update({ where: { id }, data: updateData });

  try { await createCrudAudit({ action: 'UPDATE', system: 'ERP', module: 'materials', targetId: id, before, after: m }); } catch {}

  revalidatePath('/erp/materials');
  return m;
}

export async function deleteMaterial(id: number) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM raw_materials WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  // Check for BOM references
  const bomCount = await prisma.erpBom.count({ where: { materialId: id } });
  if (bomCount > 0) throw new Error(`材料被 ${bomCount} 条 BOM 引用，无法删除`);
  const txnCount = await prisma.erpInventoryTransaction.count({ where: { materialId: id } });
  if (txnCount > 0) throw new Error(`材料有 ${txnCount} 条库存记录，无法删除`);
  await prisma.erpPurchaseRecord.deleteMany({ where: { materialId: id } });
  await prisma.erpMaterial.delete({ where: { id } });

  try { await createCrudAudit({ action: 'DELETE', system: 'ERP', module: 'materials', targetId: id, before }); } catch {}

  revalidatePath('/erp/materials');
}

export async function toggleMaterialStatus(id: number, newStatus: string) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM raw_materials WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const m = await prisma.erpMaterial.update({
    where: { id },
    data: { status: newStatus as any },
  });

  try { await createStatusAudit({ system: 'ERP', module: 'materials', targetId: id, before: before || { status: '' }, after: { status: newStatus } }); } catch {}

  revalidatePath('/erp/materials');
  return m;
}
