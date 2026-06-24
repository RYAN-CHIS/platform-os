'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ErpToolbar from '@/components/ErpToolbar';
import ErpCrudModal from '@/components/ErpCrudModal';
import {
  createProduct, updateProduct, deleteProduct, toggleProductStatus,
  createSku, updateSku, deleteSku,
} from '@/modules/erp/products/actions';

type Row = Record<string, any>;

export default function ProductsClient({
  initialData, csvColumns, csvData, workOptions,
}: { initialData: Row[]; csvColumns: any[]; csvData: any[]; workOptions: Array<{id:number;code:string;name:string}> }) {
  const [data, setData] = useState(initialData);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [productModal, setProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Row | null>(null);
  const [skuModal, setSkuModal] = useState(false);
  const [editSku, setEditSku] = useState<Row | null>(null);
  const [parentProductId, setParentProductId] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => { setData(initialData); }, [initialData]);

  const statusOptions = [
    { value: 'ACTIVE', label: '上架' },
    { value: 'READY', label: '就绪' },
    { value: 'DRAFT', label: '草稿' },
    { value: 'PAUSED', label: '暂停' },
    { value: 'ARCHIVED', label: '下架' },
  ];

  const productFields = [
    { key: 'code', label: '编码', required: true },
    { key: 'name', label: '产品名', required: true },
    { key: 'workId', label: '作品', type: 'select' as const, required: true,
      options: workOptions.map(w => ({ value: String(w.id), label: `${w.code} - ${w.name}` })) },
    { key: 'description', label: '描述', type: 'textarea' as const },
  ];

  const skuFields = [
    { key: 'code', label: 'SKU编码', required: true },
    { key: 'name', label: 'SKU名称', required: true },
    { key: 'specification', label: '规格' },
    { key: 'size', label: '尺寸' },
    { key: 'price', label: '售价', type: 'number' as const },
  ];

  const handleProductSave = useCallback(async (formData: any) => {
    if (editProduct) {
      await updateProduct(editProduct.id, formData);
    } else {
      await createProduct({ ...formData, workId: Number(formData.workId) });
    }
    setProductModal(false); setEditProduct(null);
    window.location.reload();
  }, [editProduct]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('确认删除？有 SKU 则无法删除，请先删除所有 SKU。')) return;
    try { await deleteProduct(id); setData(prev => prev.filter(d => d.id !== id)); }
    catch (e: any) { alert(e.message); }
  }, []);

  const handleToggle = useCallback(async (id: number, status: string) => {
    await toggleProductStatus(id, status);
    setData(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  }, []);

  const handleSkuSave = useCallback(async (formData: any) => {
    if (editSku) {
      await updateSku(editSku.id, formData);
    } else {
      await createSku({ ...formData, productId: parentProductId, price: Number(formData.price || 0) });
    }
    setSkuModal(false); setEditSku(null);
    window.location.reload();
  }, [editSku, parentProductId]);

  const handleSkuDelete = useCallback(async (id: number) => {
    if (!confirm('确认删除此 SKU？BOM 和成本记录将级联删除。')) return;
    await deleteSku(id);
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
    a.href = url; a.download = 'erp-products.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusFilterOptions = [
    { label: '全部', value: '' },
    ...statusOptions.map(s => ({ label: s.label, value: s.value })),
  ];

  const filtered = statusFilter ? data.filter(d => d.status === statusFilter) : data;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <ErpToolbar
        title="商品管理"
        subtitle="成品 / SKU 管理"
        total={data.length}
        entityLabel="个产品"
        searchPlaceholder="搜索编码 / 产品名…"
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onAdd={() => { setEditProduct(null); setProductModal(true); }}
        filterOptions={statusFilterOptions}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      <div style={{ overflowX: 'auto', border: '1px solid #e7e5e4', borderRadius: 8, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '2px solid #e7e5e4', textAlign: 'left', color: '#57534e', fontSize: 12 }}>
              <th style={{ padding: '10px 14px', width: 30 }}></th>
              <th style={{ padding: '10px 14px' }}>编码</th>
              <th style={{ padding: '10px 14px' }}>产品名</th>
              <th style={{ padding: '10px 14px' }}>系列</th>
              <th style={{ padding: '10px 14px', textAlign: 'center' }}>SKU数</th>
              <th style={{ padding: '10px 14px' }}>状态</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', width: 220 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p: any) => (
              <>
                <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <button onClick={() => {
                      setExpanded(prev => {
                        const next = new Set(prev);
                        next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                        return next;
                      });
                    }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                      {expanded.has(p.id) ? '▼' : '▶'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <code style={{ fontSize: 11, background: '#f5f5f4', padding: '2px 6px', borderRadius: 4 }}>{p.code || '—'}</code>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1c1917' }}>{p.name || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#78716c' }}>{p.work?.series?.name || '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                      {p.skus?.length || 0}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <select value={p.status} onChange={e => handleToggle(p.id, e.target.value)} style={{
                      background: p.status === 'ACTIVE' ? '#dcfce7' : p.status === 'DRAFT' ? '#fef3c7' : '#f5f5f4',
                      color: p.status === 'ACTIVE' ? '#16a34a' : p.status === 'DRAFT' ? '#d97706' : '#78716c',
                      border: 'none', padding: '2px 8px', borderRadius: 4, fontSize: 11,
                    }}>
                      {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <button onClick={() => { setEditProduct(p); setProductModal(true); }} style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>编辑</button>
                    <button onClick={() => handleDelete(p.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 4 }}>删除</button>
                    <button onClick={() => { setParentProductId(p.id); setEditSku(null); setSkuModal(true); }} style={{ background: '#f0fdf4', color: '#16a34a', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>+SKU</button>
                  </td>
                </tr>
                {expanded.has(p.id) && p.skus?.map((sku: any) => (
                  <tr key={`sku-${sku.id}`} style={{ background: '#fafaf9', borderBottom: '1px solid #f5f5f4' }}>
                    <td></td>
                    <td style={{ padding: '8px 14px' }}>
                      <code style={{ fontSize: 10, background: '#e7e5e4', padding: '1px 5px', borderRadius: 3 }}>{sku.code}</code>
                    </td>
                    <td style={{ padding: '8px 14px', fontSize: 12, color: '#44403c' }}>{sku.name}</td>
                    <td style={{ padding: '8px 14px', fontSize: 12, color: '#a8a29e' }}>{sku.specification || '—'} / {sku.size || '—'}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12 }}>
                      <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 3 }}>
                        库存: {sku.finishedStock || 0}
                      </span>
                    </td>
                    <td style={{ padding: '8px 14px', fontSize: 12, color: '#78716c' }}>
                      {sku.price ? `¥${Number(sku.price).toFixed(0)}` : '—'}
                    </td>
                    <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                      <button onClick={() => { setEditSku(sku); setParentProductId(p.id); setSkuModal(true); }} style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 11, marginRight: 8 }}>编辑</button>
                      <button onClick={() => handleSkuDelete(sku.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 11 }}>删除</button>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#a8a29e' }}>暂无产品</div>
        )}
      </div>

      {productModal && (
        <ErpCrudModal title={editProduct ? '编辑产品' : '新增产品'} fields={productFields}
          initialData={editProduct ? { ...editProduct, workId: String(editProduct.workId) } : undefined}
          onSave={handleProductSave}
          onClose={() => { setProductModal(false); setEditProduct(null); }} />
      )}

      {skuModal && (
        <ErpCrudModal title={editSku ? '编辑 SKU' : `新增 SKU (产品#${parentProductId})`} fields={skuFields}
          initialData={editSku || undefined}
          onSave={handleSkuSave}
          onClose={() => { setSkuModal(false); setEditSku(null); }} />
      )}
    </div>
  );
}
