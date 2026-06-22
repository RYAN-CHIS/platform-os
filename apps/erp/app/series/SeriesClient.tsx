"use client";
import { useState } from "react";
import { Pencil, Trash2, Plus, GripVertical, Download } from "lucide-react";
import Modal from "@/components/ui/Modal";

interface Series {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
}

export default function SeriesClient({ list: init }: { list: Series[] }) {
  const [rows, setRows] = useState(init);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Series | null>(null);
  const blank: Series = { id: 0, code: "", name: "", sortOrder: 0 };
  const [form, setForm] = useState<Series>({ ...blank });

  function openNew() {
    setEditing(null);
    setForm({ ...blank, code: `S${String(rows.length + 1).padStart(2, "0")}` });
    setOpen(true);
  }
  function handleExport() { window.open("/api/export?type=series", "_blank"); }
  function openEdit(s: Series) {
    setEditing(s);
    setForm({ ...s });
    setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const body = {
      code: String(fd.get("code") || ""),
      name: String(fd.get("name") || ""),
      sortOrder: Number(fd.get("sortOrder")) || 0,
    };
    await fetch(editing ? `/api/series/${editing.id}` : "/api/series", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    location.reload();
  }
  async function remove(id: number) {
    if (!confirm("确认删除该七序？关联的作品将一并失去关联！")) return;
    await fetch(`/api/series/${id}`, { method: "DELETE" });
    location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>七序管理</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "var(--border)" }}>
            <Download size={16} />导出
          </button>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#b45309" }}>
            <Plus size={16} />新增七序
          </button>
        </div>
      </div>
      <div className="bg-[var(--paper)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
        {rows.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-4 hover:bg-[rgba(245,240,230,0.4)]">
            <GripVertical size={14} className="text-[var(--ink-light)]/40" />
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[rgba(245,240,230,0.8)]" style={{ color: "var(--ink-light)" }}>{s.code}</span>
            <div className="flex-1">
              <p className="font-medium" style={{ color: "var(--ink)" }}>{s.name}</p>
            </div>
            <span className="text-xs text-[var(--ink-light)]">排序 {s.sortOrder}</span>
            <div className="flex gap-2">
              <button onClick={() => openEdit(s)} className="p-1.5 rounded-md hover:bg-[rgba(185,28,28,0.08)]" style={{ color: "var(--zhu)" }}>
                <Pencil size={14} />
              </button>
              <button onClick={() => remove(s.id)} className="p-1.5 rounded-md hover:bg-red-50" style={{ color: "#dc2626" }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm" style={{ color: "var(--ink-light)" }}>暂无七序，点击「新增七序」创建</p>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "编辑七序" : "新增七序"}>
        <form onSubmit={save} className="space-y-4">
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>七序编号 *</span>
            <input name="code" defaultValue={form.code} required className="w-full border rounded-lg px-3 py-2 text-sm font-mono" style={{ borderColor: "var(--border)" }} />
          </label>
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>七序名称 *</span>
            <input name="name" defaultValue={form.name} required className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
          </label>
          <label className="space-y-1">
            <span className="text-xs" style={{ color: "var(--ink-light)" }}>排序</span>
            <input name="sortOrder" type="number" defaultValue={form.sortOrder} className="w-full border rounded-lg px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
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
