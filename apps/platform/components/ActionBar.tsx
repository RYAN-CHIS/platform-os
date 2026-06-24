"use client";
/**
 * ERP Action Bar — WO-P12A
 * Client component: 搜索、刷新、导出 CSV（真实可用）+ 新增 Modal + 筛选（仅在 filterModalContent 提供时）
 */
import { useState, useTransition, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export interface ActionBarProps {
  module: string;
  csvColumns: { key: string; label: string }[];
  data: Record<string, unknown>[];
  searchPlaceholder?: string;
  searchParam?: string;
  addModalContent?: React.ReactNode;
  /** 筛选弹窗内容 — 提供时才会渲染筛选按钮 */
  filterModalContent?: React.ReactNode;
  /** 外部新增处理函数 — 提供时替换默认「+ 新增」Modal */
  onAdd?: () => void;
  /** 新增按钮文案 */
  addLabel?: string;
}

function exportToCsv(filename: string, columns: { key: string; label: string }[], rows: Record<string, unknown>[]) {
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const body = rows.map((row) =>
    columns.map((c) => {
      const v = row[c.key];
      if (v === null || v === undefined) return "";
      const str = String(v).replace(/"/g, '""');
      return `"${str}"`;
    }).join(",")
  ).join("\n");
  const csv = "\uFEFF" + header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ActionBar({
  module, csvColumns, data,
  searchPlaceholder = "搜索...", searchParam = "q",
  addModalContent, filterModalContent, onAdd, addLabel,
}: ActionBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(searchParams.get(searchParam) || "");
  const [addOpen, setAddOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(val: string) {
    setSearchValue(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        if (val) params.set(searchParam, val);
        else params.delete(searchParam);
        params.delete("page");
        router.replace(`?${params.toString()}`);
      });
    }, 300);
  }

  function handleRefresh() {
    startTransition(() => { router.refresh(); });
  }

  function handleExport() {
    exportToCsv(`erp-${module}.csv`, csvColumns, data);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 2000);
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160, maxWidth: 320 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#a8a29e", fontSize: 14 }}>🔍</span>
          <input
            type="text" value={searchValue} onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            style={{ width: "100%", paddingLeft: 32, paddingRight: 10, height: 36, border: "1px solid #e7e5e4", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", boxSizing: "border-box" }}
          />
          {isPending && (
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#a8a29e" }}>搜索中…</span>
          )}
        </div>

        {filterModalContent && (
          <button onClick={() => setFilterOpen(true)} style={btnStyle("secondary")}>
            🔧 筛选
          </button>
        )}

        <button onClick={handleRefresh} disabled={isPending} style={btnStyle("secondary")}>
          {isPending ? "⟳ 刷新中…" : "⟳ 刷新"}
        </button>

        <button onClick={handleExport} style={btnStyle("secondary")}>
          {exportDone ? "✅ 已导出" : "↓ 导出 CSV"}
        </button>

        <div style={{ flex: 1 }} />

        <button onClick={() => onAdd ? onAdd() : setAddOpen(true)} style={btnStyle("primary")}>
          {addLabel || "+ 新增"}
        </button>
      </div>

      {/* 筛选 Modal (only when filterModalContent provided) */}
      {filterModalContent && filterOpen && (
        <Modal title="筛选条件" onClose={() => setFilterOpen(false)}>
          {filterModalContent}
        </Modal>
      )}

      {/* 新增 Modal (only when onAdd not provided) */}
      {!onAdd && addOpen && (
        <Modal title="新增" onClose={() => setAddOpen(false)}>
          {addModalContent || (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🚧</p>
              <p style={{ fontWeight: 500, color: "#44403c", marginBottom: 8 }}>新增功能建设中</p>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f5f5f4" }}>
          <span style={{ fontWeight: 500, fontSize: 15, color: "#1c1917" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#a8a29e", lineHeight: 1, padding: "2px 6px", borderRadius: 4 }}>✕</button>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>{children}</div>
      </div>
    </div>
  );
}

function btnStyle(variant: "primary" | "secondary") {
  const base: React.CSSProperties = { height: 36, padding: "0 14px", borderRadius: 6, fontSize: 13, cursor: "pointer", border: "1px solid", fontWeight: 400, whiteSpace: "nowrap", transition: "opacity 0.15s" };
  if (variant === "primary") { return { ...base, background: "#1c1917", color: "#fff", borderColor: "#1c1917" }; }
  return { ...base, background: "#fff", color: "#44403c", borderColor: "#e7e5e4" };
}
