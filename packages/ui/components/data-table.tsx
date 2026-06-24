"use client";

import * as React from "react";

/**
 * DataTable — 通用数据表格
 * WO-P8A: Recovered from Legacy Platform UI.
 * Features: column definition, built-in sorting, loading state, empty state.
 */

export interface Column<T> {
  key: string;
  title: React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey?: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyText?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns, data, rowKey = (row) => row.id || Math.random().toString(),
  onRowClick, loading, emptyText = "暂无数据", className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) { setSortDir(sortDir === "asc" ? "desc" : "asc"); }
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]; const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [data, sortKey, sortDir]);

  return (
    <div className={`overflow-hidden rounded-xl border border-stone-200 bg-white ${className || ""}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-4 py-3 font-medium text-stone-500 ${col.sortable !== false ? "cursor-pointer select-none hover:text-stone-700" : ""} ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                  style={{ width: col.width }}
                >
                  {col.title}
                  {sortKey === col.key && (sortDir === "asc" ? " ↑" : " ↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-stone-400">
                <div className="inline-flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-stone-400" />加载中...</div>
              </td></tr>
            ) : sortedData.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-stone-400">{emptyText}</td></tr>
            ) : (
              sortedData.map((row, index) => (
                <tr key={rowKey(row)} onClick={() => onRowClick?.(row)}
                  className={`border-b border-stone-50 transition-colors ${onRowClick ? "cursor-pointer hover:bg-stone-50" : ""}`}>
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-stone-700 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}>
                      {col.render ? col.render(row, index) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
