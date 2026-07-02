'use server';

import { prisma } from '@yunwu/db';
import { revalidatePath } from 'next/cache';
import { createCrudAudit, createStatusAudit } from '@/lib/audit';

const PRODUCT_AUDIT_TABLE = 'products';
const SKU_AUDIT_TABLE = 'product_skus';

async function fetchAuditSnapshot(table: string, id: number) {
  try {
    return await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM ${table} WHERE id = $1`, id);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[audit] snapshot query failed for ${table}#${id}:`, error);
      throw error;
    }
    console.warn(`[audit] snapshot query failed for ${table}#${id}:`, error);
    return [];
  }
}

// ── Product CRUD ──

export async function createProduct(data: {
  code: string; name: string; workId: number; description?: string;
}) {
  const p = await prisma.erpProduct.create({
    data: {
      code: data.code,
      name: data.name,
      workId: data.workId,
      description: data.description || '',
    },
  });

  try { await createCrudAudit({ action: 'CREATE', system: 'ERP', module: 'products', targetId: p.id, after: p }); } catch {}

  revalidatePath('/erp/products');
  return p;
}

export async function updateProduct(id: number, data: {
  code?: string; name?: string; workId?: number; status?: string; description?: string;
}) {
  // Fetch before state
  const beforeRows = await fetchAuditSnapshot(PRODUCT_AUDIT_TABLE, id);
  const before = beforeRows[0] || null;

  const updateData: any = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.workId !== undefined) updateData.workId = data.workId;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.description !== undefined) updateData.description = data.description;

  const p = await prisma.erpProduct.update({ where: { id }, data: updateData });

  try { await createCrudAudit({ action: 'UPDATE', system: 'ERP', module: 'products', targetId: id, before, after: p }); } catch {}

  revalidatePath('/erp/products');
  return p;
}

export async function deleteProduct(id: number) {
  // Fetch before state
  const beforeRows = await fetchAuditSnapshot(PRODUCT_AUDIT_TABLE, id);
  const before = beforeRows[0] || null;

  const skuCount = await prisma.erpProductSku.count({ where: { productId: id } });
  if (skuCount > 0) throw new Error(`产品下有 ${skuCount} 个 SKU，请先删除所有 SKU`);

  await prisma.$transaction(async (tx: any) => {
    await tx.erpProductCost.deleteMany({
      where: { sku: { productId: id } },
    });
    await tx.erpBom.deleteMany({
      where: { sku: { productId: id } },
    });
    await tx.erpProductSku.deleteMany({ where: { productId: id } });
    await tx.erpProduct.delete({ where: { id } });
  });

  try { await createCrudAudit({ action: 'DELETE', system: 'ERP', module: 'products', targetId: id, before }); } catch {}

  revalidatePath('/erp/products');
}

export async function toggleProductStatus(id: number, newStatus: string) {
  // Fetch before state
  const beforeRows = await fetchAuditSnapshot(PRODUCT_AUDIT_TABLE, id);
  const before = beforeRows[0] || null;

  const p = await prisma.erpProduct.update({
    where: { id },
    data: { status: newStatus as any },
  });

  try { await createStatusAudit({ system: 'ERP', module: 'products', targetId: id, before: before || { status: '' }, after: { status: newStatus } }); } catch {}

  revalidatePath('/erp/products');
  return p;
}

// ── SKU CRUD ──

export async function createSku(data: {
  code: string; name: string; productId: number;
  specification?: string; size?: string; price?: number;
}) {
  const sku = await prisma.erpProductSku.create({
    data: {
      code: data.code,
      name: data.name,
      productId: data.productId,
      specification: data.specification || '',
      size: data.size || '',
      price: data.price || 0,
    },
  });
  // auto-create cost record
  await prisma.erpProductCost.create({
    data: { skuId: sku.id },
  });

  try { await createCrudAudit({ action: 'CREATE', system: 'ERP', module: 'product_sku', targetId: sku.id, after: sku }); } catch {}

  revalidatePath('/erp/products');
  return sku;
}

export async function updateSku(id: number, data: {
  code?: string; name?: string; specification?: string; size?: string;
  price?: number; status?: string;
}) {
  // Fetch before state
  const beforeRows = await fetchAuditSnapshot(SKU_AUDIT_TABLE, id);
  const before = beforeRows[0] || null;

  const updateData: any = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.specification !== undefined) updateData.specification = data.specification;
  if (data.size !== undefined) updateData.size = data.size;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.status !== undefined) updateData.status = data.status;

  const sku = await prisma.erpProductSku.update({ where: { id }, data: updateData });

  try { await createCrudAudit({ action: 'UPDATE', system: 'ERP', module: 'product_sku', targetId: id, before, after: sku }); } catch {}

  revalidatePath('/erp/products');
  return sku;
}

export async function deleteSku(id: number) {
  // Fetch before state
  const beforeRows = await fetchAuditSnapshot(SKU_AUDIT_TABLE, id);
  const before = beforeRows[0] || null;

  await prisma.erpBom.deleteMany({ where: { skuId: id } });
  await prisma.erpProductCost.deleteMany({ where: { skuId: id } });
  await prisma.erpProductionRecord.deleteMany({ where: { skuId: id } });
  await prisma.erpProductSku.delete({ where: { id } });

  try { await createCrudAudit({ action: 'DELETE', system: 'ERP', module: 'product_sku', targetId: id, before }); } catch {}

  revalidatePath('/erp/products');
}

// ── Lookup helpers ──
export async function getWorks() {
  return prisma.erpWork.findMany({
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true },
  });
}
