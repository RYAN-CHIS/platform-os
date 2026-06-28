"use client";
/**
 * BrandMediaPicker — Image/media selector with library pick & local upload
 * Replace manual URL input with picker/upload/preview/replace/delete
 */
import { useState, useRef, useEffect } from "react";

interface MediaItem {
  id: number;
  url: string;
  filename: string;
  thumbnail?: string;
  mediaType: string;
}

export interface BrandMediaPickerProps {
  /** Current image URL (can be empty) */
  value: string;
  /** Called when a new image is selected or uploaded */
  onChange: (url: string) => void;
  /** Label text */
  label?: string;
  /** Required flag */
  required?: boolean;
  /** Placeholder for empty state */
  placeholder?: string;
}

export function BrandMediaPicker({
  value, onChange, label, required, placeholder = "点击选择或上传图片",
}: BrandMediaPickerProps) {
  const [mode, setMode] = useState<"none" | "picker" | "upload">("none");
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(value || "");
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync preview with external value
  useEffect(() => { setPreviewUrl(value); }, [value]);

  // ── Open media library picker ──
  const openPicker = async () => {
    setLoading(true);
    try {
      const res = await fetch("/brand/media?q=");
      // We use a simple inline fetch approach
      const data = await res.json().catch(() => null);
      if (data?.rows) {
        setMediaList(data.rows.filter((r: any) =>
          r.mediaType === "IMAGE" || r.url?.match(/\.(jpg|jpeg|png|webp|gif|svg)/i)
        ));
      }
    } catch {}
    setLoading(false);
    setMode("picker");
  };

  // ── Upload file ──
  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("menuGroup", "other");
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `上传接口 ${res.status}`);
      }
      if (data.url) {
        onChange(data.url);
        setPreviewUrl(data.url);
        setMode("none");
      }
    } catch (e) {
      console.error("Upload failed", e);
    }
    setLoading(false);
  };

  // ── Remove image ──
  const handleRemove = () => {
    onChange("");
    setPreviewUrl("");
    setMode("none");
  };

  return (
    <div>
      {label && (
        <label style={{
          display: "block", fontSize: 12, color: "#57534e", marginBottom: 4, fontWeight: 500,
        }}>
          {label}
          {required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
        </label>
      )}

      {previewUrl ? (
        /* ── Image preview ── */
        <div style={{
          position: "relative", borderRadius: 8, overflow: "hidden",
          border: "1px solid #e7e5e4", background: "#fafaf9",
          maxWidth: 320,
        }}>
          <img
            src={previewUrl}
            alt="preview"
            style={{
              display: "block", width: "100%", height: 180,
              objectFit: "cover",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div style={{
            display: "flex", gap: 6, padding: "6px 8px",
            borderTop: "1px solid #e7e5e4", background: "#fff",
          }}>
            <button type="button" onClick={openPicker} style={miniBtn}>
              替换
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} style={miniBtn}>
              本地上传
            </button>
            <button type="button" onClick={handleRemove} style={{ ...miniBtn, color: "#dc2626", borderColor: "#fecaca" }}>
              删除
            </button>
          </div>
        </div>
      ) : (
        /* ── Empty state ── */
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
        }}>
          <button type="button" onClick={openPicker} disabled={loading} style={pickerBtn}>
            {loading ? "加载中…" : "📁 从素材库选择"}
          </button>
          <span style={{ color: "#a8a29e", fontSize: 12 }}>或</span>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={loading} style={pickerBtn}>
            📤 本地上传
          </button>
          <span style={{ color: "#d6d3d1", fontSize: 11 }}>{placeholder}</span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />

      {/* ── Media library picker modal ── */}
      {mode === "picker" && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setMode("none"); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9100,
            background: "rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div style={{
            background: "#fff", borderRadius: 12, width: "100%", maxWidth: 600, maxHeight: "70vh",
            overflow: "hidden", display: "flex", flexDirection: "column",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px", borderBottom: "1px solid #e7e5e4",
            }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: "#1c1917" }}>选择图片</span>
              <button onClick={() => setMode("none")} style={{
                background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#a8a29e",
              }}>✕</button>
            </div>
            <div style={{
              flex: 1, overflowY: "auto", padding: 16,
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
            }}>
              {mediaList.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "#a8a29e", fontSize: 13 }}>
                  {loading ? "加载中…" : "暂无素材，请先上传"}
                </div>
              )}
              {mediaList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { onChange(item.url); setPreviewUrl(item.url); setMode("none"); }}
                  style={{
                    border: "1px solid #e7e5e4", borderRadius: 8, overflow: "hidden",
                    cursor: "pointer", padding: 0, background: "#fafaf9",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#292524"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e7e5e4"; }}
                >
                  <img
                    src={item.thumbnail || item.url}
                    alt={item.filename}
                    style={{ display: "block", width: "100%", height: 100, objectFit: "cover" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='%23f5f5f4' width='40' height='40'/%3E%3Ctext x='4' y='24' font-size='20' fill='%23ccc'%3E🖼%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  <div style={{ padding: "4px 6px", fontSize: 10, color: "#a8a29e", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {item.filename}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inline styles ──
const pickerBtn: React.CSSProperties = {
  height: 34, padding: "0 12px", borderRadius: 6, fontSize: 12,
  cursor: "pointer", border: "1px solid #d6d3d1", background: "#fff",
  color: "#44403c", fontWeight: 400,
};

const miniBtn: React.CSSProperties = {
  height: 28, padding: "0 8px", borderRadius: 4, fontSize: 11,
  cursor: "pointer", border: "1px solid #d6d3d1", background: "#fff",
  color: "#57534e",
};
