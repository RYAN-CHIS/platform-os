/** /erp/costs — P13A Full CRUD */
import { prisma } from '@yunwu/db';
import CostsClient from './client';

export default async function CostsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = String(sp?.q || '').trim();

  const costs = await prisma.erpProductCost.findMany({
    take: 200, orderBy: { updatedAt: 'desc' },
    where: q ? {
      OR: [
        { sku: { code: { contains: q, mode: 'insensitive' } } },
        { sku: { name: { contains: q, mode: 'insensitive' } } },
      ],
    } : undefined,
    include: {
      sku: {
        select: {
          code: true, name: true, price: true,
          product: { select: { name: true } },
        },
      },
    },
  });

  function margin(cost: number, price: number | null | undefined): string {
    if (!price || price <= 0 || cost <= 0) return '—';
    return `${(((price - cost) / price) * 100).toFixed(1)}%`;
  }

  const csvColumns = [
    { key: 'skuCode', label: 'SKU编码' }, { key: 'skuName', label: 'SKU名称' },
    { key: 'productName', label: '产品' }, { key: 'materialCost', label: '材料成本' },
    { key: 'laborCost', label: '人工成本' }, { key: 'packagingCost', label: '包装成本' },
    { key: 'totalCost', label: '总成本' }, { key: 'salePrice', label: '售价' },
    { key: 'margin', label: '利润率' },
  ];

  const csvData = costs.map(c => ({
    skuCode: c.sku?.code || '', skuName: c.sku?.name || '',
    productName: c.sku?.product?.name || '',
    materialCost: c.materialCost, laborCost: c.laborCost,
    packagingCost: c.packagingCost, totalCost: c.totalCost,
    salePrice: c.sku?.price || '', margin: margin(c.totalCost, c.sku?.price),
  }));

  return <CostsClient initialData={JSON.parse(JSON.stringify(costs))} csvColumns={csvColumns} csvData={csvData} />;
}
