'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActionBar } from '@/components/ActionBar';
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

  const filtered = typeFilter ? data.filter(d => d.type === typeFilter) : data;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '0.1em', color: '#1c1917' }}>库存管理</h1>
        <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 4 }}>
          共 <strong style={{ color: '#78716c' }}>{totalCount}</strong> 条流水
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <ActionBar module="inventory" csvColumns={csvColumns} data={csvData}
          searchPlaceholder="搜索材料 / 单据…" searchParam="q" />
        <button onClick={() => setStockView(!stockView)} style={{
          padding: '8px 16px', background: stockView ? '#1c1917' : '#f5f5f4', color: stockView ? '#fff' : '#78716c',
          border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>{stockView ? '流水明细' : '库存概览'}</button>
        <button onClick={() => setModalOpen(true)} style={{
          padding: '8px 16px', background: '#1c1917', color: '#fff', border: 'none',
          borderRadius: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>+ 库存操作</button>
        {!stockView && (
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{
            padding: '8px 12px', border: '1px solid #e7e5e4', borderRadius: 6, fontSize: 13, background: '#fff',
          }}>
            <option value="">全部类型</option>
            <option value="IN">入库</option>
            <option value="OUT">出库</option>
            <option value="ADJUST">调整</option>
          </select>
        )}
      </div>

      {stockView ? (
        /* Stock overview */
        <div style={{ border: '1px solid #e7e5e4', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#fafaf9', borderBottom: '2px solid #e7e5e4', textAlign: 'left', color: '#78716c', fontSize: 11 }}>
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
        /* Transaction list */
        <div style={{ overflowX: 'auto', border: '1px solid #e7e5e4', borderRadius: 8, background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#fafaf9', borderBottom: '2px solid #e7e5e4', textAlign: 'left', color: '#78716c', fontSize: 11, textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>材料</th>
                <th style={{ padding: '10px 14px' }}>类型</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>数量</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>变更前</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>变更后</th>
                <th style={{ padding: '10px 14px' }}>关联单据</th>
                <th style={{ padding: '10px 14px' }}>备注</th>
                <th style={{ padding: '10px 14px' }}>时间</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t: any) => {
                const tc = typeColors[t.type] || { bg: '#f5f5f4', color: '#78716c' };
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <p style={{ margin: 0, fontWeight: 500, color: '#1c1917' }}>{t.material?.name || '—'}</p>
                      <code style={{ fontSize: 10, background: '#f5f5f4', padding: '1px 5px', borderRadius: 3 }}>{t.material?.code || ''}</code>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>{t.type}</span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 500 }}>
                      {t.type === 'OUT' ? <span style={{ color: '#dc2626' }}>-{t.quantity}</span> : <span style={{ color: '#16a34a' }}>+{t.quantity}</span>}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#78716c' }}>{t.beforeQty}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 500, color: '#1c1917' }}>{t.afterQty}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#78716c' }}>{t.relatedDoc || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#a8a29e', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.remark || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: '#a8a29e' }}>{t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 16).replace('T', ' ') : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <ErpCrudModal title="库存操作" fields={fields}
          onSave={handleSave}
          onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
