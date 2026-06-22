"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { getPageContents, upsertPageContent, deletePageContent } from "@/lib/actions/content-actions";

type PageContent = {
  id: string;
  pageKey: string;
  sectionKey: string;
  title: string;
  content: string;
  image: string | null;
  sortOrder: number;
  published: boolean;
  updatedAt: Date;
};

const PAGE_KEYS = [
  { value: "home_hero",       label: "首页 · Hero" },
  { value: "home_brand",      label: "首页 · 品牌介绍" },
  { value: "about",           label: "关于我们" },
  { value: "contact",         label: "联系我们" },
  { value: "footer",          label: "页脚" },
];

export default function AdminContentPage() {
  const [items, setItems] = useState<PageContent[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterKey, setFilterKey] = useState<string>("");
  const [form, setForm] = useState({
    id: "", pageKey: "home_hero", sectionKey: "", title: "", content: "", image: "", sortOrder: 0, published: true,
  });
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await getPageContents(filterKey || undefined);
    setItems(data as any);
  }

  useEffect(() => { load(); }, [filterKey]);

  function resetForm() {
    setForm({ id: "", pageKey: "home_hero", sectionKey: "", title: "", content: "", image: "", sortOrder: 0, published: true });
    setEditingId(null);
    setShowForm(false);
  }

  function editItem(c: any) {
    setForm({
      id: c.id, pageKey: c.pageKey, sectionKey: c.sectionKey,
      title: c.title, content: c.content, image: c.image || "",
      sortOrder: c.sortOrder, published: c.published,
    });
    setEditingId(c.id);
    setShowForm(true);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    if (form.id) fd.append("id", form.id);
    fd.append("pageKey", form.pageKey);
    fd.append("sectionKey", form.sectionKey);
    fd.append("title", form.title);
    fd.append("content", form.content);
    fd.append("image", form.image);
    fd.append("sortOrder", String(form.sortOrder));
    fd.append("published", String(form.published));
    await upsertPageContent(fd);
    resetForm();
    await load();
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除？")) return;
    await deletePageContent(id);
    await load();
  }

  const textStyle  = { color: "var(--yun-text)" };
  const subStyle   = { color: "var(--yun-subtext)" };
  const lineStyle  = { borderColor: "var(--yun-line)" };
  const grouped = filterKey
    ? items
    : PAGE_KEYS.map((pk) => ({
        key: pk.value,
        label: pk.label,
        items: items.filter((i) => i.pageKey === pk.value),
      }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium tracking-[0.1em]" style={textStyle}>页面内容管理</h1>
          <p className="text-xs mt-1" style={subStyle}>动态化首页、关于、联系等页面内容</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-1.5 text-sm text-white rounded tracking-wider"
          style={{ background: "var(--yun-accent)" }}>
          新增区块
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterKey("")}
          className={`px-3 py-1 text-xs rounded border ${filterKey === "" ? "bg-[var(--yun-accent)] text-white border-[var(--yun-accent)]" : "border-[var(--yun-line)]"}`}>
          全部
        </button>
        {PAGE_KEYS.map((pk) => (
          <button key={pk.value} onClick={() => setFilterKey(pk.value)}
            className={`px-3 py-1 text-xs rounded border ${filterKey === pk.value ? "bg-[var(--yun-accent)] text-white border-[var(--yun-accent)]" : "border-[var(--yun-line)]"}`}
            style={filterKey !== pk.value ? { borderColor: "var(--yun-line)", color: "var(--yun-text)" } : {}}>
            {pk.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded p-4 mb-6 space-y-3" style={lineStyle}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={subStyle}>页面</label>
              <select value={form.pageKey} onChange={(e) => setForm({ ...form, pageKey: e.target.value })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle}>
                {PAGE_KEYS.map((pk) => <option key={pk.value} value={pk.value}>{pk.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>区块 Key</label>
              <input value={form.sectionKey} onChange={(e) => setForm({ ...form, sectionKey: e.target.value })}
                placeholder="如 hero_title / brand_text" required
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={subStyle}>标题</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={subStyle}>内容（支持 HTML）</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4} className="w-full px-3 py-1.5 border text-sm bg-white font-mono" style={lineStyle} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1" style={subStyle}>图片 URL</label>
              <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>排序</label>
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  className="accent-[var(--yun-accent)]" />
                <span style={textStyle}>发布</span>
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

      {/* List */}
      <div className="space-y-2">
        {filterKey
          ? items.map((c: any) => (
              <ContentCard key={c.id} item={c} onEdit={editItem} onDelete={handleDelete} textStyle={textStyle} subStyle={subStyle} lineStyle={lineStyle} />
            ))
          : grouped.map((g: any) => (
              <div key={g.key}>
                <h3 className="text-xs font-medium mt-4 mb-2" style={subStyle}>{g.label}</h3>
                {g.items.length === 0 && <p className="text-xs py-4" style={subStyle}>暂无内容</p>}
                {g.items.map((c: any) => (
                  <ContentCard key={c.id} item={c} onEdit={editItem} onDelete={handleDelete} textStyle={textStyle} subStyle={subStyle} lineStyle={lineStyle} />
                ))}
              </div>
            ))
        }
      </div>
    </div>
  );
}

function ContentCard({ item, onEdit, onDelete, textStyle, subStyle, lineStyle }: any) {
  return (
    <div className="bg-white border rounded p-4 flex items-start justify-between" style={lineStyle}>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={textStyle}>{item.title || <span className="text-xs" style={subStyle}>无标题</span>}</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded" style={{
            background: item.published ? "rgba(99,153,34,0.1)" : "rgba(136,135,128,0.1)",
            color: item.published ? "#639922" : "var(--yun-subtext)",
          }}>{item.published ? "已发布" : "草稿"}</span>
        </div>
        <p className="text-xs mt-1" style={subStyle}>{item.sectionKey} · 排序 {item.sortOrder}</p>
        {item.content && <p className="text-xs mt-1 line-clamp-2" style={subStyle} dangerouslySetInnerHTML={{ __html: item.content.slice(0, 100) }} />}
      </div>
      <div className="flex gap-2 shrink-0 ml-4">
        <button onClick={() => onEdit(item)}
          className="px-3 py-1 text-xs border rounded" style={{ ...lineStyle, color: "var(--yun-text)" }}>
          编辑
        </button>
        <button onClick={() => onDelete(item.id)}
          className="px-3 py-1 text-xs border rounded" style={{ borderColor: "#E24B4A", color: "#E24B4A" }}>
          删除
        </button>
      </div>
    </div>
  );
}
