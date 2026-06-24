/** /erp/bom — P13A Full CRUD */
import { prisma } from '@yunwu/db';
import BomClient from './client';

export default async function BomPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = String(sp?.q || '').trim();

  const [items, skus, materials] = await Promise.all([
    prisma.erpBom.findMany({
      take: 300, orderBy: { skuId: 'asc' },
      where: q ? {
        OR: [
          { materialNameSnapshot: { contains: q, mode: 'insensitive' } },
          { materialCodeSnapshot: { contains: q, mode: 'insensitive' } },
          { sku: { code: { contains: q, mode: 'insensitive' } } },
        ],
      } : undefined,
      include: {
        material: { select: { name: true, specification: true, inventoryUnit: true } },
        sku: { select: { code: true, name: true } },
      },
    }),
    prisma.erpProductSku.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.erpMaterial.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true, inventoryUnit: true, unitCost: true } }),
  ]);

  const csvColumns = [
    { key: 'skuCode', label: 'SKU编码' }, { key: 'skuName', label: 'SKU名称' },
    { key: 'materialCode', label: '材料编码' }, { key: 'materialName', label: '材料名称' },
    { key: 'quantity', label: '用量' }, { key: 'unit', label: '单位' },
    { key: 'unitPrice', label: '单价' }, { key: 'lineCost', label: '行成本' },
  ];

  const csvData = items.map(b => ({
    skuCode: b.sku?.code || String(b.skuId), skuName: b.sku?.name || '',
    materialCode: b.materialCodeSnapshot, materialName: b.materialNameSnapshot,
    quantity: b.quantity, unit: b.material?.inventoryUnit || '',
    unitPrice: b.unitPrice || '', lineCost: b.lineCost || '',
  }));

  return <BomClient initialData={JSON.parse(JSON.stringify(items))} csvColumns={csvColumns} csvData={csvData} skuOptions={skus} materialOptions={materials as any} />;
}
