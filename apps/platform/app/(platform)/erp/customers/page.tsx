/** /erp/customers — P13A Full CRUD */
import { prisma } from '@yunwu/db';
import CustomersClient from './client';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = String(sp?.q || '').trim();

  const customers = await prisma.erpCustomer.findMany({
    take: 200, orderBy: { createdAt: 'desc' },
    where: q ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    } : undefined,
    include: { _count: { select: { orders: true } } },
  });

  const csvColumns = [
    { key: 'code', label: '编码' }, { key: 'name', label: '客户名' },
    { key: 'phone', label: '电话' }, { key: 'email', label: '邮箱' },
    { key: 'wechat', label: '微信' }, { key: 'source', label: '来源' },
    { key: 'tags', label: '标签' }, { key: 'orderCount', label: '订单数' },
  ];

  const csvData = customers.map(c => ({
    code: c.code, name: c.name, phone: c.phone || '', email: c.email || '',
    wechat: c.wechat || '', source: c.source || '', tags: c.tags || '',
    orderCount: c._count?.orders || 0,
  }));

  return <CustomersClient initialData={JSON.parse(JSON.stringify(customers))} csvColumns={csvColumns} csvData={csvData} />;
}
