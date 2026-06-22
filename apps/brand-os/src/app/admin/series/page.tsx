"use client";
export const dynamic = 'force-dynamic'


import { useEffect, useState } from "react";
import { getSeries, createSeries, updateSeries, deleteSeries } from "@/lib/actions/admin-actions";

type Series = {
  id: number; name: string; slug: string; description: string;
  shortDesc: string | null; longDesc: string | null; coverImage: string | null;
  sortOrder: number; isActive: boolean;
};

export default function AdminSeriesPage() {
  const [items, setItems] = useState<Series[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", shortDesc: "", longDesc: "", coverImage: "", sortOrder: 0, isActive: true });
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await getSeries();
    setItems(data);
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setForm({ name: "", slug: "", description: "", shortDesc: "", longDesc: "", coverImage: "", sortOrder: items.length + 1, isActive: true });
    setEditingId(null);
    setShowNew(false);
  }

  function editItem(s: Series) {
    setForm({ name: s.name, slug: s.slug, description: s.description ?? "", shortDesc: s.shortDesc ?? "", longDesc: s.longDesc ?? "", coverImage: s.coverImage ?? "", sortOrder: s.sortOrder, isActive: s.isActive });
    setEditingId(s.id);
    setShowNew(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (editingId) {
      await updateSeries(editingId, form);
    } else {
      await createSeries(form);
    }
    resetForm();
    await load();
    setLoading(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("确定删除？")) return;
    await deleteSeries(id);
    await load();
  }

  const textStyle = { color: "var(--yun-text)" };
  const subStyle = { color: "var(--yun-subtext)" };
  const lineStyle = { borderColor: "var(--yun-line)" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium tracking-[0.1em]" style={textStyle}>七序体系</h1>
          <p className="text-xs mt-1" style={subStyle}>品牌世界观，非商品分类</p>
        </div>
        <button onClick={() => { resetForm(); setShowNew(true); }}
          className="px-4 py-1.5 text-sm text-white rounded tracking-wider"
          style={{ background: "var(--yun-accent)" }}>
          新增
        </button>
      </div>

      {/* Form */}
      {showNew && (
        <form onSubmit={handleSubmit} className="bg-white border rounded p-4 mb-6 space-y-3" style={lineStyle}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={subStyle}>名称</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                required className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>Slug</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                required className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={subStyle}>简短描述</label>
            <input value={form.shortDesc} onChange={(e) => setForm({ ...form, shortDesc: e.target.value })}
              className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={subStyle}>详细描述</label>
            <textarea value={form.longDesc} onChange={(e) => setForm({ ...form, longDesc: e.target.value })}
              rows={3} className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1" style={subStyle}>封面图 URL</label>
              <input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>排序</label>
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="accent-[var(--yun-accent)]" />
                <span style={textStyle}>上线</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading}
              className="px-4 py-1.5 text-sm text-white rounded" style={{ background: "var(--yun-accent)" }}>
              {editingId ? "保存" : "创建"}
            </button>
            <button type="button" onClick={resetForm}
              className="px-4 py-1.5 text-sm border rounded" style={lineStyle}>
              取消
            </button>
          </div>
        </form>
      )}

      {/* Table - card view */}
      <div className="space-y-2">
        {items.map((s) => (
          <div key={s.id} className="bg-white border rounded p-4 flex items-center justify-between" style={lineStyle}>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={textStyle}>{s.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{
                  background: s.isActive ? "rgba(99,153,34,0.1)" : "rgba(136,135,128,0.1)",
                  color: s.isActive ? "#639922" : "var(--yun-subtext)",
                }}>{s.isActive ? "上线" : "下线"}</span>
              </div>
              <p className="text-xs mt-1" style={subStyle}>{s.shortDesc}</p>
              <p className="text-[11px] mt-0.5" style={subStyle}>/{s.slug} · 排序 {s.sortOrder}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => editItem(s)}
                className="px-3 py-1 text-xs border rounded" style={{ ...lineStyle, color: "var(--yun-text)" }}>
                编辑
              </button>
              <button onClick={() => handleDelete(s.id)}
                className="px-3 py-1 text-xs border rounded" style={{ borderColor: "#E24B4A", color: "#E24B4A" }}>
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
