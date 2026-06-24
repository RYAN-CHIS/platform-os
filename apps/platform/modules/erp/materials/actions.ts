'use server';

import { prisma } from '@yunwu/db';
import { revalidatePath } from 'next/cache';
import { createCrudAudit, createStatusAudit } from '@/lib/audit';

export async function createMaterial(data: {
  code: string; name: string; category?: string; materialType?: string;
  specification?: string; inventoryUnit?: string; unitCost?: number;
  supplier?: string; purchaseMethod?: string; remark?: string;
  defaultPurchaseUnit?: string; usageUnit?: string; defaultConversionRate?: number;
  purchasePrice?: number; safetyStock?: number; conversionDescription?: string;
  beadsPerStrand?: number; weightPerStrand?: number;
  pricingMethod?: string; totalWeightG?: number; totalPieces?: number;
  pricePerGram?: number; costPerUsageUnit?: number;
}) {
  // Auto-calculate costPerUsageUnit for by-weight pricing
  let costPerUsageUnit = data.costPerUsageUnit ?? 0;
  if (data.pricingMethod === 'by_weight' && data.totalPieces && data.totalPieces > 0) {
    const totalPrice = data.totalWeightG && data.pricePerGram
      ? data.totalWeightG * data.pricePerGram
      : (data.purchasePrice || 0);
    costPerUsageUnit = totalPrice / data.totalPieces;
  } else if (!costPerUsageUnit && data.unitCost) {
    costPerUsageUnit = data.unitCost;
  }

  const m = await prisma.erpMaterial.create({
    data: {
      code: data.code,
      name: data.name,
      category: data.category || '',
      materialType: (data.materialType as any) || 'OTHER',
      specification: data.specification || '',
      inventoryUnit: data.inventoryUnit || '颗',
      unitCost: data.unitCost || 0,
      supplier: data.supplier || '',
      remark: data.remark || '',
      defaultPurchaseUnit: data.defaultPurchaseUnit || null,
      usageUnit: data.usageUnit || null,
      defaultConversionRate: data.defaultConversionRate || null,
      purchasePrice: data.purchasePrice || null,
      safetyStock: data.safetyStock || 0,
      conversionDescription: data.conversionDescription || null,
      beadsPerStrand: data.beadsPerStrand || 0,
      weightPerStrand: data.weightPerStrand || 0,
      pricingMethod: data.pricingMethod || 'by_piece',
      totalWeightG: data.totalWeightG || 0,
      totalPieces: data.totalPieces || 0,
      pricePerGram: data.pricePerGram || 0,
      costPerUsageUnit: costPerUsageUnit || 0,
    },
  });

  try { await createCrudAudit({ action: 'CREATE', system: 'ERP', module: 'materials', targetId: m.id, after: m }); } catch {}

  revalidatePath('/erp/materials');
  return m;
}

export async function updateMaterial(id: number, data: {
  code?: string; name?: string; category?: string; materialType?: string;
  specification?: string; inventoryUnit?: string; unitCost?: number;
  status?: string; supplier?: string; purchaseMethod?: string; remark?: string;
  defaultPurchaseUnit?: string; usageUnit?: string; defaultConversionRate?: number;
  purchasePrice?: number; safetyStock?: number; conversionDescription?: string;
  beadsPerStrand?: number; weightPerStrand?: number;
  pricingMethod?: string; totalWeightG?: number; totalPieces?: number;
  pricePerGram?: number; costPerUsageUnit?: number;
}) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM raw_materials WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  // Auto-calculate costPerUsageUnit
  let computedCostPerUsageUnit: number | undefined;
  if (data.pricingMethod === 'by_weight') {
    if (data.totalPieces && data.totalPieces > 0) {
      const totalWeight = data.totalWeightG ?? before?.total_weight_g ?? 0;
      const pricePGram = data.pricePerGram ?? before?.price_per_gram ?? 0;
      const totalPrice = totalWeight * pricePGram;
      computedCostPerUsageUnit = totalPrice / data.totalPieces;
    }
  }

  const updateData: any = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.materialType !== undefined) updateData.materialType = data.materialType;
  if (data.specification !== undefined) updateData.specification = data.specification;
  if (data.inventoryUnit !== undefined) updateData.inventoryUnit = data.inventoryUnit;
  if (data.unitCost !== undefined) updateData.unitCost = data.unitCost;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.supplier !== undefined) updateData.supplier = data.supplier;
  if (data.remark !== undefined) updateData.remark = data.remark;
  if (data.defaultPurchaseUnit !== undefined) updateData.defaultPurchaseUnit = data.defaultPurchaseUnit || null;
  if (data.usageUnit !== undefined) updateData.usageUnit = data.usageUnit || null;
  if (data.defaultConversionRate !== undefined) updateData.defaultConversionRate = data.defaultConversionRate || null;
  if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice || null;
  if (data.safetyStock !== undefined) updateData.safetyStock = data.safetyStock || 0;
  if (data.conversionDescription !== undefined) updateData.conversionDescription = data.conversionDescription || null;
  if (data.beadsPerStrand !== undefined) updateData.beadsPerStrand = data.beadsPerStrand || 0;
  if (data.weightPerStrand !== undefined) updateData.weightPerStrand = data.weightPerStrand || 0;
  if (data.pricingMethod !== undefined) updateData.pricingMethod = data.pricingMethod || 'by_piece';
  if (data.totalWeightG !== undefined) updateData.totalWeightG = data.totalWeightG || 0;
  if (data.totalPieces !== undefined) updateData.totalPieces = data.totalPieces || 0;
  if (data.pricePerGram !== undefined) updateData.pricePerGram = data.pricePerGram || 0;
  if (computedCostPerUsageUnit !== undefined) {
    updateData.costPerUsageUnit = computedCostPerUsageUnit;
  } else if (data.costPerUsageUnit !== undefined) {
    updateData.costPerUsageUnit = data.costPerUsageUnit || 0;
  }

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
