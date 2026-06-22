"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, ShoppingCart, Download, RefreshCw, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useSort } from "@/hooks/useSort";

const materialTypeOptions = [
  { value: "BEAD", label: "珠类" },
  { value: "METAL", label: "金属" },
  { value: "CERAMIC", label: "陶瓷" },
  { value: "LEATHER", label: "皮革" },
  { value: "CORD", label: "绳线" },
  { value: "PACKAGING", label: "包装" },
  { value: "OTHER", label: "其他" },
];

const inventoryUnitOptions = [
  { value: "颗", label: "颗" },
  { value: "个", label: "个" },
  { value: "克", label: "克" },
  { value: "米", label: "米" },
  { value: "张", label: "张" },
  { value: "套", label: "套" },
  { value: "片", label: "片" },
];

const statusOptions = [
  { value: "DRAFT", label: "草稿" },
  { value: "READY", label: "就绪" },
  { value: "ACTIVE", label: "活跃" },
  { value: "PAUSED", label: "暂停" },
  { value: "ARCHIVED", label: "归档" },
];

// 分类导航配置
const CATEGORY_VIEWS = [
  { key: "", label: "全部材料", icon: "📦" },
  { key: "bead", label: "珠子系统", icon: "🫧" },
  { key: "ceramic", label: "瓷器系统", icon: "🏺" },
  { key: "metal", label: "配件系统", icon: "⚙️" },
  { key: "seal", label: "印章系统", icon: "🔖" },
];

interface RawMaterial {
  id: number;
  code: string;
  name: string;
  category: string;
  materialType: string;
  specification: string | null;
  inventoryUnit: string;
  remaining: number;
  unitCost: number | null;
  status: string;
  shape: string | null;
  beadsPerStrand: number | null;
  weightPerStrand: number | null;
  defaultPurchaseUnit: string | null;
  defaultConversionRate: number | null;
  supplier: string;
  remark: string | null;
  createdAt: Date;
}

interface PurchaseRecord {
  id: number;
  materialId: number;
  purchaseDate: string;
  supplier: string | null;
  purchaseUnit: string;
  conversionRate: number;
  purchaseQuantity: number;
  purchaseUnitPrice: number | null;
  purchasePrice: number;
  inventoryQuantity: number;
  unitCost: number | null;
  remark: string | null;
  createdAt: Date;
}

// 表单状态
interface MaterialForm {
  code: string;
  name: string;
  category: string;
  materialType: string;
  specification: string;
  inventoryUnit: string;
  status: string;
  shape: string;
  beadsPerStrand: string;
  weightPerStrand: string;
  defaultPurchaseUnit: string;
  defaultConversionRate: string;
  supplier: string;
  remark: string;
  // 首次成本核算（新增时使用）
  initialPurchasePrice: string;
  initialPurchaseQuantity: string;
}

function emptyMaterialForm(): MaterialForm {
  return {
    code: "",
    name: "",
    category: "",
    materialType: "BEAD",
    specification: "",
    inventoryUnit: "颗",
    status: "READY",
    shape: "",
    beadsPerStrand: "",
    weightPerStrand: "",
    defaultPurchaseUnit: "条",
    defaultConversionRate: "38",
    supplier: "",
    remark: "",
    initialPurchasePrice: "",
    initialPurchaseQuantity: "",
  };
}

// 采购入库表单
interface PurchaseForm {
  purchaseDate: string;
  supplier: string;
  purchaseUnit: string;
  conversionRate: string;
  purchaseQuantity: string;
  purchaseUnitPrice: string;
  purchasePrice: string;
  remark: string;
}

function emptyPurchaseForm(): PurchaseForm {
  return {
    purchaseDate: new Date().toISOString().split("T")[0],
    supplier: "",
    purchaseUnit: "个",
    conversionRate: "1",
    purchaseQuantity: "",
    purchaseUnitPrice: "",
    purchasePrice: "",
    remark: "",
  };
}

// 格式化采购库存显示
function purchaseStock(remaining: number, purUnit: string | null, rate: number | null): string {
  if (purUnit && rate && rate > 0 && rate !== 1) {
    const qty = remaining / rate;
    const display = Number.isInteger(qty) ? qty : qty.toFixed(2);
    return `${display} ${purUnit}`;
  }
  return "-";
}

