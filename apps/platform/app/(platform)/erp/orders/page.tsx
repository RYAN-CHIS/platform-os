/** /erp/orders — P13A Full CRUD */
import { prisma } from '@yunwu/db';
import OrdersClient from './client';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = String(sp?.q || '').trim();

  const [orders, customers] = await Promise.all([
    prisma.erpOrder.findMany({
      where: q ? {
        OR: [
          { orderNo: { contains: q, mode: 'insensitive' as const } },
          { customer: { name: { contains: q, mode: 'insensitive' as const } } },
        ],
      } : undefined,
      include: { customer: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' }, take: 200,
    }),
    prisma.erpCustomer.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, phone: true },
    }),
  ]);

  const csvColumns = [
    { key: 'orderNo', label: '订单号' }, { key: 'customerName', label: '客户' },
    { key: 'channel', label: '渠道' }, { key: 'status', label: '订单状态' },
    { key: 'paymentStatus', label: '支付状态' }, { key: 'totalAmount', label: '总金额' },
    { key: 'paidAmount', label: '已付' }, { key: 'orderDate', label: '下单日期' },
  ];

  const csvData = orders.map(o => ({
    orderNo: o.orderNo, customerName: o.customer?.name || '',
    channel: o.channel, status: o.status, paymentStatus: o.paymentStatus,
    totalAmount: o.totalAmount, paidAmount: o.paidAmount,
    orderDate: o.orderDate ? new Date(o.orderDate).toISOString().slice(0,10) : '',
  }));

  return <OrdersClient initialData={JSON.parse(JSON.stringify(orders))} csvColumns={csvColumns} csvData={csvData} customerOptions={customers as any} />;
}
