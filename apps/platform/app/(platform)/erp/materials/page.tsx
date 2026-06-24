/** /erp/materials — P13A Full CRUD */
import { prisma } from '@yunwu/db';
import MaterialsClient from './client';

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = String(sp?.q || '').trim();

  const materials = await prisma.erpMaterial.findMany({
    take: 200, orderBy: { code: 'asc' },
    where: q ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ],
    } : undefined,
  });

  const csvColumns = [
    { key: 'code', label: '编码' }, { key: 'name', label: '名称' },
    { key: 'category', label: '分类' }, { key: 'materialType', label: '类型' },
    { key: 'inventoryUnit', label: '单位' }, { key: 'remaining', label: '库存' },
    { key: 'unitCost', label: '单价' }, { key: 'specification', label: '规格' },
  ];

  const csvData = materials.map(m => ({
    code: m.code, name: m.name, category: m.category,
    materialType: m.materialType, inventoryUnit: m.inventoryUnit,
    remaining: m.remaining, unitCost: m.unitCost, specification: m.specification,
  }));

  return <MaterialsClient initialData={JSON.parse(JSON.stringify(materials))} csvColumns={csvColumns} csvData={csvData} />;
}
