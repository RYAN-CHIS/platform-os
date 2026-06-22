"use client";

import { useState, useEffect } from "react";
import { X, Trash2, ExternalLink, Copy } from "lucide-react";
import type { MediaItem } from "../MediaClient";

interface MediaRefRow {
  entity_type: string;
  entity_id: number;
  field_name: string;
}

interface Props {
  item: MediaItem;
  onClose: () => void;
  onDelete: (id: number) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function MediaDetail({ item, onClose, onDelete }: Props) {
  const [references, setReferences] = useState<MediaRefRow[]>([]);
  const [refCount, setRefCount] = useState(item._refCount ?? 0);

  useEffect(() => {
    fetch(`/api/media/${item.id}`)
      .then((r) => r.json())
      .then((data) => {
        setReferences(data.references ?? []);
        setRefCount(data._refCount ?? 0);
      })
      .catch(() => {});
  }, [item.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.url);
  };

  const handleDelete = () => {
    if (refCount > 0) {
      const confirmed = confirm(`该文件被 ${refCount} 处引用，确认删除？`);
      if (!confirmed) return;
    }
    onDelete(item.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[10vh]" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-base font-semibold truncate" style={{ color: "var(--ink)" }}>{item.originalName}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X size={18} style={{ color: "var(--ink-muted)" }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Preview */}
          <div className="rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center" style={{ minHeight: 200 }}>
            {item.mimeType.startsWith("image") ? (
              <img src={item.url} alt={item.originalName} className="max-w-full max-h-[300px] object-contain" />
            ) : item.mimeType.startsWith("video") ? (
              <video src={item.url} controls className="max-w-full max-h-[300px]" />
            ) : (
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>不支持预览</p>
            )}
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>文件名</span>
              <p style={{ color: "var(--ink)" }} className="truncate">{item.originalName}</p>
            </div>
            <div>
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>类型</span>
              <p style={{ color: "var(--ink)" }}>{item.mediaType}</p>
            </div>
            <div>
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>大小</span>
              <p style={{ color: "var(--ink)" }}>{formatSize(item.size)}</p>
            </div>
            <div>
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>分类</span>
              <p style={{ color: "var(--ink)" }}>{item.category}</p>
            </div>
            {item.width && item.height && (
              <div>
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>尺寸</span>
                <p style={{ color: "var(--ink)" }}>{item.width} x {item.height}</p>
              </div>
            )}
            <div>
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>上传时间</span>
              <p style={{ color: "var(--ink)" }}>{formatDate(item.createdAt)}</p>
            </div>
            {item.tags && (
              <div className="col-span-2">
                <span className="text-xs" style={{ color: "var(--ink-muted)" }}>标签</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {item.tags.split(",").map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-xs"
                      style={{ background: "var(--bg-secondary)", color: "var(--ink)" }}
                    >
                      {t.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* URL */}
          <div>
            <span className="text-xs" style={{ color: "var(--ink-muted)" }}>URL</span>
            <div className="flex items-center gap-2 mt-0.5">
              <code
                className="flex-1 px-3 py-1.5 rounded text-xs truncate"
                style={{ background: "var(--bg-secondary)", color: "var(--ink)", fontSize: 11 }}
              >
                {item.url}
              </code>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-gray-100"
                title="复制链接"
              >
                <Copy size={14} style={{ color: "var(--ink-muted)" }} />
              </button>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-gray-100"
                title="新窗口打开"
              >
                <ExternalLink size={14} style={{ color: "var(--ink-muted)" }} />
              </a>
            </div>
          </div>

          {/* References */}
          {references.length > 0 && (
            <div>
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                被引用 ({refCount} 处)
              </span>
              <div className="mt-1 space-y-1 max-h-32 overflow-auto">
                {references.map((ref, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2 py-1 rounded text-xs"
                    style={{ background: "var(--bg-secondary)", color: "var(--ink)" }}
                  >
                    <span className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>
                      {ref.entity_type}#{ref.entity_id}
                    </span>
                    <span>·</span>
                    <span>{ref.field_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between px-5 py-4 border-t sticky bottom-0 bg-white" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-[7px] rounded-md text-xs border hover:bg-red-50 transition-colors"
            style={{ borderColor: "#fca5a5", color: "#dc2626" }}
          >
            <Trash2 size={14} />
            删除文件
          </button>
          <button
            onClick={onClose}
            className="px-4 py-[7px] rounded-md text-sm border hover:bg-gray-50"
            style={{ borderColor: "var(--border)", color: "var(--ink)" }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
