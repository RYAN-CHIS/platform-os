'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ErpToolbar from '@/components/ErpToolbar';
import ErpDataTable, { type Column } from '@/components/ErpDataTable';
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

  const router = useRouter();
  const searchParams = useSearchParams();

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
    a.href = url; a.download = 'erp-materials.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterOptions = [
    { label: '全部', value: '' },
    ...statusOptions.map(s => ({ label: s.label, value: s.value })),
  ];

  const filtered = statusFilter ? data.filter(d => d.status === statusFilter) : data;

  const columns: Column[] = [
    { key: 'name', label: '名称', sortable: true, render: (v: any, row: any) => <span style={{ fontWeight: 500, color: '#1c1917' }}>{row.name || '—'}</span> },
    { key: 'code', label: '编码', render: (v: any, row: any) => <code style={{ fontSize: 11, background: '#f5f5f4', padding: '2px 6px', borderRadius: 4 }}>{row.code || '—'}</code> },
    { key: 'category', label: '分类' },
    { key: 'inventoryUnit', label: '单位' },
    { key: 'remaining', label: '库存', sortable: true, width: '80px', render: (v: any, row: any) => (
      <span style={{ textAlign: 'right', display: 'block' }}>{row.remaining ?? 0} <span style={{ color: '#a8a29e' }}>{row.inventoryUnit || ''}</span></span>
    ) },
    { key: 'status', label: '状态', width: '100px', render: (v: any, row: any) => {
      const sc = statusColors[row.status] || statusColors.DRAFT;
      return (
        <select value={row.status} onChange={e => handleToggleStatus(row.id, e.target.value)} style={{
          background: sc.bg, color: sc.color, border: 'none', padding: '2px 8px', borderRadius: 4, fontSize: 11,
        }}>
          {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      );
    } },
    { key: 'createdAt', label: '创建时间', sortable: true, render: (v: any) => v ? new Date(v).toISOString().slice(0, 10) : '—' },
    { key: 'actions', label: '操作', width: '140px', render: (v: any, row: any) => (
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
        title="材料管理"
        subtitle="原材料 / 半成品 / 包材"
        total={data.length}
        entityLabel="条材料"
        searchPlaceholder="搜索编码 / 名称 / 分类…"
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onAdd={() => { setEditItem(null); setModalOpen(true); }}
        filterOptions={filterOptions}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      <ErpDataTable
        columns={columns}
        rows={filtered}
        emptyText="暂无材料"
      />

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
