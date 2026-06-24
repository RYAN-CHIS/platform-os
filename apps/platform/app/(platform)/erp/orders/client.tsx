'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ErpToolbar from '@/components/ErpToolbar';
import ErpDataTable, { type Column } from '@/components/ErpDataTable';
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
  const [statusFilter, setStatusFilter] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();

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
    a.href = url; a.download = 'erp-orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusFilterOptions = [
    { label: '全部', value: '' },
    { label: '待确认', value: 'PENDING' },
    { label: '已确认', value: 'CONFIRMED' },
    { label: '已发货', value: 'SHIPPED' },
    { label: '已完成', value: 'COMPLETED' },
    { label: '已取消', value: 'CANCELLED' },
  ];

  const filtered = statusFilter ? data.filter(d => d.status === statusFilter) : data;

  const columns: Column[] = [
    { key: 'orderNo', label: '订单号', render: (v: any) => <code style={{ fontSize: 11, background: '#f5f5f4', padding: '2px 6px', borderRadius: 4 }}>{v || '—'}</code> },
    { key: 'customer', label: '客户', render: (v: any, row: any) => <span style={{ fontWeight: 500, color: '#1c1917' }}>{row.customer?.name || '—'}</span> },
    { key: 'status', label: '状态', render: (v: any) => {
      const sc = statusColors[v] || { bg: '#f5f5f4', color: '#78716c' };
      return <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{v}</span>;
    } },
    { key: 'paymentStatus', label: '支付', render: (v: any) => {
      const pc = payColors[v] || { bg: '#f5f5f4', color: '#78716c' };
      return <span style={{ background: pc.bg, color: pc.color, padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{v}</span>;
    } },
    { key: 'totalAmount', label: '金额', sortable: true, render: (v: any) => <span style={{ fontWeight: 500, color: '#b45309' }}>¥{Number(v).toFixed(0)}</span> },
    { key: 'orderDate', label: '日期', sortable: true, render: (v: any) => v ? new Date(v).toISOString().slice(0, 10) : '—' },
    { key: 'actions', label: '操作', width: '280px', render: (v: any, row: any) => {
      const canShip = row.status === 'PENDING' || row.status === 'CONFIRMED';
      const canEdit = row.status === 'PENDING' || row.status === 'CONFIRMED';
      return (
        <div style={{ textAlign: 'center' }}>
          {canEdit && (
            <button onClick={() => { setEditItem(row); setModalOpen(true); }} style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>编辑</button>
          )}
          {canShip && (
            <button onClick={() => handleShip(row.id)} style={{ background: '#dcfce7', color: '#16a34a', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>发货</button>
          )}
          {row.status === 'SHIPPED' && (
            <button onClick={() => handleComplete(row.id)} style={{ background: '#d1fae5', color: '#059669', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>完成</button>
          )}
          {row.status !== 'SHIPPED' && row.status !== 'COMPLETED' && row.status !== 'CANCELLED' && (
            <button onClick={() => handleCancel(row.id)} style={{ background: '#fef3c7', color: '#d97706', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>取消</button>
          )}
          {row.status !== 'SHIPPED' && row.status !== 'COMPLETED' && (
            <button onClick={() => handleDelete(row.id, row.status)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>删除</button>
          )}
          {(row.status === 'COMPLETED' || row.status === 'CANCELLED') && (
            <span style={{ color: '#a8a29e', fontSize: 12 }}>—</span>
          )}
        </div>
      );
    } },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <ErpToolbar
        title="订单管理"
        total={data.length}
        entityLabel="条订单"
        searchPlaceholder="搜索订单号 / 客户名…"
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
        emptyText="暂无订单"
      />

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
