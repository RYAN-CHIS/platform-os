"use client";
/**
 * Settings Audit Client — WO-P12D
 */
import { useState, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/ActionBar";
import type { AuditLogRow } from "@/modules/settings/audit/actions";
import { listAuditLogs, getEntityTypes, getAuditUsers, exportAuditLogs } from "@/modules/settings/audit/actions";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  GRANT: "bg-purple-100 text-purple-700",
  REVOKE: "bg-orange-100 text-orange-700",
  LOGIN: "bg-cyan-100 text-cyan-700",
  TOGGLE: "bg-amber-100 text-amber-700",
};

const SYSTEM_COLORS: Record<string, string> = {
  ERP: "bg-blue-50 text-blue-700 border-blue-200",
  BRAND: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SETTINGS: "bg-purple-50 text-purple-700 border-purple-200",
  AUTH: "bg-amber-50 text-amber-700 border-amber-200",
};

interface AuditDetails {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  diff?: Record<string, { before: unknown; after: unknown }>;
  description?: string;
}

function parseDetails(details: string | null): AuditDetails | null {
  if (!details) return null;
  try {
    return JSON.parse(details) as AuditDetails;
  } catch {
    return null;
  }
}

function JsonViewer({ data, label, changedKeys }: { data: Record<string, unknown>; label: string; changedKeys?: string[] }) {
  return (
    <div className="bg-stone-50 rounded border border-stone-200 p-3">
      <div className="text-xs font-medium text-stone-500 mb-2">{label}</div>
      <div className="space-y-1">
        {Object.entries(data).map(([key, value]) => {
          const isChanged = changedKeys?.includes(key);
          return (
            <div key={key} className={`flex gap-2 text-xs ${isChanged ? "font-medium" : ""}`}>
              <span className="text-stone-400 font-mono shrink-0">{key}:</span>
              <span className={`font-mono break-all ${isChanged ? (label.includes("前") ? "text-red-600" : "text-emerald-600") : "text-stone-600"}`}>
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DiffViewer({ diff }: { diff: Record<string, { before: unknown; after: unknown }> }) {
  return (
    <div className="bg-stone-50 rounded border border-stone-200 p-3">
      <div className="text-xs font-medium text-stone-500 mb-2">差异 (diff)</div>
      <div className="space-y-2">
        {Object.entries(diff).map(([key, { before, after }]) => (
          <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs">
            <span className="text-stone-500 font-mono shrink-0 min-w-[80px]">{key}</span>
            <div className="flex items-center gap-2 flex-1">
              <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded font-mono border border-red-100">
                {typeof before === "object" ? JSON.stringify(before) : String(before)}
              </span>
              <span className="text-stone-400">→</span>
              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono border border-emerald-100">
                {typeof after === "object" ? JSON.stringify(after) : String(after)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuditClient({
  initialLogs,
  entityTypes,
  auditUsers,
  systems,
  currentFilter,
}: {
  initialLogs: AuditLogRow[];
  entityTypes: string[];
  auditUsers: { id: number; name: string | null; email: string }[];
  systems: string[];
  currentFilter: { q?: string; module?: string; userId?: number; action?: string; from?: string; to?: string; system?: string; targetId?: string };
}) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  useEffect(() => { setLogs(initialLogs); }, [initialLogs]);
  const [filters, setFilters] = useState(currentFilter);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.module) params.set("module", filters.module);
    if (filters.userId) params.set("userId", String(filters.userId));
    if (filters.action) params.set("action", filters.action);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.system) params.set("system", filters.system);
    if (filters.targetId) params.set("targetId", filters.targetId);
    router.replace(`/settings/audit?${params.toString()}`);
    router.refresh();
  };

  const clearFilters = () => {
    router.replace("/settings/audit");
    router.refresh();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await exportAuditLogs(filters);
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const csvColumns = [
    { key: "created_at", label: "时间" },
    { key: "user_email", label: "用户" },
    { key: "action", label: "操作" },
    { key: "entity_type", label: "模块" },
    { key: "entity_id", label: "目标ID" },
    { key: "details", label: "详情" },
    { key: "ip", label: "IP" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">审计日志</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="h-9 px-4 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? "导出中..." : "导出 CSV"}
          </button>
          <span className="text-sm text-stone-500">共 {logs.length} 条记录</span>
        </div>
      </div>

      <ActionBar
        module="settings-audit"
        csvColumns={csvColumns}
        data={logs.map(l => ({ ...l }))}
        searchPlaceholder="搜索日志..."
        filterModalContent={
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">系统</label>
              <select
                value={filters.system || ""}
                onChange={e => setFilters(f => ({ ...f, system: e.target.value || undefined }))}
                className="w-full h-9 px-3 border border-stone-200 rounded text-sm bg-white"
              >
                <option value="">所有系统</option>
                {systems.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">模块</label>
              <select
                value={filters.module || ""}
                onChange={e => setFilters(f => ({ ...f, module: e.target.value || undefined }))}
                className="w-full h-9 px-3 border border-stone-200 rounded text-sm bg-white"
              >
                <option value="">全部</option>
                {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">操作</label>
              <select
                value={filters.action || ""}
                onChange={e => setFilters(f => ({ ...f, action: e.target.value || undefined }))}
                className="w-full h-9 px-3 border border-stone-200 rounded text-sm bg-white"
              >
                <option value="">全部</option>
                {Object.keys(ACTION_COLORS).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">用户</label>
              <select
                value={filters.userId || ""}
                onChange={e => setFilters(f => ({ ...f, userId: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full h-9 px-3 border border-stone-200 rounded text-sm bg-white"
              >
                <option value="">全部</option>
                {auditUsers.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">目标 ID</label>
              <input
                type="text"
                value={filters.targetId || ""}
                onChange={e => setFilters(f => ({ ...f, targetId: e.target.value || undefined }))}
                placeholder="输入目标 ID"
                className="w-full h-9 px-3 border border-stone-200 rounded text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-stone-500 mb-1">开始时间</label>
                <input type="date" value={filters.from || ""} onChange={e => setFilters(f => ({ ...f, from: e.target.value || undefined }))} className="w-full h-9 px-3 border border-stone-200 rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">结束时间</label>
                <input type="date" value={filters.to || ""} onChange={e => setFilters(f => ({ ...f, to: e.target.value || undefined }))} className="w-full h-9 px-3 border border-stone-200 rounded text-sm" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={applyFilters} className="h-9 px-4 bg-stone-800 text-white text-sm rounded">应用筛选</button>
              <button onClick={clearFilters} className="h-9 px-4 border border-stone-200 text-sm rounded text-stone-600">清除</button>
            </div>
          </div>
        }
      />

      {/* Audit Logs Table */}
      <div className="border border-stone-200 rounded overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-stone-50 text-stone-500">
              <th className="text-left py-2 px-3">时间</th>
              <th className="text-left py-2 px-3">用户</th>
              <th className="text-left py-2 px-3">操作</th>
              <th className="text-left py-2 px-3">系统</th>
              <th className="text-left py-2 px-3">模块</th>
              <th className="text-left py-2 px-3">目标ID</th>
              <th className="text-left py-2 px-3">详情</th>
              <th className="text-left py-2 px-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              const parsed = parseDetails(l.details);
              const isExpanded = expandedId === l.id;
              const changedKeys = parsed?.diff ? Object.keys(parsed.diff) : [];
              return (
                <Fragment key={l.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : l.id)}
                    className={`border-b border-stone-100 hover:bg-stone-50/50 cursor-pointer transition-colors ${isExpanded ? "bg-stone-50/80" : ""}`}
                  >
                    <td className="py-2 px-3 text-stone-500 text-xs whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString("zh-CN")}
                    </td>
                    <td className="py-2 px-3 font-medium text-xs">{l.user_name || l.user_email}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${ACTION_COLORS[l.action] || "bg-stone-100 text-stone-600"}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs border ${SYSTEM_COLORS[l.system] || "bg-stone-50 text-stone-600 border-stone-200"}`}>
                        {l.system}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs font-mono text-stone-500">{l.entity_type}</td>
                    <td className="py-2 px-3 text-xs font-mono text-stone-400">{l.entity_id || "—"}</td>
                    <td className="py-2 px-3 text-xs text-stone-500 max-w-[200px] truncate">{l.details || "—"}</td>
                    <td className="py-2 px-3 text-xs font-mono text-stone-400">{l.ip || "—"}</td>
                  </tr>
                  {isExpanded && parsed && (
                    <tr className="border-b border-stone-200 bg-stone-50/40">
                      <td colSpan={8} className="py-4 px-3">
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          {parsed.description && (
                            <div className="text-sm text-stone-600 bg-white border border-stone-200 rounded p-3">
                              <span className="text-stone-400 font-medium">描述：</span>
                              {parsed.description}
                            </div>
                          )}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {parsed.before && (
                              <JsonViewer data={parsed.before} label="变更前 (before)" changedKeys={changedKeys} />
                            )}
                            {parsed.after && (
                              <JsonViewer data={parsed.after} label="变更后 (after)" changedKeys={changedKeys} />
                            )}
                          </div>
                          {parsed.diff && Object.keys(parsed.diff).length > 0 && (
                            <DiffViewer diff={parsed.diff} />
                          )}
                          {!parsed.before && !parsed.after && !parsed.diff && !parsed.description && (
                            <div className="text-xs text-stone-400">无详细变更数据</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-16 text-stone-400">
                  <div className="text-3xl mb-2">📋</div>
                  <div>暂无审计日志</div>
                  <div className="text-xs mt-1">系统操作将被自动记录于此</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-stone-400 text-center">
        显示最近 500 条记录
      </div>
    </div>
  );
}
