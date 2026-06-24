'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ErpToolbar from '@/components/ErpToolbar';
import ErpDataTable, { type Column } from '@/components/ErpDataTable';
import ErpCrudModal from '@/components/ErpCrudModal';
import {
  createProduction, startProduction, completeProduction,
  cancelProduction, updateProduction, deleteProduction,
} from '@/modules/erp/production/actions';

type Row = Record<string, any>;

export default function ProductionClient({
  initialData, csvColumns, csvData, skuOptions,
}: { initialData: Row[]; csvColumns: any[]; csvData: any[]; skuOptions: Array<{id:number;code:string;name:string;finishedStock:number}> }) {
  const [data, setData] = useState(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Row | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => { setData(initialData); }, [initialData]);

  const statusColors: Record<string, { bg: string; color: string }> = {
    draft: { bg: '#fef3c7', color: '#d97706' },
    in_progress: { bg: '#dbeafe', color: '#1d4ed8' },
    completed: { bg: '#dcfce7', color: '#16a34a' },
    cancelled: { bg: '#f5f5f4', color: '#78716c' },
  };

  const statusLabels: Record<string, string> = {
    draft: '草稿', in_progress: '进行中', completed: '已完成', cancelled: '已取消',
  };

  const fields = [
    { key: 'skuId', label: 'SKU', type: 'select' as const, required: true,
      options: skuOptions.map(s => ({ value: String(s.id), label: `${s.code} - ${s.name} (成品库存:${s.finishedStock})` })) },
    { key: 'quantity', label: '生产数量', type: 'number' as const, required: true, placeholder: '0' },
    { key: 'laborCost', label: '人工成本', type: 'number' as const, placeholder: '0' },
    { key: 'packagingCost', label: '包装成本', type: 'number' as const, placeholder: '0' },
    { key: 'remark', label: '备注', type: 'textarea' as const },
  ];

  const handleSave = useCallback(async (formData: Record<string, any>) => {
    if (editItem) {
      await updateProduction(editItem.id, {
        quantity: Number(formData.quantity),
        laborCost: Number(formData.laborCost || 0),
        packagingCost: Number(formData.packagingCost || 0),
        remark: formData.remark,
      });
    } else {
      await createProduction({
        skuId: Number(formData.skuId),
        quantity: Number(formData.quantity),
        laborCost: Number(formData.laborCost || 0),
        packagingCost: Number(formData.packagingCost || 0),
        remark: formData.remark,
      });
    }
    setModalOpen(false); setEditItem(null);
    window.location.reload();
  }, [editItem]);

  const handleStart = useCallback(async (id: number) => {
    const confirmed = confirm('开始生产将自动扣减 BOM 材料库存，确认继续？');
    if (!confirmed) return;
    try {
      const result = await startProduction(id);
      const dedupStr = result.deductions.map((d: any) => `${d.materialName} -${d.qty}`).join(', ');
      alert(`生产已启动！材料扣减: ${dedupStr}`);
      window.location.reload();
    } catch (e: any) { alert(e.message); }
  }, []);

  const handleComplete = useCallback(async (id: number) => {
    if (!confirm('确认完成？将增加成品库存并写入成本。')) return;
    try {
      const result = await completeProduction(id);
      alert(`生产完成！成品库存: ${result.beforeStock} → ${result.afterStock}`);
      window.location.reload();
    } catch (e: any) { alert(e.message); }
  }, []);

  const handleCancel = useCallback(async (id: number) => {
    const msg = '确认取消？进行中的生产将退还材料库存。';
    if (!confirm(msg)) return;
    try {
      await cancelProduction(id);
      window.location.reload();
    } catch (e: any) { alert(e.message); }
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('确认删除此生产单（仅限草稿状态）？')) return;
    try {
      await deleteProduction(id);
      setData(prev => prev.filter(d => d.id !== id));
    } catch (e: any) { alert(e.message); }
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
    a.href = url; a.download = 'erp-production.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusFilterOptions = [
    { label: '全部', value: '' },
    { label: '草稿', value: 'draft' },
    { label: '进行中', value: 'in_progress' },
    { label: '已完成', value: 'completed' },
    { label: '已取消', value: 'cancelled' },
  ];

  const filtered = statusFilter ? data.filter(d => d.status === statusFilter) : data;

  const columns: Column[] = [
    { key: 'sku', label: 'SKU', render: (v: any, row: any) => (
      <div>
        <p style={{ margin: 0, fontWeight: 500, color: '#1c1917' }}>{row.sku?.name || '—'}</p>
        <code style={{ fontSize: 10, background: '#f5f5f4', padding: '1px 5px', borderRadius: 3 }}>{row.sku?.code || ''}</code>
      </div>
    ) },
    { key: 'quantity', label: '数量', sortable: true, width: '80px', render: (v: any) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { key: 'materialCost', label: '材料', width: '80px', render: (v: any) => <span style={{ color: '#78716c' }}>¥{Number(v).toFixed(0)}</span> },
    { key: 'laborCost', label: '人工', width: '80px', render: (v: any) => <span style={{ color: '#78716c' }}>¥{Number(v).toFixed(0)}</span> },
    { key: 'packagingCost', label: '包装', width: '80px', render: (v: any) => <span style={{ color: '#78716c' }}>¥{Number(v).toFixed(0)}</span> },
    { key: 'totalCost', label: '总成本', sortable: true, width: '80px', render: (v: any) => <span style={{ fontWeight: 500, color: '#b45309' }}>¥{Number(v).toFixed(2)}</span> },
    { key: 'status', label: '状态', width: '90px', render: (v: any) => {
      const sc = statusColors[v] || statusColors.draft;
      return <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{statusLabels[v] || v}</span>;
    } },
    { key: 'actions', label: '操作', width: '240px', render: (v: any, row: any) => (
      <div style={{ textAlign: 'center' }}>
        {row.status === 'draft' && (
          <>
            <button onClick={() => handleStart(row.id)} style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>开始</button>
            <button onClick={() => { setEditItem(row); setModalOpen(true); }} style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>编辑</button>
            <button onClick={() => handleDelete(row.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>删除</button>
          </>
        )}
        {row.status === 'in_progress' && (
          <>
            <button onClick={() => handleComplete(row.id)} style={{ background: '#dcfce7', color: '#16a34a', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>完成</button>
            <button onClick={() => handleCancel(row.id)} style={{ background: '#fef3c7', color: '#d97706', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>取消</button>
          </>
        )}
        {(row.status === 'completed' || row.status === 'cancelled') && (
          <span style={{ color: '#a8a29e', fontSize: 12 }}>—</span>
        )}
      </div>
    ) },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <ErpToolbar
        title="生产管理"
        total={data.length}
        entityLabel="条生产记录"
        searchPlaceholder="搜索 SKU / 备注…"
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
        emptyText="暂无生产记录"
      />

      {modalOpen && (
        <ErpCrudModal title={editItem ? '编辑生产单' : '创建生产单'} fields={fields}
          initialData={editItem ? { ...editItem, skuId: String(editItem.skuId) } : undefined}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditItem(null); }} />
      )}
    </div>
  );
}
