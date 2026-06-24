'use server';

import { prisma } from '@yunwu/db';
import { revalidatePath } from 'next/cache';
import { createCrudAudit } from '@/lib/audit';

export async function createCustomer(data: {
  name: string; phone?: string; email?: string; wechat?: string;
  source?: string; address?: string; tags?: string; notes?: string;
}) {
  const count = await prisma.erpCustomer.count();
  const code = `C${String(count + 1).padStart(4, '0')}`;

  const c = await prisma.erpCustomer.create({
    data: {
      code,
      name: data.name,
      phone: data.phone || '',
      email: data.email || '',
      wechat: data.wechat || '',
      source: (data.source as any) || null,
      address: data.address || '',
      tags: data.tags || '',
      notes: data.notes || '',
    },
  });

  try { await createCrudAudit({ action: 'CREATE', system: 'ERP', module: 'customers', targetId: c.id, after: c }); } catch {}

  revalidatePath('/erp/customers');
  return c;
}

export async function updateCustomer(id: number, data: {
  name?: string; phone?: string; email?: string; wechat?: string;
  source?: string; address?: string; tags?: string; notes?: string;
}) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_customers WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.wechat !== undefined) updateData.wechat = data.wechat;
  if (data.source !== undefined) updateData.source = data.source;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const c = await prisma.erpCustomer.update({ where: { id }, data: updateData });

  try { await createCrudAudit({ action: 'UPDATE', system: 'ERP', module: 'customers', targetId: id, before, after: c }); } catch {}

  revalidatePath('/erp/customers');
  return c;
}

export async function deleteCustomer(id: number) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_customers WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const orderCount = await prisma.erpOrder.count({ where: { customerId: id } });
  if (orderCount > 0) throw new Error(`客户有 ${orderCount} 条关联订单，不可删除`);
  await prisma.erpCustomer.delete({ where: { id } });

  try { await createCrudAudit({ action: 'DELETE', system: 'ERP', module: 'customers', targetId: id, before }); } catch {}

  revalidatePath('/erp/customers');
}
