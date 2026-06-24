"use client";
/**
 * ERP Action Bar — WO-P12A
 * Client component: 搜索、刷新、导出 CSV（真实可用）+ 新增/筛选 Modal 骨架
 */
import { useState, useTransition, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export interface ActionBarProps {
  /** 页面标识，用于 CSV 文件名 */
  module: string;
  /** CSV 导出的列定义 */
  csvColumns: { key: string; label: string }[];
  /** 当前表格数据（用于导出） */
  data: Record<string, unknown>[];
  /** 搜索占位符 */
  searchPlaceholder?: string;
  /** 搜索参数名（URL param） */
  searchParam?: string;
  /** 新增弹窗内容（可选） */
  addModalContent?: React.ReactNode;
  /** 筛选弹窗内容（可选） */
  filterModalContent?: React.ReactNode;
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
  const csv = "\uFEFF" + header + "\n" + body; // BOM for Excel
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ActionBar({
  module,
  csvColumns,
  data,
  searchPlaceholder = "搜索...",
  searchParam = "q",
  addModalContent,
  filterModalContent,
}: ActionBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(searchParams.get(searchParam) || "");
  const [addOpen, setAddOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 搜索（防抖 300ms，更新 URL param）
  function handleSearch(val: string) {
    setSearchValue(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        if (val) params.set(searchParam, val);
        else params.delete(searchParam);
        params.delete("page"); // 重置翻页
        router.replace(`?${params.toString()}`);
      });
    }, 300);
  }

  // 刷新当前页
  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  // 导出 CSV
  function handleExport() {
    exportToCsv(`erp-${module}.csv`, csvColumns, data);
    setExportDone(true);
    setTimeout(() => setExportDone(false), 2000);
  }

  return (
    <>
      {/* ── Action Bar ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 20,
        flexWrap: "wrap",
      }}>
        {/* 搜索框 */}
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160, maxWidth: 320 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#a8a29e", fontSize: 14 }}>🔍</span>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              width: "100%",
              paddingLeft: 32,
              paddingRight: 10,
              height: 36,
              border: "1px solid #e7e5e4",
              borderRadius: 6,
              fontSize: 13,
              outline: "none",
              background: "#fff",
              boxSizing: "border-box",
            }}
          />
          {isPending && (
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#a8a29e" }}>
              搜索中…
            </span>
          )}
        </div>

        {/* 筛选按钮 */}
        <button
          onClick={() => setFilterOpen(true)}
          style={btnStyle("secondary")}
        >
          🔧 筛选
        </button>

        {/* 刷新按钮 */}
        <button
          onClick={handleRefresh}
          disabled={isPending}
          style={btnStyle("secondary")}
        >
          {isPending ? "⟳ 刷新中…" : "⟳ 刷新"}
        </button>

        {/* 导出按钮 */}
        <button
          onClick={handleExport}
          style={btnStyle("secondary")}
        >
          {exportDone ? "✅ 已导出" : "↓ 导出 CSV"}
        </button>

        <div style={{ flex: 1 }} />

        {/* 新增按钮 */}
        <button
          onClick={() => setAddOpen(true)}
          style={btnStyle("primary")}
        >
          + 新增
        </button>
      </div>

      {/* ── 新增 Modal ── */}
      {addOpen && (
        <Modal title="新增" onClose={() => setAddOpen(false)}>
          {addModalContent || (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🚧</p>
              <p style={{ fontWeight: 500, color: "#44403c", marginBottom: 8 }}>新增功能建设中</p>
              <p style={{ fontSize: 13, color: "#a8a29e" }}>
                保存逻辑将在下一工单（WO-P13A）接入。<br />
                当前页面已接通数据库，数据真实展示。
              </p>
            </div>
          )}
        </Modal>
      )}

      {/* ── 筛选 Modal ── */}
      {filterOpen && (
        <Modal title="筛选条件" onClose={() => setFilterOpen(false)}>
          {filterModalContent || (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🔧</p>
              <p style={{ fontWeight: 500, color: "#44403c", marginBottom: 8 }}>高级筛选建设中</p>
              <p style={{ fontSize: 13, color: "#a8a29e" }}>
                当前可通过顶部搜索框按关键词过滤数据。<br />
                字段级筛选将在下一工单中接入。
              </p>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

// ── Modal 组件 ──────────────────────────────
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff",
        borderRadius: 12,
        width: "100%",
        maxWidth: 480,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid #f5f5f4",
        }}>
          <span style={{ fontWeight: 500, fontSize: 15, color: "#1c1917" }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", fontSize: 18,
              cursor: "pointer", color: "#a8a29e", lineHeight: 1,
              padding: "2px 6px", borderRadius: 4,
            }}
          >✕</button>
        </div>
        {/* Body */}
        <div style={{ padding: "16px 20px 20px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── 按钮样式工具函数 ──────────────────────────────
function btnStyle(variant: "primary" | "secondary") {
  const base: React.CSSProperties = {
    height: 36,
    padding: "0 14px",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    border: "1px solid",
    fontWeight: 400,
    whiteSpace: "nowrap",
    transition: "opacity 0.15s",
  };
  if (variant === "primary") {
    return { ...base, background: "#1c1917", color: "#fff", borderColor: "#1c1917" };
  }
  return { ...base, background: "#fff", color: "#44403c", borderColor: "#e7e5e4" };
}
