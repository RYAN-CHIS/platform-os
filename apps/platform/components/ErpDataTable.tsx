"use client";

import { useState } from "react";

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ErpDataTableProps {
  columns: Column[];
  rows: any[];
  onSort?: (key: string, order: "asc" | "desc") => void;
  sortKey?: string;
  sortOrder?: string;
  emptyText?: string;
  loading?: boolean;
}

export default function ErpDataTable({
  columns, rows, onSort, sortKey, sortOrder,
  emptyText = "暂无数据", loading
}: ErpDataTableProps) {
  const [localSortKey, setLocalSortKey] = useState<string | null>(null);
  const [localSortOrder, setLocalSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (onSort) {
      const newOrder = sortKey === key && sortOrder === "asc" ? "desc" : "asc";
      onSort(key, newOrder);
    } else {
      const newOrder = localSortKey === key && localSortOrder === "asc" ? "desc" : "asc";
      setLocalSortKey(key);
      setLocalSortOrder(newOrder);
    }
  };

  const effectiveSortKey = onSort ? sortKey : localSortKey;
  const effectiveSortOrder = onSort ? sortOrder : localSortOrder;

  // Client-side sort when no onSort provided
  let displayRows = rows;
  if (!onSort && localSortKey) {
    displayRows = [...rows].sort((a, b) => {
      const av = a[localSortKey];
      const bv = b[localSortKey];
      const aval = av == null ? "" : String(av);
      const bval = bv == null ? "" : String(bv);
      const cmp = aval.localeCompare(bval, undefined, { numeric: true });
      return localSortOrder === "asc" ? cmp : -cmp;
    });
  }

  if (loading) {
    return <div style={{textAlign:"center",padding:40,color:"#a8a29e"}}>加载中...</div>;
  }

  if (rows.length === 0) {
    return <div style={{textAlign:"center",padding:40,color:"#a8a29e"}}>{emptyText}</div>;
  }

  return (
    <div style={{overflowX:"auto",border:"1px solid #e7e5e4",borderRadius:8}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead>
          <tr style={{background:"#fafaf9"}}>
            {columns.map(col => (
              <th
                key={col.key}
                onClick={() => col.sortable && handleSort(col.key)}
                style={{
                  position:"sticky",top:0,background:"#fafaf9",zIndex:10,
                  padding:"10px 12px",textAlign:"left",fontWeight:500,color:"#57534e",
                  borderBottom:"1px solid #e7e5e4",whiteSpace:"nowrap",
                  cursor: col.sortable ? "pointer" : "default",
                  width: col.width,
                }}
              >
                {col.label}
                {col.sortable && effectiveSortKey === col.key && (
                  <span style={{marginLeft:4,fontSize:10}}>{effectiveSortOrder === "asc" ? "↑" : "↓"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr key={row.id || i} style={{borderBottom:"1px solid #f5f5f4"}}>
              {columns.map(col => (
                <td key={col.key} style={{padding:"8px 12px",color:"#44403c",whiteSpace:"nowrap"}}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
