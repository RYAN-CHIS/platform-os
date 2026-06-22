"use client";

import { useState, useRef, useCallback } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";

interface Props {
  onClose: () => void;
  onUploaded: () => void;
}

const CATEGORY_OPTIONS = [
  { value: "OTHER", label: "其他" },
  { value: "BANNER", label: "Banner" },
  { value: "PRODUCT", label: "产品" },
  { value: "WORK", label: "作品" },
  { value: "BRAND", label: "品牌" },
  { value: "ARTICLE", label: "文章" },
  { value: "PAGE", label: "页面" },
];

export default function MediaUploader({ onClose, onUploaded }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [tags, setTags] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: FileList) => {
    const validFiles = Array.from(newFiles).filter((f) =>
      f.type.startsWith("image/") || f.type.startsWith("video/") || f.type === "application/pdf",
    );
    if (validFiles.length === 0) {
      setError("不支持的文件类型，仅支持图片/视频/PDF");
      return;
    }
    setFiles((prev) => [...prev, ...validFiles]);
    setError("");
  }, []);

  const handleRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError("");

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);
      formData.append("category", category);
      formData.append("tags", tags);

      try {
        const res = await fetch("/api/media", { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "上传失败");
        }
      } catch (err: any) {
        setError(err.message || "上传失败，请重试");
        setUploading(false);
        return;
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setUploading(false);
    onUploaded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>上传媒体</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={18} style={{ color: "var(--ink-muted)" }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-amber-600 bg-amber-50" : ""}`}
            style={{ borderColor: dragOver ? "#b45309" : "var(--border)" }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={32} className="mx-auto mb-2" style={{ color: "var(--ink-muted)" }} />
            <p className="text-sm" style={{ color: "var(--ink)" }}>拖拽文件到此处，或点击选择</p>
            <p className="text-xs mt-1" style={{ color: "var(--ink-light)" }}>支持 JPG/PNG/WebP/GIF/SVG/MP4/PDF，单文件最大 10MB</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm,application/pdf"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {/* File previews */}
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>已选择 {files.length} 个文件</p>
              <div className="max-h-32 overflow-auto space-y-1">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-1.5 rounded text-sm"
                    style={{ background: "var(--bg-secondary)", color: "var(--ink)" }}
                  >
                    <span className="truncate flex-1">
                      {file.type.startsWith("image") && <ImageIcon size={14} className="inline mr-1" />}
                      {file.name}
                    </span>
                    <button onClick={() => handleRemove(i)} className="ml-2">
                      <X size={14} style={{ color: "var(--ink-muted)" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category + Tags */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs block mb-1" style={{ color: "var(--ink-muted)" }}>分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-[7px] rounded-md border text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs block mb-1" style={{ color: "var(--ink-muted)" }}>标签（逗号分隔）</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="如：首页, 活动"
                className="w-full px-3 py-[7px] rounded-md border text-sm"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm px-3 py-2 rounded" style={{ background: "#fef2f2", color: "#dc2626" }}>{error}</p>
          )}

          {/* Progress */}
          {uploading && (
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: "#b45309" }}
                />
              </div>
              <p className="text-xs text-center" style={{ color: "var(--ink-muted)" }}>{progress}%</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={onClose}
            className="px-4 py-[7px] rounded-md text-sm border hover:bg-gray-50"
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
            disabled={uploading}
          >
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className={`px-4 py-[7px] rounded-md text-sm font-medium text-white transition-opacity ${files.length === 0 || uploading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`}
            style={{ background: "#b45309" }}
          >
            {uploading ? `上传中 ${progress}%` : `上传 ${files.length} 个文件`}
          </button>
        </div>
      </div>
    </div>
  );
}
