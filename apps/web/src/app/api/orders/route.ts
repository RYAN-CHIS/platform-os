import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/orders — 创建订单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, customerName, phone, address, remark } = body;

    if (!items?.length || !customerName || !phone || !address) {
      return NextResponse.json({ error: '缺少必要信息' }, { status: 400 });
    }

    const orders = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { slug: item.slug } });
      if (!product) continue;

      const orderNo = `YW${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const order = await prisma.order.create({
        data: {
          orderNo,
          productId: product.id,
          productName: product.name,
          quantity: item.quantity || 1,
          amount: product.salePrice * (item.quantity || 1),
          customerName,
          phone,
          address,
          remark: remark || '',
          status: 'pending',
        },
      });
      orders.push(order);
    }

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('订单创建失败:', error);
    return NextResponse.json({ error: '订单创建失败' }, { status: 500 });
  }
}

// GET /api/orders — 获取订单列表（简易查询）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  const status = searchParams.get('status');

  const where: Record<string, unknown> = {};
  if (phone) where.phone = phone;
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(orders);
}
