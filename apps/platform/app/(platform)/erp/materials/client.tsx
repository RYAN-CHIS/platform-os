'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Download, Upload } from 'lucide-react';
import ErpToolbar from '@/components/ErpToolbar';
import ErpDataTable, { type Column } from '@/components/ErpDataTable';
import MaterialFormModal from './MaterialFormModal';
import {
  createMaterial, updateMaterial, deleteMaterial, toggleMaterialStatus,
} from '@/modules/erp/materials/actions';

type MaterialRow = Record<string, any>;

type ImportApiError = {
  ok?: boolean;
  error?: string;
  detail?: string;
  preview?: any[];
  results?: any;
};

function parseMaybeJson(text: string): ImportApiError | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function displayMaterialType(type: string) {
  if (type === 'BEAD') return '珠子';
  if (type === 'METAL') return '配件';
  if (type === 'CERAMIC') return '瓷器';
  if (type === 'LEATHER') return '皮具';
  return '其他';
}

async function readJsonResponse(res: Response): Promise<{ ok: boolean; data: ImportApiError | null; rawText: string }> {
  const rawText = await res.text();
  const data = parseMaybeJson(rawText);
  if (!data) {
    console.error('[materials/import] non-JSON response:', rawText.slice(0, 200));
  }
  return { ok: res.ok, data, rawText };
}

