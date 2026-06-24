'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActionBar } from '@/components/ActionBar';
import { Card } from '@yunwu/ui';
import ErpCrudModal from '@/components/ErpCrudModal';
import {
  createMaterial, updateMaterial, deleteMaterial, toggleMaterialStatus,
} from '@/modules/erp/materials/actions';

type MaterialRow = Record<string, any>;

export default function MaterialsClient({
  initialData, csvColumns, csvData,
}: {
  initialData: MaterialRow[]; csvColumns: any[]; csvData: any[];
}) {
  const [data, setData] = useState(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<MaterialRow | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { setData(initialData); }, [initialData]);

  const statusColors: Record<string, { bg: string; color: string }> = {
    ACTIVE: { bg: '#dcfce7', color: '#16a34a' },
    READY: { bg: '#dbeafe', color: '#1d4ed8' },
    DRAFT: { bg: '#fef3c7', color: '#d97706' },
    PAUSED: { bg: '#f5f5f4', color: '#78716c' },
    ARCHIVED: { bg: '#fef2f2', color: '#dc2626' },
  };

  const materialTypes = [
    { value: 'BEAD', label: '珠子' },
    { value: 'METAL', label: '金属' },
    { value: 'CERAMIC', label: '陶瓷' },
    { value: 'LEATHER', label: '皮革' },
    { value: 'INCENSE', label: '香品' },
    { value: 'CORD', label: '线绳' },
    { value: 'PACKAGING', label: '包装' },
    { value: 'OTHER', label: '其他' },
  ];

  const statusOptions = [
    { value: 'ACTIVE', label: '启用' },
    { value: 'READY', label: '就绪' },
    { value: 'DRAFT', label: '草稿' },
    { value: 'PAUSED', label: '暂停' },
    { value: 'ARCHIVED', label: '停用' },
  ];

  const fields = [
    { key: 'code', label: '编码', required: true, placeholder: '如 MAT-001' },
    { key: 'name', label: '名称', required: true, placeholder: '材料名称' },
    { key: 'category', label: '分类', placeholder: '如 天然水晶' },
    { key: 'materialType', label: '类型', type: 'select' as const, options: materialTypes },
    { key: 'specification', label: '规格', placeholder: '如 10mm' },
    { key: 'inventoryUnit', label: '单位', placeholder: '颗/个/克' },
    { key: 'unitCost', label: '单价', type: 'number' as const, placeholder: '0' },
    { key: 'supplier', label: '供应商', placeholder: '供应商名称' },
    { key: 'remark', label: '备注', type: 'textarea' as const, placeholder: '备注信息' },
  ];

  const handleSave = useCallback(async (formData: any) => {
    if (editItem) {
      await updateMaterial(editItem.id, formData);
    } else {
      await createMaterial(formData);
    }
    setModalOpen(false);
    setEditItem(null);
    window.location.reload();
  }, [editItem]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('确认删除此材料？如有 BOM 引用或库存记录则无法删除。')) return;
    try {
      await deleteMaterial(id);
      setData(prev => prev.filter(d => d.id !== id));
    } catch (e: any) { alert(e.message); }
  }, []);

  const handleToggleStatus = useCallback(async (id: number, status: string) => {
    await toggleMaterialStatus(id, status);
    setData(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  }, []);

  const filtered = statusFilter ? data.filter(d => d.status === statusFilter) : data;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: '0.1em', color: '#1c1917' }}>材料管理</h1>
        <p style={{ fontSize: 13, color: '#a8a29e', marginTop: 4 }}>
          共 <strong style={{ color: '#78716c' }}>{data.length}</strong> 条材料
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <ActionBar module="materials" csvColumns={csvColumns} data={csvData}
          searchPlaceholder="搜索编码 / 名称 / 分类…" searchParam="q" />
        <button onClick={() => { setEditItem(null); setModalOpen(true); }} style={{
          padding: '8px 16px', background: '#1c1917', color: '#fff', border: 'none',
          borderRadius: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>+ 新增材料</button>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
          padding: '8px 12px', border: '1px solid #e7e5e4', borderRadius: 6, fontSize: 13, background: '#fff',
        }}>
          <option value="">全部状态</option>
          {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e7e5e4', borderRadius: 8, background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fafaf9', borderBottom: '2px solid #e7e5e4', textAlign: 'left', color: '#78716c', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '10px 14px' }}>编码</th>
              <th style={{ padding: '10px 14px' }}>名称</th>
              <th style={{ padding: '10px 14px' }}>分类</th>
              <th style={{ padding: '10px 14px' }}>类型</th>
              <th style={{ padding: '10px 14px' }}>规格</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>库存</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>单价</th>
              <th style={{ padding: '10px 14px' }}>状态</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', width: 160 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m: any) => {
              const sc = statusColors[m.status] || statusColors.DRAFT;
              return (
                <tr key={m.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <code style={{ fontSize: 11, background: '#f5f5f4', padding: '2px 6px', borderRadius: 4 }}>{m.code || '—'}</code>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1c1917' }}>{m.name || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#78716c' }}>{m.category || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#78716c' }}>{m.materialType || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#a8a29e', fontSize: 12 }}>{m.specification || '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    {m.remaining ?? 0} <span style={{ color: '#a8a29e' }}>{m.inventoryUnit || ''}</span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: '#78716c' }}>
                    {m.unitCost ? `¥${Number(m.unitCost).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <select value={m.status} onChange={e => handleToggleStatus(m.id, e.target.value)} style={{
                      background: sc.bg, color: sc.color, border: 'none', padding: '2px 8px', borderRadius: 4, fontSize: 11,
                    }}>
                      {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <button onClick={() => { setEditItem(m); setModalOpen(true); }} style={{
                      background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '3px 10px',
                      borderRadius: 4, cursor: 'pointer', fontSize: 12, marginRight: 6,
                    }}>编辑</button>
                    <button onClick={() => handleDelete(m.id)} style={{
                      background: '#fef2f2', color: '#dc2626', border: 'none', padding: '3px 10px',
                      borderRadius: 4, cursor: 'pointer', fontSize: 12,
                    }}>删除</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#a8a29e' }}>
            <p style={{ fontSize: 48, marginBottom: 8 }}>📦</p>
            <p>暂无数据</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <ErpCrudModal
          title={editItem ? '编辑材料' : '新增材料'}
          fields={fields}
          initialData={editItem || undefined}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}
