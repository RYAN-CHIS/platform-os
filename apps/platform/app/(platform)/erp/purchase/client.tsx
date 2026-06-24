'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActionBar } from '@/components/ActionBar';
import ErpCrudModal from '@/components/ErpCrudModal';
import { createPurchase, updatePurchase, cancelPurchase, confirmReceive, deletePurchase, getMaterialsForSelect } from '@/modules/erp/purchase/actions';

type Row = Record<string, any>;

export default function PurchaseClient({
  initialData, csvColumns, csvData, materialOptions,
}: { initialData: Row[]; csvColumns: any[]; csvData: any[]; materialOptions: Array<{id:number;code:string;name:string;inventoryUnit:string;supplier:string}> }) {
  const [data, setData] = useState(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Row | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

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

  const filtered = statusFilter ? data.filter(d => d.status === statusFilter) : data;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '0.1em', color: '#1c1917' }}>采购管理</h1>
        <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 4 }}>
          共 <strong style={{ color: '#78716c' }}>{data.length}</strong> 条采购记录
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <ActionBar module="purchase" csvColumns={csvColumns} data={csvData}
          searchPlaceholder="搜索供应商 / 材料名…" searchParam="q" />
        <button onClick={() => { setEditItem(null); setModalOpen(true); }} style={{
          padding: '8px 16px', background: '#1c1917', color: '#fff', border: 'none',
          borderRadius: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>+ 新增采购</button>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
          padding: '8px 12px', border: '1px solid #e7e5e4', borderRadius: 6, fontSize: 13, background: '#fff',
        }}>
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="ordered">已下单</option>
          <option value="received">已入库</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e7e5e4', borderRadius: 8, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '2px solid #e7e5e4', textAlign: 'left', color: '#78716c', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '10px 14px' }}>材料</th>
              <th style={{ padding: '10px 14px' }}>供应商</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>数量</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>单价</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>总价</th>
              <th style={{ padding: '10px 14px' }}>状态</th>
              <th style={{ padding: '10px 14px' }}>日期</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', width: 260 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r: any) => {
              const sc = statusColors[r.status] || statusColors.ordered;
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1c1917' }}>{r.material?.name || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#78716c' }}>{r.supplier || '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>{r.purchaseQuantity} <span style={{ color: '#a8a29e' }}>{r.purchaseUnit}</span></td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#78716c' }}>{r.purchaseUnitPrice ? `¥${Number(r.purchaseUnitPrice).toFixed(2)}` : '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 500, color: '#b45309' }}>¥{Number(r.purchasePrice).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{r.status}</span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#a8a29e' }}>{r.purchaseDate ? new Date(r.purchaseDate).toISOString().slice(0, 10) : '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {r.status !== 'received' && r.status !== 'cancelled' && (
                      <button onClick={() => handleReceive(r.id)} style={{
                        background: '#dcfce7', color: '#16a34a', border: 'none', padding: '3px 10px',
                        borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4,
                      }}>入库</button>
                    )}
                    {r.status === 'draft' && (
                      <button onClick={() => { setEditItem(r); setModalOpen(true); }} style={{
                        background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '3px 10px',
                        borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4,
                      }}>编辑</button>
                    )}
                    {r.status !== 'received' && r.status !== 'cancelled' && (
                      <button onClick={() => handleCancel(r.id)} style={{
                        background: '#fef3c7', color: '#d97706', border: 'none', padding: '3px 10px',
                        borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4,
                      }}>取消</button>
                    )}
                    {r.status !== 'received' && (
                      <button onClick={() => handleDelete(r.id, r.status)} style={{
                        background: '#fef2f2', color: '#dc2626', border: 'none', padding: '3px 10px',
                        borderRadius: 4, cursor: 'pointer', fontSize: 12,
                      }}>删除</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
