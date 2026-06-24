'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ErpToolbar from '@/components/ErpToolbar';
import ErpDataTable, { type Column } from '@/components/ErpDataTable';
import ErpCrudModal from '@/components/ErpCrudModal';
import { createPurchase, updatePurchase, cancelPurchase, confirmReceive, deletePurchase } from '@/modules/erp/purchase/actions';

type Row = Record<string, any>;

export default function PurchaseClient({
  initialData, csvColumns, csvData, materialOptions,
}: { initialData: Row[]; csvColumns: any[]; csvData: any[]; materialOptions: Array<{id:number;code:string;name:string;inventoryUnit:string;supplier:string}> }) {
  const [data, setData] = useState(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Row | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => { setData(initialData); }, [initialData]);

  const statusColors: Record<string, { bg: string; color: string }> = {
    draft: { bg: '#fef3c7', color: '#d97706' },
    ordered: { bg: '#dbeafe', color: '#1d4ed8' },
    received: { bg: '#dcfce7', color: '#16a34a' },
    cancelled: { bg: '#f5f5f4', color: '#78716c' },
  };

  const fields = [
    { key: 'materialId', label: '材料', type: 'select' as const, required: true,
      options: materialOptions.map(m => ({ value: String(m.id), label: `${m.code} - ${m.name} (${m.inventoryUnit})` })) },
    { key: 'purchaseDate', label: '采购日期', placeholder: 'YYYY-MM-DD' },
    { key: 'supplier', label: '供应商' },
    { key: 'purchaseUnit', label: '采购单位', placeholder: '个/批' },
    { key: 'conversionRate', label: '换算率', type: 'number' as const, placeholder: '采购单位→库存单位换算率' },
    { key: 'purchaseQuantity', label: '采购数量', type: 'number' as const, required: true, placeholder: '0' },
    { key: 'purchaseUnitPrice', label: '单价', type: 'number' as const, placeholder: '0' },
    { key: 'remark', label: '备注', type: 'textarea' as const },
  ];

  const handleSave = useCallback(async (formData: Record<string, any>) => {
    if (editItem) {
      await updatePurchase(editItem.id, formData);
    } else {
      await createPurchase({
        materialId: Number(formData.materialId),
        purchaseDate: formData.purchaseDate || undefined,
        supplier: formData.supplier || undefined,
        purchaseUnit: formData.purchaseUnit || undefined,
        conversionRate: formData.conversionRate || undefined,
        purchaseQuantity: Number(formData.purchaseQuantity),
        purchaseUnitPrice: Number(formData.purchaseUnitPrice || 0),
        remark: formData.remark || undefined,
      });
    }
    setModalOpen(false); setEditItem(null);
    window.location.reload();
  }, [editItem]);

  const handleReceive = useCallback(async (id: number) => {
    if (!confirm('确认入库？库存将自动增加，入库后不可修改。')) return;
    try {
      const result = await confirmReceive(id);
      alert(`入库成功！库存: ${result.beforeQty} → ${result.afterQty}`);
      window.location.reload();
    } catch (e: any) { alert(e.message); }
  }, []);

  const handleCancel = useCallback(async (id: number) => {
    if (!confirm('确认取消此采购单？')) return;
    await cancelPurchase(id);
    window.location.reload();
  }, []);

  const handleDelete = useCallback(async (id: number, status: string) => {
    if (status === 'received') { alert('已入库的采购单不可删除'); return; }
    if (!confirm('确认删除？')) return;
    await deletePurchase(id);
    setData(prev => prev.filter(d => d.id !== id));
  }, []);

  const handleSearch = (q: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (q) params.set('q', q);
    else params.delete('q');
    params.delete('page');
    router.replace(`?${params.toString()}`);
  };

  const handleRefresh = () => { router.refresh(); };

  const handleExport = () => {
    const header = csvColumns.map((c: any) => `"${c.label}"`).join(',');
    const body = csvData.map((row: any) =>
      csvColumns.map((c: any) => {
        const v = row[c.key];
        if (v === null || v === undefined) return '';
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');
    const csv = '\uFEFF' + header + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'erp-purchase.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusFilterOptions = [
    { label: '全部', value: '' },
    { label: '草稿', value: 'draft' },
    { label: '已下单', value: 'ordered' },
    { label: '已入库', value: 'received' },
    { label: '已取消', value: 'cancelled' },
  ];

  const filtered = statusFilter ? data.filter(d => d.status === statusFilter) : data;

  const columns: Column[] = [
    { key: 'material', label: '材料', render: (v: any, row: any) => <span style={{ fontWeight: 500, color: '#1c1917' }}>{row.material?.name || '—'}</span> },
    { key: 'supplier', label: '供应商', sortable: true, render: (v: any) => v || '—' },
    { key: 'purchaseQuantity', label: '数量', width: '100px', render: (v: any, row: any) => <span>{v} <span style={{ color: '#a8a29e' }}>{row.purchaseUnit}</span></span> },
    { key: 'purchaseUnitPrice', label: '单价', width: '80px', render: (v: any) => v ? `¥${Number(v).toFixed(2)}` : '—' },
    { key: 'purchasePrice', label: '总价', sortable: true, width: '80px', render: (v: any) => <span style={{ fontWeight: 500, color: '#b45309' }}>¥{Number(v).toFixed(2)}</span> },
    { key: 'status', label: '状态', width: '80px', render: (v: any) => {
      const sc = statusColors[v] || statusColors.ordered;
      return <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{v}</span>;
    } },
    { key: 'purchaseDate', label: '日期', sortable: true, width: '100px', render: (v: any) => v ? new Date(v).toISOString().slice(0, 10) : '—' },
    { key: 'actions', label: '操作', width: '220px', render: (v: any, row: any) => (
      <div style={{ textAlign: 'center' }}>
        {row.status !== 'received' && row.status !== 'cancelled' && (
          <button onClick={() => handleReceive(row.id)} style={{
            background: '#dcfce7', color: '#16a34a', border: 'none', padding: '3px 10px',
            borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4,
          }}>入库</button>
        )}
        {row.status === 'draft' && (
          <button onClick={() => { setEditItem(row); setModalOpen(true); }} style={{
            background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '3px 10px',
            borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4,
          }}>编辑</button>
        )}
        {row.status !== 'received' && row.status !== 'cancelled' && (
          <button onClick={() => handleCancel(row.id)} style={{
            background: '#fef3c7', color: '#d97706', border: 'none', padding: '3px 10px',
            borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4,
          }}>取消</button>
        )}
        {row.status !== 'received' && (
          <button onClick={() => handleDelete(row.id, row.status)} style={{
            background: '#fef2f2', color: '#dc2626', border: 'none', padding: '3px 10px',
            borderRadius: 4, cursor: 'pointer', fontSize: 12,
          }}>删除</button>
        )}
      </div>
    ) },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <ErpToolbar
        title="采购管理"
        total={data.length}
        entityLabel="条采购记录"
        searchPlaceholder="搜索供应商 / 材料名…"
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onAdd={() => { setEditItem(null); setModalOpen(true); }}
        filterOptions={statusFilterOptions}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      <ErpDataTable
        columns={columns}
        rows={filtered}
        emptyText="暂无采购记录"
      />

      {modalOpen && (
        <ErpCrudModal title={editItem ? '编辑采购单' : '新增采购单'} fields={fields}
          initialData={editItem ? {
            ...editItem,
            materialId: String(editItem.materialId),
            purchaseDate: editItem.purchaseDate ? new Date(editItem.purchaseDate).toISOString().slice(0, 10) : '',
          } : undefined}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditItem(null); }} />
      )}
    </div>
  );
}
