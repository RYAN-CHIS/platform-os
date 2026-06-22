"use client";
export const dynamic = 'force-dynamic'


import { useEffect, useState } from "react";
import { getMaterials, createMaterial, updateMaterial, deleteMaterial } from "@/lib/actions/admin-actions";

type Mat = {
  id: number; name: string; alias: string | null; type: string; origin: string;
  history: string | null; features: string | null; description: string; image: string;
};

export default function AdminMaterialsPage() {
  const [items, setItems] = useState<Mat[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", alias: "", type: "", origin: "", history: "", features: "", description: "", image: "" });
  const [loading, setLoading] = useState(false);

  async function load() { const data = await getMaterials(); setItems(data); }
  useEffect(() => { load(); }, []);

  function resetForm() {
    setForm({ name: "", alias: "", type: "", origin: "", history: "", features: "", description: "", image: "" });
    setEditingId(null); setShowForm(false);
  }

  function editItem(m: Mat) {
    setForm({ name: m.name, alias: m.alias ?? "", type: m.type, origin: m.origin, history: m.history ?? "", features: m.features ?? "", description: m.description, image: m.image });
    setEditingId(m.id); setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    editingId ? await updateMaterial(editingId, form) : await createMaterial(form);
    resetForm(); await load(); setLoading(false);
  }

  async function handleDelete(id: number) { if (!confirm("确定删除？")) return; await deleteMaterial(id); await load(); }

  const textStyle = { color: "var(--yun-text)" };
  const subStyle = { color: "var(--yun-subtext)" };
  const lineStyle = { borderColor: "var(--yun-line)" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium tracking-[0.1em]" style={textStyle}>材料研究库</h1>
          <p className="text-xs mt-1" style={subStyle}>品牌知识库，非库存模块</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-1.5 text-sm text-white rounded tracking-wider" style={{ background: "var(--yun-accent)" }}>
          新增材料
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded p-4 mb-6 space-y-3" style={lineStyle}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={subStyle}>名称 *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                required className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>别名</label>
              <input value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={subStyle}>类别</label>
              <input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>产地</label>
              <input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={subStyle}>历史</label>
            <input value={form.history} onChange={(e) => setForm({ ...form, history: e.target.value })}
              className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={subStyle}>特点</label>
            <input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })}
              className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={subStyle}>描述</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={subStyle}>图片 URL</label>
            <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
              className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading} className="px-4 py-1.5 text-sm text-white rounded" style={{ background: "var(--yun-accent)" }}>
              {editingId ? "保存" : "创建"}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-1.5 text-sm border rounded" style={lineStyle}>取消</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {items.map((m) => (
          <div key={m.id} className="bg-white border rounded p-4 flex items-start justify-between" style={lineStyle}>
            <div className="flex-1">
              <span className="text-sm font-medium" style={textStyle}>{m.name}</span>
              {m.alias && <span className="text-xs ml-2" style={subStyle}>({m.alias})</span>}
              {(m.type || m.origin) && (
                <p className="text-xs mt-1" style={subStyle}>
                  {[m.type, m.origin].filter(Boolean).join(" · ")}
                </p>
              )}
              {m.description && <p className="text-xs mt-1 line-clamp-2" style={subStyle}>{m.description}</p>}
            </div>
            <div className="flex gap-2 shrink-0 ml-3">
              <button onClick={() => editItem(m)} className="px-3 py-1 text-xs border rounded" style={{ ...lineStyle, color: "var(--yun-text)" }}>编辑</button>
              <button onClick={() => handleDelete(m.id)} className="px-3 py-1 text-xs border rounded" style={{ borderColor: "#E24B4A", color: "#E24B4A" }}>删除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
