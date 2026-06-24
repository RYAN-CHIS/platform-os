'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActionBar } from '@/components/ActionBar';
import ErpCrudModal from '@/components/ErpCrudModal';
import { createBom, updateBom, deleteBom } from '@/modules/erp/bom/actions';

type Row = Record<string, any>;

export default function BomClient({
  initialData, csvColumns, csvData, skuOptions, materialOptions,
}: { initialData: Row[]; csvColumns: any[]; csvData: any[]; skuOptions: Array<{id:number;code:string;name:string}>; materialOptions: Array<{id:number;code:string;name:string;inventoryUnit:string;unitCost:number}> }) {
  const [data, setData] = useState(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Row | null>(null);

  useEffect(() => { setData(initialData); }, [initialData]);

  const fields = [
    { key: 'skuId', label: 'SKU', type: 'select' as const, required: true,
      options: skuOptions.map(s => ({ value: String(s.id), label: `${s.code} - ${s.name}` })) },
    { key: 'materialId', label: '材料', type: 'select' as const, required: true,
      options: materialOptions.map(m => ({ value: String(m.id), label: `${m.code} - ${m.name} (${m.inventoryUnit})` })) },
    { key: 'quantity', label: '用量', type: 'number' as const, required: true, placeholder: '每单位产品用量' },
  ];

  const handleSave = useCallback(async (formData: Record<string, any>) => {
    if (editItem) {
      await updateBom(editItem.id, { quantity: Number(formData.quantity) });
    } else {
      await createBom({
        skuId: Number(formData.skuId),
        materialId: Number(formData.materialId),
        quantity: Number(formData.quantity),
      });
    }
    setModalOpen(false); setEditItem(null);
    window.location.reload();
  }, [editItem]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('确认删除此 BOM 条目？成本将自动重算。')) return;
    await deleteBom(id);
    setData(prev => prev.filter(d => d.id !== id));
  }, []);

  // Group by SKU
  const grouped: Record<string, Row[]> = {};
  data.forEach(b => {
    const key = b.sku?.code || String(b.skuId);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(b);
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '0.1em', color: '#1c1917' }}>BOM 物料清单</h1>
        <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 4 }}>
          共 <strong style={{ color: '#78716c' }}>{data.length}</strong> 条 BOM
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <ActionBar module="bom" csvColumns={csvColumns} data={csvData}
          searchPlaceholder="搜索材料 / SKU编码…" searchParam="q" />
        <button onClick={() => { setEditItem(null); setModalOpen(true); }} style={{
          padding: '8px 16px', background: '#1c1917', color: '#fff', border: 'none',
          borderRadius: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>+ 新增 BOM</button>
      </div>

      {Object.entries(grouped).map(([skuKey, items]) => {
        const totalCost = items.reduce((s, b) => s + Number(b.lineCost || 0), 0);
        return (
          <div key={skuKey} style={{ marginBottom: 20, border: '1px solid #e7e5e4', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
            <div style={{ background: '#fafaf9', padding: '10px 14px', borderBottom: '1px solid #e7e5e4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 500, color: '#1c1917' }}>{skuKey}</span>
                <span style={{ color: '#a8a29e', marginLeft: 8, fontSize: 12 }}>{items[0]?.sku?.name || ''}</span>
              </div>
              <span style={{ fontSize: 12, color: '#b45309', fontWeight: 500 }}>合计成本: ¥{totalCost.toFixed(2)}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e7e5e4', textAlign: 'left', color: '#78716c', fontSize: 11 }}>
                  <th style={{ padding: '8px 14px' }}>材料</th>
                  <th style={{ padding: '8px 14px' }}>规格</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right' }}>用量</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right' }}>单价</th>
                  <th style={{ padding: '8px 14px', textAlign: 'right' }}>行成本</th>
                  <th style={{ padding: '8px 14px', textAlign: 'center', width: 120 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b: any) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                    <td style={{ padding: '8px 14px' }}>
                      <p style={{ margin: 0, fontWeight: 500, color: '#1c1917' }}>{b.materialNameSnapshot}</p>
                      <code style={{ fontSize: 10, background: '#f5f5f4', padding: '1px 5px', borderRadius: 3 }}>{b.materialCodeSnapshot}</code>
                    </td>
                    <td style={{ padding: '8px 14px', color: '#a8a29e', fontSize: 12 }}>{b.material?.specification || '—'}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right' }}>{b.quantity} <span style={{ color: '#a8a29e' }}>{b.material?.inventoryUnit || ''}</span></td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', color: '#78716c' }}>{b.unitPrice ? `¥${Number(b.unitPrice).toFixed(2)}` : '—'}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 500, color: '#b45309' }}>{b.lineCost ? `¥${Number(b.lineCost).toFixed(2)}` : '—'}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                      <button onClick={() => { setEditItem(b); setModalOpen(true); }} style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 6 }}>编辑</button>
                      <button onClick={() => handleDelete(b.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {modalOpen && (
        <ErpCrudModal
          title={editItem ? '编辑 BOM' : '新增 BOM'}
          fields={editItem ? [{ key: 'quantity', label: '用量', type: 'number' as const, required: true }] : fields}
          initialData={editItem || undefined}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}
