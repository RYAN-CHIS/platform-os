'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActionBar } from '@/components/ActionBar';
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

  const filtered = statusFilter ? data.filter(d => d.status === statusFilter) : data;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '0.1em', color: '#1c1917' }}>生产管理</h1>
        <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 4 }}>
          共 <strong style={{ color: '#78716c' }}>{data.length}</strong> 条生产记录
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <ActionBar module="production" csvColumns={csvColumns} data={csvData}
          searchPlaceholder="搜索 SKU / 备注…" searchParam="q" />
        <button onClick={() => { setEditItem(null); setModalOpen(true); }} style={{
          padding: '8px 16px', background: '#1c1917', color: '#fff', border: 'none',
          borderRadius: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>+ 创建生产单</button>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
          padding: '8px 12px', border: '1px solid #e7e5e4', borderRadius: 6, fontSize: 13, background: '#fff',
        }}>
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="in_progress">进行中</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e7e5e4', borderRadius: 8, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '2px solid #e7e5e4', textAlign: 'left', color: '#78716c', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '10px 14px' }}>SKU</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>数量</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>材料</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>人工</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>包装</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>总成本</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>单位</th>
              <th style={{ padding: '10px 14px' }}>状态</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', width: 280 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r: any) => {
              const sc = statusColors[r.status] || statusColors.draft;
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <p style={{ margin: 0, fontWeight: 500, color: '#1c1917' }}>{r.sku?.name || '—'}</p>
                    <code style={{ fontSize: 10, background: '#f5f5f4', padding: '1px 5px', borderRadius: 3 }}>{r.sku?.code || ''}</code>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 500 }}>{r.quantity}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#78716c' }}>¥{Number(r.materialCost).toFixed(0)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#78716c' }}>¥{Number(r.laborCost).toFixed(0)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#78716c' }}>¥{Number(r.packagingCost).toFixed(0)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 500, color: '#b45309' }}>¥{Number(r.totalCost).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#78716c' }}>¥{Number(r.unitCost).toFixed(2)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>
                      {statusLabels[r.status] || r.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {r.status === 'draft' && (
                      <>
                        <button onClick={() => handleStart(r.id)} style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>开始</button>
                        <button onClick={() => { setEditItem(r); setModalOpen(true); }} style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>编辑</button>
                        <button onClick={() => handleDelete(r.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>删除</button>
                      </>
                    )}
                    {r.status === 'in_progress' && (
                      <>
                        <button onClick={() => handleComplete(r.id)} style={{ background: '#dcfce7', color: '#16a34a', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>完成</button>
                        <button onClick={() => handleCancel(r.id)} style={{ background: '#fef3c7', color: '#d97706', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>取消</button>
                      </>
                    )}
                    {(r.status === 'completed' || r.status === 'cancelled') && (
                      <span style={{ color: '#a8a29e', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ErpCrudModal title={editItem ? '编辑生产单' : '创建生产单'} fields={fields}
          initialData={editItem ? { ...editItem, skuId: String(editItem.skuId) } : undefined}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditItem(null); }} />
      )}
    </div>
  );
}
