"use client";
import { useState } from "react";
import { Plus, ArrowDown, ArrowUp, RefreshCw, Download, Search, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useSort } from "@/hooks/useSort";

interface Material {
  id: number;
  code: string;
  name: string;
  category: string;
  specification: string | null;
  materialType: string;
  inventoryUnit: string;
  remaining: number;
  unitCost: number | null;
  status: string;
  shape: string | null;
  beadsPerStrand: number | null;
  weightPerStrand: number | null;
  defaultPurchaseUnit: string | null;
  defaultConversionRate: number | null;
}

/** 格式化采购库存显示 */
function purchaseStock(remaining: number, purUnit: string | null, rate: number | null): string {
  if (purUnit && rate && rate > 0 && rate !== 1) {
    const qty = remaining / rate;
    const display = Number.isInteger(qty) ? qty : qty.toFixed(2);
    return `${display} ${purUnit}`;
  }
  return "-";
}

/** 格式化核算库存显示 */
function inventoryStock(remaining: number, invUnit: string): string {
  return `${remaining} ${invUnit}`;
}

/** 格式化采购单价 */
function purchaseUnitPrice(unitCost: number | null, rate: number | null): string {
  if (unitCost == null) return "-";
  if (rate && rate > 0 && rate !== 1) {
    return `¥${(unitCost * rate).toFixed(2)}`;
  }
  return "-";
}

/** 格式化核算单价 */
function inventoryUnitPrice(unitCost: number | null): string {
  if (unitCost == null) return "-";
  return `¥${unitCost.toFixed(2)}`;
}
interface Transaction {
  id: number;
  materialId: number;
  type: string;
  quantity: number;
  beforeQty: number;
  afterQty: number;
  remark: string | null;
  createdAt: Date;
  material?: { code: string; name: string; inventoryUnit: string };
}

const typeMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  IN: { label: "入库", color: "#16a34a", icon: <ArrowDown size={12} /> },
  OUT: { label: "出库", color: "#dc2626", icon: <ArrowUp size={12} /> },
  ADJUST: { label: "调整", color: "#d97706", icon: <RefreshCw size={12} /> },
};

