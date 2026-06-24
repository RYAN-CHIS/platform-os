/** /erp/production — P13A Full CRUD */
import { prisma } from '@yunwu/db';
import ProductionClient from './client';

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = String(sp?.q || '').trim();

  const [records, skus] = await Promise.all([
    prisma.erpProductionRecord.findMany({
      take: 200, orderBy: { createdAt: 'desc' },
      where: q ? {
        OR: [
          { sku: { code: { contains: q, mode: 'insensitive' } } },
          { sku: { name: { contains: q, mode: 'insensitive' } } },
          { remark: { contains: q, mode: 'insensitive' } },
        ],
      } : undefined,
      include: { sku: { select: { code: true, name: true } } },
    }),
    prisma.erpProductSku.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, finishedStock: true },
    }),
  ]);

  const csvColumns = [
    { key: 'skuCode', label: 'SKU编码' }, { key: 'skuName', label: 'SKU名称' },
    { key: 'quantity', label: '数量' }, { key: 'materialCost', label: '材料成本' },
    { key: 'laborCost', label: '人工成本' }, { key: 'packagingCost', label: '包装成本' },
    { key: 'totalCost', label: '总成本' }, { key: 'unitCost', label: '单位成本' },
    { key: 'status', label: '状态' }, { key: 'remark', label: '备注' },
  ];

  const csvData = records.map(r => ({
    skuCode: r.sku?.code || '', skuName: r.sku?.name || '',
    quantity: r.quantity, materialCost: r.materialCost,
    laborCost: r.laborCost, packagingCost: r.packagingCost,
    totalCost: r.totalCost, unitCost: r.unitCost,
    status: (r as any).status || '', remark: r.remark || '',
  }));

  return <ProductionClient initialData={JSON.parse(JSON.stringify(records))} csvColumns={csvColumns} csvData={csvData} skuOptions={skus} />;
}
