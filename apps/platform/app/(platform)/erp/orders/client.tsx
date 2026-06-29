'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import ErpToolbar from '@/components/ErpToolbar';
import ErpDataTable, { type Column } from '@/components/ErpDataTable';
import {
  createOrder, updateOrder, shipOrder, completeOrder, cancelOrder, deleteOrder,
  getSkusForOrderSelect,
} from '@/modules/erp/orders/actions';
import type { OrderItemInput } from '@/modules/erp/orders/actions';

type Row = Record<string, any>;

interface OrderSkuItem {
  sku_id: number;
  sku_code: string;
  product_id: number;
  qty: number;
  price: number;
}

/** Parse order items from the stored JSON (handles both old and new format). */
function parseItems(raw: string | null | undefined): OrderSkuItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((it: any) => ({
      sku_id: it.sku_id ?? it.skuId ?? 0,
      sku_code: it.sku_code ?? it.skuCode ?? it.skuName ?? '',
      product_id: it.product_id ?? it.productId ?? 0,
      qty: it.qty ?? it.quantity ?? 1,
      price: it.price ?? 0,
    })).filter((it: OrderSkuItem) => it.sku_id > 0);
  } catch {
    return [];
  }
}

/** Local SKU option type for the add-item dropdown. */
interface SkuOption {
  id: number;
  code: string;
  name: string;
  price: number;
  finishedStock: number;
  productId: number;
  product: { id: number; code: string; name: string };
}

