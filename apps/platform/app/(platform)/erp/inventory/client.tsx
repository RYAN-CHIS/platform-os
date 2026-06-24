'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ErpToolbar from '@/components/ErpToolbar';
import ErpDataTable, { type Column } from '@/components/ErpDataTable';
import ErpCrudModal from '@/components/ErpCrudModal';
import { createInventoryTransaction } from '@/modules/erp/inventory/actions';

type Row = Record<string, any>;

export default function InventoryClient({
  initialTxns, totalCount, csvColumns, csvData, materialOptions,
}: { initialTxns: Row[]; totalCount: number; csvColumns: any[]; csvData: any[]; materialOptions: Array<{id:number;code:string;name:string;remaining:number;inventoryUnit:string}> }) {
  const [data, setData] = useState(initialTxns);
  const [modalOpen, setModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [stockView, setStockView] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => { setData(initialTxns); }, [initialTxns]);

  const typeColors: Record<string, { bg: string; color: string }> = {
    IN: { bg: '#dcfce7', color: '#16a34a' },
    OUT: { bg: '#fef2f2', color: '#dc2626' },
    ADJUST: { bg: '#fef3c7', color: '#d97706' },
  };

  const fields = [
    { key: 'materialId', label: '材料', type: 'select' as const, required: true,
      options: materialOptions.map(m => ({ value: String(m.id), label: `${m.code} - ${m.name} (库存:${m.remaining}${m.inventoryUnit})` })) },
    { key: 'type', label: '类型', type: 'select' as const, required: true,
      options: [{ value: 'IN', label: '入库 (+)' }, { value: 'OUT', label: '出库 (-)' }, { value: 'ADJUST', label: '盘点调整' }] },
    { key: 'quantity', label: '数量', type: 'number' as const, required: true, placeholder: 'ADJUST模式输入目标库存值' },
    { key: 'relatedDoc', label: '关联单据', placeholder: '如 PR-001' },
    { key: 'remark', label: '备注', type: 'textarea' as const },
  ];

  const handleSave = useCallback(async (formData: Record<string, any>) => {
    await createInventoryTransaction({
      materialId: Number(formData.materialId),
      type: formData.type,
      quantity: Number(formData.quantity),
      relatedDoc: formData.relatedDoc,
      remark: formData.remark,
    });
    setModalOpen(false);
    window.location.reload();
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
    a.href = url; a.download = 'erp-inventory.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeFilterOptions = [
    { label: '全部', value: '' },
    { label: '入库', value: 'IN' },
    { label: '出库', value: 'OUT' },
    { label: '调整', value: 'ADJUST' },
  ];

  const filtered = typeFilter ? data.filter(d => d.type === typeFilter) : data;

  const txnColumns: Column[] = [
    { key: 'material', label: '材料', render: (v: any, row: any) => (
      <div>
        <p style={{ margin: 0, fontWeight: 500, color: '#1c1917' }}>{row.material?.name || '—'}</p>
        <code style={{ fontSize: 10, background: '#f5f5f4', padding: '1px 5px', borderRadius: 3 }}>{row.material?.code || ''}</code>
      </div>
    ) },
    { key: 'type', label: '类型', width: '80px', render: (v: any) => {
      const tc = typeColors[v] || { bg: '#f5f5f4', color: '#78716c' };
      return <span style={{ background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>{v}</span>;
    } },
    { key: 'quantity', label: '数量', width: '80px', render: (v: any, row: any) => (
      <span style={{ fontWeight: 500 }}>
        {row.type === 'OUT' ? <span style={{ color: '#dc2626' }}>-{row.quantity}</span> : <span style={{ color: '#16a34a' }}>+{row.quantity}</span>}
      </span>
    ) },
    { key: 'beforeQty', label: '变更前', width: '80px', render: (v: any) => <span style={{ color: '#78716c' }}>{v}</span> },
    { key: 'afterQty', label: '变更后', width: '80px', render: (v: any) => <span style={{ fontWeight: 500, color: '#1c1917' }}>{v}</span> },
    { key: 'relatedDoc', label: '关联单据', width: '100px', render: (v: any) => v || '—' },
    { key: 'createdAt', label: '时间', sortable: true, width: '140px', render: (v: any) => v ? new Date(v).toISOString().slice(0, 16).replace('T', ' ') : '—' },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <ErpToolbar
        title="库存管理"
        total={stockView ? materialOptions.length : totalCount}
        entityLabel={stockView ? "种材料" : "条流水"}
        searchPlaceholder="搜索材料 / 单据…"
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onAdd={() => setModalOpen(true)}
        filterOptions={!stockView ? typeFilterOptions : undefined}
        activeFilter={typeFilter}
        onFilterChange={setTypeFilter}
        extraButtons={
          <button onClick={() => setStockView(!stockView)} style={{
            padding: '6px 12px',
            background: stockView ? '#292524' : '#fff',
            color: stockView ? '#fff' : '#57534e',
            border: '1px solid #e7e5e4',
            borderRadius: 6, fontSize: 13, cursor: 'pointer',
          }}>{stockView ? '流水明细' : '库存概览'}</button>
        }
      />

      {stockView ? (
        /* Stock overview */
        <div style={{ border: '1px solid #e7e5e4', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#fafaf9', borderBottom: '2px solid #e7e5e4', textAlign: 'left', color: '#57534e', fontSize: 12 }}>
                <th style={{ padding: '10px 14px' }}>编码</th>
                <th style={{ padding: '10px 14px' }}>名称</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>库存</th>
                <th style={{ padding: '10px 14px' }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {materialOptions.map(m => {
                const isLow = m.remaining <= 10;
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                    <td style={{ padding: '10px 14px' }}><code style={{ fontSize: 11, background: '#f5f5f4', padding: '2px 6px', borderRadius: 4 }}>{m.code}</code></td>
                    <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1c1917' }}>{m.name}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 500, color: isLow ? '#dc2626' : '#16a34a' }}>
                      {m.remaining} <span style={{ color: '#a8a29e' }}>{m.inventoryUnit}</span>
                      {isLow && <span style={{ marginLeft: 8, background: '#fef2f2', color: '#dc2626', padding: '1px 6px', borderRadius: 3, fontSize: 10 }}>低库存</span>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#a8a29e' }}>{'—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <ErpDataTable
          columns={txnColumns}
          rows={filtered}
          emptyText="暂无库存流水"
        />
      )}

      {modalOpen && (
        <ErpCrudModal title="库存操作" fields={fields}
          onSave={handleSave}
          onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
