"use client";
import { useState } from "react";
import { Pencil, Trash2, Plus, Download } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface Work {
  id: number;
  code: string;
  name: string;
  seriesId: number;
  status: string;
  series?: { name: string };
  assets?: { thumbnail: string | null; story: string | null } | null;
  products?: { id: number }[];
}
interface Series { id: number; name: string; }

const statusMap: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "草稿", color: "#78716c" },
  DESIGNING: { label: "设计中", color: "#2563eb" },
  READY: { label: "待上架", color: "#d97706" },
  ACTIVE: { label: "在售", color: "#16a34a" },
  PAUSED: { label: "已暂停", color: "#ea580c" },
  ARCHIVED: { label: "已归档", color: "#a8a29e" },
};

export default function WorksClient({ works: init, series }: { works: Work[]; series: Series[] }) {
  const [rows] = useState(init);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Work | null>(null);
  const blank = { id: 0, code: "", name: "", seriesId: 0, status: "DRAFT" };
  const [form, setForm] = useState<typeof blank>({ ...blank });

  function openNew() {
    setEditing(null);
    setForm({ ...blank, code: `W${String(rows.length + 1).padStart(3, "0")}`, seriesId: series[0]?.id ?? 0 });
    setOpen(true);
  }
  function handleExport() { window.open("/api/export?type=works", "_blank"); }
  function openEdit(w: Work) {
    setEditing(w);
    setForm({ id: w.id, code: w.code, name: w.name, seriesId: w.seriesId, status: w.status });
    setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const body = {
      code: String(fd.get("code") || ""),
      name: String(fd.get("name") || ""),
      seriesId: Number(fd.get("seriesId")),
      status: String(fd.get("status")),
    };
    await fetch(editing ? `/api/works/${editing.id}` : "/api/works", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    location.reload();
  }
  async function remove(id: number) {
    if (!confirm("确认删除该作品？关联的产品/SKU会一并删除！")) return;
    await fetch(`/api/works/${id}`, { method: "DELETE" });
    location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>作品管理</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "var(--border)" }}>
            <Download size={16} />导出
          </button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#b45309" }}>
            <Plus size={16} />新增作品
          </button>
        </div>
      </div>
      <div className="grid gap-4">
        {rows.map((w) => {
          const st = statusMap[w.status] ?? { label: w.status, color: "#78716c" };
          return (
            <div key={w.id} className="bg-[var(--paper)] border border-[var(--border)] rounded-xl p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex gap-4 items-start">
                  {w.assets?.thumbnail && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.assets.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover bg-[var(--border)]" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[rgba(245,240,230,0.8)]" style={{ color: "var(--ink-light)" }}>{w.code}</span>
                      <p className="font-semibold" style={{ color: "var(--ink)" }}>{w.name}</p>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--ink-light)" }}>
                      {w.series?.name ?? "未关联"} · {w.products?.length ?? 0} 个产品
                    </p>
                    {w.assets?.story && (
                      <p className="text-xs mt-1 line-clamp-1" style={{ color: "var(--ink-light)" }}>{w.assets.story}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${st.color}15`, color: st.color }}>{st.label}</span>
                  <button onClick={() => openEdit(w)} className="p-1.5 rounded-md hover:bg-[rgba(185,28,28,0.08)]" style={{ color: "var(--zhu)" }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(w.id)} className="p-1.5 rounded-md hover:bg-red-50" style={{ color: "#dc2626" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: "var(--ink-light)" }}>暂无作品，点击「新增作品」创建</p>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "编辑作品" : "新增作品"}>
        <form onSubmit={save} className="space-y-4">
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>作品编号 *</span>
            <input name="code" defaultValue={form.code} required className="w-full border rounded-lg px-3 py-2 text-sm font-mono" style={{ borderColor: "var(--border)" }} />
          </label>
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>作品名称 *</span>
            <input name="name" defaultValue={form.name} required className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
          </label>
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>所属七序 *</span>
            <select name="seriesId" defaultValue={String(form.seriesId)} required className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
              <option value="">请选择</option>
              {series.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>状态</span>
            <select name="status" defaultValue={form.status} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
              {Object.entries(statusMap).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
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
