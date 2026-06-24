"use client";
/**
 * BrandSeriesClient — WO-P12B + WO-P13C Publishing Workflow
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/ActionBar";
import { CrudModal, ConfirmModal, FormField } from "@/components/BrandCrudModal";
import {
  createSeries,
  updateSeries,
  deleteSeries,
  moveSeries,
  submitSeriesForReview,
  approveSeries,
  rejectSeries,
  publishSeriesNow,
  scheduleSeriesPublish,
  unpublishSeries,
  archiveSeries,
  getSeriesVersions,
  rollbackSeries,
  getSeriesPreviewToken,
} from "@/modules/brand/series/actions";

const SERIES_FIELDS: FormField[] = [
  { key: "name", label: "系列名称", type: "text", required: true, placeholder: "见己" },
  { key: "slug", label: "Slug", type: "text", required: true, placeholder: "jian-ji" },
  { key: "description", label: "简述", type: "text", required: true, placeholder: "一段简介..." },
  { key: "coverImage", label: "封面图 URL", type: "text", placeholder: "/images/series/..." },
  { key: "heroText", label: "Hero 文案", type: "text", placeholder: "主标题文案" },
  { key: "short_desc", label: "短描述", type: "textarea", placeholder: "用于卡片展示的简短描述..." },
  { key: "long_desc", label: "长描述", type: "textarea", placeholder: "详情页长描述..." },
  { key: "sort_order", label: "排序权重", type: "number", placeholder: "0" },
  { key: "is_active", label: "启用状态", type: "select", options: [{ label: "启用", value: "true" }, { label: "禁用", value: "false" }], defaultValue: "true" },
];

const CSV_COLUMNS = [
  { key: "name", label: "系列名称" },
  { key: "slug", label: "Slug" },
  { key: "description", label: "简述" },
  { key: "status", label: "发布状态" },
  { key: "is_active", label: "启用" },
  { key: "sort_order", label: "排序" },
  { key: "published_at", label: "发布时间" },
];

const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 10px", border: "1px solid #e7e5e4", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", boxSizing: "border-box", fontFamily: "inherit" };

// ── Status badge config ──

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  DRAFT:     { label: "草稿",     bg: "#f5f5f4", color: "#78716c", border: "#e7e5e4" },
  IN_REVIEW: { label: "审核中",   bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  APPROVED:  { label: "已通过",   bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  SCHEDULED: { label: "定时发布", bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
  PUBLISHED: { label: "已发布",   bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  ARCHIVED:  { label: "已归档",   bg: "#f5f5f4", color: "#44403c", border: "#d6d3d1" },
  REJECTED:  { label: "已驳回",   bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: config.bg, color: config.color, border: `1px solid ${config.border}`, display: "inline-block", whiteSpace: "nowrap" }}>
      {config.label}
    </span>
  );
}

// ── Workflow buttons per status ──

function getWorkflowButtons(status: string): { label: string; action: string }[] {
  switch (status) {
    case "DRAFT":
      return [
        { label: "提交审核", action: "submit" },
        { label: "立即发布", action: "publish" },
      ];
    case "IN_REVIEW":
      return [
        { label: "通过", action: "approve" },
        { label: "驳回", action: "reject" },
        { label: "重新编辑", action: "toDraft" },
      ];
    case "APPROVED":
      return [
        { label: "立即发布", action: "publish" },
        { label: "定时发布", action: "schedule" },
        { label: "驳回", action: "reject" },
        { label: "重新编辑", action: "toDraft" },
      ];
    case "SCHEDULED":
      return [
        { label: "立即发布", action: "publish" },
        { label: "重新编辑", action: "toDraft" },
      ];
    case "PUBLISHED":
      return [
        { label: "下架", action: "unpublish" },
        { label: "归档", action: "archive" },
      ];
    case "ARCHIVED":
      return [
        { label: "重新编辑", action: "toDraft" },
        { label: "重新审核", action: "submit" },
      ];
    case "REJECTED":
      return [
        { label: "重新编辑", action: "toDraft" },
        { label: "重新提交", action: "submit" },
      ];
    default:
      return [];
  }
}

function wfBtnStyle(action: string): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    cursor: "pointer",
    marginLeft: 4,
    whiteSpace: "nowrap",
    border: "1px solid",
  };
  switch (action) {
    case "submit":
      return { ...base, background: "#fffbeb", color: "#d97706", borderColor: "#fde68a" };
    case "approve":
    case "publish":
      return { ...base, background: "#ecfdf5", color: "#059669", borderColor: "#a7f3d0" };
    case "reject":
      return { ...base, background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" };
    case "schedule":
      return { ...base, background: "#f5f3ff", color: "#7c3aed", borderColor: "#ddd6fe" };
    case "unpublish":
      return { ...base, background: "#fffbeb", color: "#d97706", borderColor: "#fde68a" };
    case "archive":
    case "toDraft":
      return { ...base, background: "#f5f5f4", color: "#78716c", borderColor: "#e7e5e4" };
    default:
      return { ...base, background: "#fafaf9", color: "#44403c", borderColor: "#e7e5e4" };
  }
}

const wfBtnDisabled: React.CSSProperties = { opacity: 0.5, cursor: "not-allowed" };

// ── Version History Modal ──

function VersionHistoryModal({ id, name, onClose, onRollback }: {
  id: number;
  name: string;
  onClose: () => void;
  onRollback: () => void;
}) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollingBack, setRollingBack] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getSeriesVersions(id).then((v) => {
      setVersions(v);
      setLoading(false);
    }).catch((e) => {
      setError(e.message || "加载版本失败");
      setLoading(false);
    });
  }, [id]);

  async function handleRollback(version: number) {
    setRollingBack(version);
    setError("");
    try {
      const r = await rollbackSeries(id, version);
      if (!r.success) {
        setError(r.error || "回滚失败");
        setRollingBack(null);
        return;
      }
      onRollback();
      onClose();
    } catch (e: any) {
      setError(e.message || "回滚失败");
      setRollingBack(null);
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={modalOverlayStyle}
    >
      <div style={{ ...modalContentStyle, maxWidth: 600 }}>
        <div style={modalHeaderStyle}>
          <span style={{ fontWeight: 500, fontSize: 15, color: "#1c1917" }}>版本历史 — {name}</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 24, color: "#a8a29e", fontSize: 13 }}>加载中…</div>
          ) : versions.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "#a8a29e", fontSize: 13 }}>暂无版本记录。发布后会自动创建版本快照。</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {versions.map((v) => {
                const cfg = STATUS_CONFIG[v.status] || STATUS_CONFIG.DRAFT;
                return (
                  <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", border: "1px solid #f5f5f4", borderRadius: 6, background: "#fafaf9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1c1917", minWidth: 36 }}>v{v.version}</span>
                      <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 10, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: "nowrap" }}>{cfg.label}</span>
                      <span style={{ fontSize: 11, color: "#a8a29e", whiteSpace: "nowrap" }}>{v.created_at ? new Date(v.created_at).toLocaleString("zh-CN") : "—"}</span>
                    </div>
                    <button
                      onClick={() => handleRollback(v.version)}
                      disabled={rollingBack !== null}
                      style={{
                        padding: "3px 10px", borderRadius: 4, fontSize: 11, cursor: rollingBack !== null ? "not-allowed" : "pointer",
                        background: "#1c1917", color: "#fff", border: "1px solid #1c1917", opacity: rollingBack !== null ? 0.5 : 1, whiteSpace: "nowrap",
                      }}
                    >
                      {rollingBack === v.version ? "回滚中…" : "回滚"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {error && <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 6, marginTop: 12, fontSize: 13, color: "#dc2626" }}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Schedule Dialog ──

function ScheduleDialog({ id, name, onClose, onScheduled }: {
  id: number;
  name: string;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [publishAt, setPublishAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSchedule() {
    if (!publishAt) {
      setError("请选择发布时间");
      return;
    }
    const iso = new Date(publishAt).toISOString();
    if (new Date(iso) <= new Date()) {
      setError("发布时间必须晚于当前时间");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await scheduleSeriesPublish(id, iso);
      if (!r.success) {
        setError(r.error || "定时发布设置失败");
        setLoading(false);
        return;
      }
      onScheduled();
      onClose();
    } catch (e: any) {
      setError(e.message || "定时发布设置失败");
      setLoading(false);
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={modalOverlayStyle}
    >
      <div style={{ ...modalContentStyle, maxWidth: 400 }}>
        <div style={modalHeaderStyle}>
          <span style={{ fontWeight: 500, fontSize: 15, color: "#1c1917" }}>定时发布 — {name}</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "#57534e", marginBottom: 4 }}>发布时间 <span style={{ color: "#dc2626" }}>*</span></label>
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              style={inputStyle}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          {error && <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 6, marginBottom: 12, fontSize: 13, color: "#dc2626" }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onClose} style={modalBtnStyle("secondary")}>取消</button>
            <button type="button" onClick={handleSchedule} disabled={loading} style={modalBtnStyle("primary")}>
              {loading ? "设置中…" : "确认定时发布"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reject Dialog ──

function RejectDialog({ id, name, onClose, onRejected }: {
  id: number;
  name: string;
  onClose: () => void;
  onRejected: () => void;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleReject() {
    setLoading(true);
    setError("");
    try {
      const r = await rejectSeries(id, reason || undefined);
      if (!r.success) {
        setError(r.error || "驳回失败");
        setLoading(false);
        return;
      }
      onRejected();
      onClose();
    } catch (e: any) {
      setError(e.message || "驳回失败");
      setLoading(false);
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={modalOverlayStyle}
    >
      <div style={{ ...modalContentStyle, maxWidth: 400 }}>
        <div style={modalHeaderStyle}>
          <span style={{ fontWeight: 500, fontSize: 15, color: "#1c1917" }}>驳回系列 — {name}</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "#57534e", marginBottom: 4 }}>驳回原因（可选）</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请输入驳回原因..."
              rows={3}
              style={inputStyle}
            />
          </div>
          {error && <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 6, marginBottom: 12, fontSize: 13, color: "#dc2626" }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onClose} style={modalBtnStyle("secondary")}>取消</button>
            <button type="button" onClick={handleReject} disabled={loading} style={modalBtnStyle("danger")}>
              {loading ? "驳回中…" : "确认驳回"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Series Form ──

function AddSeriesForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    SERIES_FIELDS.forEach((f) => { init[f.key] = f.defaultValue ?? ""; });
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const r = await createSeries(form);
    setLoading(false);
    if (r.error) { setError(r.error); return; }
    onSuccess(); router.refresh();
  }
  function setField(k: string, v: unknown) { setForm((p) => ({ ...p, [k]: v })); }

  return (
    <form onSubmit={handleSubmit} style={{ padding: "4px 0" }}>
      {SERIES_FIELDS.map((f) => (
        <div key={f.key} style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, color: "#57534e", marginBottom: 4 }}>{f.label}{f.required && <span style={{ color: "#dc2626" }}> *</span>}</label>
          {f.type === "textarea" ? (
            <textarea value={String(form[f.key] ?? "")} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.placeholder} required={f.required} rows={3} style={inputStyle} />
          ) : f.type === "select" && f.options ? (
            <select value={String(form[f.key] ?? f.options[0].value)} onChange={(e) => setField(f.key, e.target.value)} style={inputStyle}>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input type={f.type === "number" ? "number" : "text"} value={String(form[f.key] ?? "")} onChange={(e) => setField(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)} placeholder={f.placeholder} required={f.required} style={inputStyle} />
          )}
        </div>
      ))}
      {error && <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 6, marginBottom: 12, fontSize: 13, color: "#dc2626" }}>{error}</div>}
      <button type="submit" disabled={loading} style={{ height: 36, padding: "0 16px", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#1c1917", color: "#fff", border: "1px solid #1c1917" }}>{loading ? "创建中…" : "创建"}</button>
    </form>
  );
}

// ── Main Client ──

export function BrandSeriesClient({ rows, error: serverError, searchQ }: { rows: any[]; error: string | null; searchQ: string; }) {
  const router = useRouter();
  const [addKey, setAddKey] = useState(0);
  const [editRow, setEditRow] = useState<any>(null);
  const [deleteRow, setDeleteRow] = useState<any>(null);
  const [versionRow, setVersionRow] = useState<any>(null);
  const [scheduleRow, setScheduleRow] = useState<any>(null);
  const [rejectRow, setRejectRow] = useState<any>(null);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function handleUpdate(id: number, data: Record<string, unknown>) {
    const r = await updateSeries(id, data);
    if (!r.error) { setEditRow(null); router.refresh(); }
    return r;
  }
  async function handleDelete() {
    if (!deleteRow) return;
    await deleteSeries(deleteRow.id);
    setDeleteRow(null); router.refresh();
  }
  async function handleMove(id: number, dir: "up" | "down") {
    await moveSeries(id, dir); router.refresh();
  }

  function handleWorkflowAction(action: string, row: any) {
    if (action === "versions") { setVersionRow(row); return; }
    if (action === "schedule") { setScheduleRow(row); return; }
    if (action === "reject") { setRejectRow(row); return; }
    if (action === "preview") { handlePreview(row); return; }
    handleStatusAction(action, row);
  }

  async function handlePreview(row: any) {
    setBusyId(row.id);
    setActionError("");
    try {
      const token = await getSeriesPreviewToken(row.id);
      window.open(`/preview?token=${encodeURIComponent(token)}`, "_blank");
    } catch (e: any) {
      setActionError(e.message || "生成预览链接失败");
    }
    setBusyId(null);
  }

  async function handleStatusAction(action: string, row: any) {
    setBusyId(row.id);
    setActionError("");
    try {
      let r: { success: boolean; error?: string } | undefined;
      switch (action) {
        case "submit":    r = await submitSeriesForReview(row.id); break;
        case "approve":   r = await approveSeries(row.id); break;
        case "publish":   r = await publishSeriesNow(row.id); break;
        case "unpublish": r = await unpublishSeries(row.id); break;
        case "archive":   r = await archiveSeries(row.id); break;
        case "toDraft":   r = await unpublishSeries(row.id); break;
      }
      if (r && !r.success) {
        setActionError(r.error || "操作失败");
      } else {
        router.refresh();
      }
    } catch (e: any) {
      setActionError(e.message || "操作失败");
    }
    setBusyId(null);
  }

  const hasData = rows && rows.length > 0;

  return (
    <div style={{ maxWidth: "100%", padding: "0 4px" }}>
      <h1 style={{ fontSize: 20, fontWeight: 300, letterSpacing: "0.1em", color: "#1c1917", marginBottom: 4 }}>七序系列管理</h1>
      <p style={{ fontSize: 13, color: "#a8a29e", marginBottom: 16 }}>管理允物七阶体系系列。操作将影响前台展示。</p>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Kpi label="系列总数" value={rows?.length || 0} />
        <Kpi label="已发布" value={rows?.filter((r: any) => r.status === "PUBLISHED").length || 0} />
        <Kpi label="草稿" value={rows?.filter((r: any) => r.status === "DRAFT" || !r.status).length || 0} />
        <Kpi label="审核中" value={rows?.filter((r: any) => r.status === "IN_REVIEW").length || 0} />
      </div>
      <ActionBar module="brand-series" csvColumns={CSV_COLUMNS} data={rows || []} searchPlaceholder="搜索系列名称或 Slug..." searchParam="q"
        addModalContent={<AddSeriesForm key={addKey} onSuccess={() => setAddKey((k) => k + 1)} />} />
      {serverError && <div style={{ padding: 12, background: "#fef2f2", borderRadius: 6, marginBottom: 16, fontSize: 13, color: "#dc2626" }}>{serverError}</div>}
      {actionError && (
        <div style={{ padding: "10px 12px", background: "#fef2f2", borderRadius: 6, marginBottom: 16, fontSize: 13, color: "#dc2626", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{actionError}</span>
          <button onClick={() => setActionError("")} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 14, padding: "0 4px" }}>✕</button>
        </div>
      )}
      {hasData ? (
        <div style={{ overflowX: "auto", border: "1px solid #e7e5e4", borderRadius: 8, background: "#fff" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid #e7e5e4", background: "#fafaf9", textAlign: "left" }}>
              <th style={thStyle}>排序</th><th style={thStyle}>名称</th><th style={thStyle}>Slug</th><th style={thStyle}>简述</th><th style={thStyle}>状态</th><th style={{ ...thStyle, textAlign: "right" }}>操作</th>
            </tr></thead>
            <tbody>{rows.map((r: any) => {
              const status = r.status || "DRAFT";
              const wfButtons = getWorkflowButtons(status);
              const isBusy = busyId === r.id;
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #f5f5f4" }}>
                  <td style={tdStyle}><button onClick={() => handleMove(r.id, "up")} style={sortBtnStyle}>↑</button><span style={{ margin: "0 4px", color: "#a8a29e", fontSize: 11 }}>{r.sort_order}</span><button onClick={() => handleMove(r.id, "down")} style={sortBtnStyle}>↓</button></td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{r.name}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: "#a8a29e" }}>{r.slug}</td>
                  <td style={{ ...tdStyle, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description || "—"}</td>
                  <td style={tdStyle}><StatusBadge status={status} /></td>
                  <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                    {wfButtons.map((b) => (
                      <button
                        key={b.action}
                        onClick={() => handleWorkflowAction(b.action, r)}
                        disabled={isBusy}
                        style={{ ...wfBtnStyle(b.action), ...(isBusy ? wfBtnDisabled : {}) }}
                      >
                        {b.label}
                      </button>
                    ))}
                    <button onClick={() => handleWorkflowAction("versions", r)} disabled={isBusy} style={{ ...wfBtnStyle(""), ...(isBusy ? wfBtnDisabled : {}) }}>版本</button>
                    {(status === "PUBLISHED" || status === "DRAFT") && (
                      <button onClick={() => handleWorkflowAction("preview", r)} disabled={isBusy} style={{ ...wfBtnStyle(""), ...(isBusy ? wfBtnDisabled : {}) }}>预览</button>
                    )}
                    <button onClick={() => setEditRow(r)} style={actionStyle}>编辑</button>
                    <button onClick={() => setDeleteRow(r)} style={{ ...actionStyle, color: "#dc2626" }}>删除</button>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#a8a29e" }}><div style={{ fontSize: 40, marginBottom: 12 }}>🌊</div><p style={{ fontSize: 15, color: "#57534e", marginBottom: 4 }}>暂无系列</p></div>
      )}
      {editRow && <CrudModal mode="edit" title="编辑系列" fields={SERIES_FIELDS}
        initialData={{ name: editRow.name || "", slug: editRow.slug || "", description: editRow.description || "", coverImage: editRow.coverImage || "", heroText: editRow.heroText || "", short_desc: editRow.short_desc || "", long_desc: editRow.long_desc || "", sort_order: String(editRow.sort_order ?? 0), is_active: (editRow.is_active === true || editRow.is_active === "true") ? "true" : "false" }}
        onSubmit={(data) => handleUpdate(editRow.id, data)} onClose={() => setEditRow(null)} />}
      {deleteRow && <ConfirmModal title="删除系列" message={`确定要删除「${deleteRow.name}」吗？`} onConfirm={handleDelete} onClose={() => setDeleteRow(null)} />}
      {versionRow && (
        <VersionHistoryModal
          id={versionRow.id}
          name={versionRow.name}
          onClose={() => setVersionRow(null)}
          onRollback={() => router.refresh()}
        />
      )}
      {scheduleRow && (
        <ScheduleDialog
          id={scheduleRow.id}
          name={scheduleRow.name}
          onClose={() => setScheduleRow(null)}
          onScheduled={() => router.refresh()}
        />
      )}
      {rejectRow && (
        <RejectDialog
          id={rejectRow.id}
          name={rejectRow.name}
          onClose={() => setRejectRow(null)}
          onRejected={() => router.refresh()}
        />
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return <div style={{ padding: "8px 14px", background: "#fafaf9", borderRadius: 6, border: "1px solid #e7e5e4", minWidth: 100 }}><div style={{ fontSize: 11, color: "#a8a29e" }}>{label}</div><div style={{ fontSize: 18, fontWeight: 400, color: "#1c1917" }}>{value}</div></div>;
}

const thStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "#78716c", textTransform: "uppercase" };
const tdStyle: React.CSSProperties = { padding: "8px 12px", color: "#44403c", verticalAlign: "middle" };
const sortBtnStyle: React.CSSProperties = { background: "none", border: "1px solid #e7e5e4", borderRadius: 3, cursor: "pointer", fontSize: 12, color: "#78716c", padding: "0 5px" };
const actionStyle: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#d97706", marginLeft: 8, textDecoration: "underline" };

// ── Modal shared styles ──

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9000,
  background: "rgba(0,0,0,0.4)",
  display: "flex", alignItems: "center", justifyContent: "center",
};

const modalContentStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 12,
  width: "100%", maxWidth: 520, maxHeight: "85vh", overflow: "auto",
  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "16px 20px", borderBottom: "1px solid #f5f5f4",
};

const closeBtnStyle: React.CSSProperties = {
  background: "none", border: "none", fontSize: 18,
  cursor: "pointer", color: "#a8a29e", lineHeight: 1,
  padding: "2px 6px", borderRadius: 4,
};

function modalBtnStyle(variant: "primary" | "secondary" | "danger"): React.CSSProperties {
  const base: React.CSSProperties = {
    height: 36, padding: "0 14px", borderRadius: 6, fontSize: 13,
    cursor: "pointer", border: "1px solid", fontWeight: 400,
    whiteSpace: "nowrap",
  };
  if (variant === "danger") return { ...base, background: "#dc2626", color: "#fff", borderColor: "#dc2626" };
  if (variant === "primary") return { ...base, background: "#1c1917", color: "#fff", borderColor: "#1c1917" };
  return { ...base, background: "#fff", color: "#44403c", borderColor: "#e7e5e4" };
}
