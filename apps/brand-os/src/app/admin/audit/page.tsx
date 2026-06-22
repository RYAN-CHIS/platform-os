"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { getAuditLogs, getAdminUsers } from "@/lib/actions/audit-actions";

type AuditEntry = {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: Date;
};

type UserOption = { id: string; name: string; email: string };

const ACTION_LABELS: Record<string, string> = {
  login: "登录", create: "新增", update: "修改",
  delete: "删除", publish: "发布", unpublish: "下架",
};

export default function AdminAuditPage() {
  const [entries, setEntries]     = useState<AuditEntry[]>([]);
  const [users, setUsers]         = useState<UserOption[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterUser, setFilterUser]   = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const PAGE_SIZE = 20;

  async function load() {
    setLoading(true);
    const [uRes, aRes] = await Promise.all([
      getAdminUsers(),
      getAuditLogs({ userId: filterUser || undefined, action: filterAction || undefined, entityType: filterEntity || undefined, page, pageSize: PAGE_SIZE }),
    ]);
    setUsers(uRes as any);
    setEntries((aRes as any).data || []);
    setTotal((aRes as any).total || 0);
    setLoading(false);
  }

  useEffect(() => { load(); }, [page, filterUser, filterAction, filterEntity]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const textStyle  = { color: "var(--yun-text)" };
  const subStyle   = { color: "var(--yun-subtext)" };
  const lineStyle  = { borderColor: "var(--yun-line)" };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-medium tracking-[0.1em]" style={textStyle}>审计日志</h1>
        <p className="text-xs mt-1" style={subStyle}>后台操作追溯</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border text-xs bg-white" style={lineStyle}>
          <option value="">全部操作</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <input
          value={filterEntity}
          onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
          placeholder="模块过滤，如：Product"
          className="px-3 py-1.5 border text-xs bg-white w-40" style={lineStyle} />

        <button onClick={() => { setFilterUser(""); setFilterAction(""); setFilterEntity(""); setPage(1); load(); }}
          className="px-3 py-1.5 text-xs border rounded" style={lineStyle}>
          重置
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-xs py-8 text-center" style={subStyle}>加载中…</p>
      ) : (
        <div className="border rounded overflow-hidden" style={lineStyle}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--yun-bg)]">
                  <th className="px-3 py-2 text-left font-medium" style={subStyle}>时间</th>
                  <th className="px-3 py-2 text-left font-medium" style={subStyle}>用户</th>
                  <th className="px-3 py-2 text-left font-medium" style={subStyle}>操作</th>
                  <th className="px-3 py-2 text-left font-medium" style={subStyle}>模块</th>
                  <th className="px-3 py-2 text-left font-medium" style={subStyle}>对象</th>
                  <th className="px-3 py-2 text-left font-medium" style={subStyle}>详情</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center" style={subStyle}>暂无日志记录</td></tr>
                )}
                {entries.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-[var(--yun-bg)]">
                    <td className="px-3 py-2 whitespace-nowrap" style={subStyle}>
                      {new Date(e.createdAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-3 py-2" style={textStyle}>
                      {users.find((u: any) => u.id === e.userId)?.name || e.userId}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded text-[11px]" style={{
                        background: e.action === "delete" ? "rgba(226,75,74,0.1)" : "rgba(99,153,34,0.1)",
                        color: e.action === "delete" ? "#E24B4A" : "#639922",
                      }}>
                        {ACTION_LABELS[e.action] || e.action}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={textStyle}>{e.entityType}</td>
                    <td className="px-3 py-2 font-mono text-[11px]" style={subStyle}>{e.entityId || "—"}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate" style={subStyle}>{e.details || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 text-xs border rounded disabled:opacity-40" style={lineStyle}>
            上一页
          </button>
          <span className="text-xs py-1" style={subStyle}>第 {page} / {totalPages} 页（共 {total} 条）</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 text-xs border rounded disabled:opacity-40" style={lineStyle}>
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
