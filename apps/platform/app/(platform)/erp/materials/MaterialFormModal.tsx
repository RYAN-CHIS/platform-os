"use client";
/**
 * MaterialFormModal — ERP材料新增/编辑弹窗（分区卡片式 + 自动计算）
 * WO-MODAL-REDESIGN
 */
import { useState, useCallback, useMemo } from "react";

interface Props {
  mode: "add" | "edit";
  initialData?: Record<string, any>;
  onSave: (data: Record<string, any>) => Promise<void>;
  onClose: () => void;
}

const CATEGORIES = ["水晶", "玉石", "配件", "瓷器", "皮具", "包装", "其他"];

const SHAPES = ["圆珠", "桶珠", "苹果珠", "算盘珠", "雕刻", "随形", "其他"];

type PricingMode = "by_piece" | "by_weight" | "by_strand" | "by_item";

export default function MaterialFormModal({ mode, initialData, onSave, onClose }: Props) {
  // ── Form state ──
  const [f, setF] = useState<Record<string, any>>(() => ({
    code: initialData?.code ?? "",
    name: initialData?.name ?? "",
    category: initialData?.category ?? "",
    specification: initialData?.specification ?? "",
    shape: initialData?.shape ?? "",
    remark: initialData?.remark ?? "",
    // pricing
    pricingMode: initialData?.pricingMethod || initialData?.pricingMode || "by_weight",
    purchaseWeight: initialData?.totalWeightG ?? 0,
    pricePerGram: initialData?.pricePerGram ?? 0,
    purchaseBeadCount: initialData?.totalPieces ?? 0,
    purchaseQty: initialData?.purchaseQty ?? 0,
    unitPrice: initialData?.unitPrice ?? 0,
    strandCount: initialData?.strandCount ?? 0,
    beadsPerStrand: initialData?.beadsPerStrand ?? 0,
    strandPrice: initialData?.strandPrice ?? 0,
    purchaseTotalPrice: initialData?.purchaseTotalPrice ?? 0,
    // inventory
    remaining: initialData?.remaining ?? 0,
    safetyStock: initialData?.safetyStock ?? 0,
    // ext
    supplier: initialData?.supplier ?? "",
    purchaseMethod: initialData?.purchaseMethod ?? "",
    status: initialData?.status || "ACTIVE",
    materialType: initialData?.materialType || "BEAD",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sections, setSections] = useState<Record<string, boolean>>({
    basic: true,
    purchase: true,
    inventory: false,
    ext: false,
  });

  const toggleSection = (k: string) => setSections((p) => ({ ...p, [k]: !p[k] }));

  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  // ── Auto calculations ──
  const calc = useMemo(() => {
    const pm = f.pricingMode as PricingMode;
    let totalPrice = 0;
    let totalPieces = 0;
    let singleCost = 0;
    let formulaParts: string[] = [];

    if (pm === "by_weight") {
      const w = parseFloat(f.purchaseWeight) || 0;
      const pg = parseFloat(f.pricePerGram) || 0;
      const bc = parseInt(f.purchaseBeadCount) || 0;
      totalPrice = w * pg;
      totalPieces = bc;
      singleCost = totalPieces > 0 ? totalPrice / totalPieces : 0;
      if (w && pg) formulaParts.push(`${w} × ${pg} = ${totalPrice.toFixed(2)}`);
      if (totalPrice && totalPieces) formulaParts.push(`${totalPrice.toFixed(2)} ÷ ${totalPieces} = ${singleCost.toFixed(2)} 元/${getUsageUnit()}`);
    } else if (pm === "by_piece") {
      const qty = parseInt(f.purchaseQty) || 0;
      const up = parseFloat(f.unitPrice) || 0;
      totalPrice = qty * up;
      totalPieces = qty;
      singleCost = up;
      if (qty && up) formulaParts.push(`${qty} × ${up} = ${totalPrice.toFixed(2)}`);
    } else if (pm === "by_strand") {
      const sc = parseInt(f.strandCount) || 0;
      const bps = parseInt(f.beadsPerStrand) || 0;
      const sp = parseFloat(f.strandPrice) || 0;
      totalPieces = sc * bps;
      totalPrice = sc * sp;
      singleCost = totalPieces > 0 ? totalPrice / totalPieces : 0;
      if (sc && bps) formulaParts.push(`总颗数 = ${sc}串 × ${bps}颗 = ${totalPieces}颗`);
      if (totalPrice && totalPieces) formulaParts.push(`单颗成本 = ${totalPrice.toFixed(2)} ÷ ${totalPieces} = ${singleCost.toFixed(2)} 元/${getUsageUnit()}`);
    } else {
      // by_item
      const qty = parseInt(f.purchaseQty) || 0;
      const up = parseFloat(f.unitPrice) || 0;
      totalPrice = qty * up;
      totalPieces = qty;
      singleCost = up;
    }
    return { totalPrice, totalPieces, singleCost, formulaParts };
  }, [f.pricingMode, f.purchaseWeight, f.pricePerGram, f.purchaseBeadCount, f.purchaseQty, f.unitPrice, f.strandCount, f.beadsPerStrand, f.strandPrice]);

  function getUsageUnit() {
    const mt = f.materialType;
    if (mt === "BEAD") return "颗";
    if (mt === "METAL") return "个";
    return "件";
  }

  const handleSave = async () => {
    // Validate
    if (!f.name?.trim()) { setError("请输入材料名称"); return; }
    if (!f.code?.trim()) { setError("请输入材料编码"); return; }
    setError("");
    setSaving(true);
    try {
      const data: Record<string, any> = {
        ...f,
        unitCost: f.unitPrice || 0,
        materialType: "BEAD",
        inventoryUnit: getUsageUnit(),
        usageUnit: getUsageUnit(),
        pricingMethod: f.pricingMode,
        totalWeightG: parseFloat(f.purchaseWeight) || 0,
        pricePerGram: parseFloat(f.pricePerGram) || 0,
        totalPieces: calc.totalPieces,
        purchasePrice: calc.totalPrice,
        costPerUsageUnit: calc.singleCost,
        purchaseQty: parseInt(f.purchaseQty) || 0,
        unitPrice: parseFloat(f.unitPrice) || 0,
        beadsPerStrand: parseInt(f.beadsPerStrand) || 0,
        strandCount: parseInt(f.strandCount) || 0,
        strandPrice: parseFloat(f.strandPrice) || 0,
        remaining: parseInt(f.remaining) || 0,
        safetyStock: parseInt(f.safetyStock) || 0,
      };
      await onSave(data);
    } catch (e: any) {
      setError(e.message || "保存失败");
    }
    setSaving(false);
  };

  // ── Styles ──
  const sectionHeader: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    cursor: "pointer", padding: "10px 0", userSelect: "none",
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 14, fontWeight: 600, color: "#292524", letterSpacing: "0.02em",
  };
  const sectionDesc: React.CSSProperties = {
    fontSize: 11, color: "#a8a29e", marginTop: 1,
  };
  const fieldLabel: React.CSSProperties = {
    display: "block", fontSize: 12, color: "#57534e", marginBottom: 3, fontWeight: 500,
  };
  const input: React.CSSProperties = {
    width: "100%", height: 36, padding: "0 10px", border: "1px solid #d6d3d1",
    borderRadius: 6, fontSize: 13, outline: "none", background: "#fff",
    boxSizing: "border-box", fontFamily: "inherit",
  };
  const select: React.CSSProperties = { ...input, cursor: "pointer" };
  const numInput: React.CSSProperties = { ...input, MozAppearance: "textfield" };
  const gridCol2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        display: "flex", flexDirection: "column", background: "#fff", borderRadius: 12,
        width: "100%", maxWidth: 860, maxHeight: "85vh", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #e7e5e4", flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#1c1917", letterSpacing: "0.02em" }}>
            {mode === "add" ? "新增材料" : "编辑材料"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#a8a29e" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {error && (
            <div style={{ background: "#fef2f2", color: "#dc2626", padding: "8px 12px", borderRadius: 6, fontSize: 13, marginBottom: 16 }}>{error}</div>
          )}

          {/* ── 基础信息 ── */}
          <div style={{ marginBottom: 20 }}>
            <div onClick={() => toggleSection("basic")} style={sectionHeader}>
              <div>
                <div style={sectionTitle}>基础信息</div>
                <div style={sectionDesc}>材料基础信息，用于库存识别与 BOM 匹配</div>
              </div>
              <span style={{ color: "#a8a29e", fontSize: 12 }}>{sections.basic ? "收起" : "展开"}</span>
            </div>
            {sections.basic && (
              <div style={gridCol2}>
                <div>
                  <label style={fieldLabel}>材料编码 *</label>
                  <input value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="如 MAT-001" style={input} />
                </div>
                <div>
                  <label style={fieldLabel}>名称 *</label>
                  <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="如 白兔毛" style={input} />
                </div>
                <div>
                  <label style={fieldLabel}>品类 *</label>
                  <select value={f.category} onChange={(e) => set("category", e.target.value)} style={select}>
                    <option value="">请选择品类</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={fieldLabel}>规格 *</label>
                  <input value={f.specification} onChange={(e) => set("specification", e.target.value)} placeholder="如 8mm / 10mm" style={input} />
                </div>
                <div>
                  <label style={fieldLabel}>形状</label>
                  <select value={f.shape} onChange={(e) => set("shape", e.target.value)} style={select}>
                    <option value="">请选择形状</option>
                    {SHAPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: "#e7e5e4", margin: "0 0 20px" }} />

          {/* ── 采购信息 ── */}
          <div style={{ marginBottom: 20 }}>
            <div onClick={() => toggleSection("purchase")} style={sectionHeader}>
              <div>
                <div style={sectionTitle}>采购信息</div>
                <div style={sectionDesc}>选择计价方式后，系统自动计算单颗成本</div>
              </div>
              <span style={{ color: "#a8a29e", fontSize: 12 }}>{sections.purchase ? "收起" : "展开"}</span>
            </div>
            {sections.purchase && (
              <div>
                {/* 计价方式 selector */}
                <div style={{ marginBottom: 12 }}>
                  <label style={fieldLabel}>计价方式 *</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { v: "by_weight", l: "按克" },
                      { v: "by_piece", l: "按颗" },
                      { v: "by_strand", l: "按串" },
                      { v: "by_item", l: "按件" },
                    ].map((opt) => (
                      <button key={opt.v} type="button" onClick={() => set("pricingMode", opt.v)}
                        style={{
                          height: 32, padding: "0 14px", borderRadius: 6, fontSize: 12,
                          cursor: "pointer", border: f.pricingMode === opt.v ? "2px solid #292524" : "1px solid #d6d3d1",
                          background: f.pricingMode === opt.v ? "#f5f5f4" : "#fff",
                          color: f.pricingMode === opt.v ? "#1c1917" : "#78716c",
                          fontWeight: f.pricingMode === opt.v ? 600 : 400,
                          fontFamily: "inherit",
                        }}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── By Weight ── */}
                {f.pricingMode === "by_weight" && (
                  <div style={gridCol2}>
                    <div>
                      <label style={fieldLabel}>总克重 (g) *</label>
                      <input type="number" value={f.purchaseWeight} onChange={(e) => set("purchaseWeight", e.target.value)} placeholder="35.3" style={numInput} />
                    </div>
                    <div>
                      <label style={fieldLabel}>克单价 (元/g) *</label>
                      <input type="number" value={f.pricePerGram} onChange={(e) => set("pricePerGram", e.target.value)} placeholder="25" style={numInput} />
                    </div>
                    <div>
                      <label style={fieldLabel}>总颗数 *</label>
                      <input type="number" value={f.purchaseBeadCount} onChange={(e) => set("purchaseBeadCount", e.target.value)} placeholder="46" style={numInput} />
                    </div>
                    {/* Formula display */}
                    {(parseFloat(f.purchaseWeight) > 0 && parseFloat(f.pricePerGram) > 0) && (
                      <div style={{ gridColumn: "1/-1", background: "#fafaf9", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#57534e", lineHeight: 1.7 }}>
                        <div>采购总价 = {f.purchaseWeight} × {f.pricePerGram} = <strong>¥{calc.totalPrice.toFixed(2)}</strong></div>
                        {calc.totalPieces > 0 && (
                          <div>单颗成本 = {calc.totalPrice.toFixed(2)} ÷ {calc.totalPieces} = <strong style={{ color: "#059669" }}>¥{calc.singleCost.toFixed(2)}/{getUsageUnit()}</strong></div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── By Piece ── */}
                {f.pricingMode === "by_piece" && (
                  <div style={gridCol2}>
                    <div>
                      <label style={fieldLabel}>采购数量 *</label>
                      <input type="number" value={f.purchaseQty} onChange={(e) => set("purchaseQty", e.target.value)} placeholder="46" style={numInput} />
                    </div>
                    <div>
                      <label style={fieldLabel}>单颗采购价 *</label>
                      <input type="number" value={f.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} placeholder="19.18" style={numInput} />
                    </div>
                    {(parseFloat(f.purchaseQty) > 0 && parseFloat(f.unitPrice) > 0) && (
                      <div style={{ gridColumn: "1/-1", background: "#fafaf9", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#57534e" }}>
                        采购总价 = {f.purchaseQty} × {f.unitPrice} = <strong>¥{calc.totalPrice.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* ── By Strand ── */}
                {f.pricingMode === "by_strand" && (
                  <div style={gridCol2}>
                    <div>
                      <label style={fieldLabel}>串数 *</label>
                      <input type="number" value={f.strandCount} onChange={(e) => set("strandCount", e.target.value)} placeholder="10" style={numInput} />
                    </div>
                    <div>
                      <label style={fieldLabel}>每串颗数 *</label>
                      <input type="number" value={f.beadsPerStrand} onChange={(e) => set("beadsPerStrand", e.target.value)} placeholder="108" style={numInput} />
                    </div>
                    <div>
                      <label style={fieldLabel}>每串采购价 *</label>
                      <input type="number" value={f.strandPrice} onChange={(e) => set("strandPrice", e.target.value)} placeholder="1500" style={numInput} />
                    </div>
                    {(parseFloat(f.strandCount) > 0 && parseFloat(f.beadsPerStrand) > 0) && (
                      <div style={{ gridColumn: "1/-1", background: "#fafaf9", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#57534e" }}>
                        <div>总颗数 = {f.strandCount}串 × {f.beadsPerStrand}颗 = <strong>{calc.totalPieces}颗</strong></div>
                        {calc.totalPrice > 0 && calc.totalPieces > 0 && (
                          <div>单颗成本 = {calc.totalPrice.toFixed(2)} ÷ {calc.totalPieces} = <strong style={{ color: "#059669" }}>¥{calc.singleCost.toFixed(2)}/{getUsageUnit()}</strong></div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── By Item ── */}
                {f.pricingMode === "by_item" && (
                  <div style={gridCol2}>
                    <div>
                      <label style={fieldLabel}>采购数量 *</label>
                      <input type="number" value={f.purchaseQty} onChange={(e) => set("purchaseQty", e.target.value)} placeholder="数量" style={numInput} />
                    </div>
                    <div>
                      <label style={fieldLabel}>单价 *</label>
                      <input type="number" value={f.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} placeholder="单价" style={numInput} />
                    </div>
                    {(parseFloat(f.purchaseQty) > 0 && parseFloat(f.unitPrice) > 0) && (
                      <div style={{ gridColumn: "1/-1", background: "#fafaf9", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#57534e" }}>
                        采购总价 = {f.purchaseQty} × {f.unitPrice} = <strong>¥{calc.totalPrice.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: "#e7e5e4", margin: "0 0 20px" }} />

          {/* ── 自动换算结果 ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...sectionHeader, cursor: "default" }}>
              <div>
                <div style={sectionTitle}>自动换算结果</div>
                <div style={sectionDesc}>系统会使用该成本参与 BOM 成本计算</div>
              </div>
            </div>
            <div style={{
              background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
              border: "1px solid #a7f3d0", borderRadius: 10, padding: "14px 18px",
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 11, color: "#6ee7b7" }}>采购总价</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#065f46" }}>¥{calc.totalPrice.toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6ee7b7" }}>总颗数</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#065f46" }}>{calc.totalPieces} {getUsageUnit()}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6ee7b7" }}>BOM使用单位</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#065f46" }}>{getUsageUnit()}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#6ee7b7" }}>单颗成本</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#059669" }}>¥{calc.singleCost.toFixed(2)}/{getUsageUnit()}</div>
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: "#e7e5e4", margin: "0 0 20px" }} />

          {/* ── 库存信息 ── */}
          <div style={{ marginBottom: 20 }}>
            <div onClick={() => toggleSection("inventory")} style={sectionHeader}>
              <div>
                <div style={sectionTitle}>库存信息</div>
                <div style={sectionDesc}>库存数量与预警设置。低于安全库存时会提醒采购。</div>
              </div>
              <span style={{ color: "#a8a29e", fontSize: 12 }}>{sections.inventory ? "收起" : "展开"}</span>
            </div>
            {sections.inventory && (
              <div style={gridCol2}>
                <div>
                  <label style={fieldLabel}>当前库存数量</label>
                  <input type="number" value={f.remaining} onChange={(e) => set("remaining", e.target.value)} placeholder="0" style={numInput} />
                </div>
                <div>
                  <label style={fieldLabel}>安全库存</label>
                  <input type="number" value={f.safetyStock} onChange={(e) => set("safetyStock", e.target.value)} placeholder="0" style={numInput} />
                </div>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: "#e7e5e4", margin: "0 0 20px" }} />

          {/* ── 扩展信息 ── */}
          <div style={{ marginBottom: 4 }}>
            <div onClick={() => toggleSection("ext")} style={sectionHeader}>
              <div>
                <div style={sectionTitle}>扩展信息</div>
                <div style={sectionDesc}>供应商、采购方式与状态</div>
              </div>
              <span style={{ color: "#a8a29e", fontSize: 12 }}>{sections.ext ? "收起" : "展开"}</span>
            </div>
            {sections.ext && (
              <div style={gridCol2}>
                <div>
                  <label style={fieldLabel}>供应商</label>
                  <input value={f.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="供应商名称" style={input} />
                </div>
                <div>
                  <label style={fieldLabel}>采购方式</label>
                  <input value={f.purchaseMethod} onChange={(e) => set("purchaseMethod", e.target.value)} placeholder="如 直接采购/定制/批发" style={input} />
                </div>
                <div>
                  <label style={fieldLabel}>状态</label>
                  <select value={f.status} onChange={(e) => set("status", e.target.value)} style={select}>
                    <option value="ACTIVE">启用</option>
                    <option value="ARCHIVED">停用</option>
                  </select>
                </div>
                <div>
                  <label style={fieldLabel}>备注</label>
                  <input value={f.remark} onChange={(e) => set("remark", e.target.value)} placeholder="备注信息" style={input} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px", borderTop: "1px solid #e7e5e4", flexShrink: 0, background: "#fafaf9",
        }}>
          <button type="button" onClick={onClose} disabled={saving} style={{
            height: 36, padding: "0 16px", borderRadius: 6, fontSize: 13,
            cursor: "pointer", border: "1px solid #d6d3d1", background: "#fff",
            color: "#44403c", fontFamily: "inherit",
          }}>
            取消
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={saving} onClick={async () => {
              setF((prev: Record<string, any>) => ({ ...prev, status: "DRAFT" }));
              await handleSave();
            }} style={{
              height: 36, padding: "0 16px", borderRadius: 6, fontSize: 13,
              cursor: saving ? "wait" : "pointer", border: "1px solid #d6d3d1",
              background: "#fff", color: "#78716c", fontFamily: "inherit",
            }}>
              保存草稿
            </button>
            <button type="button" disabled={saving} onClick={handleSave} style={{
              height: 36, padding: "0 20px", borderRadius: 6, fontSize: 13,
              cursor: saving ? "wait" : "pointer", border: "none",
              background: "#292524", color: "#fff", fontFamily: "inherit",
              opacity: saving ? 0.6 : 1,
            }}>
              {saving ? "创建中…" : mode === "add" ? "创建材料" : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
