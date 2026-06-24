'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActionBar } from '@/components/ActionBar';
import { updateCostLabor, updateCostPackaging, recalcAllCosts, getCostSummary } from '@/modules/erp/costs/actions';

type Row = Record<string, any>;

export default function CostsClient({
  initialData, csvColumns, csvData,
}: { initialData: Row[]; csvColumns: any[]; csvData: any[] }) {
  const [data, setData] = useState(initialData);
  const [summary, setSummary] = useState<{ totalMaterial: number; totalLabor: number; totalPackaging: number; totalCost: number; totalRevenue: number; margin: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => { setData(initialData); }, [initialData]);

  useEffect(() => {
    getCostSummary().then(setSummary).catch(() => {});
  }, []);

  function margin(cost: number, price: number | null | undefined): string {
    if (!price || price <= 0 || cost <= 0) return '—';
    return `${(((price - cost) / price) * 100).toFixed(1)}%`;
  }

  const handleInlineEdit = useCallback(async (id: number, field: string, value: number) => {
    if (field === 'laborCost') await updateCostLabor(id, value);
    else if (field === 'packagingCost') await updateCostPackaging(id, value);
    setData(prev => prev.map(d => {
      if (d.skuId === id) {
        const updated = { ...d };
        if (field === 'laborCost') { updated.laborCost = value; updated.totalCost = Number(updated.materialCost) + value + Number(updated.packagingCost); }
        if (field === 'packagingCost') { updated.packagingCost = value; updated.totalCost = Number(updated.materialCost) + Number(updated.laborCost) + value; }
        return updated;
      }
      return d;
    }));
    setEditingCell(null);
  }, []);

  const handleRecalc = useCallback(async () => {
    if (!confirm('重新计算所有 SKU 的材料成本（根据 BOM），确认？')) return;
    await recalcAllCosts();
    window.location.reload();
  }, []);

  const totalCostSum = data.reduce((s, c) => s + Number(c.totalCost), 0);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '0.1em', color: '#1c1917' }}>成本核算</h1>
        <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 4 }}>
          共 <strong style={{ color: '#78716c' }}>{data.length}</strong> 条成本
          · 总成本 <strong style={{ color: '#b45309' }}>¥{totalCostSum.toFixed(0)}</strong>
        </p>
      </div>

      {summary && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '12px 20px', flex: 1, minWidth: 140 }}>
            <p style={{ fontSize: 11, color: '#16a34a', margin: 0 }}>材料总成本</p>
            <p style={{ fontSize: 20, fontWeight: 600, color: '#16a34a', margin: '4px 0 0' }}>¥{summary.totalMaterial.toFixed(0)}</p>
          </div>
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 20px', flex: 1, minWidth: 140 }}>
            <p style={{ fontSize: 11, color: '#1d4ed8', margin: 0 }}>人工总成本</p>
            <p style={{ fontSize: 20, fontWeight: 600, color: '#1d4ed8', margin: '4px 0 0' }}>¥{summary.totalLabor.toFixed(0)}</p>
          </div>
          <div style={{ background: '#fef3c7', borderRadius: 8, padding: '12px 20px', flex: 1, minWidth: 140 }}>
            <p style={{ fontSize: 11, color: '#d97706', margin: 0 }}>包装总成本</p>
            <p style={{ fontSize: 20, fontWeight: 600, color: '#d97706', margin: '4px 0 0' }}>¥{summary.totalPackaging.toFixed(0)}</p>
          </div>
          <div style={{ background: '#ede9fe', borderRadius: 8, padding: '12px 20px', flex: 1, minWidth: 140 }}>
            <p style={{ fontSize: 11, color: '#7c3aed', margin: 0 }}>预计总收入</p>
            <p style={{ fontSize: 20, fontWeight: 600, color: '#7c3aed', margin: '4px 0 0' }}>¥{summary.totalRevenue.toFixed(0)}</p>
          </div>
          <div style={{ background: '#fdf2f8', borderRadius: 8, padding: '12px 20px', flex: 1, minWidth: 140 }}>
            <p style={{ fontSize: 11, color: '#db2777', margin: 0 }}>毛利率</p>
            <p style={{ fontSize: 20, fontWeight: 600, color: '#db2777', margin: '4px 0 0' }}>{summary.margin}%</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <ActionBar module="costs" csvColumns={csvColumns} data={csvData}
          searchPlaceholder="搜索 SKU / 产品名…" searchParam="q" />
        <button onClick={handleRecalc} style={{
          padding: '8px 16px', background: '#1c1917', color: '#fff', border: 'none',
          borderRadius: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>🔄 重算成本</button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e7e5e4', borderRadius: 8, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '2px solid #e7e5e4', textAlign: 'left', color: '#78716c', fontSize: 11, textTransform: 'uppercase' }}>
              <th style={{ padding: '10px 14px' }}>SKU</th>
              <th style={{ padding: '10px 14px' }}>产品</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>材料</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>人工</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>包装</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>总成本</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>售价</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>利润率</th>
              <th style={{ padding: '10px 14px' }}>更新</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c: any) => {
              const m = margin(c.totalCost, c.sku?.salePrice || c.sku?.price);
              const marginNum = m !== '—' ? parseFloat(m) : null;
              const marginColor = marginNum === null ? '#a8a29e' : marginNum >= 50 ? '#16a34a' : marginNum >= 30 ? '#d97706' : '#dc2626';
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <p style={{ margin: 0, fontWeight: 500, color: '#1c1917', fontSize: 12 }}>{c.sku?.name || '—'}</p>
                    <code style={{ fontSize: 10, background: '#f5f5f4', padding: '1px 5px', borderRadius: 3 }}>{c.sku?.code || ''}</code>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#78716c', fontSize: 12 }}>{c.sku?.product?.name || '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#78716c' }}>¥{Number(c.materialCost).toFixed(0)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#78716c', cursor: 'pointer' }}
                    onClick={() => { setEditingCell({ id: c.skuId, field: 'laborCost' }); setEditValue(String(c.laborCost)); }}>
                    {editingCell && editingCell.id === c.skuId && editingCell.field === 'laborCost' ? (
                      <input
                        type="number" value={editValue} autoFocus
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => handleInlineEdit(c.skuId, 'laborCost', Number(editValue))}
                        onKeyDown={e => { if (e.key === 'Enter') handleInlineEdit(c.skuId, 'laborCost', Number(editValue)); }}
                        style={{ width: 60, padding: '2px 6px', border: '1px solid #1d4ed8', borderRadius: 3, fontSize: 12, textAlign: 'right' }}
                      />
                    ) : `¥${Number(c.laborCost).toFixed(0)}`}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#78716c', cursor: 'pointer' }}
                    onClick={() => { setEditingCell({ id: c.skuId, field: 'packagingCost' }); setEditValue(String(c.packagingCost)); }}>
                    {editingCell && editingCell.id === c.skuId && editingCell.field === 'packagingCost' ? (
                      <input
                        type="number" value={editValue} autoFocus
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => handleInlineEdit(c.skuId, 'packagingCost', Number(editValue))}
                        onKeyDown={e => { if (e.key === 'Enter') handleInlineEdit(c.skuId, 'packagingCost', Number(editValue)); }}
                        style={{ width: 60, padding: '2px 6px', border: '1px solid #1d4ed8', borderRadius: 3, fontSize: 12, textAlign: 'right' }}
                      />
                    ) : `¥${Number(c.packagingCost).toFixed(0)}`}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#b45309' }}>¥{Number(c.totalCost).toFixed(0)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#78716c' }}>
                    {(c.sku?.salePrice || c.sku?.price) ? `¥${Number(c.sku?.salePrice || c.sku?.price).toFixed(0)}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 500, color: marginColor }}>{m}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#a8a29e' }}>
                    {c.updatedAt ? new Date(c.updatedAt).toISOString().slice(0, 10) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
