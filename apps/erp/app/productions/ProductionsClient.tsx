"use client";

import { useState } from "react";
import { ClipboardCheck, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useSort } from "@/hooks/useSort";

interface ProductionRecord {
  id: number;
  skuCode: string;
  skuName: string;
  seriesName: string;
  workName: string;
  quantity: number;
  materialCost: number;
  laborCost: number;
  packagingCost: number;
  totalCost: number;
  unitCost: number;
  remark: string | null;
  createdAt: string;
}

interface SkuOption {
  id: number;
  code: string;
  name: string;
  seriesName: string;
  workName: string;
  finishedStock: number;
  price: number;
  boms: { materialId: number; materialName: string; quantity: number; inventoryUnit: string; remaining: number }[];
}

export default function ProductionsClient({
  records,
  skus,
}: {
  records: ProductionRecord[];
  skus: SkuOption[];
}) {
  const [showNew, setShowNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const { sorted: sortedList, sortKey, sortDir, toggleSort } = useSort(records);

  const filtered = searchQuery
    ? sortedList.filter((r) => {
        const q = searchQuery.toLowerCase();
        return r.skuCode.toLowerCase().includes(q) || r.skuName.toLowerCase().includes(q);
      })
    : sortedList;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearch(q: string) { setSearchQuery(q); setCurrentPage(1); }

  function formatMoney(v: number) {
    return (v / 100).toFixed(2);
  }

  return (
    <div style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, color: "var(--ink)" }}>
            生产记录
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--ink-light)" }}>
            记录每次生产，自动扣减材料库存，更新成品库存与成本
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 22px", borderRadius: 10,
            background: "linear-gradient(135deg, #b45309, #92400e)",
            color: "#fff", border: "none", cursor: "pointer",
            fontSize: "0.85rem", fontWeight: 600,
            boxShadow: "0 2px 12px rgba(180,83,9,0.3)",
          }}
        >
          <Plus size={16} /> 新建生产
        </button>
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-light)", opacity: 0.5 }} />
          <input
            type="text"
            placeholder="搜索 SKU 编码或名称..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px 10px 36px",
              borderRadius: 10, border: "1px solid var(--border)",
              background: "var(--paper)", fontSize: "0.83rem", color: "var(--ink)",
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--paper)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--ink-light)", fontWeight: 500 }}>日期</th>
              <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--ink-light)", fontWeight: 500 }}>SKU</th>
              <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--ink-light)", fontWeight: 500 }}>作品</th>
              <th style={{ textAlign: "right", padding: "12px 16px", color: "var(--ink-light)", fontWeight: 500 }}>数量</th>
              <th style={{ textAlign: "right", padding: "12px 16px", color: "var(--ink-light)", fontWeight: 500 }}>材料成本</th>
              <th style={{ textAlign: "right", padding: "12px 16px", color: "var(--ink-light)", fontWeight: 500 }}>人工</th>
              <th style={{ textAlign: "right", padding: "12px 16px", color: "var(--ink-light)", fontWeight: 500 }}>包装</th>
              <th style={{ textAlign: "right", padding: "12px 16px", color: "var(--ink-light)", fontWeight: 500 }}>总成本</th>
              <th style={{ textAlign: "right", padding: "12px 16px", color: "var(--ink-light)", fontWeight: 500 }}>单件成本</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: "center", color: "var(--ink-light)" }}>
                  <ClipboardCheck size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p style={{ margin: 0, fontSize: "0.85rem" }}>暂无生产记录</p>
                  <p style={{ margin: "4px 0 0", fontSize: "0.78rem", opacity: 0.6 }}>点击「新建生产」开始记录</p>
                </td>
              </tr>
            )}
            {paginated.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 16px", color: "var(--ink-light)", fontSize: "0.8rem" }}>
                  {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                </td>
                <td style={{ padding: "12px 16px", fontWeight: 500 }}>{r.skuCode}</td>
                <td style={{ padding: "12px 16px" }}>{r.skuName}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>{r.quantity}</td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>¥{formatMoney(r.materialCost)}</td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>¥{formatMoney(r.laborCost)}</td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>¥{formatMoney(r.packagingCost)}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#b45309" }}>¥{formatMoney(r.totalCost)}</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontStyle: "italic", color: "var(--ink-light)" }}>¥{formatMoney(r.unitCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 20 }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--paper)", cursor: "pointer" }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: "0.83rem", color: "var(--ink-light)" }}>{safePage} / {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
            style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--paper)", cursor: "pointer" }}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* New Production Modal */}
      {showNew && (
        <NewProductionModal
          skus={skus}
          onClose={() => setShowNew(false)}
          onSuccess={() => { setShowNew(false); window.location.reload(); }}
        />
      )}
    </div>
  );
}

