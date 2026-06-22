"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Pencil, GripVertical } from "lucide-react";

interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  mediaId: number;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  media: {
    id: number;
    url: string;
    originalName: string;
  };
  createdAt: string;
}

export default function BannerList() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [mediaId, setMediaId] = useState<number | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);

  // Media picker
  const [mediaResults, setMediaResults] = useState<Array<{ id: number; url: string; originalName: string }>>([]);
  const [mediaSearch, setMediaSearch] = useState("");

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/banners");
      setBanners(await res.json());
    } catch (err) {
      console.error("加载 Banner 失败:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  // Search media for picker
  useEffect(() => {
    if (!showForm && !editing) return;
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (mediaSearch) params.set("keyword", mediaSearch);
        params.set("pageSize", "20");
        const res = await fetch(`/api/media?${params.toString()}`);
        const data = await res.json();
        setMediaResults(data.items ?? []);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [mediaSearch, showForm, editing]);

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setMediaId(null);
    setLinkUrl("");
    setIsActive(true);
    setStartAt("");
    setEndAt("");
    setMediaSearch("");
    setEditing(null);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setTitle(b.title);
    setSubtitle(b.subtitle ?? "");
    setMediaId(b.mediaId);
    setLinkUrl(b.linkUrl ?? "");
    setIsActive(b.isActive);
    setStartAt(b.startAt ? b.startAt.slice(0, 10) : "");
    setEndAt(b.endAt ? b.endAt.slice(0, 10) : "");
    setMediaSearch(b.media.originalName);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title || !mediaId) return;
    setSaving(true);
    try {
      const body: any = { title, subtitle: subtitle || null, mediaId, linkUrl: linkUrl || null, isActive, startAt, endAt };
      let res;
      if (editing) {
        res = await fetch(`/api/banners/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        // Get max sortOrder
        const maxOrder = banners.reduce((max, b) => Math.max(max, b.sortOrder), 0);
        body.sortOrder = maxOrder + 1;
        res = await fetch("/api/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (res.ok) {
        setShowForm(false);
        resetForm();
        fetchBanners();
      }
    } catch (err) {
      console.error("保存失败:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此 Banner？")) return;
    await fetch(`/api/banners/${id}`, { method: "DELETE" });
    fetchBanners();
  };

  const handleToggleActive = async (b: Banner) => {
    await fetch(`/api/banners/${b.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !b.isActive }),
    });
    fetchBanners();
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newBanners = [...banners];
    [newBanners[index - 1], newBanners[index]] = [newBanners[index], newBanners[index - 1]];
    setBanners(newBanners);
    await fetch("/api/banners/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: newBanners.map((b) => b.id) }),
    });
  };

  const handleMoveDown = async (index: number) => {
    if (index === banners.length - 1) return;
    const newBanners = [...banners];
    [newBanners[index], newBanners[index + 1]] = [newBanners[index + 1], newBanners[index]];
    setBanners(newBanners);
    await fetch("/api/banners/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: newBanners.map((b) => b.id) }),
    });
  };

  return (
    <div className="p-6 relative">
      {banners.length === 0 && !loading && (
        <div className="text-center py-16">
          <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>暂无 Banner</p>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-md text-sm font-medium text-white"
            style={{ background: "#b45309" }}
          >
            <Plus size={14} />创建 Banner
          </button>
        </div>
      )}

      {banners.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm" style={{ color: "var(--ink-muted)" }}>{banners.length} 个 Banner</span>
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 px-3 py-[7px] rounded-md text-sm font-medium text-white"
              style={{ background: "#b45309" }}
            >
              <Plus size={14} />新增
            </button>
          </div>

          <div className="space-y-2">
            {banners.map((b, i) => (
              <div
                key={b.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border"
                style={{ borderColor: "var(--border)", background: "white" }}
              >
                {/* Sort buttons */}
                <div className="flex flex-col">
                  <button
                    onClick={() => handleMoveUp(i)}
                    className="text-xs leading-none hover:text-amber-600"
                    style={{ color: "var(--ink-muted)" }}
                    disabled={i === 0}
                  >▲</button>
                  <button
                    onClick={() => handleMoveDown(i)}
                    className="text-xs leading-none hover:text-amber-600"
                    style={{ color: "var(--ink-muted)" }}
                    disabled={i === banners.length - 1}
                  >▼</button>
                </div>

                {/* Thumbnail */}
                <div className="w-16 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={b.media.url}
                    alt={b.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>{b.title}</p>
                    {b.subtitle && (
                      <span className="text-xs truncate" style={{ color: "var(--ink-muted)" }}>{b.subtitle}</span>
                    )}
                  </div>
                  {b.linkUrl && (
                    <p className="text-xs truncate" style={{ color: "var(--ink-light)" }}>{b.linkUrl}</p>
                  )}
                </div>

                {/* Status */}
                <button
                  onClick={() => handleToggleActive(b)}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${b.isActive ? "text-white" : ""}`}
                  style={b.isActive ? { background: "#b45309" } : { background: "var(--bg-secondary)", color: "var(--ink-muted)" }}
                >
                  {b.isActive ? "生效中" : "已停用"}
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(b)}
                    className="p-1.5 rounded hover:bg-gray-100"
                  >
                    <Pencil size={14} style={{ color: "var(--ink-muted)" }} />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 rounded hover:bg-red-50"
                  >
                    <Trash2 size={14} color="#dc2626" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[10vh]" onClick={() => { setShowForm(false); resetForm(); }}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                {editing ? "编辑 Banner" : "新建 Banner"}
              </h3>
            </div>

            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--ink-muted)" }}>标题 *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-[7px] rounded-md border text-sm"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="Banner 标题"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--ink-muted)" }}>副标题</label>
                <input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3 py-[7px] rounded-md border text-sm"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="可选副标题"
                />
              </div>

              {/* Media Picker */}
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--ink-muted)" }}>媒体图片 *</label>
                <input
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  className="w-full px-3 py-[7px] rounded-md border text-sm"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="搜索已上传的图片…"
                />
                {mediaId && (
                  <div className="mt-2 px-2 py-1 rounded text-xs" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                    已选择: ID {mediaId}
                  </div>
                )}
                {mediaResults.length > 0 && !mediaId && (
                  <div className="mt-1 max-h-32 overflow-auto border rounded" style={{ borderColor: "var(--border)" }}>
                    {mediaResults.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setMediaId(m.id); setMediaSearch(m.originalName); setMediaResults([]); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        style={{ color: "var(--ink)" }}
                      >
                        <img src={m.url} alt="" className="w-8 h-6 rounded object-cover" />
                        <span className="truncate">{m.originalName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Link URL */}
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--ink-muted)" }}>链接地址</label>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-[7px] rounded-md border text-sm"
                  style={{ borderColor: "var(--border)" }}
                  placeholder="如：/products/P001"
                />
              </div>

              {/* Time range */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs block mb-1" style={{ color: "var(--ink-muted)" }}>开始时间</label>
                  <input
                    type="date"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full px-3 py-[7px] rounded-md border text-sm"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs block mb-1" style={{ color: "var(--ink-muted)" }}>结束时间</label>
                  <input
                    type="date"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full px-3 py-[7px] rounded-md border text-sm"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded accent-amber-700"
                />
                <span className="text-sm" style={{ color: "var(--ink)" }}>立即生效</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-[7px] rounded-md text-sm border hover:bg-gray-50"
                style={{ borderColor: "var(--border)", color: "var(--ink)" }}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!title || !mediaId || saving}
                className={`px-4 py-[7px] rounded-md text-sm font-medium text-white transition-opacity ${!title || !mediaId || saving ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`}
                style={{ background: "#b45309" }}
              >
                {saving ? "保存中…" : editing ? "更新" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
