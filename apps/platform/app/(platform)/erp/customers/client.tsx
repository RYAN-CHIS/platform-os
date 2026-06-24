'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ErpToolbar from '@/components/ErpToolbar';
import ErpDataTable, { type Column } from '@/components/ErpDataTable';
import ErpCrudModal from '@/components/ErpCrudModal';
import {
  createCustomer, updateCustomer, deleteCustomer,
} from '@/modules/erp/customers/actions';

type Row = Record<string, any>;

export default function CustomersClient({
  initialData, csvColumns, csvData,
}: { initialData: Row[]; csvColumns: any[]; csvData: any[] }) {
  const [data, setData] = useState(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Row | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => { setData(initialData); }, [initialData]);

  const sources = [
    { value: 'MINIPROGRAM', label: '小程序' },
    { value: 'WEBSITE', label: '官网' },
    { value: 'MANUAL', label: '手动录入' },
  ];

  const fields = [
    { key: 'name', label: '客户名', required: true },
    { key: 'phone', label: '电话' },
    { key: 'email', label: '邮箱' },
    { key: 'wechat', label: '微信' },
    { key: 'source', label: '来源', type: 'select' as const, options: sources },
    { key: 'address', label: '地址' },
    { key: 'tags', label: '标签', placeholder: '用逗号分隔' },
    { key: 'notes', label: '备注', type: 'textarea' as const },
  ];

  const handleSave = useCallback(async (formData: any) => {
    if (editItem) {
      await updateCustomer(editItem.id, formData);
    } else {
      await createCustomer(formData);
    }
    setModalOpen(false); setEditItem(null);
    window.location.reload();
  }, [editItem]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('确认删除？有关联订单则无法删除。')) return;
    try {
      await deleteCustomer(id);
      setData(prev => prev.filter(d => d.id !== id));
    } catch (e: any) { alert(e.message); }
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
    a.href = url; a.download = 'erp-customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column[] = [
    { key: 'code', label: '编码', render: (v: any) => <code style={{ fontSize: 11, background: '#f5f5f4', padding: '2px 6px', borderRadius: 4 }}>{v}</code> },
    { key: 'name', label: '客户名', sortable: true, render: (v: any) => <span style={{ fontWeight: 500, color: '#1c1917' }}>{v}</span> },
    { key: 'contact', label: '联系方式', render: (v: any, row: any) => (
      <span>
        {row.phone && <span style={{ fontSize: 12, color: '#78716c', marginRight: 8 }}>📱 {row.phone}</span>}
        {row.wechat && <span style={{ fontSize: 12, color: '#78716c', marginRight: 8 }}>💬 {row.wechat}</span>}
        {!row.phone && !row.wechat && <span style={{ color: '#a8a29e' }}>—</span>}
      </span>
    ) },
    { key: 'source', label: '来源', render: (v: any) => v || '—' },
    { key: 'tags', label: '标签', render: (v: any) => v || '—' },
    { key: 'orderCount', label: '订单数', width: '80px', render: (v: any, row: any) => (
      <span style={{
        background: (row._count?.orders || 0) > 0 ? '#dbeafe' : '#f5f5f4',
        color: (row._count?.orders || 0) > 0 ? '#1d4ed8' : '#78716c',
        padding: '2px 8px', borderRadius: 4, fontSize: 12,
      }}>{row._count?.orders || 0}</span>
    ) },
    { key: 'actions', label: '操作', width: '120px', render: (v: any, row: any) => (
      <div style={{ textAlign: 'center' }}>
        <button onClick={() => { setEditItem(row); setModalOpen(true); }} style={{
          background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '3px 10px',
          borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 6,
        }}>编辑</button>
        <button onClick={() => handleDelete(row.id)} style={{
          background: '#fef2f2', color: '#dc2626', border: 'none', padding: '3px 10px',
          borderRadius: 4, cursor: 'pointer', fontSize: 12,
        }}>删除</button>
      </div>
    ) },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <ErpToolbar
        title="客户管理"
        total={data.length}
        entityLabel="位客户"
        searchPlaceholder="搜索名称 / 编码 / 电话…"
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onAdd={() => { setEditItem(null); setModalOpen(true); }}
      />

      <ErpDataTable
        columns={columns}
        rows={data}
        emptyText="暂无客户"
      />

      {modalOpen && (
        <ErpCrudModal
          title={editItem ? '编辑客户' : '新增客户'}
          fields={fields}
          initialData={editItem || undefined}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}