export default function MaterialsClient({
  initialData, csvColumns, csvData, category, title,
}: {
  initialData: MaterialRow[]; csvColumns: any[]; csvData: any[]; category?: string; title?: string;
}) {
  const [data, setData] = useState(initialData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<MaterialRow | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<any>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importNotice, setImportNotice] = useState<string>('');
  const [importError, setImportError] = useState<string>('');

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

  const statusOptions = [
    { value: 'ACTIVE', label: '启用' },
    { value: 'READY', label: '就绪' },
    { value: 'DRAFT', label: '草稿' },
    { value: 'PAUSED', label: '暂停' },
    { value: 'ARCHIVED', label: '停用' },
  ];

  const handleSave = useCallback(async (formData: any): Promise<{ ok: boolean; error?: string }> => {
    try {
      if (editItem) {
        await updateMaterial(editItem.id, formData);
      } else {
        await createMaterial(formData);
      }
      setModalOpen(false);
      setEditItem(null);
      router.refresh();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || '保存失败' };
    }
  }, [editItem, router]);

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

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      [
        '原料编码',
        '品类',
        '名称',
        '供应商',
        '规格mm',
        '形状',
        '备注',
        '计价方式',
        '进货串数/个数',
        '计价单价',
        '计价单位',
        '采购总价',
        '每串颗数',
        '每串克重',
        '总颗数',
        '总克重',
        '单颗成本（颗）',
      ],
      [
        'RM-001',
        '配件',
        '示例材料',
        '示例供应商',
        '8mm',
        '圆珠',
        '可选',
        '按颗',
        10,
        3.5,
        '颗',
        35,
        0,
        0,
        100,
        0,
        0.35,
      ],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, '01原料采购库');
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '01原料采购库.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openImportModal = () => {
    setImportModalOpen(true);
    setImportStep('upload');
    setImportFile(null);
    setImportPreview([]);
    setImportResults(null);
    setImportNotice('');
    setImportError('');
  };

  const submitImportPreview = async () => {
    if (!importFile) return;
    setImportBusy(true);
    setImportError('');
    setImportNotice('');
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await fetch('/api/materials/import', { method: 'POST', body: formData });
      const { data, rawText } = await readJsonResponse(res);
      if (!data) {
        throw new Error('导入接口返回异常，请检查服务端日志');
      }
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || '导入预览失败');
      }
      setImportPreview((data.preview || []).map((row: any) => ({
        ...row,
        action: row.action || (row.matched ? 'update' : 'skip'),
      })));
      setImportStep('preview');
      if (!res.ok) console.error(rawText.slice(0, 200));
    } catch (error: any) {
      setImportError(error.message || '导入预览失败');
    } finally {
      setImportBusy(false);
    }
  };

  const applyImport = async () => {
    setImportBusy(true);
    setImportError('');
    setImportNotice('');
    try {
      const items = importPreview.map((item) => ({
        ...item,
        action: item.action || (item.matched ? 'update' : 'skip'),
      }));
      const res = await fetch('/api/materials/import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const { data } = await readJsonResponse(res);
      if (!data) {
        throw new Error('导入接口返回异常，请检查服务端日志');
      }
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || '导入应用失败');
      }
      setImportResults(data.results);
      setImportNotice(`已更新 ${data.results?.updated || 0} 条，已新建 ${data.results?.created || 0} 条，跳过 ${data.results?.skipped || 0} 条`);
      setImportStep('result');
      router.refresh();
    } catch (error: any) {
      setImportError(error.message || '导入应用失败');
    } finally {
      setImportBusy(false);
    }
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

    if (row.materialType === 'BEAD' || row.materialType === 'OTHER') {
      const parts: string[] = [];
      if (row.totalWeightG && row.totalWeightG > 0) parts.push(`${row.totalWeightG}g`);
      if (row.totalPieces && row.totalPieces > 0) parts.push(`${row.totalPieces}${usageUnit}`);
      if (parts.length > 0) return parts.join(' / ');
    }

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

  function getUsageUnit(row: any): string {
    if (row.usageUnit) return row.usageUnit;
    const mt = row.materialType;
    if (mt === 'BEAD') return '颗';
    if (mt === 'METAL') return '个';
    if (mt === 'CERAMIC' || mt === 'LEATHER' || mt === 'INCENSE') return '件';
    return row.inventoryUnit || '单位';
  }

  function calcUnitPrice(row: any): string {
    if (row.costPerUsageUnit != null && row.costPerUsageUnit > 0) {
      return `¥${Number(row.costPerUsageUnit).toFixed(2)} / ${getUsageUnit(row)}`;
    }
    if (row.pricingMethod === 'by_weight' && row.totalWeightG && row.pricePerGram && row.totalPieces) {
      const totalPrice = row.totalWeightG * row.pricePerGram;
      const perPiece = totalPrice / row.totalPieces;
      return `¥${perPiece.toFixed(2)} / ${getUsageUnit(row)}`;
    }
    if (row.unitCost != null && row.unitCost > 0) {
      return `¥${Number(row.unitCost).toFixed(2)} / ${row.inventoryUnit || '单位'}`;
    }
    const purchasePrice = row.purchasePrice;
    const rate = row.defaultConversionRate || 1;
    if (purchasePrice != null && purchasePrice > 0 && rate > 0) {
      const unitPrice = purchasePrice / rate;
      return `¥${unitPrice.toFixed(2)} / ${row.inventoryUnit || '单位'}`;
    }
    return '—';
  }

  // 同一时间只能展开一个材料详情：用单个 expandedMaterialId 派生出 expandedRows 集合
  const [expandedMaterialId, setExpandedMaterialId] = useState<number | null>(null);
  const expandedRows = expandedMaterialId == null ? new Set<number>() : new Set<number>([expandedMaterialId]);
  const toggleExpand = (id: number) => {
    setExpandedMaterialId(prev => (prev === id ? null : id));
  };

  const formatDate = (v: any) => v ? new Date(v).toLocaleString('zh-CN') : '—';

  const columns: Column[] = [
    { key: 'name', label: '名称', sortable: true, render: (v: any, row: any) => <span style={{ fontWeight: 500, color: '#1c1917' }}>{row.name || '—'}</span> },
    { key: 'code', label: '编码', render: (v: any, row: any) => <code style={{ fontSize: 11, background: '#f5f5f4', padding: '2px 6px', borderRadius: 4 }}>{row.code || '—'}</code> },
    { key: 'category', label: '分类' },
    { key: 'specification', label: '规格' },
    { key: 'inventoryUnit', label: '单位', align: 'center' },
    { key: 'remaining', label: '库存', sortable: true, align: 'right', width: '160px', render: (v: any, row: any) => (
      <span style={{ whiteSpace: 'nowrap' }}>{formatStock(row)}</span>
    ) },
    { key: 'unitCost', label: '最小单位单价', align: 'right', width: '140px', render: (v: any, row: any) => (
      <span style={{ color: '#16a34a', fontWeight: 500, whiteSpace: 'nowrap' }}>{calcUnitPrice(row)}</span>
    ) },
    { key: 'status', label: '状态', align: 'center', width: '100px', render: (v: any, row: any) => {
      const sc = statusColors[row.status] || statusColors.DRAFT;
      return (
        <select value={row.status} onChange={e => handleToggleStatus(row.id, e.target.value)} style={{
          background: sc.bg, color: sc.color, border: 'none', padding: '2px 8px', borderRadius: 4, fontSize: 11,
        }}>
          {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      );
    } },
    { key: 'actions', label: '操作', align: 'right', width: '180px', render: (v: any, row: any) => (
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
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
        title={title || '材料管理'}
        subtitle={category ? `${title} · 分类筛选` : '原材料 / 半成品 / 包材'}
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
        extraButtons={(
          <>
            <button
              onClick={handleDownloadTemplate}
              style={{ padding: '6px 12px', border: '1px solid #e7e5e4', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#57534e' }}
            >
              <Download size={14} style={{ display: 'inline-block', marginRight: 4, verticalAlign: '-2px' }} />
              下载导入模板
            </button>
            <button
              onClick={openImportModal}
              style={{ padding: '6px 12px', border: '1px solid #e7e5e4', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#57534e' }}
            >
              <Upload size={14} style={{ display: 'inline-block', marginRight: 4, verticalAlign: '-2px' }} />
              导入库存 Excel
            </button>
          </>
        )}
      />

      <ErpDataTable
        columns={columns}
        rows={filtered}
        emptyText="暂无材料"
        expandedRows={expandedRows}
        renderExpanded={(row: any) => {
          const usageUnit = getUsageUnit(row);
          const pricingLabel: Record<string, string> = {
            by_weight: '按克', by_piece: '按颗', by_strand: '按串', by_item: '按件',
          };
          return (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px 20px",fontSize:12,color:"#57534e",padding:"10px 0"}}>
              <div style={{fontWeight:500,color:"#292524",borderBottom:"1px solid #f5f5f4",paddingBottom:4,gridColumn:"1/-1",marginBottom:2}}>
                基础信息
              </div>
              <div><span style={{color:"#a8a29e"}}>原料编码:</span> {row.code || "—"}</div>
              <div><span style={{color:"#a8a29e"}}>品类:</span> {row.category || "—"}</div>
              <div><span style={{color:"#a8a29e"}}>名称:</span> {row.name || "—"}</div>
              <div><span style={{color:"#a8a29e"}}>供应商:</span> {row.supplier || "—"}</div>
              <div><span style={{color:"#a8a29e"}}>规格mm:</span> {row.specification || "—"}</div>
              <div><span style={{color:"#a8a29e"}}>形状:</span> {row.shape || "—"}</div>

              <div style={{fontWeight:500,color:"#292524",borderBottom:"1px solid #f5f5f4",paddingBottom:4,gridColumn:"1/-1",marginTop:8,marginBottom:2}}>
                采购信息
              </div>
              <div><span style={{color:"#a8a29e"}}>计价方式:</span> {pricingLabel[row.pricingMethod] || row.pricingMethod || "—"}</div>
              <div><span style={{color:"#a8a29e"}}>采购数量/串数:</span> {row.purchaseQty ? `${row.purchaseQty} ${row.pricingMethod === 'by_strand' ? '串' : '个'}` : "—"}</div>
              <div><span style={{color:"#a8a29e"}}>计价单价:</span> {row.unitPrice ? `¥${Number(row.unitPrice).toFixed(2)}` : "—"}</div>
              <div><span style={{color:"#a8a29e"}}>计价单位:</span> {row.pricingUnit || "—"}</div>
              <div><span style={{color:"#a8a29e"}}>采购总价:</span> {row.purchaseTotalPrice || row.purchasePrice ? `¥${Number(row.purchaseTotalPrice || row.purchasePrice).toFixed(2)}` : "—"}</div>
              {row.pricingMethod === 'by_weight' && (
                <>
                  <div><span style={{color:"#a8a29e"}}>克单价:</span> {row.pricePerGram ? `¥${Number(row.pricePerGram).toFixed(2)}/g` : "—"}</div>
                  <div><span style={{color:"#a8a29e"}}>总克重:</span> {row.totalWeightG ? `${row.totalWeightG}g` : "—"}</div>
                </>
              )}

              <div style={{fontWeight:500,color:"#292524",borderBottom:"1px solid #f5f5f4",paddingBottom:4,gridColumn:"1/-1",marginTop:8,marginBottom:2}}>
                珠子明细
              </div>
              <div><span style={{color:"#a8a29e"}}>每串颗数:</span> {row.beadsPerStrand ? `${row.beadsPerStrand}颗/串` : "—"}</div>
              <div><span style={{color:"#a8a29e"}}>每串克重:</span> {row.weightPerStrand ? `${row.weightPerStrand}g` : "—"}</div>
              <div><span style={{color:"#a8a29e"}}>总颗数:</span> {row.totalPieces ? `${row.totalPieces}${usageUnit}` : "—"}</div>
              <div><span style={{color:"#a8a29e"}}>总克重:</span> {row.totalWeightG ? `${row.totalWeightG}g` : "—"}</div>

              <div style={{fontWeight:500,color:"#292524",borderBottom:"1px solid #f5f5f4",paddingBottom:4,gridColumn:"1/-1",marginTop:8,marginBottom:2}}>
                成本
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <span style={{color:"#a8a29e"}}>单颗成本:</span>{' '}
                <strong style={{color:"#059669",fontSize:14}}>
                  {row.costPerUsageUnit ? `¥${Number(row.costPerUsageUnit).toFixed(2)}/${usageUnit}` : "—"}
                </strong>
              </div>

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
          mode={editItem ? 'edit' : 'add'}
          initialData={editItem || undefined}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditItem(null); }}
        />
      )}

      {importModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(41,37,36,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 960, width: '100%', maxHeight: '85vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>导入库存 Excel</h3>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#78716c' }}>
                  第 1 步上传 Excel，第 2 步预览匹配结果，第 3 步确认导入。
                </p>
              </div>
              <button onClick={() => setImportModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>

            {(importError || importNotice) && (
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: importError ? '#fef2f2' : '#f0fdf4', color: importError ? '#b91c1c' : '#166534', fontSize: 12, lineHeight: 1.6 }}>
                {importError || importNotice}
              </div>
            )}

            {importStep === 'upload' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
                <div style={{ fontSize: 12, color: '#78716c', lineHeight: 1.6 }}>
                  <p style={{ margin: 0 }}>匹配规则：先按编码，找不到再按名称精确匹配。</p>
                  <p style={{ margin: 0 }}>导入会写入供应商、规格、形状、计价方式、采购数量、采购总价、珠子明细、单颗成本等完整字段。</p>
                  <p style={{ margin: 0 }}>只有库存数量变化时，才会写入 `inventory_transactions` 调整记录。</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => setImportModalOpen(false)} style={{ padding: '8px 14px', border: '1px solid #e7e5e4', borderRadius: 6, background: '#fff' }}>取消</button>
                  <button onClick={submitImportPreview} disabled={!importFile || importBusy} style={{ padding: '8px 14px', border: 'none', borderRadius: 6, background: '#292524', color: '#fff', cursor: 'pointer', opacity: !importFile || importBusy ? 0.6 : 1 }}>
                    {importBusy ? '生成中...' : '生成预览'}
                  </button>
                </div>
              </div>
            )}

            {importStep === 'preview' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ maxHeight: 420, overflow: 'auto', border: '1px solid #e7e5e4', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ background: '#fafaf9' }}>
                      <tr>
                        {['原料编码', '名称', '完整字段', '自动分类', '匹配方式', '当前库存', 'Excel库存', '差异', '当前单价', 'Excel单价', '动作'].map((h) => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e7e5e4' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, idx) => (
                        <tr key={row.rowNum || idx} style={{ borderBottom: '1px solid #f5f5f4' }}>
                          <td style={{ padding: '10px 12px' }}>{row.code}</td>
                          <td style={{ padding: '10px 12px' }}>{row.name}</td>
                          <td style={{ padding: '10px 12px', color: row.completeFields >= 5 ? '#16a34a' : '#d97706' }}>
                            {row.fullFieldStatus || (row.completeFields >= 5 ? '已读取供应商/规格/形状/采购价/珠子明细' : '字段不完整')}
                          </td>
                          <td style={{ padding: '10px 12px' }}>{displayMaterialType(row.materialType)}</td>
                          <td style={{ padding: '10px 12px' }}>{row.matchMethod || (row.matched ? '编码' : '未匹配')}</td>
                          <td style={{ padding: '10px 12px' }}>{row.currentRemaining ?? '—'}</td>
                          <td style={{ padding: '10px 12px' }}>{row.excelRemaining}</td>
                          <td style={{ padding: '10px 12px' }}>{row.difference ?? '—'}</td>
                          <td style={{ padding: '10px 12px' }}>{row.currentUnitCost ?? '—'}</td>
                          <td style={{ padding: '10px 12px' }}>{row.excelUnitCost ?? '—'}</td>
                          <td style={{ padding: '10px 12px' }}>{row.action === 'create' ? '新建' : row.matched ? '更新' : '跳过'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setImportStep('upload')} style={{ padding: '8px 14px', border: '1px solid #e7e5e4', borderRadius: 6, background: '#fff' }}>重新选择文件</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setImportModalOpen(false)} style={{ padding: '8px 14px', border: '1px solid #e7e5e4', borderRadius: 6, background: '#fff' }}>取消</button>
                    <button onClick={applyImport} disabled={importBusy} style={{ padding: '8px 14px', border: 'none', borderRadius: 6, background: '#292524', color: '#fff', cursor: 'pointer', opacity: importBusy ? 0.6 : 1 }}>
                      {importBusy ? '导入中...' : '确认导入'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {importStep === 'result' && (
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ background: '#f0fdf4', color: '#166534', padding: 12, borderRadius: 8, fontSize: 12 }}>
                  导入完成：已更新 {importResults?.updated || 0} 条，已新建 {importResults?.created || 0} 条，跳过 {importResults?.skipped || 0} 条。
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setImportModalOpen(false)} style={{ padding: '8px 14px', border: 'none', borderRadius: 6, background: '#292524', color: '#fff' }}>关闭</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