// ========== 新建生产弹窗 ==========

function NewProductionModal({
  skus,
  onClose,
  onSuccess,
}: {
  skus: SkuOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [skuId, setSkuId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("");
  const [laborCost, setLaborCost] = useState("0");
  const [packagingCost, setPackagingCost] = useState("0");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedSku = skus.find(s => s.id === skuId);

  const estMaterialCost = selectedSku
    ? selectedSku.boms.reduce((sum, b) => sum + b.quantity * (quantity ? parseInt(quantity) : 0) * 0, 0)
    : 0;
  const estTotal = estMaterialCost + (parseInt(laborCost) || 0) + (parseInt(packagingCost) || 0);

  async function handleSubmit() {
    setError("");
    if (!skuId) { setError("请选择SKU"); return; }
    if (!quantity || parseInt(quantity) <= 0) { setError("请输入生产数量"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/productions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skuId,
          quantity: parseInt(quantity),
          laborCost: parseInt(laborCost) || 0,
          packagingCost: parseInt(packagingCost) || 0,
          remark,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建失败");
      onSuccess();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--paper)", borderRadius: 16, padding: 32, width: 560, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: "1.1rem" }}>新建生产记录</h3>

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(220,38,38,0.08)", color: "#dc2626", fontSize: "0.82rem", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* SKU 选择 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, marginBottom: 6, color: "var(--ink-light)" }}>选择 SKU *</label>
          <select
            value={skuId}
            onChange={(e) => setSkuId(e.target.value ? parseInt(e.target.value) : "")}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: "0.85rem" }}
          >
            <option value="">-- 请选择 --</option>
            {skus.map((s) => (
              <option key={s.id} value={s.id}>{s.code} - {s.name}（{s.workName} / {s.seriesName}）</option>
            ))}
          </select>
        </div>

        {/* BOM 预览 */}
        {selectedSku && (
          <div style={{ marginBottom: 16, padding: 14, borderRadius: 10, background: "rgba(180,83,9,0.06)", border: "1px solid rgba(180,83,9,0.15)" }}>
            <p style={{ margin: "0 0 8px", fontSize: "0.8rem", fontWeight: 600, color: "#b45309" }}>BOM 材料清单</p>
            {selectedSku.boms.map((b) => (
              <div key={b.materialId} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", padding: "4px 0" }}>
                <span>{b.materialName} × {b.quantity}{b.inventoryUnit}/件</span>
                <span style={{ color: "var(--ink-light)" }}>库存: {b.remaining}{b.inventoryUnit}</span>
              </div>
            ))}
          </div>
        )}

        {/* 生产数量 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, marginBottom: 6, color: "var(--ink-light)" }}>生产数量 *</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="输入生产数量"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: "0.85rem", boxSizing: "border-box" }}
          />
        </div>

        {/* 人工成本 & 包装成本 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, marginBottom: 6, color: "var(--ink-light)" }}>人工成本（分）</label>
            <input type="number" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: "0.85rem", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, marginBottom: 6, color: "var(--ink-light)" }}>包装成本（分）</label>
            <input type="number" value={packagingCost} onChange={(e) => setPackagingCost(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: "0.85rem", boxSizing: "border-box" }} />
          </div>
        </div>

        {/* 备注 */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, marginBottom: 6, color: "var(--ink-light)" }}>备注</label>
          <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: "0.85rem", resize: "vertical", boxSizing: "border-box" }} />
        </div>

        {/* 按钮 */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--paper)", cursor: "pointer", fontSize: "0.85rem" }}>取消</button>
          <button onClick={handleSubmit} disabled={saving}
            style={{
              padding: "10px 28px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
              background: saving ? "#999" : "linear-gradient(135deg, #b45309, #92400e)", color: "#fff",
            }}>
            {saving ? "提交中..." : "确认生产"}
          </button>
        </div>
      </div>
    </div>
  );
}