export default function InventoryClient({ materials, transactions, showCost = true }: { materials: Material[]; transactions: Transaction[]; showCost?: boolean }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ materialId: 0, type: "OUT", quantity: 0, remark: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  // ── 分类汇总统计 ──
  const beadMaterials = materials.filter((m) => m.materialType === "BEAD");
  const metalMaterials = materials.filter((m) => m.materialType === "METAL");
  const beadTotalCount = beadMaterials.reduce((sum, m) => sum + m.remaining, 0);
  const metalTotalCount = metalMaterials.reduce((sum, m) => sum + m.remaining, 0);
  const beadTotalValue = beadMaterials.reduce((sum, m) => sum + (m.unitCost ?? 0) * m.remaining, 0);
  const metalTotalValue = metalMaterials.reduce((sum, m) => sum + (m.unitCost ?? 0) * m.remaining, 0);
  const allTotalValue = beadTotalValue + metalTotalValue;

  // 库存概览排序
  const { sorted: sortedMaterials, sortKey: materialsSortKey, sortDir: materialsSortDir, toggleSort: toggleMaterialsSort } = useSort(materials);

  // 库存概览搜索过滤（在排序后过滤）
  const filteredMaterials = searchQuery
    ? sortedMaterials.filter((m) => {
        const q = searchQuery.toLowerCase();
        return m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
      })
    : sortedMaterials;
  const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMaterials = filteredMaterials.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // 库存流水搜索过滤 & 分页
  const [txnSearchQuery, setTxnSearchQuery] = useState("");
  const [txnPage, setTxnPage] = useState(1);
  
  // 库存流水排序
  const { sorted: sortedTxns, sortKey: txnSortKey, sortDir: txnSortDir, toggleSort: toggleTxnSort } = useSort(transactions);
  
  const filteredTxns = txnSearchQuery
    ? sortedTxns.filter((t) => {
        const q = txnSearchQuery.toLowerCase();
        return t.material?.code.toLowerCase().includes(q) || t.material?.name.toLowerCase().includes(q) || (t.remark || "").toLowerCase().includes(q);
      })
    : sortedTxns;
  const txnTotalPages = Math.max(1, Math.ceil(filteredTxns.length / PAGE_SIZE));
  const safeTxnPage = Math.min(txnPage, txnTotalPages);
  const paginatedTxns = filteredTxns.slice((safeTxnPage - 1) * PAGE_SIZE, safeTxnPage * PAGE_SIZE);

  function handleSearch(q: string) { setSearchQuery(q); setCurrentPage(1); }
  function handleTxnSearch(q: string) { setTxnSearchQuery(q); setTxnPage(1); }

  // 渲染库存概览排序表头（左对齐）
  function renderMaterialsSortTh(label: string, key: string) {
    const isActive = materialsSortKey === key;
    const icon = isActive
      ? materialsSortDir === "asc"
        ? <ArrowUp size={12} />
        : <ArrowDown size={12} />
      : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return (
      <th
        className="text-left p-3 whitespace-nowrap cursor-pointer select-none hover:bg-[rgba(180,83,9,0.08)]"
        style={{ color: isActive ? "#b45309" : "var(--ink-light)" }}
        onClick={() => toggleMaterialsSort(key)}
        title={`按${label}排序`}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {label}
          <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
        </span>
      </th>
    );
  }

  // 渲染库存概览排序表头（右对齐）
  function renderMaterialsSortThRight(label: string, key: string) {
    const isActive = materialsSortKey === key;
    const icon = isActive
      ? materialsSortDir === "asc"
        ? <ArrowUp size={12} />
        : <ArrowDown size={12} />
      : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return (
      <th
        className="text-right p-3 whitespace-nowrap cursor-pointer select-none hover:bg-[rgba(180,83,9,0.08)]"
        style={{ color: isActive ? "#b45309" : "var(--ink-light)" }}
        onClick={() => toggleMaterialsSort(key)}
        title={`按${label}排序`}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end", width: "100%" }}>
          {label}
          <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
        </span>
      </th>
    );
  }

  // 渲染库存流水排序表头（左对齐）
  function renderTxnSortTh(label: string, key: string) {
    const isActive = txnSortKey === key;
    const icon = isActive
      ? txnSortDir === "asc"
        ? <ArrowUp size={12} />
        : <ArrowDown size={12} />
      : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return (
      <th
        className="text-left p-3 whitespace-nowrap cursor-pointer select-none hover:bg-[rgba(180,83,9,0.08)]"
        style={{ color: isActive ? "#b45309" : "var(--ink-light)" }}
        onClick={() => toggleTxnSort(key)}
        title={`按${label}排序`}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {label}
          <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
        </span>
      </th>
    );
  }

  // 渲染库存流水排序表头（右对齐）
  function renderTxnSortThRight(label: string, key: string) {
    const isActive = txnSortKey === key;
    const icon = isActive
      ? txnSortDir === "asc"
        ? <ArrowUp size={12} />
        : <ArrowDown size={12} />
      : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return (
      <th
        className="text-right p-3 whitespace-nowrap cursor-pointer select-none hover:bg-[rgba(180,83,9,0.08)]"
        style={{ color: isActive ? "#b45309" : "var(--ink-light)" }}
        onClick={() => toggleTxnSort(key)}
        title={`按${label}排序`}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end", width: "100%" }}>
          {label}
          <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
        </span>
      </th>
    );
  }

  // 渲染库存流水排序表头（居中）
  function renderTxnSortThCenter(label: string, key: string) {
    const isActive = txnSortKey === key;
    const icon = isActive
      ? txnSortDir === "asc"
        ? <ArrowUp size={12} />
        : <ArrowDown size={12} />
      : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return (
      <th
        className="text-center p-3 whitespace-nowrap cursor-pointer select-none hover:bg-[rgba(180,83,9,0.08)]"
        style={{ color: isActive ? "#b45309" : "var(--ink-light)" }}
        onClick={() => toggleTxnSort(key)}
        title={`按${label}排序`}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "center", width: "100%" }}>
          {label}
          <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
        </span>
      </th>
    );
  }

  function openNew() {
    setForm({ materialId: materials[0]?.id ?? 0, type: "OUT", quantity: 0, remark: "" });
    setOpen(true);
  }
  function handleExport() { window.open("/api/export?type=inventory", "_blank"); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      materialId: Number(form.materialId),
      type: form.type,
      remark: form.remark,
    };
    if (form.type === "ADJUST") {
      body.newQuantity = Number(form.quantity);
    } else {
      body.quantity = Number(form.quantity);
    }
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    location.reload();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] p-6 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>库存中心</h1>
        <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-light)" }} />
              <input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="搜索编码或名称…"
                className="w-48 pl-9 pr-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "var(--border)" }}>
            <Download size={16} />导出
          </button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#b45309" }}>
            <Plus size={16} />库存操作
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-4">
        {/* 分类汇总卡片 */}
        <div className="grid grid-cols-3 gap-3 shrink-0">
          {/* 珠子系统 */}
          <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--paper)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "var(--ink-light)" }}>珠子系统</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(180,83,9,0.08)", color: "#b45309" }}>
                {beadMaterials.length} 种
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono" style={{ color: "var(--ink)" }}>
                {beadTotalCount.toLocaleString()}
              </span>
              <span className="text-sm" style={{ color: "var(--ink-light)" }}>颗</span>
            </div>
            {showCost && (
            <div className="text-xs mt-1" style={{ color: "var(--ink-light)" }}>
              库存总值 <span style={{ color: "#b45309", fontWeight: 600 }}>¥{beadTotalValue.toFixed(2)}</span>
            </div>
            )}
          </div>

          {/* 配件系统 */}
          <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--paper)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "var(--ink-light)" }}>配件系统</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(100,116,139,0.08)", color: "#64748b" }}>
                {metalMaterials.length} 种
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono" style={{ color: "var(--ink)" }}>
                {metalTotalCount.toLocaleString()}
              </span>
              <span className="text-sm" style={{ color: "var(--ink-light)" }}>个</span>
            </div>
            {showCost && (
            <div className="text-xs mt-1" style={{ color: "var(--ink-light)" }}>
              库存总值 <span style={{ color: "#64748b", fontWeight: 600 }}>¥{metalTotalValue.toFixed(2)}</span>
            </div>
            )}
          </div>

          {/* 总计 */}
          <div className="rounded-xl border p-4" style={{ borderColor: "rgba(180,83,9,0.15)", background: "linear-gradient(135deg, rgba(180,83,9,0.04), rgba(251,191,36,0.02))" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "var(--ink-light)" }}>合计</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(180,83,9,0.12)", color: "#b45309" }}>
                {materials.length} 种
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono" style={{ color: "#b45309" }}>
                {showCost ? `¥${allTotalValue.toFixed(0)}` : `${materials.length} 种材料`}
              </span>
              {showCost && <span className="text-sm" style={{ color: "var(--ink-light)" }}>库存总值</span>}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--ink-light)" }}>
              珠子 {beadTotalCount.toLocaleString()} 颗 + 配件 {metalTotalCount.toLocaleString()} 个
            </div>
          </div>
        </div>

        {/* 库存概览 */}
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          <h2 className="text-sm font-medium shrink-0" style={{ color: "var(--ink-light)" }}>材料库存</h2>
          <div className="flex-1 min-h-0 bg-[var(--paper)] rounded-xl border border-[var(--border)] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="relative z-10">
              <tr style={{ background: "rgba(245,240,230,0.95)", color: "var(--ink-light)", position: "sticky", top: 0 }}>
                {/* 编号 - 需要 sticky left-0 */}
                <th
                  className="text-left p-3 whitespace-nowrap sticky left-0 z-20 cursor-pointer select-none hover:bg-[rgba(180,83,9,0.08)]"
                  style={{ background: "rgba(245,240,230,0.95)", color: materialsSortKey === "code" ? "#b45309" : "var(--ink-light)" }}
                  onClick={() => toggleMaterialsSort("code")}
                  title="按编号排序"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    编号
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      {materialsSortKey === "code"
                        ? materialsSortDir === "asc"
                          ? <ArrowUp size={12} />
                          : <ArrowDown size={12} />
                        : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                    </span>
                  </span>
                </th>
                {renderMaterialsSortTh("名称", "name")}
                {renderMaterialsSortTh("规格", "specification")}
                {renderMaterialsSortTh("形状", "shape")}
                {renderMaterialsSortThRight("颗数/条", "beadsPerStrand")}
                {renderMaterialsSortThRight("克重/条", "weightPerStrand")}
                <th className="text-right p-3">采购库存</th>
                {renderMaterialsSortThRight("核算库存", "remaining")}
                {showCost && <th className="text-right p-3">采购单价</th>}
                {showCost && renderMaterialsSortThRight("核算单价", "unitCost")}
                {showCost && <th className="text-right p-3">库存总值</th>}
                <th className="text-center p-3">状态</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMaterials.map((m) => {
                const lowStock = m.remaining < 50;
                return (
                  <tr key={m.id} className="border-t border-[var(--border)] hover:bg-[rgba(245,240,230,0.4)]">
                    <td className="p-3 font-mono text-xs">{m.code}</td>
                    <td className="p-3 font-medium">{m.name}</td>
                    <td className="p-3 text-xs" style={{ color: "var(--ink-light)" }}>{m.specification || "-"}</td>
                    <td className="p-3 text-xs">{m.shape || "-"}</td>
                    <td className="p-3 text-right font-mono text-xs">{m.beadsPerStrand != null ? m.beadsPerStrand.toFixed(2) : "-"}</td>
                    <td className="p-3 text-right font-mono text-xs">{m.weightPerStrand != null ? `${m.weightPerStrand.toFixed(2)}g` : "-"}</td>
                    <td className="p-3 text-right font-mono font-medium" style={{ color: lowStock ? "#dc2626" : "inherit" }}>
                      {purchaseStock(m.remaining, m.defaultPurchaseUnit, m.defaultConversionRate)}
                    </td>
                    <td className="p-3 text-right font-mono font-medium" style={{ color: lowStock ? "#dc2626" : "inherit" }}>
                      {inventoryStock(m.remaining, m.inventoryUnit)}
                    </td>
                    {showCost && (
                    <td className="p-3 text-right font-mono text-xs" style={{ color: "var(--ink-light)" }}>
                      {purchaseUnitPrice(m.unitCost, m.defaultConversionRate)}
                    </td>
                    )}
                    {showCost && (
                    <td className="p-3 text-right font-mono">{inventoryUnitPrice(m.unitCost)}</td>
                    )}
                    {showCost && (
                    <td className="p-3 text-right font-mono" style={{ color: "var(--zhu)" }}>¥{((m.unitCost ?? 0) * m.remaining).toFixed(2)}</td>
                    )}
                    <td className="p-3 text-center">
                      {lowStock ? (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}>
                          库存不足
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(22,163,74,0.1)", color: "#16a34a" }}>
                          正常
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredMaterials.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-6 text-center" style={{ color: "var(--ink-light)" }}>
                    {searchQuery ? `未找到匹配"${searchQuery}"的材料` : "暂无材料数据"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--ink-light)" }}>共 {filteredMaterials.length} 条 · 第 {safePage}/{totalPages} 页</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={safePage <= 1} className="p-2 rounded-md text-xs disabled:opacity-30 hover:bg-[rgba(245,240,230,0.6)]">首页</button>
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="p-2 rounded-md disabled:opacity-30 hover:bg-[rgba(245,240,230,0.6)]"><ChevronLeft size={14} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setCurrentPage(p)} className="w-8 h-8 rounded-md text-xs font-mono" style={safePage === p ? { background: "#b45309", color: "#fff" } : { color: "var(--ink)" }}>{p}</button>
                ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="p-2 rounded-md disabled:opacity-30 hover:bg-[rgba(245,240,230,0.6)]"><ChevronRight size={14} /></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={safePage >= totalPages} className="p-2 rounded-md text-xs disabled:opacity-30 hover:bg-[rgba(245,240,230,0.6)]">末页</button>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* 库存事务流水 */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h2 className="text-sm font-medium" style={{ color: "var(--ink-light)" }}>库存流水</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-light)" }} />
            <input
              value={txnSearchQuery}
              onChange={(e) => handleTxnSearch(e.target.value)}
              placeholder="搜索材料或备注…"
              className="w-48 pl-9 pr-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-[var(--paper)] rounded-xl border border-[var(--border)] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="relative z-10">
              <tr style={{ background: "rgba(245,240,230,0.95)", color: "var(--ink-light)", position: "sticky", top: 0 }}>
                {/* 时间 - 需要 sticky left-0 */}
                <th
                  className="text-left p-3 whitespace-nowrap sticky left-0 z-20 cursor-pointer select-none hover:bg-[rgba(180,83,9,0.08)]"
                  style={{ background: "rgba(245,240,230,0.95)", color: txnSortKey === "createdAt" ? "#b45309" : "var(--ink-light)" }}
                  onClick={() => toggleTxnSort("createdAt")}
                  title="按时间排序"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    时间
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      {txnSortKey === "createdAt"
                        ? txnSortDir === "asc"
                          ? <ArrowUp size={12} />
                          : <ArrowDown size={12} />
                        : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                    </span>
                  </span>
                </th>
                {renderTxnSortTh("材料", "material.code")}
                {renderTxnSortThCenter("类型", "type")}
                {renderTxnSortThRight("变动量", "quantity")}
                {renderTxnSortThRight("变动前", "beforeQty")}
                {renderTxnSortThRight("变动后", "afterQty")}
                {renderTxnSortTh("备注", "remark")}
              </tr>
            </thead>
            <tbody>
              {paginatedTxns.map((t) => {
                const tp = typeMap[t.type] ?? { label: t.type, color: "#78716c", icon: null };
                return (
                  <tr key={t.id} className="border-t border-[var(--border)] hover:bg-[rgba(245,240,230,0.4)]">
                    <td className="p-3 text-xs" style={{ color: "var(--ink-light)" }}>
                      {new Date(t.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-xs">{t.material?.code}</span>
                      <span className="ml-1">{t.material?.name}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: `${tp.color}15`, color: tp.color }}>
                        {tp.icon} {tp.label}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono" style={{ color: t.type === "IN" ? "#16a34a" : t.type === "OUT" ? "#dc2626" : "#d97706" }}>
                      {t.type === "IN" ? "+" : t.type === "OUT" ? "-" : "±"}{t.quantity}
                    </td>
                    <td className="p-3 text-right font-mono text-xs" style={{ color: "var(--ink-light)" }}>{t.beforeQty}</td>
                    <td className="p-3 text-right font-mono font-medium">{t.afterQty}</td>
                    <td className="p-3 text-xs" style={{ color: "var(--ink-light)" }}>{t.remark || "-"}</td>
                  </tr>
                );
              })}
              {filteredTxns.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center" style={{ color: "var(--ink-light)" }}>
                    {txnSearchQuery ? `未找到匹配"${txnSearchQuery}"的流水记录` : "暂无库存流水"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          {txnTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--ink-light)" }}>共 {filteredTxns.length} 条 · 第 {safeTxnPage}/{txnTotalPages} 页</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setTxnPage(1)} disabled={safeTxnPage <= 1} className="p-2 rounded-md text-xs disabled:opacity-30 hover:bg-[rgba(245,240,230,0.6)]">首页</button>
                <button onClick={() => setTxnPage((p) => Math.max(1, p - 1))} disabled={safeTxnPage <= 1} className="p-2 rounded-md disabled:opacity-30 hover:bg-[rgba(245,240,230,0.6)]"><ChevronLeft size={14} /></button>
                {Array.from({ length: txnTotalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setTxnPage(p)} className="w-8 h-8 rounded-md text-xs font-mono" style={safeTxnPage === p ? { background: "#b45309", color: "#fff" } : { color: "var(--ink)" }}>{p}</button>
                ))}
                <button onClick={() => setTxnPage((p) => Math.min(txnTotalPages, p + 1))} disabled={safeTxnPage >= txnTotalPages} className="p-2 rounded-md disabled:opacity-30 hover:bg-[rgba(245,240,230,0.6)]"><ChevronRight size={14} /></button>
                <button onClick={() => setTxnPage(txnTotalPages)} disabled={safeTxnPage >= txnTotalPages} className="p-2 rounded-md text-xs disabled:opacity-30 hover:bg-[rgba(245,240,230,0.6)]">末页</button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* 库存操作弹窗 */}
      <Modal open={open} onClose={() => setOpen(false)} title="库存操作">
        <form onSubmit={save} className="space-y-4">
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>选择材料 *</span>
            <select
              value={String(form.materialId)}
              onChange={(e) => setForm({ ...form, materialId: Number(e.target.value) })}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <option value="">请选择材料</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}（{m.code}）· 当前：{inventoryStock(m.remaining, m.inventoryUnit)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>操作类型 *</span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              <option value="OUT">出库（生产消耗）</option>
              <option value="ADJUST">调整（盘点校正）</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>数量 *</span>
            <input
              type="number"
              step="0.01"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              style={{ borderColor: "var(--border)" }}
              placeholder={form.type === "ADJUST" ? "调整后的目标数量" : "正数"}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>备注</span>
            <input
              type="text"
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
              placeholder="如：生产订单#001"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "var(--border)" }}>取消</button>
            <button type="submit" className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#b45309" }}>确认</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
