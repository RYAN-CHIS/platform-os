'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ErpToolbar from '@/components/ErpToolbar';
import ErpDataTable, { type Column } from '@/components/ErpDataTable';
import MaterialFormModal from './MaterialFormModal';
import {
  createMaterial, updateMaterial, deleteMaterial, toggleMaterialStatus,
} from '@/modules/erp/materials/actions';

type MaterialRow = Record<string, any>;

export default function MaterialsClient({
  initialData, csvColumns, csvData, category, title,
}: {
  initialData: MaterialRow[]; csvColumns: any[]; csvData: any[]; category?: string; title?: string;
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
    { value: 'INCENSE', label: '香' },
    { value: 'CORD', label: '绳线' },
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

  function formatStock(row: any) {
    const qty = row.remaining ?? 0;
    const stockUnit = row.inventoryUnit || '';
    const usageUnit = getUsageUnit(row);

    // For bead materials with weight data, show: totalWeight / pieces
    if (row.materialType === 'BEAD' || row.materialType === 'OTHER') {
      const parts: string[] = [];
      if (row.totalWeightG && row.totalWeightG > 0) parts.push(`${row.totalWeightG}g`);
      if (row.totalPieces && row.totalPieces > 0) parts.push(`${row.totalPieces}${usageUnit}`);
      if (parts.length > 0) return parts.join(' / ');
    }

    // Standard format with purchase unit conversion
    const purchaseUnit = row.defaultPurchaseUnit || '';
    const rate = row.defaultConversionRate || 1;
    if (purchaseUnit && purchaseUnit !== stockUnit && rate > 0 && rate !== 1) {
      const inPurchase = qty / rate;
      if (Number.isInteger(inPurchase)) {
        return `${inPurchase}${purchaseUnit} / ${qty}${stockUnit}`;
      }
      return `${inPurchase.toFixed(1)}${purchaseUnit} / ${qty}${stockUnit}`;
    }
    return `${qty} ${stockUnit}`;
  }

  /** Get display unit for BOM usage (颗 for beads, 个 for metal, etc.) */
  function getUsageUnit(row: any): string {
    if (row.usageUnit) return row.usageUnit;
    const mt = row.materialType;
    if (mt === 'BEAD') return '颗';
    if (mt === 'METAL') return '个';
    if (mt === 'CERAMIC' || mt === 'LEATHER' || mt === 'INCENSE') return '件';
    return row.inventoryUnit || '单位';
  }

  function calcUnitPrice(row: any): string {
    // Priority 1: use costPerUsageUnit (auto-calculated from purchase data)
    if (row.costPerUsageUnit != null && row.costPerUsageUnit > 0) {
      return `¥${Number(row.costPerUsageUnit).toFixed(2)} / ${getUsageUnit(row)}`;
    }
    // Priority 2: for by_weight pricing, calculate from totalWeightG/pricePerGram/totalPieces
    if (row.pricingMethod === 'by_weight' && row.totalWeightG && row.pricePerGram && row.totalPieces) {
      const totalPrice = row.totalWeightG * row.pricePerGram;
      const perPiece = totalPrice / row.totalPieces;
      return `¥${perPiece.toFixed(2)} / ${getUsageUnit(row)}`;
    }
    // Fallback: unitCost
    if (row.unitCost != null && row.unitCost > 0) {
      return `¥${Number(row.unitCost).toFixed(2)} / ${row.inventoryUnit || '单位'}`;
    }
    // Fallback: purchasePrice / conversionRate
    const purchasePrice = row.purchasePrice;
    const rate = row.defaultConversionRate || 1;
    if (purchasePrice != null && purchasePrice > 0 && rate > 0) {
      const unitPrice = purchasePrice / rate;
      return `¥${unitPrice.toFixed(2)} / ${row.inventoryUnit || '单位'}`;
    }
    return "—";
  }

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const formatDate = (v: any) => v ? new Date(v).toLocaleString("zh-CN") : "—";

  const columns: Column[] = [
    { key: 'name', label: '名称', sortable: true, render: (v: any, row: any) => <span style={{ fontWeight: 500, color: '#1c1917' }}>{row.name || '—'}</span> },
    { key: 'code', label: '编码', render: (v: any, row: any) => <code style={{ fontSize: 11, background: '#f5f5f4', padding: '2px 6px', borderRadius: 4 }}>{row.code || '—'}</code> },
    { key: 'category', label: '分类' },
    { key: 'specification', label: '规格', render: (v: any, row: any) => <span>{row.specification || '—'}</span> },
    { key: 'inventoryUnit', label: '单位' },
    { key: 'remaining', label: '库存', sortable: true, width: '140px', render: (v: any, row: any) => (
      <span style={{ textAlign: 'right', display: 'block' }}>{formatStock(row)}</span>
    ) },
    { key: 'unitCost', label: '最小单位单价', width: '130px', render: (v: any, row: any) => (
      <span style={{ color: '#16a34a', fontWeight: 500, textAlign: 'right', display: 'block' }}>{calcUnitPrice(row)}</span>
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
    { key: 'actions', label: '操作', width: '180px', render: (v: any, row: any) => (
      <div style={{ textAlign: 'center', display: 'flex', gap: 4, justifyContent: 'center' }}>
        <button onClick={() => toggleExpand(row.id)} style={{
          background: expandedRows.has(row.id) ? '#d6d3d1' : '#f5f5f4', color: '#57534e', border: 'none',
          padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
        }}>{expandedRows.has(row.id) ? '收起' : '详情'}</button>
        <button onClick={() => { setEditItem(row); setModalOpen(true); }} style={{
          background: '#eff6ff', color: '#1d4ed8', border: 'none', padding: '3px 8px',
          borderRadius: 4, cursor: 'pointer', fontSize: 12,
        }}>编辑</button>
        <button onClick={() => handleDelete(row.id)} style={{
          background: '#fef2f2', color: '#dc2626', border: 'none', padding: '3px 8px',
          borderRadius: 4, cursor: 'pointer', fontSize: 12,
        }}>删除</button>
      </div>
    ) },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <ErpToolbar
        title={title || "材料管理"}
        subtitle={category ? `${title} · 分类筛选` : "原材料 / 半成品 / 包材"}
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
        expandedRows={expandedRows}
        renderExpanded={(row: any) => {
          const usageUnit = getUsageUnit(row);
          const pricingLabel: Record<string, string> = {
            by_piece: '按个计价', by_weight: '按克计价', by_strand: '按串计价',
          };
          const purchaseTotal = row.totalWeightG && row.pricePerGram
            ? row.totalWeightG * row.pricePerGram
            : (row.purchasePrice || 0);
          return (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px 20px",fontSize:12,color:"#57534e",padding:"10px 0"}}>
              {/* 供应商与采购 */}
              <div style={{fontWeight:500,color:"#292524",borderBottom:"1px solid #f5f5f4",paddingBottom:4,gridColumn:"1/-1",marginBottom:2}}>
                供应商与采购
              </div>
              <div><span style={{color:"#a8a29e"}}>供应商:</span> {row.supplier || "—"}</div>
              <div><span style={{color:"#a8a29e"}}>采购方式:</span> {row.purchaseMethod || "—"}</div>
              <div><span style={{color:"#a8a29e"}}>采购单位:</span> {row.defaultPurchaseUnit || "—"}</div>

              {/* 计价信息 */}
              <div style={{fontWeight:500,color:"#292524",borderBottom:"1px solid #f5f5f4",paddingBottom:4,gridColumn:"1/-1",marginTop:8,marginBottom:2}}>
                计价信息
              </div>
              <div><span style={{color:"#a8a29e"}}>计价方式:</span> {pricingLabel[row.pricingMethod] || row.pricingMethod || "—"}</div>
              {row.pricingMethod === 'by_weight' && (
                <>
                  <div><span style={{color:"#a8a29e"}}>克单价:</span> {row.pricePerGram ? `¥${Number(row.pricePerGram).toFixed(2)}/g` : "—"}</div>
                  <div><span style={{color:"#a8a29e"}}>总克重:</span> {row.totalWeightG ? `${row.totalWeightG}g` : "—"}</div>
                  <div><span style={{color:"#a8a29e"}}>采购总价:</span> {purchaseTotal ? `¥${Number(purchaseTotal).toFixed(2)}` : "—"}</div>
                </>
              )}
              <div><span style={{color:"#a8a29e"}}>总颗数:</span> {row.totalPieces ? `${row.totalPieces} ${usageUnit}` : "—"}</div>
              <div><span style={{color:"#a8a29e"}}>单颗成本:</span> {row.costPerUsageUnit ? `¥${Number(row.costPerUsageUnit).toFixed(2)}/${usageUnit}` : "—"}</div>
              <div><span style={{color:"#a8a29e"}}>BOM使用单位:</span> {usageUnit}</div>

              {/* 库存与数量 */}
              <div style={{fontWeight:500,color:"#292524",borderBottom:"1px solid #f5f5f4",paddingBottom:4,gridColumn:"1/-1",marginTop:8,marginBottom:2}}>
                库存与数量
              </div>
              <div><span style={{color:"#a8a29e"}}>库存数量({row.inventoryUnit||"单位"}):</span> {row.remaining ?? 0}</div>
              <div><span style={{color:"#a8a29e"}}>安全库存:</span> {row.safetyStock && row.safetyStock > 0 ? `${row.safetyStock} ${row.inventoryUnit || '单位'}` : "—"}</div>

              {/* 单位换算 */}
              <div style={{fontWeight:500,color:"#292524",borderBottom:"1px solid #f5f5f4",paddingBottom:4,gridColumn:"1/-1",marginTop:8,marginBottom:2}}>
                单位换算
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <span style={{color:"#a8a29e"}}>换算关系:</span>{' '}
                {row.conversionDescription || (row.defaultConversionRate
                  ? `1 ${row.defaultPurchaseUnit || '采购单位'} = ${row.defaultConversionRate} ${row.inventoryUnit || '库存单位'}`
                  : "—")}
              </div>
              <div><span style={{color:"#a8a29e"}}>库存单位:</span> {row.inventoryUnit || "—"}</div>
              <div><span style={{color:"#a8a29e"}}>使用单位:</span> {usageUnit}</div>

              {/* 时间与备注 */}
              <div style={{fontWeight:500,color:"#292524",borderBottom:"1px solid #f5f5f4",paddingBottom:4,gridColumn:"1/-1",marginTop:8,marginBottom:2}}>
                时间与备注
              </div>
              <div><span style={{color:"#a8a29e"}}>创建时间:</span> {formatDate(row.createdAt)}</div>
              <div><span style={{color:"#a8a29e"}}>更新时间:</span> {formatDate(row.updatedAt)}</div>
              <div style={{gridColumn:"1/-1"}}><span style={{color:"#a8a29e"}}>备注:</span> {row.remark || "—"}</div>
            </div>
          );
        }}
      />

      {modalOpen && (
        <MaterialFormModal
          mode={editItem ? "edit" : "add"}
          initialData={editItem || undefined}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}
