"use client";
export const dynamic = 'force-dynamic'


import { useEffect, useState } from "react";
import { getSeoConfigs, upsertSeoConfig } from "@/lib/actions/admin-actions";

type Seo = {
  id: string; pageKey: string; title: string; description: string;
  ogImage: string | null; canonical: string | null;
};

const presets = [
  { key: "home", label: "首页 SEO" },
  { key: "series", label: "七序 SEO" },
  { key: "objects", label: "器物 SEO" },
  { key: "journal", label: "品牌志 SEO" },
  { key: "products", label: "作品 SEO" },
];

export default function AdminSeoPage() {
  const [configs, setConfigs] = useState<Seo[]>([]);
  const [activeKey, setActiveKey] = useState(presets[0].key);
  const [form, setForm] = useState({ title: "", description: "", ogImage: "", canonical: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const data = await getSeoConfigs();
    setConfigs(data);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const existing = configs.find((c) => c.pageKey === activeKey);
    setForm({
      title: existing?.title || "",
      description: existing?.description || "",
      ogImage: existing?.ogImage || "",
      canonical: existing?.canonical || "",
    });
  }, [activeKey, configs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await upsertSeoConfig({ pageKey: activeKey, ...form });
    await load();
    setMsg("已保存");
    setLoading(false);
    setTimeout(() => setMsg(""), 2000);
  }

  const textStyle = { color: "var(--yun-text)" };
  const subStyle = { color: "var(--yun-subtext)" };
  const lineStyle = { borderColor: "var(--yun-line)" };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium tracking-[0.1em]" style={textStyle}>SEO 中心</h1>
        <p className="text-xs mt-1" style={subStyle}>管理各页面的 Title / Description / OG Image</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {presets.map((p) => (
          <button key={p.key} onClick={() => setActiveKey(p.key)}
            className="px-3 py-1.5 text-sm border rounded transition-colors"
            style={{
              ...lineStyle,
              color: activeKey === p.key ? "var(--yun-accent)" : "var(--yun-text)",
              background: activeKey === p.key ? "rgba(161,98,7,0.06)" : "#fff",
              borderColor: activeKey === p.key ? "var(--yun-accent)" : "var(--yun-line)",
            }}>
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded p-4 space-y-3 max-w-2xl" style={lineStyle}>
        <div>
          <label className="block text-xs mb-1" style={subStyle}>Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={subStyle}>Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3} className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={subStyle}>OG Image URL</label>
          <input value={form.ogImage} onChange={(e) => setForm({ ...form, ogImage: e.target.value })}
            className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={subStyle}>Canonical URL</label>
          <input value={form.canonical} onChange={(e) => setForm({ ...form, canonical: e.target.value })}
            className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
        </div>
        <div className="flex gap-2 pt-1 items-center">
          <button type="submit" disabled={loading}
            className="px-4 py-1.5 text-sm text-white rounded" style={{ background: "var(--yun-accent)" }}>
            保存
          </button>
          {msg && <span className="text-xs" style={{ color: "#639922" }}>{msg}</span>}
        </div>
      </form>
    </div>
  );
}
