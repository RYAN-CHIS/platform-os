"use client";
import { useState } from "react";
import { Pencil, Trash2, Plus, Download, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface Sku {
  id: number;
  code: string;
  name: string;
  specification: string | null;
  size: string | null;
  price: number;
  finishedStock: number;
  status: string;
}
interface Product {
  id: number;
  code: string;
  name: string;
  workId: number;
  status: string;
  description: string | null;
  work?: { name: string; series?: { name: string } };
  skus?: Sku[];
}
interface Series { id: number; name: string; }
interface Work { id: number; name: string; code: string; }

const statusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "草稿", color: "#78716c" },
  DESIGNING: { label: "设计中", color: "#2563eb" },
  READY: { label: "待上架", color: "#d97706" },
  ACTIVE: { label: "在售", color: "#16a34a" },
  PAUSED: { label: "已暂停", color: "#ea580c" },
  ARCHIVED: { label: "已归档", color: "#a8a29e" },
};

export default function ProductsClient({ products: init, series, works }: { products: Product[]; series: Series[]; works: Work[] }) {
  const [rows] = useState(init);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const blank = { id: 0, code: "", name: "", workId: 0, status: "DRAFT", description: "" };
  const [form, setForm] = useState<typeof blank>({ ...blank });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSeries, setFilterSeries] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  const filtered = rows.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.code.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) return false;
    }
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterSeries && p.work?.series?.name !== filterSeries) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearch(q: string) { setSearchQuery(q); setCurrentPage(1); }
  function handleStatusFilter(v: string) { setFilterStatus(v); setCurrentPage(1); }
  function handleSeriesFilter(v: string) { setFilterSeries(v); setCurrentPage(1); }

  function openNew() {
    setEditing(null);
    setForm({ ...blank, code: `P${String(rows.length + 1).padStart(3, "0")}`, workId: works[0]?.id ?? 0 });
    setOpen(true);
  }
  function handleExport() { window.open("/api/export?type=products", "_blank"); }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({ id: p.id, code: p.code, name: p.name, workId: p.workId, status: p.status, description: p.description ?? "" });
    setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const body = {
      code: String(fd.get("code") || ""),
      name: String(fd.get("name") || ""),
      workId: Number(fd.get("workId")),
      status: String(fd.get("status")),
      description: String(fd.get("description") || ""),
    };
    await fetch(editing ? `/api/products/${editing.id}` : "/api/products", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    location.reload();
  }
  async function remove(id: number) {
    if (!confirm("确认删除？关联SKU将一并删除！")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    location.reload();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] p-6 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>七序作品库</h1>
        <div className="flex items-center gap-2.5">
            {/* 搜索框 */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-light)" }} />
              <input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="搜索编码或名称…"
                className="w-44 pl-8 pr-7 py-[7px] rounded-md border text-sm bg-white"
                style={{ borderColor: "var(--border)" }}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100" style={{ color: "var(--ink-light)" }}>
                  <X size={12} />
                </button>
              )}
            </div>
            {/* 状态筛选 */}
            <select
              value={filterStatus}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-2.5 py-[7px] rounded-md border text-sm bg-white"
              style={{ borderColor: "var(--border)", color: filterStatus ? "var(--ink)" : "var(--ink-light)" }}
            >
              <option value="">全部状态</option>
              {Object.entries(statusMap).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            {/* 系列筛选 */}
            <select
              value={filterSeries}
              onChange={(e) => handleSeriesFilter(e.target.value)}
              className="px-2.5 py-[7px] rounded-md border text-sm bg-white min-w-[100px]"
              style={{ borderColor: "var(--border)", color: filterSeries ? "var(--ink)" : "var(--ink-light)" }}
            >
              <option value="">全部系列</option>
              {series.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            {(filterStatus || filterSeries || searchQuery) && (
              <button
                onClick={() => { setSearchQuery(""); setFilterStatus(""); setFilterSeries(""); setCurrentPage(1); }}
                className="px-2.5 py-[7px] rounded-md text-xs text-[var(--ink-light)] hover:text-[var(--ink)] hover:bg-gray-100 transition-colors"
              >
                重置
              </button>
            )}
            <span className="w-px h-5 bg-[var(--border)]" />
            <button onClick={handleExport} className="px-2.5 py-[7px] rounded-md text-sm bg-white border hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
              导出
            </button>
            <button onClick={openNew} className="px-2.5 py-[7px] rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ background: "#b45309" }}>
              新增产品
            </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto grid gap-4 content-start">
        {paginated.map((p) => {
          const st = statusMap[p.status] ?? { label: p.status, color: "#78716c" };
          return (
            <div key={p.id} className="bg-[var(--paper)] border border-[var(--border)] rounded-xl p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[rgba(245,240,230,0.8)]" style={{ color: "var(--ink-light)" }}>{p.code}</span>
                    <p className="font-semibold" style={{ color: "var(--ink)" }}>{p.name}</p>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--ink-light)" }}>
                    {p.work?.series?.name} · {p.work?.name}
                  </p>
                  {p.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--ink-light)" }}>{p.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${st.color}15`, color: st.color }}>{st.label}</span>
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-md hover:bg-[rgba(185,28,28,0.08)]" style={{ color: "var(--zhu)" }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(p.id)} className="p-1.5 rounded-md hover:bg-red-50" style={{ color: "#dc2626" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {p.skus && p.skus.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-wrap gap-2">
                  {p.skus.map((s) => (
                    <span key={s.id} className="text-xs px-2 py-1 rounded-full bg-[rgba(245,240,230,0.8)]" style={{ color: "var(--ink-light)" }}>
                      {s.code} · {s.specification || "默认"} · ¥{s.price.toFixed(0)} · 库存{s.finishedStock}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: "var(--ink-light)" }}>
            {searchQuery || filterStatus || filterSeries
              ? `未找到匹配条件的产品（${[searchQuery ? `"${searchQuery}"` : "", filterStatus ? statusMap[filterStatus]?.label : "", filterSeries ? `系列「${filterSeries}」` : ""].filter(Boolean).join(" + ")}）`
              : "暂无作品，点击「新增产品」录入"}
          </p>
        )}
      </div>
      {totalPages > 1 && (
        <div className="bg-[var(--paper)] rounded-xl border border-[var(--border)] flex items-center justify-between px-4 py-3">
          <span className="text-xs" style={{ color: "var(--ink-light)" }}>共 {filtered.length} 条 · 第 {safePage}/{totalPages} 页</span>
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
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "编辑产品" : "新增产品"}>
        <form onSubmit={save} className="space-y-4">
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>产品编号 *</span>
            <input name="code" defaultValue={form.code} required className="w-full border rounded-lg px-3 py-2 text-sm font-mono" style={{ borderColor: "var(--border)" }} />
          </label>
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>产品名称 *</span>
            <input name="name" defaultValue={form.name} required className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
          </label>
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>关联作品 *</span>
            <select name="workId" defaultValue={String(form.workId)} required className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
              <option value="">请选择作品</option>
              {works.map((w) => <option key={w.id} value={w.id}>{w.name}（{w.code}）</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>状态</span>
            <select name="status" defaultValue={form.status} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
              {Object.entries(statusMap).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>描述</span>
            <textarea name="description" defaultValue={form.description} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "var(--border)" }}>取消</button>
            <button type="submit" className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#b45309" }}>保存</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
