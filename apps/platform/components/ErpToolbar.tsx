"use client";

import { useState } from "react";

interface ErpToolbarProps {
  title: string;
  subtitle?: string;
  total: number;
  entityLabel?: string;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onAdd?: () => void;
  filterOptions?: { label: string; value: string }[];
  activeFilter?: string;
  onFilterChange?: (value: string) => void;
  extraButtons?: React.ReactNode;
}

export default function ErpToolbar({
  title, subtitle, total, entityLabel = "条",
  searchPlaceholder = "搜索...",
  onSearch, onRefresh, onExport, onAdd,
  filterOptions, activeFilter, onFilterChange,
  extraButtons,
}: ErpToolbarProps) {
  const [q, setQ] = useState("");

  return (
    <div style={{marginBottom:20}}>
      {/* Row 1: Title + Add button */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:300,letterSpacing:"0.05em",color:"#292524",margin:0}}>{title}</h1>
          {subtitle && <p style={{fontSize:12,color:"#a8a29e",marginTop:4}}>{subtitle}</p>}
        </div>
        <div style={{display:"flex",gap:8}}>
          {onRefresh && <button onClick={onRefresh} title="刷新" style={{padding:"6px 12px",border:"1px solid #e7e5e4",borderRadius:6,background:"#fff",cursor:"pointer",fontSize:13,color:"#57534e"}}>🔄 刷新</button>}
          {onExport && <button onClick={onExport} title="导出 CSV" style={{padding:"6px 12px",border:"1px solid #e7e5e4",borderRadius:6,background:"#fff",cursor:"pointer",fontSize:13,color:"#57534e"}}>📥 导出</button>}
          {extraButtons}
          {onAdd && <button onClick={onAdd} style={{padding:"6px 16px",background:"#292524",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:13}}>+ 新增{entityLabel.replace("条","")}</button>}
        </div>
      </div>

      {/* Row 2: Filters + Search */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:"#78716c"}}>共 <b>{total}</b> {entityLabel}</span>
          {filterOptions && (
            <div style={{display:"flex",gap:4}}>
              {filterOptions.map(f => (
                <button
                  key={f.value}
                  onClick={() => onFilterChange?.(f.value)}
                  style={{
                    padding:"3px 10px",borderRadius:12,border:"1px solid #e7e5e4",fontSize:11,
                    background: activeFilter === f.value ? "#292524" : "#fff",
                    color: activeFilter === f.value ? "#fff" : "#78716c",
                    cursor:"pointer"
                  }}
                >{f.label}</button>
              ))}
            </div>
          )}
        </div>
        {onSearch && (
          <div style={{display:"flex",gap:4}}>
            <input
              value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onSearch(q)}
              placeholder={searchPlaceholder}
              style={{padding:"5px 10px",border:"1px solid #e7e5e4",borderRadius:6,fontSize:13,width:200}}
            />
            <button onClick={() => onSearch(q)} style={{padding:"5px 10px",background:"#f5f5f4",border:"1px solid #e7e5e4",borderRadius:6,fontSize:13,cursor:"pointer"}}>搜索</button>
          </div>
        )}
      </div>
    </div>
  );
}
