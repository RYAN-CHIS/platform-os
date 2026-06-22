"use client";

import { Trash2, ImageIcon } from "lucide-react";
import type { MediaItem } from "../MediaClient";

interface Props {
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
  onDelete: (id: number) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const CATEGORY_COLORS: Record<string, string> = {
  BANNER: "#f59e0b",
  PRODUCT: "#3b82f6",
  WORK: "#8b5cf6",
  BRAND: "#ec4899",
  ARTICLE: "#10b981",
  PAGE: "#6366f1",
  OTHER: "#6b7280",
};

export default function MediaGrid({ items, onSelect, onDelete }: Props) {
  return (
    <div className="p-6">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {items.map((item) => (
          <div
            key={item.id}
            className="relative group rounded-lg border overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            style={{ borderColor: "var(--border)", background: "white" }}
            onClick={() => onSelect(item)}
          >
            {/* Image thumbnail */}
            <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
              {item.mimeType.startsWith("image") ? (
                <img
                  src={item.thumbnailUrl ?? item.url}
                  alt={item.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <ImageIcon size={40} style={{ color: "var(--ink-muted)" }} />
              )}
            </div>

            {/* Info */}
            <div className="p-2">
              <p className="text-xs truncate" style={{ color: "var(--ink)" }} title={item.originalName}>
                {item.originalName}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px]" style={{ color: "var(--ink-muted)" }}>
                  {formatSize(item.size)}
                </span>
                {/* Category badge */}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: CATEGORY_COLORS[item.category] ?? "#6b7280" }}
                >
                  {item.category}
                </span>
              </div>
              {/* Ref count */}
              {item._refCount > 0 && (
                <p className="text-[10px] mt-1" style={{ color: "var(--ink-light)" }}>
                  被引用 {item._refCount} 次
                </p>
              )}
            </div>

            {/* Hover delete */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
              title="删除"
            >
              <Trash2 size={14} color="#dc2626" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
