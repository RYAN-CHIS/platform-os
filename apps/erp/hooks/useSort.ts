"use client";

import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc" | null;

interface UseSortResult<T> {
  sorted: T[];
  sortKey: string | null;
  sortDir: SortDirection;
  toggleSort: (key: string) => void;
}

/**
 * 通用表格排序 Hook
 * @param data 原始数据
 * @param defaultKey 默认排序列
 * @param defaultDir 默认排序方向
 */
export function useSort<T extends Record<string, any>>(
  data: T[],
  defaultKey?: string,
  defaultDir: "asc" | "desc" = "asc"
): UseSortResult<T> {
  const [sortKey, setSortKey] = useState<string | null>(defaultKey ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultDir);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = getNestedValue(a, sortKey);
      const bVal = getNestedValue(b, sortKey);

      // null 处理
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDir === "asc" ? -1 : 1;
      if (bVal == null) return sortDir === "asc" ? 1 : -1;

      // 数字比较
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      // 日期比较
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDir === "asc"
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      // 字符串比较（支持中文）
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal), "zh-CN", {
            numeric: true,
          })
        : String(bVal).localeCompare(String(aVal), "zh-CN", {
            numeric: true,
          });
    });
  }, [data, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        // 第三次点击取消排序
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return { sorted, sortKey, sortDir, toggleSort };
}

/** 获取嵌套字段值，支持 "work.name" 格式 */
function getNestedValue(obj: any, key: string): any {
  return key.split(".").reduce((o, k) => o?.[k], obj);
}
