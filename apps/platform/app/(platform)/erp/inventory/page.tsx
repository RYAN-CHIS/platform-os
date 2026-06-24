/** /erp/inventory — P13A Full CRUD */
import { prisma } from '@yunwu/db';
import InventoryClient from './client';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = String(sp?.q || '').trim();
  const page = Math.max(1, Number(sp?.page) || 1);
  const pageSize = 50;

  const where: any = {};
  if (q) {
    where.OR = [
      { material: { name: { contains: q, mode: 'insensitive' } } },
      { relatedDoc: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [txns, total, materials] = await Promise.all([
    prisma.erpInventoryTransaction.findMany({
      where, include: { material: { select: { name: true, code: true, inventoryUnit: true } } },
      orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
    }),
    prisma.erpInventoryTransaction.count({ where }),
    prisma.erpMaterial.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, remaining: true, inventoryUnit: true, status: true },
    }),
  ]);

  const csvColumns = [
    { key: 'materialCode', label: '材料编码' }, { key: 'materialName', label: '材料名称' },
    { key: 'type', label: '类型' }, { key: 'quantity', label: '数量' },
    { key: 'beforeQty', label: '变更前' }, { key: 'afterQty', label: '变更后' },
    { key: 'relatedDoc', label: '关联单据' }, { key: 'remark', label: '备注' }, { key: 'createdAt', label: '时间' },
  ];

  const csvData = txns.map(t => ({
    materialCode: t.material?.code || '', materialName: t.material?.name || '',
    type: t.type, quantity: t.quantity, beforeQty: t.beforeQty, afterQty: t.afterQty,
    relatedDoc: t.relatedDoc || '', remark: t.remark || '',
    createdAt: t.createdAt ? new Date(t.createdAt).toISOString().slice(0,19).replace('T',' ') : '',
  }));

  return <InventoryClient initialTxns={JSON.parse(JSON.stringify(txns))} totalCount={total} csvColumns={csvColumns} csvData={csvData} materialOptions={materials} />;
}
