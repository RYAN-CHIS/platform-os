/** /erp/products — P13A Full CRUD (Product + SKU) */
import { prisma } from '@yunwu/db';
import ProductsClient from './client';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = String(sp?.q || '').trim();

  const [products, works] = await Promise.all([
    prisma.erpProduct.findMany({
      take: 200, orderBy: { code: 'asc' },
      where: q ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
        ],
      } : undefined,
      include: {
        work: { include: { series: { select: { name: true } } } },
        skus: { select: { id: true, code: true, name: true, specification: true, size: true, price: true, finishedStock: true, status: true } },
      },
    }),
    prisma.erpWork.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
  ]);

  const csvColumns = [
    { key: 'code', label: '编码' }, { key: 'name', label: '产品名' },
    { key: 'series', label: '系列' }, { key: 'skuCount', label: 'SKU数' },
    { key: 'status', label: '状态' },
  ];

  const csvData = products.map(p => ({
    code: p.code, name: p.name,
    series: p.work?.series?.name || '',
    skuCount: p.skus?.length || 0, status: p.status,
  }));

  return <ProductsClient initialData={JSON.parse(JSON.stringify(products))} csvColumns={csvColumns} csvData={csvData} workOptions={works} />;
}
