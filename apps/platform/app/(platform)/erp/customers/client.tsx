'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActionBar } from '@/components/ActionBar';
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

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '0.1em', color: '#1c1917' }}>客户管理</h1>
        <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 4 }}>
          共 <strong style={{ color: '#78716c' }}>{data.length}</strong> 位客户
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <ActionBar module="customers" csvColumns={csvColumns} data={csvData}
          searchPlaceholder="搜索名称 / 编码 / 电话…" searchParam="q" />
        <button onClick={() => { setEditItem(null); setModalOpen(true); }} style={{
          padding: '8px 16px', background: '#1c1917', color: '#fff', border: 'none',
          borderRadius: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>+ 新增客户</button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e7e5e4', borderRadius: 8, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '2px solid #e7e5e4', textAlign: 'left', color: '#78716c', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '10px 14px' }}>编码</th>
              <th style={{ padding: '10px 14px' }}>客户名</th>
              <th style={{ padding: '10px 14px' }}>联系方式</th>
              <th style={{ padding: '10px 14px' }}>来源</th>
              <th style={{ padding: '10px 14px' }}>标签</th>
              <th style={{ padding: '10px 14px', textAlign: 'center' }}>订单数</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', width: 120 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c: any) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                <td style={{ padding: '10px 14px' }}>
                  <code style={{ fontSize: 11, background: '#f5f5f4', padding: '2px 6px', borderRadius: 4 }}>{c.code}</code>
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1c1917' }}>{c.name}</td>
                <td style={{ padding: '10px 14px' }}>
                  {c.phone && <span style={{ fontSize: 12, color: '#78716c', marginRight: 8 }}>📱 {c.phone}</span>}
                  {c.wechat && <span style={{ fontSize: 12, color: '#78716c', marginRight: 8 }}>💬 {c.wechat}</span>}
                  {!c.phone && !c.wechat && <span style={{ color: '#a8a29e' }}>—</span>}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#78716c' }}>{c.source || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#a8a29e' }}>{c.tags || '—'}</td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <span style={{ background: (c._count?.orders || 0) > 0 ? '#dbeafe' : '#f5f5f4', color: (c._count?.orders || 0) > 0 ? '#1d4ed8' : '#78716c', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                    {c._count?.orders || 0}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                  <button onClick={() => { setEditItem(c); setModalOpen(true); }} style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 6 }}>编辑</button>
                  <button onClick={() => handleDelete(c.id)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
