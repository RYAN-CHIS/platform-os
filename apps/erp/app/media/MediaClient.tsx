"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Image, Flag, AlertCircle } from "lucide-react";
import MediaGrid from "./components/MediaGrid";
import MediaUploader from "./components/MediaUploader";
import MediaDetail from "./components/MediaDetail";
import BannerList from "./components/BannerList";

type Tab = "media" | "banners";

export interface MediaItem {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  mediaType: string;
  category: string;
  alt: string | null;
  tags: string | null;
  _refCount: number;
  createdAt: string;
}

const CATEGORY_OPTIONS = [
  { value: "", label: "全部分类" },
  { value: "BANNER", label: "Banner" },
  { value: "PRODUCT", label: "产品" },
  { value: "WORK", label: "作品" },
  { value: "BRAND", label: "品牌" },
  { value: "ARTICLE", label: "文章" },
  { value: "PAGE", label: "页面" },
  { value: "OTHER", label: "其他" },
];

const TYPE_OPTIONS = [
  { value: "", label: "全部类型" },
  { value: "IMAGE", label: "图片" },
  { value: "VIDEO", label: "视频" },
  { value: "DOCUMENT", label: "文档" },
];

export function MediaClient() {
  const [activeTab, setActiveTab] = useState<Tab>("media");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Filters
  const [keyword, setKeyword] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // UI state
  const [showUploader, setShowUploader] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [blobEnabled, setBlobEnabled] = useState(true); // 默认 true，API 返回后更新

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set("keyword", keyword);
      if (filterType) params.set("mediaType", filterType);
      if (filterCategory) params.set("category", filterCategory);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/media?${params.toString()}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setBlobEnabled(data.blobEnabled ?? true);
    } catch (err) {
      console.error("加载媒体失败:", err);
    } finally {
      setLoading(false);
    }
  }, [keyword, filterType, filterCategory, page]);

  useEffect(() => {
    if (activeTab === "media") fetchMedia();
  }, [fetchMedia, activeTab]);

  const handleUploaded = () => {
    setShowUploader(false);
    setUploadKey((k) => k + 1);
    setPage(1);
    fetchMedia();
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (res.ok) fetchMedia();
    } catch (err) {
      console.error("删除失败:", err);
    }
  };

  const handleSearch = (q: string) => {
    setKeyword(q);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h1 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>媒体中心</h1>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => setActiveTab("media")}
              className={`px-4 py-[7px] text-sm transition-colors ${activeTab === "media" ? "text-white" : ""}`}
              style={activeTab === "media" ? { background: "#b45309" } : { color: "var(--ink-muted)" }}
            >
              <Image size={14} className="inline mr-1.5" />
              媒体库
            </button>
            <button
              onClick={() => setActiveTab("banners")}
              className={`px-4 py-[7px] text-sm transition-colors ${activeTab === "banners" ? "text-white" : ""}`}
              style={activeTab === "banners" ? { background: "#b45309" } : { color: "var(--ink-muted)" }}
            >
              <Flag size={14} className="inline mr-1.5" />
              Banner
            </button>
          </div>

          {activeTab === "media" && (
            <button
              onClick={() => blobEnabled && setShowUploader(true)}
              disabled={!blobEnabled}
              title={blobEnabled ? "上传文件" : "Blob 存储未配置，无法上传。请在 Vercel 项目设置中添加 BLOB_READ_WRITE_TOKEN 环境变量。"}
              className={`flex items-center gap-1.5 px-3 py-[7px] rounded-md text-sm font-medium text-white transition-opacity ${blobEnabled ? "hover:opacity-90" : "opacity-50 cursor-not-allowed"}`}
              style={{ background: blobEnabled ? "#b45309" : "#9ca3af" }}
            >
              <Plus size={14} />
              上传
            </button>
          )}
        </div>
      </div>

      {/* Blob 存储未配置警告 */}
      {activeTab === "media" && !blobEnabled && (
        <div className="flex items-center gap-3 px-6 py-3 border-b" style={{ background: "#fffbeb", borderColor: "#fcd34d" }}>
          <AlertCircle size={18} style={{ color: "#d97706", flexShrink: 0 }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "#92400e" }}>Blob 存储未配置 — 文件上传功能暂不可用</p>
            <p className="text-xs mt-0.5" style={{ color: "#a16207" }}>
              前往 <code className="px-1 py-0.5 rounded text-xs" style={{ background: "#fef3c7", color: "#92400e" }}>Vercel Dashboard → Settings → Environment Variables</code> 添加 <code className="px-1 py-0.5 rounded text-xs" style={{ background: "#fef3c7", color: "#92400e" }}>BLOB_READ_WRITE_TOKEN</code>，从 Storage → Blob Store 获取 Token 值，然后 Redeploy。
            </p>
          </div>
        </div>
      )}

      {/* Toolbar (media only) */}
      {activeTab === "media" && (
        <div className="flex items-center gap-2 px-6 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-light)" }} />
            <input
              value={keyword}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="搜索文件名或标签…"
              className="w-full pl-9 pr-3 py-[7px] rounded-md border text-sm"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            className="px-3 py-[7px] rounded-md border text-sm"
            style={{ borderColor: "var(--border)", color: filterCategory ? "var(--ink)" : "var(--ink-muted)" }}
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="px-3 py-[7px] rounded-md border text-sm"
            style={{ borderColor: "var(--border)", color: filterType ? "var(--ink)" : "var(--ink-muted)" }}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {(keyword || filterType || filterCategory) && (
            <button
              onClick={() => { setKeyword(""); setFilterType(""); setFilterCategory(""); setPage(1); }}
              className="px-3 py-[7px] rounded-md text-xs hover:bg-red-50 transition-colors"
              style={{ color: "#dc2626" }}
            >
              重置
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "media" && (
          <>
            {loading ? (
              <p className="text-center py-16 text-sm" style={{ color: "var(--ink-muted)" }}>加载中…</p>
            ) : items.length === 0 ? (
              <p className="text-center py-16 text-sm" style={{ color: "var(--ink-muted)" }}>
                {keyword || filterType || filterCategory ? "未找到匹配的媒体文件" : "暂无媒体文件，点击「上传」开始"}
              </p>
            ) : (
              <MediaGrid
                items={items}
                onSelect={setSelectedMedia}
                onDelete={handleDelete}
              />
            )}
          </>
        )}
        {activeTab === "banners" && <BannerList />}
      </div>

      {/* Pagination */}
      {activeTab === "media" && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm" style={{ color: "var(--ink-muted)" }}>共 {total} 个文件</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-8 h-8 rounded text-sm transition-colors ${page === i + 1 ? "text-white" : ""}`}
                style={page === i + 1 ? { background: "#b45309" } : { color: "var(--ink-muted)" }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload modal */}
      {showUploader && (
        <MediaUploader
          key={uploadKey}
          onClose={() => setShowUploader(false)}
          onUploaded={handleUploaded}
        />
      )}

      {/* Detail modal */}
      {selectedMedia && (
        <MediaDetail
          item={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
