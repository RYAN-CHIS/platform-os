'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActionBar } from '@/components/ActionBar';
import ErpCrudModal from '@/components/ErpCrudModal';
import {
  createOrder, updateOrder, shipOrder, completeOrder, cancelOrder, deleteOrder,
} from '@/modules/erp/orders/actions';

type Row = Record<string, any>;

export default function OrdersClient({
  initialData, csvColumns, csvData, customerOptions,
}: { initialData: Row[]; csvColumns: any[]; csvData: any[]; customerOptions: Array<{id:number;code:string;name:string;phone:string}> }) {
  const [data, setData] = useState(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Row | null>(null);

  useEffect(() => { setData(initialData); }, [initialData]);

  const statusColors: Record<string, { bg: string; color: string }> = {
    PENDING: { bg: '#fef3c7', color: '#d97706' },
    CONFIRMED: { bg: '#dbeafe', color: '#1d4ed8' },
    PROCESSING: { bg: '#ede9fe', color: '#7c3aed' },
    SHIPPED: { bg: '#dcfce7', color: '#16a34a' },
    COMPLETED: { bg: '#d1fae5', color: '#059669' },
    CANCELLED: { bg: '#f5f5f4', color: '#78716c' },
  };

  const payColors: Record<string, { bg: string; color: string }> = {
    UNPAID: { bg: '#fef2f2', color: '#dc2626' },
    PARTIAL: { bg: '#fef3c7', color: '#d97706' },
    PAID: { bg: '#dcfce7', color: '#16a34a' },
    REFUNDED: { bg: '#f5f5f4', color: '#78716c' },
  };

  const channels = [
    { value: 'MANUAL', label: '手动录入' },
    { value: 'MINIPROGRAM', label: '小程序' },
    { value: 'WEBSITE', label: '官网' },
  ];

  const fields = [
    { key: 'customerId', label: '客户', type: 'select' as const, required: true,
      options: customerOptions.map(c => ({ value: String(c.id), label: `${c.name} (${c.code})` })) },
    { key: 'channel', label: '渠道', type: 'select' as const, options: channels },
    { key: 'totalAmount', label: '总金额', type: 'number' as const, required: true, placeholder: '0' },
    { key: 'discount', label: '折扣', type: 'number' as const, placeholder: '0' },
    { key: 'shippingFee', label: '运费', type: 'number' as const, placeholder: '0' },
    { key: 'notes', label: '备注', type: 'textarea' as const },
  ];

  const handleSave = useCallback(async (formData: Record<string, any>) => {
    if (editItem) {
      await updateOrder(editItem.id, {
        customerId: Number(formData.customerId),
        totalAmount: Number(formData.totalAmount),
        discount: Number(formData.discount || 0),
        shippingFee: Number(formData.shippingFee || 0),
        notes: formData.notes,
      });
    } else {
      await createOrder({
        customerId: Number(formData.customerId),
        channel: formData.channel,
        totalAmount: Number(formData.totalAmount),
        discount: Number(formData.discount || 0),
        shippingFee: Number(formData.shippingFee || 0),
        notes: formData.notes,
      });
    }
    setModalOpen(false); setEditItem(null);
    window.location.reload();
  }, [editItem]);

  const handleShip = useCallback(async (id: number) => {
    if (!confirm('确认发货？将自动扣减关联 SKU 的成品库存。')) return;
    try {
      const result = await shipOrder(id);
      alert(`发货成功！${result.orderNo}\n${result.details.join('\n') || '无库存扣减'}`);
      window.location.reload();
    } catch (e: any) { alert(e.message); }
  }, []);

  const handleComplete = useCallback(async (id: number) => {
    if (!confirm('确认完成？订单将标记为已完成并全额收款。')) return;
    try { await completeOrder(id); window.location.reload(); }
    catch (e: any) { alert(e.message); }
  }, []);

  const handleCancel = useCallback(async (id: number) => {
    if (!confirm('确认取消订单？')) return;
    try { await cancelOrder(id); window.location.reload(); }
    catch (e: any) { alert(e.message); }
  }, []);

  const handleDelete = useCallback(async (id: number, status: string) => {
    if (status === 'SHIPPED' || status === 'COMPLETED') { alert('已发货/已完成的订单不可删除'); return; }
    if (!confirm('确认删除订单？')) return;
    try { await deleteOrder(id); setData(prev => prev.filter(d => d.id !== id)); }
    catch (e: any) { alert(e.message); }
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '0.1em', color: '#1c1917' }}>销售管理</h1>
        <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 4 }}>
          共 <strong style={{ color: '#78716c' }}>{data.length}</strong> 条订单
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <ActionBar module="orders" csvColumns={csvColumns} data={csvData}
          searchPlaceholder="搜索订单号 / 客户名…" searchParam="q" />
        <button onClick={() => { setEditItem(null); setModalOpen(true); }} style={{
          padding: '8px 16px', background: '#1c1917', color: '#fff', border: 'none',
          borderRadius: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>+ 新增订单</button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e7e5e4', borderRadius: 8, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '2px solid #e7e5e4', textAlign: 'left', color: '#78716c', fontSize: 11, textTransform: 'uppercase' }}>
              <th style={{ padding: '10px 14px' }}>订单号</th>
              <th style={{ padding: '10px 14px' }}>客户</th>
              <th style={{ padding: '10px 14px' }}>渠道</th>
              <th style={{ padding: '10px 14px' }}>状态</th>
              <th style={{ padding: '10px 14px' }}>支付</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>金额</th>
              <th style={{ padding: '10px 14px' }}>日期</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', width: 300 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {data.map((o: any) => {
              const sc = statusColors[o.status] || { bg: '#f5f5f4', color: '#78716c' };
              const pc = payColors[o.paymentStatus] || { bg: '#f5f5f4', color: '#78716c' };
              const canShip = o.status === 'PENDING' || o.status === 'CONFIRMED';
              const canEdit = o.status === 'PENDING' || o.status === 'CONFIRMED';
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                  <td style={{ padding: '10px 14px' }}><code style={{ fontSize: 11, background: '#f5f5f4', padding: '2px 6px', borderRadius: 4 }}>{o.orderNo}</code></td>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1c1917' }}>{o.customer?.name || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#78716c', fontSize: 12 }}>{o.channel}</td>
                  <td style={{ padding: '10px 14px' }}><span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{o.status}</span></td>
                  <td style={{ padding: '10px 14px' }}><span style={{ background: pc.bg, color: pc.color, padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{o.paymentStatus}</span></td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 500, color: '#b45309' }}>¥{Number(o.totalAmount).toFixed(0)}</td>
                  <td style={{ padding: '10px 14px', fontSize: 11, color: '#a8a29e' }}>{o.orderDate ? new Date(o.orderDate).toISOString().slice(0, 10) : '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    {canEdit && (
                      <button onClick={() => { setEditItem(o); setModalOpen(true); }} style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>编辑</button>
                    )}
                    {canShip && (
                      <button onClick={() => handleShip(o.id)} style={{ background: '#dcfce7', color: '#16a34a', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>发货</button>
                    )}
                    {o.status === 'SHIPPED' && (
                      <button onClick={() => handleComplete(o.id)} style={{ background: '#d1fae5', color: '#059669', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>完成</button>
                    )}
                    {o.status !== 'SHIPPED' && o.status !== 'COMPLETED' && o.status !== 'CANCELLED' && (
                      <button onClick={() => handleCancel(o.id)} style={{ background: '#fef3c7', color: '#d97706', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>取消</button>
                    )}
                    {o.status !== 'SHIPPED' && o.status !== 'COMPLETED' && (
                      <button onClick={() => handleDelete(o.id, o.status)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>删除</button>
                    )}
                    {(o.status === 'COMPLETED' || o.status === 'CANCELLED') && (
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
        <ErpCrudModal title={editItem ? '编辑订单' : '新增订单'} fields={fields}
          initialData={editItem ? {
            ...editItem,
            customerId: String(editItem.customerId),
          } : undefined}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditItem(null); }} />
      )}
    </div>
  );
}
