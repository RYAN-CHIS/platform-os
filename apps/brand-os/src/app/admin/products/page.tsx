"use client";
export const dynamic = 'force-dynamic'


import { useEffect, useState } from "react";
import { getProducts, createProduct, deleteProduct, getSeriesForSelect, getCategoriesForSelect } from "@/lib/actions/admin-actions";

type ProductItem = {
  id: number; sku: string; name: string; slug: string; status: string;
  seriesId: number; objectCategory: string;
  series: { id: number; name: string };
  theme: string; coverImage: string; salePrice: number;
  updatedAt: Date;
};
type SelectOption = { id: string | number; name: string };

export default function AdminProductsPage() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [seriesOpts, setSeriesOpts] = useState<SelectOption[]>([]);
  const [catOpts, setCatOpts] = useState<SelectOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    sku: "", name: "", slug: "", seriesId: 0, objectCategory: "",
    theme: "", story: "", materials: "", coverImage: "", costPrice: 0, salePrice: 0, status: "draft",
  });
  const [loading, setLoading] = useState(false);

  async function load() {
    const [p, s, c] = await Promise.all([getProducts(), getSeriesForSelect(), getCategoriesForSelect()]);
    setItems(p); setSeriesOpts(s); setCatOpts(c);
  }
  useEffect(() => { load(); }, []);

  function resetForm() {
    setForm({ sku: "", name: "", slug: "", seriesId: 0, objectCategory: "", theme: "", story: "", materials: "", coverImage: "", costPrice: 0, salePrice: 0, status: "draft" });
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await createProduct(form);
    resetForm(); await load(); setLoading(false);
  }

  async function handleDelete(id: number) { if (!confirm("确定删除？")) return; await deleteProduct(id); await load(); }

  const textStyle = { color: "var(--yun-text)" };
  const subStyle = { color: "var(--yun-subtext)" };
  const lineStyle = { borderColor: "var(--yun-line)" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium tracking-[0.1em]" style={textStyle}>作品中心</h1>
          <p className="text-xs mt-1" style={subStyle}>最核心模块 — 作品归属于七序 + 器物分类</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-1.5 text-sm text-white rounded tracking-wider" style={{ background: "var(--yun-accent)" }}>
          新增作品
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded p-4 mb-6 space-y-3" style={lineStyle}>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1" style={subStyle}>作品编号 *</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                required className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>名称 *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                required className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>Slug *</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                required className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={subStyle}>七序</label>
              <select value={form.seriesId} onChange={(e) => setForm({ ...form, seriesId: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle}>
                <option value="">选择七序</option>
                {seriesOpts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>器物分类</label>
              <select value={form.objectCategory} onChange={(e) => setForm({ ...form, objectCategory: e.target.value })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle}>
                <option value="">选择分类</option>
                {catOpts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={subStyle}>创作主题</label>
              <input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>封面图 URL</label>
              <input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={subStyle}>创作故事</label>
            <textarea value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })}
              rows={2} className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1" style={subStyle}>成本</label>
              <input type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>建议售价</label>
              <input type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>状态</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle}>
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading} className="px-4 py-1.5 text-sm text-white rounded" style={{ background: "var(--yun-accent)" }}>创建</button>
            <button type="button" onClick={resetForm} className="px-4 py-1.5 text-sm border rounded" style={lineStyle}>取消</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="bg-white border rounded p-4 flex items-center justify-between" style={lineStyle}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={textStyle}>{p.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                  background: p.status === "published" ? "rgba(99,153,34,0.1)" : "rgba(136,135,128,0.1)",
                  color: p.status === "published" ? "#639922" : "var(--yun-subtext)",
                }}>{p.status === "published" ? "已发布" : "草稿"}</span>
              </div>
              <p className="text-xs mt-1" style={subStyle}>
                {p.sku} · {p.series?.name} · {p.objectCategory}
              </p>
            </div>
            <button onClick={() => handleDelete(p.id)} className="px-3 py-1 text-xs border rounded shrink-0" style={{ borderColor: "#E24B4A", color: "#E24B4A" }}>删除</button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-center py-8" style={subStyle}>暂无作品</p>
        )}
      </div>
    </div>
  );
}
