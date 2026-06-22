"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { getTags, upsertTag, deleteTag } from "@/lib/actions/tag-actions";
import { TagType } from "@prisma/client";

type Tag = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: TagType;
  _count?: { productTags: number; journalTags: number };
};

const TAG_TYPES = [
  { value: TagType.SERIES,   label: "系列" },
  { value: TagType.VALUE,    label: "价值观" },
  { value: TagType.MATERIAL, label: "材料" },
  { value: TagType.EMOTION,  label: "情绪" },
  { value: TagType.SCENE,    label: "场景" },
  { value: TagType.OBJECT,   label: "器物" },
];

export default function AdminTagsPage() {
  const [items, setItems]       = useState<Tag[]>([]);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [filterType, setFilterType]   = useState<TagType | "">("");
  const [form, setForm] = useState({ id: "", name: "", slug: "", description: "", type: TagType.SERIES });
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await getTags(filterType === "" ? undefined : filterType);
    setItems(data as any);
  }

  useEffect(() => { load(); }, [filterType]);

  function resetForm() {
    setForm({ id: "", name: "", slug: "", description: "", type: "SERIES" });
    setEditingId(null);
    setShowForm(false);
  }

  function editItem(t: Tag) {
    setForm({ id: t.id, name: t.name, slug: t.slug, description: t.description || "", type: t.type as any });
    setEditingId(t.id);
    setShowForm(true);
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    if (form.id) fd.append("id", form.id);
    fd.append("name", form.name);
    fd.append("slug", form.slug);
    fd.append("description", form.description);
    fd.append("type", form.type);
    await upsertTag(fd);
    resetForm();
    await load();
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除该标签？关联的作品/文章会同步解绑。")) return;
    await deleteTag(id);
    await load();
  }

  const textStyle  = { color: "var(--yun-text)" };
  const subStyle   = { color: "var(--yun-subtext)" };
  const lineStyle  = { borderColor: "var(--yun-line)" };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium tracking-[0.1em]" style={textStyle}>标签系统</h1>
          <p className="text-xs mt-1" style={subStyle}>品牌资产统一语言 · 用于 SEO / 推荐 / 搜索</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-1.5 text-sm text-white rounded tracking-wider"
          style={{ background: "var(--yun-accent)" }}>
          新增标签
        </button>
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterType("")}
          className={`px-3 py-1 text-xs rounded border ${filterType === "" ? "bg-[var(--yun-accent)] text-white border-[var(--yun-accent)]" : "border-[var(--yun-line)]"}`}>
          全部
        </button>
        {TAG_TYPES.map((t) => (
          <button key={t.value} onClick={() => setFilterType(t.value)}
            className={`px-3 py-1 text-xs rounded border ${filterType === t.value ? "bg-[var(--yun-accent)] text-white border-[var(--yun-accent)]" : "border-[var(--yun-line)]"}`}
            style={filterType !== t.value ? { borderColor: "var(--yun-line)", color: "var(--yun-text)" } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded p-4 mb-6 space-y-3" style={lineStyle}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={subStyle}>名称</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                required placeholder="如：芙初"
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>Slug</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                required placeholder="如：fuchu"
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={subStyle}>类型</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle}>
                {TAG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>描述</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="可选"
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
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

      {/* Table */}
      <div className="space-y-2">
        {items.map((t) => (
          <div key={t.id} className="bg-white border rounded p-4 flex items-center justify-between" style={lineStyle}>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={textStyle}>{t.name}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--yun-line)]" style={subStyle}>
                  {TAG_TYPES.find((tt) => tt.value === t.type)?.label || t.type}
                </span>
              </div>
              <p className="text-xs mt-1" style={subStyle}>/{t.slug}</p>
              {t.description && <p className="text-xs mt-0.5" style={subStyle}>{t.description}</p>}
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <span className="text-[11px]" style={subStyle}>
                {t._count?.productTags || 0} 作品 · {t._count?.journalTags || 0} 文章
              </span>
              <button onClick={() => editItem(t)}
                className="px-3 py-1 text-xs border rounded" style={{ ...lineStyle, color: "var(--yun-text)" }}>
                编辑
              </button>
              <button onClick={() => handleDelete(t.id)}
                className="px-3 py-1 text-xs border rounded" style={{ borderColor: "#E24B4A", color: "#E24B4A" }}>
                删除
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs py-8 text-center" style={subStyle}>暂无标签，点击右上角新增</p>
        )}
      </div>
    </div>
  );
}
