'use server';

import { prisma } from '@yunwu/db';
import { revalidatePath } from 'next/cache';
import { createCrudAudit, createStatusAudit, createInventoryAudit } from '@/lib/audit';

export async function createOrder(data: {
  customerId: number; channel?: string; items?: string;
  subtotal?: number; discount?: number; totalAmount: number;
  shippingFee?: number; notes?: string;
}) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.erpOrder.count({
    where: { orderNo: { startsWith: `YW-${today}` } },
  });
  const orderNo = `YW-${today}-${String(count + 1).padStart(3, '0')}`;

  const order = await prisma.erpOrder.create({
    data: {
      orderNo,
      customerId: data.customerId,
      channel: (data.channel as any) || 'MANUAL',
      items: data.items || '[]',
      subtotal: data.subtotal || data.totalAmount,
      discount: data.discount || 0,
      totalAmount: data.totalAmount,
      paidAmount: 0,
      shippingFee: data.shippingFee || 0,
      notes: data.notes || '',
    },
    include: {
      customer: { select: { name: true } },
    },
  });

  try { await createCrudAudit({ action: 'CREATE', system: 'ERP', module: 'orders', targetId: order.id, after: order }); } catch {}

  revalidatePath('/erp/orders');
  return order;
}

export async function updateOrder(id: number, data: {
  customerId?: number; totalAmount?: number; discount?: number;
  shippingFee?: number; notes?: string; shippingAddress?: string;
}) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_orders WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const existing = await prisma.erpOrder.findUnique({ where: { id } });
  if (!existing) throw new Error('订单不存在');

  const updateData: any = {};
  if (data.customerId !== undefined) updateData.customerId = data.customerId;
  if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
  if (data.discount !== undefined) updateData.discount = data.discount;
  if (data.shippingFee !== undefined) updateData.shippingFee = data.shippingFee;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.shippingAddress !== undefined) updateData.shippingAddress = data.shippingAddress;

  const order = await prisma.erpOrder.update({ where: { id }, data: updateData });

  try { await createCrudAudit({ action: 'UPDATE', system: 'ERP', module: 'orders', targetId: id, before, after: order }); } catch {}

  revalidatePath('/erp/orders');
  return order;
}

export async function shipOrder(id: number) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_orders WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const order = await prisma.erpOrder.findUnique({
    where: { id },
    include: { customer: { select: { name: true } } },
  });
  if (!order) throw new Error('订单不存在');
  if (order.status !== 'CONFIRMED' && order.status !== 'PENDING') {
    throw new Error(`当前状态 ${order.status} 不允许发货`);
  }

  // Parse items to find SKUs and deduct stock
  let items: Array<{ skuId?: number; skuName?: string; quantity?: number }> = [];
  try { items = JSON.parse(order.items || '[]'); } catch (e) { /* ignore */ }

  const details: string[] = [];
  await prisma.$transaction(async (tx: any) => {
    for (const item of items) {
      if (item.skuId && item.quantity) {
        const sku = await tx.erpProductSku.findUnique({ where: { id: item.skuId } });
        if (sku) {
          const beforeStock = sku.finishedStock;
          if (beforeStock < item.quantity) {
            throw new Error(`SKU ${sku.name} 成品库存不足: 需要 ${item.quantity}，当前 ${beforeStock}`);
          }
          await tx.erpProductSku.update({
            where: { id: item.skuId },
            data: { finishedStock: beforeStock - item.quantity },
          });
          details.push(`${sku.name} -${item.quantity} (${beforeStock} → ${beforeStock - item.quantity})`);
        }
      }
    }
    await tx.erpOrder.update({
      where: { id },
      data: { status: 'SHIPPED' },
    });
  });

  // Status change audit
  try { await createStatusAudit({ system: 'ERP', module: 'orders', targetId: id, before: before || { status: order.status }, after: { status: 'SHIPPED' }, description: `订单发货 ${order.orderNo}: ${order.customer.name}` }); } catch {}

  // Inventory audit for each SKU shipped
  for (const item of items) {
    if (item.skuId && item.quantity) {
      const sku = await prisma.erpProductSku.findUnique({ where: { id: item.skuId } });
      if (sku) {
        try { await createInventoryAudit({ action: 'ORDER_SHIPPED', productName: sku.name, skuCode: sku.code, quantity: item.quantity, beforeStock: sku.finishedStock + item.quantity, afterStock: sku.finishedStock, orderId: id, description: `订单发货扣库存: ${sku.name} -${item.quantity}` }); } catch {}
      }
    }
  }

  revalidatePath('/erp/orders');
  revalidatePath('/erp/inventory');
  return { orderNo: order.orderNo, details };
}

export async function completeOrder(id: number) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_orders WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const order = await prisma.erpOrder.findUnique({
    where: { id },
    include: { customer: { select: { name: true } } },
  });
  if (!order) throw new Error('订单不存在');
  if (order.status !== 'SHIPPED') throw new Error('只能完成已发货的订单');

  await prisma.erpOrder.update({
    where: { id },
    data: { status: 'COMPLETED', paidAmount: order.totalAmount, paymentStatus: 'PAID' },
  });

  try { await createStatusAudit({ system: 'ERP', module: 'orders', targetId: id, before: before || { status: 'SHIPPED' }, after: { status: 'COMPLETED' }, description: `订单完成 ${order.orderNo}: ${order.customer.name} ¥${order.totalAmount}` }); } catch {}

  revalidatePath('/erp/orders');
}

export async function cancelOrder(id: number) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_orders WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const order = await prisma.erpOrder.findUnique({
    where: { id },
    include: { customer: { select: { name: true } } },
  });
  if (!order) throw new Error('订单不存在');
  if (order.status === 'SHIPPED' || order.status === 'COMPLETED') {
    throw new Error('已发货/已完成的订单不可取消');
  }

  await prisma.erpOrder.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  try { await createStatusAudit({ system: 'ERP', module: 'orders', targetId: id, before: before || { status: order.status }, after: { status: 'CANCELLED' }, description: `取消订单 ${order.orderNo}: ${order.customer.name}` }); } catch {}

  revalidatePath('/erp/orders');
}

export async function deleteOrder(id: number) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_orders WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const order = await prisma.erpOrder.findUnique({ where: { id } });
  if (!order) throw new Error('订单不存在');
  const nonDeletable = ['SHIPPED', 'COMPLETED'];
  if (nonDeletable.includes(order.status)) throw new Error('已发货/已完成的订单不可删除');
  await prisma.erpOrder.delete({ where: { id } });

  try { await createCrudAudit({ action: 'DELETE', system: 'ERP', module: 'orders', targetId: id, before }); } catch {}

  revalidatePath('/erp/orders');
}

export async function updateOrderStatus(id: number, status: string) {
  // Fetch before state
  const beforeRows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_orders WHERE id = $1`, id);
  const before = beforeRows[0] || null;

  const order = await prisma.erpOrder.update({
    where: { id },
    data: { status: status as any },
  });

  try { await createStatusAudit({ system: 'ERP', module: 'orders', targetId: id, before: before || { status: '' }, after: { status } }); } catch {}

  revalidatePath('/erp/orders');
  return order;
}

export async function getCustomersForSelect() {
  return prisma.erpCustomer.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, code: true, name: true, phone: true },
  });
}
