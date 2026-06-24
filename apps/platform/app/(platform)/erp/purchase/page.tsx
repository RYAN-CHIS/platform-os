/** /erp/purchase — P13A Full CRUD */
import { prisma } from '@yunwu/db';
import PurchaseClient from './client';

export default async function PurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = String(sp?.q || '').trim();

  const [records, materials] = await Promise.all([
    prisma.erpPurchaseRecord.findMany({
      where: q ? {
        OR: [
          { supplier: { contains: q, mode: 'insensitive' as const } },
          { material: { name: { contains: q, mode: 'insensitive' as const } } },
        ],
      } : undefined,
      include: { material: { select: { name: true, specification: true } } },
      orderBy: { purchaseDate: 'desc' }, take: 200,
    }),
    prisma.erpMaterial.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, inventoryUnit: true, supplier: true },
    }),
  ]);

  const csvColumns = [
    { key: 'materialName', label: '材料' }, { key: 'supplier', label: '供应商' },
    { key: 'purchaseQuantity', label: '采购数量' }, { key: 'purchaseUnit', label: '单位' },
    { key: 'purchaseUnitPrice', label: '单价' }, { key: 'purchasePrice', label: '总价' },
    { key: 'purchaseDate', label: '采购日期' }, { key: 'remark', label: '备注' },
  ];

  const csvData = records.map(r => ({
    materialName: r.material?.name || '', supplier: r.supplier || '',
    purchaseQuantity: r.purchaseQuantity, purchaseUnit: r.purchaseUnit,
    purchaseUnitPrice: r.purchaseUnitPrice, purchasePrice: r.purchasePrice,
    purchaseDate: r.purchaseDate ? new Date(r.purchaseDate).toISOString().slice(0,10) : '',
    remark: r.remark || '',
  }));

  return <PurchaseClient initialData={JSON.parse(JSON.stringify(records))} csvColumns={csvColumns} csvData={csvData} materialOptions={materials} />;
}