// ── Order form modal (replaces generic ErpCrudModal) ──
function OrderFormModal({
  mode, initialData, onSave, onClose, customerOptions, skuOptions,
}: {
  mode: 'add' | 'edit';
  initialData?: Row;
  onSave: (data: Record<string, any>) => Promise<void>;
  onClose: () => void;
  customerOptions: Array<{ id: number; code: string; name: string; phone: string }>;
  skuOptions: SkuOption[];
}) {
  const [customerId, setCustomerId] = useState(initialData?.customerId ?? '');
  const [channel, setChannel] = useState(initialData?.channel ?? 'MANUAL');
  const [discount, setDiscount] = useState(Number(initialData?.discount ?? 0));
  const [shippingFee, setShippingFee] = useState(Number(initialData?.shippingFee ?? 0));
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [items, setItems] = useState<OrderSkuItem[]>(() => {
    if (mode === 'edit' && initialData?.items) {
      return parseItems(initialData.items);
    }
    return [];
  });
  const [selectedSkuId, setSelectedSkuId] = useState('');
  const [saving, setSaving] = useState(false);

  const channels = [
    { value: 'MANUAL', label: '手动录入' },
    { value: 'MINIPROGRAM', label: '小程序' },
    { value: 'WEBSITE', label: '官网' },
  ];

  // Compute totals
  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.qty * it.price, 0),
    [items],
  );
  const totalAmount = useMemo(
    () => subtotal - discount + shippingFee,
    [subtotal, discount, shippingFee],
  );

  function addItem() {
    const id = parseInt(selectedSkuId);
    if (!id) return;
    const sku = skuOptions.find((s) => s.id === id);
    if (!sku) return;
    // Check if already added
    if (items.some((it) => it.sku_id === id)) {
      setItems((prev) =>
        prev.map((it) =>
          it.sku_id === id ? { ...it, qty: it.qty + 1 } : it,
        ),
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          sku_id: sku.id,
          sku_code: sku.code,
          product_id: sku.productId,
          qty: 1,
          price: sku.price,
        },
      ]);
    }
    setSelectedSkuId('');
  }

  function removeItem(skuId: number) {
    setItems((prev) => prev.filter((it) => it.sku_id !== skuId));
  }

  function updateItem(skuId: number, field: 'qty' | 'price', value: number) {
    setItems((prev) =>
      prev.map((it) => (it.sku_id === skuId ? { ...it, [field]: value } : it)),
    );
  }

  const handleSave = async () => {
    if (!customerId) { alert('请选择客户'); return; }
    if (items.length === 0) { alert('请至少添加一个 SKU'); return; }
    setSaving(true);
    try {
      await onSave({
        customerId: Number(customerId),
        channel,
        items,
        subtotal,
        discount,
        shippingFee,
        totalAmount,
        notes,
      });
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  };

  const addableSkus = skuOptions.filter(
    (s) => !items.some((it) => it.sku_id === s.id),
  );

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #e7e5e4',
    borderRadius: 6,
    fontSize: 13,
    color: '#1c1917',
    background: '#fff',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, color: '#57534e', marginBottom: 4, fontWeight: 500,
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 24, width: 800, maxWidth: '95vw',
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: '#1c1917' }}>
            {mode === 'add' ? '新增订单' : '编辑订单'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#78716c' }}>×</button>
        </div>

        {/* Customer + Channel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>客户 *</label>
            <select value={String(customerId)} onChange={(e) => setCustomerId(e.target.value)} style={inputStyle}>
              <option value="">请选择客户</option>
              {customerOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>渠道</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} style={inputStyle}>
              {channels.map((ch) => (
                <option key={ch.value} value={ch.value}>{ch.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* SKU Items */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>订单商品</label>
          {items.length > 0 && (
            <div style={{ marginBottom: 8, border: '1px solid #e7e5e4', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4' }}>
                    <th style={{ padding: '8px 10px', fontSize: 11, color: '#78716c', fontWeight: 500, textAlign: 'left' }}>SKU</th>
                    <th style={{ padding: '8px 10px', fontSize: 11, color: '#78716c', fontWeight: 500, textAlign: 'right' }}>数量</th>
                    <th style={{ padding: '8px 10px', fontSize: 11, color: '#78716c', fontWeight: 500, textAlign: 'right' }}>单价</th>
                    <th style={{ padding: '8px 10px', fontSize: 11, color: '#78716c', fontWeight: 500, textAlign: 'right' }}>小计</th>
                    <th style={{ padding: '8px 10px', width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const sku = skuOptions.find((s) => s.id === it.sku_id);
                    return (
                      <tr key={it.sku_id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ fontWeight: 500, color: '#1c1917' }}>{it.sku_code}</div>
                          <div style={{ fontSize: 11, color: '#a8a29e' }}>
                            {it.product_id ? `产品 #${it.product_id}` : ''}
                            {sku ? ` · 库存 ${sku.finishedStock}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <input type="number" min={1} value={it.qty}
                            onChange={(e) => updateItem(it.sku_id, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                            style={{ width: 60, padding: '4px 6px', border: '1px solid #e7e5e4', borderRadius: 4, fontSize: 13, textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <input type="number" min={0} step={0.01} value={it.price}
                            onChange={(e) => updateItem(it.sku_id, 'price', parseFloat(e.target.value) || 0)}
                            style={{ width: 80, padding: '4px 6px', border: '1px solid #e7e5e4', borderRadius: 4, fontSize: 13, textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500, color: '#b45309' }}>
                          ¥{(it.qty * it.price).toFixed(0)}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button onClick={() => removeItem(it.sku_id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add SKU row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={selectedSkuId} onChange={(e) => setSelectedSkuId(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', border: '1px solid #e7e5e4', borderRadius: 6, fontSize: 13, color: '#1c1917' }}>
              <option value="">选择 SKU 添加…</option>
              {addableSkus.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} ｜ {s.name} ｜ 库存 {s.finishedStock} ｜ ¥{s.price}
                </option>
              ))}
            </select>
            <button onClick={addItem} disabled={!selectedSkuId}
              style={{
                padding: '8px 14px', borderRadius: 6, fontSize: 13, cursor: selectedSkuId ? 'pointer' : 'not-allowed',
                background: selectedSkuId ? '#2563eb' : '#e7e5e4', color: '#fff', border: 'none',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
              <Plus size={14} /> 添加
            </button>
          </div>
          {items.length === 0 && (
            <p style={{ fontSize: 12, color: '#a8a29e', marginTop: 6 }}>未添加商品，请从上方下拉选择 SKU</p>
          )}
        </div>

        {/* Totals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>折扣</label>
            <input type="number" min={0} value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>运费</label>
            <input type="number" min={0} value={shippingFee}
              onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>备注</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} placeholder="可选" />
          </div>
        </div>

        {/* Summary */}
        <div style={{
          background: '#fafaf9', borderRadius: 8, padding: '12px 16px', marginBottom: 20,
          fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: '#57534e' }}>
            小计: <strong>¥{subtotal.toFixed(0)}</strong>
            {discount > 0 && <> · 折扣: -¥{discount.toFixed(0)}</>}
            {shippingFee > 0 && <> · 运费: ¥{shippingFee.toFixed(0)}</>}
          </span>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#b45309' }}>
            ¥{totalAmount.toFixed(0)}
          </span>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '8px 20px', borderRadius: 6, fontSize: 13, cursor: 'pointer', background: '#f5f5f4', color: '#57534e', border: '1px solid #e7e5e4' }}>
            取消
          </button>
          <button onClick={handleSave} disabled={saving || items.length === 0}
            style={{
              padding: '8px 20px', borderRadius: 6, fontSize: 13,
              cursor: (saving || items.length === 0) ? 'not-allowed' : 'pointer',
              background: '#2563eb', color: '#fff', border: 'none',
            }}>
            {saving ? '保存中…' : mode === 'add' ? '创建订单' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrdersClient({
  initialData, csvColumns, csvData, customerOptions,
}: { initialData: Row[]; csvColumns: any[]; csvData: any[]; customerOptions: Array<{id:number;code:string;name:string;phone:string}> }) {
  const [data, setData] = useState(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Row | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [skuOptions, setSkuOptions] = useState<SkuOption[]>([]);
  const [skusLoaded, setSkusLoaded] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => { setData(initialData); }, [initialData]);

  // Load SKU options once
  useEffect(() => {
    (async () => {
      const result = await getSkusForOrderSelect();
      if (result.skus) setSkuOptions(result.skus as SkuOption[]);
      setSkusLoaded(true);
    })();
  }, []);

  const statusColors: Record<string, { bg: string; color: string }> = {
    PENDING: { bg: '#fef3c7', color: '#d97706' },
    CONFIRMED: { bg: '#dbeafe', color: '#1d4ed8' },
    PROCESSING: { bg: '#ede9fe', color: '#7c3aed' },
    SHIPPED: { bg: '#dcfce7', color: '#16a34a' },
    COMPLETED: { bg: '#d1fae5', color: '#059669' },
    CANCELLED: { bg: '#f5f5f4', color: '#78716c' },
  };

  const handleSave = useCallback(async (formData: Record<string, any>) => {
    if (editItem) {
      await updateOrder(editItem.id, formData);
    } else {
      await createOrder(formData);
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
    const csv = '﻿' + header + '\n' + body;
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

  /** Render a short items summary for each row. */
  function ItemsSummary({ items }: { items: string | null | undefined }) {
    const parsed = parseItems(items);
    if (!parsed.length) return <span style={{ color: '#a8a29e', fontSize: 12 }}>—</span>;
    return (
      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
        {parsed.map((it) => (
          <div key={it.sku_id} style={{ color: '#57534e', whiteSpace: 'nowrap' }}>
            <code style={{ fontSize: 11, background: '#f5f5f4', padding: '1px 4px', borderRadius: 3 }}>{it.sku_code}</code>
            {' ×'}{it.qty}
            <span style={{ color: '#b45309', marginLeft: 4 }}>¥{(it.qty * it.price).toFixed(0)}</span>
          </div>
        ))}
      </div>
    );
  }

  const columns: Column[] = [
    { key: 'orderNo', label: '订单号', render: (v: any) => <code style={{ fontSize: 11, background: '#f5f5f4', padding: '2px 6px', borderRadius: 4 }}>{v || '—'}</code> },
    { key: 'customer', label: '客户', render: (v: any, row: any) => <span style={{ fontWeight: 500, color: '#1c1917' }}>{row.customer?.name || '—'}</span> },
    { key: 'items', label: '商品', render: (v: any, row: any) => <ItemsSummary items={row.items} /> },
    { key: 'status', label: '状态', render: (v: any) => {
      const sc = statusColors[v] || { bg: '#f5f5f4', color: '#78716c' };
      return <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{v}</span>;
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
        <OrderFormModal
          mode={editItem ? 'edit' : 'add'}
          initialData={editItem || undefined}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditItem(null); }}
          customerOptions={customerOptions}
          skuOptions={skuOptions}
        />
      )}
    </div>
  );
}
