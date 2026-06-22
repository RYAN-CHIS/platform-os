"use client";
export const dynamic = 'force-dynamic'


import { useEffect, useState, useCallback } from "react";
import { getMedia, saveMedia, deleteMedia } from "@/lib/actions/admin-actions";

type MediaItem = {
  id: string; filename: string; url: string; category: string;
  altText: string | null; size: number; mimeType: string; createdAt: Date;
};

// ── 分类定义 ──
const CATEGORIES = [
  { key: "BEADS", label: "串珠", icon: "◎", desc: "珠串、手链、项链等" },
  { key: "SEAL", label: "印章", icon: "☐", desc: "印章、印泥、底座等" },
  { key: "INCENSE", label: "香器", icon: "◈", desc: "香炉、香插、香盒等" },
  { key: "PORCELAIN", label: "瓷器", icon: "▣", desc: "瓷杯、茶具、花器等" },
  { key: "WOODWORK", label: "木作", icon: "▤", desc: "木质器物、底座等" },
  { key: "OTHER_OBJ", label: "其他器物", icon: "◆", desc: "其他类型作品" },
  { key: "PRODUCT", label: "作品通用", icon: "◇", desc: "旧数据/未分类作品" },
  { key: "MATERIAL", label: "材料图", icon: "●", desc: "材料研究、原石等" },
  { key: "BRAND", label: "品牌图", icon: "★", desc: "Logo、海报、宣传图" },
  { key: "CRAFT", label: "工艺图", icon: "⚒", desc: "制作过程、工艺细节" },
  { key: "ARTICLE", label: "文章图", icon: "📷", desc: "品牌志配图" },
] as const;

type CatKey = typeof CATEGORIES[number]["key"];

const textStyle = { color: "var(--yun-text)" };
const subStyle = { color: "var(--yun-subtext)" };
const lineStyle = { borderColor: "var(--yun-line)" };

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeTab, setActiveTab] = useState<CatKey>("BEADS");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [showAll, setShowAll] = useState(false);

  async function load() {
    const data = await getMedia();
    setItems(data);
  }
  useEffect(() => { load(); }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, cat: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", cat);

      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const json = await res.json();

      if (res.ok) {
        await saveMedia({
          filename: file.name, url: json.url, category: cat as any,
          altText: file.name, size: file.size, mimeType: file.type,
        });
        await load();
        setUploadMsg("上传成功 ✅");
      } else {
        setUploadMsg(json.error || "上传失败");
      }
    } catch {
      setUploadMsg("上传失败");
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url);
    setUploadMsg("链接已复制");
    setTimeout(() => setUploadMsg(""), 1500);
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除此图片？")) return;
    await deleteMedia(id);
    await load();
  }

  const filteredItems = showAll ? items : items.filter((m) => m.category === activeTab);

  // 每个分类的计数
  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c.key] = items.filter((m) => m.category === c.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-medium tracking-[0.1em]" style={textStyle}>图片资产库</h1>
          <p className="text-xs mt-1" style={subStyle}>按器物分类管理图片 · Vercel Blob 存储</p>
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={subStyle}>
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          显示全部
        </label>
      </div>

      {!showAll && (
        /* ── 分类 Tab 栏 ── */
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveTab(c.key)}
              className="px-3 py-1.5 text-sm rounded border transition-all"
              style={{
                background: activeTab === c.key ? "rgba(161,98,7,0.06)" : "#fff",
                borderColor: "var(--yun-line)",
                color: activeTab === c.key ? "var(--yun-accent)" : "var(--yun-text)",
                fontWeight: activeTab === c.key ? 500 : 400,
              }}
            >
              <span className="mr-1">{c.icon}</span>
              {c.label}
              <span className="ml-1.5 text-[10px] opacity-50">({counts[c.key] || 0})</span>
            </button>
          ))}
        </div>
      )}

      {/* ── 上传区域（当前选中分类）── */}
      {!showAll && (
        <div className="bg-white border rounded p-5 mb-6" style={lineStyle}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{CATEGORIES.find((c) => c.key === activeTab)?.icon}</span>
              <span className="text-sm font-medium" style={textStyle}>
                {CATEGORIES.find((c) => c.key === activeTab)?.label}
              </span>
              <span className="text-xs" style={subStyle}>
                · {CATEGORIES.find((c) => c.key === activeTab)?.desc}
              </span>
            </div>
            <label className="px-4 py-1.5 text-xs text-white rounded cursor-pointer tracking-wider"
              style={{ background: "var(--yun-accent)" }}>
              {uploading ? "上传中..." : "+ 上传图片"}
              <input type="file" accept="image/*"
                onChange={(e) => handleUpload(e, activeTab)}
                className="hidden" disabled={uploading} />
            </label>
          </div>
          {uploadMsg && (
            <p className="text-xs" style={{ color: uploadMsg.includes("失败") ? "#E24B4A" : "#639922" }}>
              {uploadMsg}
            </p>
          )}
        </div>
      )}

      {showAll && (
        /* ── 全部模式：每个分类独立展示 ── */
        <div className="space-y-8">
          {CATEGORIES.map((cat) => {
            const catItems = items.filter((m) => m.category === cat.key);
            return (
              <section key={cat.key}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <h2 className="text-sm font-medium" style={textStyle}>{cat.label}</h2>
                    <span className="text-xs" style={subStyle}>{cat.desc}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100" style={subStyle}>
                      {catItems.length} 张
                    </span>
                  </div>
                  <label className="px-3 py-1 text-xs text-white rounded cursor-pointer"
                    style={{ background: "var(--yun-accent)" }}>
                    + 上传
                    <input type="file" accept="image/*"
                      onChange={(e) => handleUpload(e, cat.key)}
                      className="hidden" disabled={uploading} />
                  </label>
                </div>

                {catItems.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {catItems.map((m) => <ImageCard key={m.id} item={m} onCopy={handleCopy} onDelete={handleDelete} />)}
                  </div>
                ) : (
                  <p className="text-xs text-center py-6 border border-dashed rounded" style={lineStyle}>
                    暂无图片，点击上方按钮上传
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* ── 单模式：当前分类网格 ── */}
      {!showAll && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredItems.map((m) => (
              <ImageCard key={m.id} item={m} onCopy={handleCopy} onDelete={handleDelete} />
            ))}
          </div>
          {filteredItems.length === 0 && (
            <p className="text-sm text-center py-8" style={subStyle}>
              该分类暂无图片，请上传
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── 图片卡片组件 ──
function ImageCard({ item, onCopy, onDelete }: {
  item: MediaItem;
  onCopy: (url: string) => void;
  onDelete: (id: string) => void;
}) {
  const lineStyle = { borderColor: "var(--yun-line)" };

  return (
    <div className="bg-white border rounded overflow-hidden" style={lineStyle}>
      <div className="aspect-square bg-gray-50 relative group">
        <img src={item.url} alt={item.altText || item.filename}
          className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button onClick={() => onCopy(item.url)}
            className="px-2 py-1 text-xs text-white bg-white/20 rounded backdrop-blur-sm">复制链接</button>
          <button onClick={() => window.open(item.url, "_blank")}
            className="px-2 py-1 text-xs text-white bg-white/20 rounded backdrop-blur-sm">查看</button>
        </div>
      </div>
      <div className="p-2">
        <p className="text-[11px] truncate" style={{ color: "var(--yun-text)" }}>{item.filename}</p>
        <button onClick={() => onDelete(item.id)}
          className="text-[10px] mt-1 hover:underline" style={{ color: "#E24B4A" }}>删除</button>
      </div>
    </div>
  );
}
