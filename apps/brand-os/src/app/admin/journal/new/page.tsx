"use client";
export const dynamic = 'force-dynamic'


import { useState } from "react";
import { useRouter } from "next/navigation";
import { createJournalPost } from "@/lib/actions/admin-actions";

const categories: Record<string, string> = {
  OBJECT: "器物", MATERIAL: "材料", CRAFT: "工艺",
  DONGHAI: "东海", CREATION: "创作", PHILOSOPHY: "哲思",
};

export default function AdminJournalNewPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", slug: "", excerpt: "", content: "", coverImage: "",
    category: "OBJECT", status: "DRAFT",
    seoTitle: "", seoDescription: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    await createJournalPost(form as any);
    router.push("/admin/journal");
  }

  const textStyle = { color: "var(--yun-text)" };
  const subStyle = { color: "var(--yun-subtext)" };
  const lineStyle = { borderColor: "var(--yun-line)" };

  return (
    <div>
      <h1 className="text-xl font-medium tracking-[0.1em] mb-6" style={textStyle}>新建文章</h1>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
        <div className="bg-white border rounded p-4 space-y-3" style={lineStyle}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={subStyle}>标题 *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                required className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>Slug</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle}
                placeholder="留空自动生成" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={subStyle}>分类 *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle}>
                {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={subStyle}>状态</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle}>
                <option value="DRAFT">草稿</option>
                <option value="PUBLISHED">发布</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={subStyle}>摘要</label>
            <input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={subStyle}>封面图 URL</label>
            <input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
              className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={subStyle}>正文 (Markdown) *</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              required rows={12} className="w-full px-3 py-1.5 border text-sm bg-white font-mono" style={lineStyle} />
          </div>
        </div>

        <div className="bg-white border rounded p-4 space-y-3" style={lineStyle}>
          <h2 className="text-sm font-medium" style={textStyle}>SEO 信息</h2>
          <div>
            <label className="block text-xs mb-1" style={subStyle}>SEO 标题</label>
            <input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
              className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={subStyle}>SEO 描述</label>
            <textarea value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
              rows={2} className="w-full px-3 py-1.5 border text-sm bg-white" style={lineStyle} />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="px-6 py-2 text-sm text-white rounded" style={{ background: "var(--yun-accent)" }}>
          {loading ? "保存中..." : "保存文章"}
        </button>
      </form>
    </div>
  );
}