// 格式化核算库存显示
function inventoryStock(remaining: number, invUnit: string): string {
  return `${remaining} ${invUnit}`;
}

// 格式化采购单价
function purchaseUnitPrice(unitCost: number | null, rate: number | null): string {
  if (unitCost == null) return "-";
  if (rate && rate > 0 && rate !== 1) {
    return `¥${(unitCost * rate).toFixed(2)}`;
  }
  return "-";
}

// 格式化核算单价
function inventoryUnitPrice(unitCost: number | null): string {
  if (unitCost == null) return "-";
  return `¥${unitCost.toFixed(2)}`;
}

export default function MaterialsClient({
  materials,
  activeView,
  showCost = true,
}: {
  materials: RawMaterial[];
  activeView: string;
  showCost?: boolean;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [editing, setEditing] = useState<RawMaterial | null>(null);
  const [form, setForm] = useState<MaterialForm>(emptyMaterialForm());
  const [purchaseForm, setPurchaseForm] = useState<PurchaseForm>(emptyPurchaseForm());
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  // 排序
  const { sorted: sortedMaterials, sortKey, sortDir, toggleSort } = useSort(materials);

  // 搜索过滤 + 分类视图过滤
  const filtered = sortedMaterials.filter((m) => {
    // 分类视图过滤
    if (activeView === "bead" && m.materialType !== "BEAD") return false;
    if (activeView === "ceramic" && m.materialType !== "CERAMIC") return false;
    if (activeView === "metal" && m.category !== "配件") return false;

    // 搜索过滤
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
    }
    return true;
  });

  const isBeadType = form.materialType === "BEAD";

  // 分页
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // 渲染可排序表头
  function renderSortTh(label: string, key: string) {
    const isActive = sortKey === key;
    const icon = isActive
      ? sortDir === "asc"
        ? <ArrowUp size={12} />
        : <ArrowDown size={12} />
      : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return (
      <th
        className="text-left p-3 whitespace-nowrap cursor-pointer select-none hover:bg-[rgba(180,83,9,0.08)]"
        style={{ color: isActive ? "#b45309" : "var(--ink-light)" }}
        onClick={() => toggleSort(key)}
        title={`按${label}排序`}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {label}
          <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
        </span>
      </th>
    );
  }

  function renderSortThRight(label: string, key: string) {
    const isActive = sortKey === key;
    const icon = isActive
      ? sortDir === "asc"
        ? <ArrowUp size={12} />
        : <ArrowDown size={12} />
      : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return (
      <th
        className="text-right p-3 whitespace-nowrap cursor-pointer select-none hover:bg-[rgba(180,83,9,0.08)]"
        style={{ color: isActive ? "#b45309" : "var(--ink-light)" }}
        onClick={() => toggleSort(key)}
        title={`按${label}排序`}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end", width: "100%" }}>
          {label}
          <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
        </span>
      </th>
    );
  }

  function renderSortThCenter(label: string, key: string) {
    const isActive = sortKey === key;
    const icon = isActive
      ? sortDir === "asc"
        ? <ArrowUp size={12} />
        : <ArrowDown size={12} />
      : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
    return (
      <th
        className="text-center p-3 whitespace-nowrap cursor-pointer select-none hover:bg-[rgba(180,83,9,0.08)]"
        style={{ color: isActive ? "#b45309" : "var(--ink-light)" }}
        onClick={() => toggleSort(key)}
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
    setEditing(null);
    setForm(emptyMaterialForm());
    setModalOpen(true);
  }

  // 导出 Excel
  function handleExport() {
    window.open("/api/export?type=materials", "_blank");
  }

  // 打开编辑材料弹窗
  function openEdit(m: RawMaterial) {
    setEditing(m);
    setForm({
      code: m.code,
      name: m.name,
      category: m.category,
      materialType: m.materialType,
      specification: m.specification ?? "",
      inventoryUnit: m.inventoryUnit,
      status: m.status,
      shape: m.shape ?? "",
      beadsPerStrand: String(m.beadsPerStrand ?? ""),
      weightPerStrand: String(m.weightPerStrand ?? ""),
      defaultPurchaseUnit: m.defaultPurchaseUnit ?? "条",
      defaultConversionRate: String(m.defaultConversionRate ?? 38),
      supplier: m.supplier,
      remark: m.remark ?? "",
      initialPurchasePrice: m.unitCost != null && m.defaultConversionRate
        ? String((m.unitCost * m.defaultConversionRate * m.remaining).toFixed(2))
        : "",
      initialPurchaseQuantity: m.defaultConversionRate
        ? String((m.remaining / m.defaultConversionRate).toFixed(2))
        : String(m.remaining),
    });
    setModalOpen(true);
  }

  // 打开采购入库弹窗
  function openPurchase(m: RawMaterial) {
    setSelectedMaterial(m);
    setPurchaseForm({
      ...emptyPurchaseForm(),
      supplier: m.supplier,
      purchaseUnit: m.defaultPurchaseUnit ?? "个",
      conversionRate: String(m.defaultConversionRate ?? 1),
    });
    setPurchaseModalOpen(true);
  }

  // 保存材料（新增/编辑）
  async function saveMaterial(e: React.FormEvent) {
    e.preventDefault();

    // 计算核算单位成本
    const purchaseQty = Number(form.initialPurchaseQuantity) || 0;
    const purchasePrice = Number(form.initialPurchasePrice) || 0;
    const conversionRate = Number(form.defaultConversionRate) || 1;
    const inventoryQty = purchaseQty * conversionRate;
    const calculatedUnitCost = inventoryQty > 0 && purchasePrice > 0
      ? purchasePrice / inventoryQty
      : null;

    const body: Record<string, unknown> = {
      code: form.code,
      name: form.name,
      category: form.category,
      materialType: form.materialType,
      specification: form.specification,
      inventoryUnit: form.inventoryUnit,
      status: form.status,
      shape: form.shape,
      beadsPerStrand: form.beadsPerStrand ? Number(form.beadsPerStrand) : null,
      weightPerStrand: form.weightPerStrand ? Number(form.weightPerStrand) : null,
      defaultPurchaseUnit: form.defaultPurchaseUnit,
      defaultConversionRate: conversionRate,
      supplier: form.supplier,
      remark: form.remark,
    };

    if (editing) {
      // 编辑模式：如果有成本数据，同时更新 unitCost、remaining
      body.unitCost = calculatedUnitCost;
      body.remaining = inventoryQty;
      body.updatePurchase = purchasePrice > 0 ? {
        purchaseDate: new Date().toISOString(),
        supplier: form.supplier,
        purchaseUnit: form.defaultPurchaseUnit,
        conversionRate: conversionRate,
        purchaseQuantity: purchaseQty,
        purchasePrice: purchasePrice,
      } : null;
    } else {
      // 新增模式
      body.unitCost = calculatedUnitCost;
      body.initialPurchase = purchasePrice > 0 ? {
        purchaseDate: new Date().toISOString(),
        supplier: form.supplier,
        purchaseUnit: form.defaultPurchaseUnit,
        conversionRate: conversionRate,
        purchaseQuantity: purchaseQty,
        purchasePrice: purchasePrice,
      } : null;
    }

    try {
      const res = await fetch(editing ? `/api/materials/${editing.id}` : "/api/materials", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setModalOpen(false);
        router.refresh();
      } else {
        const error = await res.json();
        alert(`保存失败: ${error.error}`);
      }
    } catch (error: any) {
      alert(`保存失败: ${error.message}`);
    }
  }

  // 采购入库
  async function savePurchase(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedMaterial) return;

    const body = {
      materialId: selectedMaterial.id,
      purchaseDate: purchaseForm.purchaseDate,
      supplier: purchaseForm.supplier,
      purchaseUnit: purchaseForm.purchaseUnit,
      conversionRate: Number(purchaseForm.conversionRate) || 1,
      purchaseQuantity: Number(purchaseForm.purchaseQuantity),
      purchaseUnitPrice: purchaseForm.purchaseUnitPrice ? Number(purchaseForm.purchaseUnitPrice) : null,
      purchasePrice: Number(purchaseForm.purchasePrice),
      remark: purchaseForm.remark,
    };

    try {
      const res = await fetch("/api/purchase-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setPurchaseModalOpen(false);
        router.refresh();
      } else {
        const error = await res.json();
        alert(`采购入库失败: ${error.error}`);
      }
    } catch (error: any) {
      alert(`采购入库失败: ${error.message}`);
    }
  }

  // 删除材料
  async function remove(id: number) {
    if (!confirm("确认删除？")) return;
    try {
      const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const error = await res.json();
        alert(`删除失败: ${error.error}`);
      }
    } catch (error: any) {
      alert(`删除失败: ${error.message}`);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] p-6 gap-4">
        <div className="flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
            {CATEGORY_VIEWS.find((v) => v.key === activeView)?.label || "材料管理"}
          </h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-light)" }} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索编码或名称…"
                className="w-48 pl-9 pr-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <button onClick={() => router.refresh()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "var(--border)" }} title="刷新数据">
              <RefreshCw size={16} />刷新
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: "var(--border)" }}>
              <Download size={16} />导出
            </button>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: "#b45309" }}
            >
              <Plus size={16} /> 新增材料
            </button>
          </div>
        </div>

        {/* 表格 */}
        <div className="flex-1 min-h-0 bg-[var(--paper)] rounded-xl border border-[var(--border)] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="relative z-10">
              <tr style={{ background: "rgba(245,240,230,0.95)", color: "var(--ink-light)", position: "sticky", top: 0 }}>
                {/* 编码 - 需要 sticky left-0 */}
                <th
                  className="text-left p-3 whitespace-nowrap sticky left-0 z-20 cursor-pointer select-none hover:bg-[rgba(180,83,9,0.08)]"
                  style={{ background: "rgba(245,240,230,0.95)", color: sortKey === "code" ? "#b45309" : "var(--ink-light)" }}
                  onClick={() => toggleSort("code")}
                  title="按编码排序"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    编码
                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                      {sortKey === "code"
                        ? sortDir === "asc"
                          ? <ArrowUp size={12} />
                          : <ArrowDown size={12} />
                        : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
                    </span>
                  </span>
                </th>
                {renderSortTh("名称", "name")}
                {renderSortTh("分类", "category")}
                {renderSortTh("规格", "specification")}
                {renderSortTh("形状", "shape")}
                {renderSortThRight("颗数/条", "beadsPerStrand")}
                {renderSortThRight("克重/条", "weightPerStrand")}
                <th className="text-right p-3">采购库存</th>
                {renderSortThRight("核算库存", "remaining")}
                {showCost && <th className="text-right p-3">采购单价</th>}
                {showCost && renderSortThRight("核算单价", "unitCost")}
                {showCost && <th className="text-right p-3">库存总值</th>}
                <th className="text-center p-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((m) => {
                return (
                <tr
                  key={m.id}
                  className="border-t border-[var(--border)] hover:bg-[rgba(245,240,230,0.4)]"
                >
                  <td className="p-3 font-mono text-xs">{m.code}</td>
                  <td className="p-3 font-medium">{m.name}</td>
                  <td className="p-3 text-xs">{m.category || "-"}</td>
                  <td className="p-3 text-xs" style={{ color: "var(--ink-light)" }}>{m.specification || "-"}</td>
                  <td className="p-3 text-xs">{m.shape || "-"}</td>
                  <td className="p-3 text-right font-mono text-xs">{m.beadsPerStrand != null ? m.beadsPerStrand.toFixed(2) : "-"}</td>
                  <td className="p-3 text-right font-mono text-xs">{m.weightPerStrand != null ? `${m.weightPerStrand.toFixed(2)}g` : "-"}</td>
                  <td className="p-3 text-right font-mono font-medium">
                    {purchaseStock(m.remaining, m.defaultPurchaseUnit, m.defaultConversionRate)}
                  </td>
                  <td className="p-3 text-right font-mono font-medium">
                    {inventoryStock(m.remaining, m.inventoryUnit)}
                  </td>
                  {showCost && (
                    <td className="p-3 text-right font-mono text-xs" style={{ color: "var(--ink-light)" }}>
                      {purchaseUnitPrice(m.unitCost, m.defaultConversionRate)}
                    </td>
                  )}
                  {showCost && (
                    <td className="p-3 text-right font-mono">
                      {inventoryUnitPrice(m.unitCost)}
                    </td>
                  )}
                  {showCost && (
                    <td className="p-3 text-right font-mono" style={{ color: "var(--zhu)" }}>
                      ¥{((m.unitCost ?? 0) * m.remaining).toFixed(2)}
                    </td>
                  )}
                  <td className="p-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => openPurchase(m)}
                        className="p-1.5 rounded-md hover:bg-[rgba(185,28,28,0.08)]"
                        style={{ color: "#b45309" }}
                        title="采购入库"
                      >
                        <ShoppingCart size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(m)}
                        className="p-1.5 rounded-md hover:bg-[rgba(185,28,28,0.08)]"
                        style={{ color: "var(--zhu)" }}
                        title="编辑"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => remove(m.id)}
                        className="p-1.5 rounded-md hover:bg-red-50"
                        style={{ color: "#dc2626" }}
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={showCost ? 13 : 10} className="p-6 text-center" style={{ color: "var(--ink-light)" }}>
                    {searchQuery ? `未找到匹配"${searchQuery}"的材料` : "暂无数据，点击「新增材料」录入"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                共 {filtered.length} 条 · 第 {safePage}/{totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage <= 1}
                  className="p-2 rounded-md text-xs disabled:opacity-30 hover:bg-[rgba(245,240,230,0.6)]"
                >首页</button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="p-2 rounded-md disabled:opacity-30 hover:bg-[rgba(245,240,230,0.6)]"
                ><ChevronLeft size={14} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className="w-8 h-8 rounded-md text-xs font-mono"
                    style={safePage === p ? { background: "#b45309", color: "#fff" } : { color: "var(--ink)" }}
                  >{p}</button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="p-2 rounded-md disabled:opacity-30 hover:bg-[rgba(245,240,230,0.6)]"
                ><ChevronRight size={14} /></button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage >= totalPages}
                  className="p-2 rounded-md text-xs disabled:opacity-30 hover:bg-[rgba(245,240,230,0.6)]"
                >末页</button>
              </div>
            </div>
          )}
        </div>

      {/* 材料编辑弹窗 */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "编辑材料" : "新增材料"}>
        <form onSubmit={saveMaterial} className="space-y-6">
          {/* 一、基础信息 */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium mb-1" style={{ color: "var(--ink)" }}>
              基础信息
            </legend>

            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                  编号 *
                </span>
                <input
                  name="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="MAT-xxx"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                  名称 *
                </span>
                <input
                  name="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="如：白水晶"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                  分类
                </span>
                <input
                  name="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="如：水晶、木质"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                  供应商
                </span>
                <input
                  name="supplier"
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="如：三哥沉香"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                  材料类型*
                </span>
                <select
                  value={form.materialType}
                  onChange={(e) => setForm({ ...form, materialType: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                >
                  {materialTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                  状态
                </span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                  备注
                </span>
                <input
                  name="remark"
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="可选"
                />
              </label>
            </div>
          </fieldset>

          {/* 二、单位转换设置 */}
          <fieldset
            className="space-y-3 p-4 rounded-xl border"
            style={{ borderColor: "var(--border)", background: "rgba(245,240,230,0.3)" }}
          >
            <legend className="text-sm font-medium px-2" style={{ color: "var(--ink)" }}>
              单位转换设置
            </legend>
            <p className="text-xs" style={{ color: "var(--ink-light)" }}>
              设置采购时的单位与核算时的单位，系统通过转换率自动换算库存数量。
            </p>

            <div className="grid grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                  采购单位 *
                </span>
                <input
                  name="defaultPurchaseUnit"
                  value={form.defaultPurchaseUnit}
                  onChange={(e) => setForm({ ...form, defaultPurchaseUnit: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="条、个、克等"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                  核算单位 *
                </span>
                <select
                  value={form.inventoryUnit}
                  onChange={(e) => setForm({ ...form, inventoryUnit: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)" }}
                >
                  {inventoryUnitOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                  转换率 *
                </span>
                <input
                  name="defaultConversionRate"
                  type="number"
                  step="0.01"
                  value={form.defaultConversionRate}
                  onChange={(e) => setForm({ ...form, defaultConversionRate: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="如：38"
                />
                <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                  1{form.defaultPurchaseUnit || "?"} = {form.defaultConversionRate || 1}{form.inventoryUnit}
                </span>
              </label>
            </div>
          </fieldset>

          {/* 三、成本核算 */}
            <fieldset
              className="space-y-4 p-4 rounded-xl border"
              style={{ borderColor: "var(--zhu)", background: "rgba(180,83,9,0.04)" }}
            >
              <legend className="text-sm font-medium px-2" style={{ color: "var(--zhu)" }}>
                成本核算{editing ? "（修改后将更新库存和成本）" : ""}
              </legend>
              <p className="text-xs" style={{ color: "var(--ink-light)" }}>
                {editing
                  ? "修改采购数据后，系统将重新计算核算单位成本、更新库存余量，并生成采购记录。"
                  : "首次录入时可填写采购数据，系统自动计算核算单位成本，同时生成入库记录。"}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                    采购总价（元）
                  </span>
                  <input
                    name="initialPurchasePrice"
                    type="number"
                    step="0.01"
                    value={form.initialPurchasePrice}
                    onChange={(e) => setForm({ ...form, initialPurchasePrice: e.target.value })}
                    placeholder="如：190"
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                    style={{ borderColor: "var(--border)" }}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                    采购数量（{form.defaultPurchaseUnit || "?"}）
                  </span>
                  <input
                    name="initialPurchaseQuantity"
                    type="number"
                    step="0.01"
                    value={form.initialPurchaseQuantity}
                    onChange={(e) => setForm({ ...form, initialPurchaseQuantity: e.target.value })}
                    placeholder="如：5"
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                    style={{ borderColor: "var(--border)" }}
                  />
                </label>
              </div>

              {/* 自动计算结果 */}
              {(() => {
                const qty = Number(form.initialPurchaseQuantity) || 0;
                const price = Number(form.initialPurchasePrice) || 0;
                const rate = Number(form.defaultConversionRate) || 1;
                const invQty = qty * rate;
                const unitCost = invQty > 0 && price > 0 ? price / invQty : null;

                if (!unitCost) return null;
                return (
                  <div
                    className="grid grid-cols-3 gap-4 p-3 rounded-lg"
                    style={{ background: "rgba(180,83,9,0.06)" }}
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                        入库数量
                      </span>
                      <p className="font-mono text-base font-semibold">
                        {invQty.toFixed(2)}
                        <span className="text-xs ml-1" style={{ color: "var(--ink-light)" }}>
                          {form.inventoryUnit}
                        </span>
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                        核算单位成本
                      </span>
                      <p
                        className="font-mono text-base font-semibold"
                        style={{ color: "var(--zhu)" }}
                      >
                        ¥{unitCost.toFixed(2)}
                        <span className="text-xs ml-1" style={{ color: "var(--ink-light)" }}>
                          /{form.inventoryUnit}
                        </span>
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                        成本公式
                      </span>
                      <p className="text-xs font-mono" style={{ color: "var(--ink-light)" }}>
                        {price} ÷ ({qty}×{rate}) = {unitCost.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </fieldset>

          {/* 珠类规格（仅珠类显示） */}
          {isBeadType && (
            <fieldset
              className="space-y-3 p-4 rounded-xl border"
              style={{ borderColor: "var(--border)", background: "rgba(245,240,230,0.2)" }}
            >
              <legend className="text-sm font-medium px-2" style={{ color: "var(--ink)" }}>
                珠类规格
              </legend>
              <div className="grid grid-cols-4 gap-4">
                <label className="space-y-1">
                  <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                    规格（mm）
                  </span>
                  <input
                    value={form.specification}
                    onChange={(e) => setForm({ ...form, specification: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                    style={{ borderColor: "var(--border)" }}
                    placeholder="如：7"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                    形状
                  </span>
                  <select
                    value={form.shape}
                    onChange={(e) => setForm({ ...form, shape: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="">无</option>
                    <option value="圆珠">圆珠</option>
                    <option value="挂饰">挂饰</option>
                    <option value="三通">三通</option>
                    <option value="单面珠">单面珠</option>
                    <option value="隔片">隔片</option>
                    <option value="老型">老型</option>
                    <option value="汉堡珠">汉堡珠</option>
                    <option value="方糖">方糖</option>
                    <option value="桶珠">桶珠</option>
                    <option value="随形">随形</option>
                    <option value="方块">方块</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                    颗数/条
                  </span>
                  <input
                    type="number"
                    value={form.beadsPerStrand}
                    onChange={(e) => setForm({ ...form, beadsPerStrand: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                    style={{ borderColor: "var(--border)" }}
                    placeholder="如：38"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                    克重/条（g）
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    value={form.weightPerStrand}
                    onChange={(e) => setForm({ ...form, weightPerStrand: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                    style={{ borderColor: "var(--border)" }}
                    placeholder="如：8.8"
                  />
                </label>
              </div>
            </fieldset>
          )}

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm border"
              style={{ borderColor: "var(--border)" }}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm text-white"
              style={{ background: "#b45309" }}
            >
              保存
            </button>
          </div>
        </form>
      </Modal>

      {/* 采购入库弹窗 */}
      <Modal
        open={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        title={`采购入库 - ${selectedMaterial?.name || ""}`}
      >
        <form onSubmit={savePurchase} className="space-y-5">
          <div className="p-3 rounded-lg bg-blue-50 text-sm" style={{ color: "#1e40af" }}>
            当前库存：{selectedMaterial ? inventoryStock(selectedMaterial.remaining, selectedMaterial.inventoryUnit) : "-"}
            {showCost && selectedMaterial?.unitCost && (
              <span className="ml-2">核算单价：{inventoryUnitPrice(selectedMaterial.unitCost)}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                采购日期
              </span>
              <input
                name="purchaseDate"
                type="date"
                value={purchaseForm.purchaseDate}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                供应商
              </span>
              <input
                name="supplier"
                value={purchaseForm.supplier}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <label className="space-y-1">
              <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                采购单位 *
              </span>
              <input
                name="purchaseUnit"
                value={purchaseForm.purchaseUnit}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseUnit: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)" }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                转换率 *
              </span>
              <input
                name="conversionRate"
                type="number"
                step="0.01"
                value={purchaseForm.conversionRate}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, conversionRate: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                style={{ borderColor: "var(--border)" }}
                placeholder="1 = 1个"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                采购数量 *
              </span>
              <input
                name="purchaseQuantity"
                type="number"
                step="0.01"
                value={purchaseForm.purchaseQuantity}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseQuantity: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                style={{ borderColor: "var(--border)" }}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                采购单价（元/{purchaseForm.purchaseUnit}）
              </span>
              <input
                name="purchaseUnitPrice"
                type="number"
                step="0.01"
                value={purchaseForm.purchaseUnitPrice}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseUnitPrice: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                style={{ borderColor: "var(--border)" }}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                采购总价（元）*
              </span>
              <input
                name="purchasePrice"
                type="number"
                step="0.01"
                value={purchaseForm.purchasePrice}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, purchasePrice: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                style={{ borderColor: "var(--border)" }}
              />
            </label>
          </div>

          {/* 计算预览 */}
          <div className="p-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "rgba(180,83,9,0.04)" }}>
            <p className="text-xs font-medium mb-3" style={{ color: "var(--ink-light)" }}>
              入库预览
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                  入库数量
                </span>
                <p className="font-mono text-base font-semibold">
                  {purchaseForm.purchaseQuantity && purchaseForm.conversionRate
                    ? (
                        Number(purchaseForm.purchaseQuantity) * Number(purchaseForm.conversionRate)
                      ).toFixed(2)
                    : "-"}
                  <span className="text-xs ml-1" style={{ color: "var(--ink-light)" }}>
                    {selectedMaterial?.inventoryUnit || ""}
                  </span>
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-xs" style={{ color: "var(--ink-light)" }}>
                  本次单价
                </span>
                <p className="font-mono text-base font-semibold" style={{ color: "var(--zhu)" }}>
                  {purchaseForm.purchasePrice && purchaseForm.purchaseQuantity && purchaseForm.conversionRate
                    ? (
                        Number(purchaseForm.purchasePrice) /
                        (Number(purchaseForm.purchaseQuantity) * Number(purchaseForm.conversionRate))
                      ).toFixed(2)
                    : "-"}
                  <span className="text-xs ml-1" style={{ color: "var(--ink-light)" }}>
                    /{selectedMaterial?.inventoryUnit || ""}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>
              备注
            </span>
            <input
              name="remark"
              value={purchaseForm.remark}
              onChange={(e) => setPurchaseForm({ ...purchaseForm, remark: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
            />
          </label>

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPurchaseModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm border"
              style={{ borderColor: "var(--border)" }}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm text-white"
              style={{ background: "#b45309" }}
            >
              确认入库
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
