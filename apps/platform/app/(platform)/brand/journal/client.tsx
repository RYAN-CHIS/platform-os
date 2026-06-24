"use client";
/**
 * BrandJournalClient — WO-P12B (wired to Publisher Engine)
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/ActionBar";
import { CrudModal, ConfirmModal, FormField } from "@/components/BrandCrudModal";
import {
  createPost, updatePost, deletePost, togglePostStatus, movePost,
  submitPostForReview, approvePost, rejectPost, publishPostNow,
  schedulePost, unpublishPost, archivePost,
  getPostVersions, rollbackPost, getPostPreviewToken,
  savePostSeoSnapshot,
} from "@/modules/brand/journal/actions";

// ── Constants ──

const ALL_STATUSES = [
  { label: "草稿", value: "DRAFT" },
  { label: "审核中", value: "IN_REVIEW" },
  { label: "已通过", value: "APPROVED" },
  { label: "已定时", value: "SCHEDULED" },
  { label: "已发布", value: "PUBLISHED" },
  { label: "已归档", value: "ARCHIVED" },
  { label: "已驳回", value: "REJECTED" },
];

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string; border: string }> = {
  DRAFT: { label: "草稿", bg: "#f5f5f4", color: "#78716c", border: "#e7e5e4" },
  IN_REVIEW: { label: "审核中", bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  APPROVED: { label: "已通过", bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  SCHEDULED: { label: "已定时", bg: "#faf5ff", color: "#9333ea", border: "#e9d5ff" },
  PUBLISHED: { label: "已发布", bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  ARCHIVED: { label: "已归档", bg: "#fafaf9", color: "#57534e", border: "#d6d3d1" },
  REJECTED: { label: "已驳回", bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

// Allowed workflow actions per status (derived from publisher VALID_TRANSITIONS)
const WORKFLOW_ACTIONS: Record<string, { label: string; action: string; style?: React.CSSProperties }[]> = {
  DRAFT: [
    { label: "提交审核", action: "submitReview" },
    { label: "立即发布", action: "publishNow", style: { background: "#059669", borderColor: "#059669", color: "#fff" } },
    { label: "归档", action: "archive" },
  ],
  IN_REVIEW: [
    { label: "通过", action: "approve", style: { background: "#16a34a", borderColor: "#16a34a", color: "#fff" } },
    { label: "驳回", action: "reject", style: { background: "#dc2626", borderColor: "#dc2626", color: "#fff" } },
    { label: "返回草稿", action: "toDraft" },
  ],
  APPROVED: [
    { label: "立即发布", action: "publishNow", style: { background: "#059669", borderColor: "#059669", color: "#fff" } },
    { label: "定时发布", action: "schedule", style: { background: "#9333ea", borderColor: "#9333ea", color: "#fff" } },
    { label: "驳回", action: "reject" },
    { label: "返回草稿", action: "toDraft" },
  ],
  SCHEDULED: [
    { label: "立即发布", action: "publishNow", style: { background: "#059669", borderColor: "#059669", color: "#fff" } },
    { label: "取消定时", action: "toDraft" },
  ],
  PUBLISHED: [
    { label: "撤回", action: "unpublish", style: { background: "#d97706", borderColor: "#d97706", color: "#fff" } },
    { label: "归档", action: "archive" },
  ],
  ARCHIVED: [
    { label: "重新编辑", action: "toDraft" },
    { label: "提交审核", action: "submitReview" },
  ],
  REJECTED: [
    { label: "重新编辑", action: "toDraft" },
    { label: "再次提交", action: "submitReview" },
  ],
};

const POST_FIELDS: FormField[] = [
  { key: "title", label: "标题", type: "text", required: true, placeholder: "文章标题" },
  { key: "slug", label: "Slug", type: "text", required: true, placeholder: "article-slug" },
  { key: "category", label: "分类", type: "select", required: true, options: [{ label: "器物志", value: "ARTIFACT" }, { label: "品牌志", value: "BRAND" }, { label: "同行者说", value: "TRAVELER" }, { label: "工艺", value: "CRAFT" }, { label: "其他", value: "OTHER" }]},
  { key: "excerpt", label: "摘要", type: "textarea", placeholder: "文章摘要..." },
  { key: "content", label: "正文", type: "textarea", placeholder: "文章正文内容..." },
  { key: "cover_image", label: "封面图 URL", type: "text", placeholder: "/images/journal/..." },
  { key: "status", label: "发布状态", type: "select", options: ALL_STATUSES, defaultValue: "DRAFT" },
  { key: "seo_title", label: "SEO 标题", type: "text", placeholder: "SEO 优化标题" },
  { key: "seo_description", label: "SEO 描述", type: "textarea", placeholder: "SEO 优化描述..." },
];

const CSV_COLUMNS = [
  { key: "title", label: "标题" }, { key: "slug", label: "Slug" }, { key: "category", label: "分类" },
  { key: "status", label: "状态" }, { key: "published_at", label: "发布日期" }, { key: "sort_order", label: "排序" },
];

// ── Styles ──

const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 10px", border: "1px solid #e7e5e4", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", boxSizing: "border-box", fontFamily: "inherit" };
const modalOverlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modalBox: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 24, minWidth: 400, maxWidth: 600, maxHeight: "80vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" };
const wfBtnBase: React.CSSProperties = { padding: "2px 8px", borderRadius: 4, fontSize: 11, border: "1px solid #e7e5e4", cursor: "pointer", background: "#fff", color: "#44403c", fontFamily: "inherit", whiteSpace: "nowrap" };

// ── Status Badge ──

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] || STATUS_BADGE.DRAFT;
  return (
    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: "nowrap" }}>
      {cfg.label}
    </span>
  );
}

// ── Workflow Buttons ──

function WorkflowButtons({ row, onAction }: { row: any; onAction: (action: string, row: any) => void }) {
  const actions = WORKFLOW_ACTIONS[row.status] || WORKFLOW_ACTIONS.DRAFT;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {actions.map((a) => (
        <button key={a.action} onClick={(e) => { e.stopPropagation(); onAction(a.action, row); }} style={{ ...wfBtnBase, ...a.style }}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ── Schedule Dialog ──

function ScheduleDialog({ row, onClose, onSuccess }: { row: any; onClose: () => void; onSuccess: () => void }) {
  const [publishAt, setPublishAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!publishAt) { setError("请选择发布时间"); return; }
    setLoading(true); setError("");
    const r = await schedulePost(row.id, new Date(publishAt).toISOString());
    setLoading(false);
    if (!r.success) { setError(r.error || "定时发布失败"); return; }
    onSuccess();
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: "#1c1917", margin: 0 }}>定时发布</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#a8a29e" }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: "#57534e", marginBottom: 12 }}>「{row.title}」</p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, color: "#57534e", marginBottom: 4 }}>发布时间</label>
          <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} style={inputStyle} />
        </div>
        {error && <div style={{ padding: 8, background: "#fef2f2", borderRadius: 6, marginBottom: 12, fontSize: 12, color: "#dc2626" }}>{error}</div>}
        <button onClick={handleSubmit} disabled={loading} style={{ height: 36, padding: "0 16px", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#9333ea", color: "#fff", border: "none" }}>
          {loading ? "提交中…" : "确认定时发布"}
        </button>
      </div>
    </div>
  );
}

// ── Version History Modal ──

function VersionHistoryModal({ row, onClose }: { row: any; onClose: () => void }) {
  const [versions, setVersions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rollbacking, setRollbacking] = useState<number | null>(null);
  const router = useRouter();

  useState(() => {
    (async () => {
      try {
        const data = await getPostVersions(row.id);
        setVersions(data);
      } catch (e: any) {
        setError(e.message || "加载版本历史失败");
      } finally {
        setLoading(false);
      }
    })();
  });

  async function handleRollback(version: number) {
    setRollbacking(version);
    const r = await rollbackPost(row.id, version);
    setRollbacking(null);
    if (!r.success) { setError(r.error || "回滚失败"); return; }
    // Refresh versions
    const data = await getPostVersions(row.id);
    setVersions(data);
    router.refresh();
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={{ ...modalBox, minWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: "#1c1917", margin: 0 }}>版本历史 — {row.title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#a8a29e" }}>×</button>
        </div>
        {loading && <p style={{ fontSize: 13, color: "#a8a29e" }}>加载中…</p>}
        {error && <div style={{ padding: 8, background: "#fef2f2", borderRadius: 6, marginBottom: 12, fontSize: 12, color: "#dc2626" }}>{error}</div>}
        {versions && versions.length === 0 && <p style={{ fontSize: 13, color: "#a8a29e" }}>暂无版本记录</p>}
        {versions && versions.length > 0 && (
          <div style={{ border: "1px solid #e7e5e4", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead><tr style={{ borderBottom: "1px solid #e7e5e4", background: "#fafaf9", textAlign: "left" }}>
                <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "#78716c" }}>版本</th>
                <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "#78716c" }}>状态</th>
                <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "#78716c" }}>时间</th>
                <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "#78716c", textAlign: "center" }}>操作</th>
              </tr></thead>
              <tbody>
                {versions.map((v: any, i: number) => (
                  <tr key={v.id || i} style={{ borderBottom: "1px solid #f5f5f4" }}>
                    <td style={{ padding: "8px 12px", color: "#44403c" }}>v{v.version}</td>
                    <td style={{ padding: "8px 12px" }}><StatusBadge status={v.status} /></td>
                    <td style={{ padding: "8px 12px", fontSize: 11, color: "#a8a29e" }}>{v.created_at ? new Date(v.created_at).toLocaleString("zh-CN") : "—"}</td>
                    <td style={{ padding: "8px 12px", textAlign: "center" }}>
                      <button onClick={() => handleRollback(v.version)} disabled={rollbacking === v.version}
                        style={{ ...wfBtnBase, color: "#d97706", borderColor: "#fcd34d", background: "#fffbeb" }}>
                        {rollbacking === v.version ? "回滚中…" : "回滚"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Post Form ──

function AddPostForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    POST_FIELDS.forEach((f) => { init[f.key] = f.defaultValue ?? ""; });
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    const r = await createPost(form);
    setLoading(false);
    if (r.error) { setError(r.error); return; }
    onSuccess(); router.refresh();
  }
  function setField(k: string, v: unknown) { setForm((p) => ({ ...p, [k]: v })); }
  return (
    <form onSubmit={handleSubmit} style={{ padding: "4px 0" }}>
      {POST_FIELDS.map((f) => (
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

// ── Reject Dialog ──

function RejectDialog({ row, onClose, onSuccess }: { row: any; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true); setError("");
    const r = await rejectPost(row.id, reason || undefined);
    setLoading(false);
    if (!r.success) { setError(r.error || "驳回失败"); return; }
    onSuccess();
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: "#1c1917", margin: 0 }}>驳回文章</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#a8a29e" }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: "#57534e", marginBottom: 12 }}>「{row.title}」</p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, color: "#57534e", marginBottom: 4 }}>驳回原因（选填）</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请输入驳回原因..." rows={3} style={inputStyle} />
        </div>
        {error && <div style={{ padding: 8, background: "#fef2f2", borderRadius: 6, marginBottom: 12, fontSize: 12, color: "#dc2626" }}>{error}</div>}
        <button onClick={handleSubmit} disabled={loading} style={{ height: 36, padding: "0 16px", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#dc2626", color: "#fff", border: "none" }}>
          {loading ? "提交中…" : "确认驳回"}
        </button>
      </div>
    </div>
  );
}

// ── Main Client ──

export function BrandJournalClient({ rows, error: serverError, searchQ }: { rows: any[]; error: string | null; searchQ: string; }) {
  const router = useRouter();
  const [addKey, setAddKey] = useState(0);
  const [editRow, setEditRow] = useState<any>(null);
  const [deleteRow, setDeleteRow] = useState<any>(null);
  const [scheduleRow, setScheduleRow] = useState<any>(null);
  const [rejectRow, setRejectRow] = useState<any>(null);
  const [versionsRow, setVersionsRow] = useState<any>(null);
  const [previewRow, setPreviewRow] = useState<any>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  async function handleUpdate(cuid: string, data: Record<string, unknown>) {
    const r = await updatePost(cuid, data);
    if (!r.error) { setEditRow(null); router.refresh(); }
    return r;
  }
  async function handleDelete() { if (!deleteRow) return; await deletePost(deleteRow.id); setDeleteRow(null); router.refresh(); }
  async function handleMove(id: string, dir: "up" | "down") { await movePost(id, dir); router.refresh(); }

  // ── Workflow action handler ──

  async function handleWorkflowAction(action: string, row: any) {
    setActionError("");

    switch (action) {
      case "submitReview": {
        const r = await submitPostForReview(row.id);
        if (!r.success) { setActionError(r.error || "提交审核失败"); return; }
        router.refresh();
        break;
      }
      case "approve": {
        const r = await approvePost(row.id);
        if (!r.success) { setActionError(r.error || "审核通过失败"); return; }
        router.refresh();
        break;
      }
      case "reject": {
        setRejectRow(row);
        return;
      }
      case "publishNow": {
        const r = await publishPostNow(row.id);
        if (!r.success) { setActionError(r.error || "发布失败"); return; }
        router.refresh();
        break;
      }
      case "schedule": {
        setScheduleRow(row);
        return;
      }
      case "unpublish": {
        const r = await unpublishPost(row.id);
        if (!r.success) { setActionError(r.error || "撤回失败"); return; }
        router.refresh();
        break;
      }
      case "archive": {
        const r = await archivePost(row.id);
        if (!r.success) { setActionError(r.error || "归档失败"); return; }
        router.refresh();
        break;
      }
      case "toDraft": {
        const r = await togglePostStatus(row.id, "DRAFT");
        if (r.error) { setActionError(r.error); return; }
        router.refresh();
        break;
      }
    }
  }

  async function handlePreview(row: any) {
    setPreviewRow(row);
    setPreviewToken(null);
    setPreviewLoading(true);
    try {
      const token = await getPostPreviewToken(row.id);
      setPreviewToken(token);
    } catch (e: any) {
      setActionError("生成预览令牌失败");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSeoSnapshot(row: any) {
    setActionError("");
    try {
      await savePostSeoSnapshot(row.id);
      setActionError("SEO 快照已保存");
      setTimeout(() => setActionError(""), 2000);
    } catch {
      setActionError("SEO 快照保存失败");
    }
  }

  function handleScheduleSuccess() { setScheduleRow(null); setActionError(""); router.refresh(); }
  function handleRejectSuccess() { setRejectRow(null); setActionError(""); router.refresh(); }

  const hasData = rows && rows.length > 0;

  return (
    <div style={{ maxWidth: "100%", padding: "0 4px" }}>
      <h1 style={{ fontSize: 20, fontWeight: 300, letterSpacing: "0.1em", color: "#1c1917", marginBottom: 4 }}>品牌志管理</h1>
      <p style={{ fontSize: 13, color: "#a8a29e", marginBottom: 16 }}>管理允物品牌文章内容。操作将影响 www.yunwuorigin.com 品牌志栏目。</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Kpi label="文章总数" value={rows?.length || 0} />
        <Kpi label="已发布" value={rows?.filter((r: any) => r.status === "PUBLISHED").length || 0} />
        <Kpi label="审核中" value={rows?.filter((r: any) => r.status === "IN_REVIEW").length || 0} />
        <Kpi label="草稿" value={rows?.filter((r: any) => r.status === "DRAFT").length || 0} />
        <Kpi label="已驳回" value={rows?.filter((r: any) => r.status === "REJECTED").length || 0} />
      </div>

      <ActionBar module="brand-journal" csvColumns={CSV_COLUMNS} data={rows || []} searchPlaceholder="搜索文章标题或摘要..." searchParam="q"
        addModalContent={<AddPostForm key={addKey} onSuccess={() => setAddKey((k) => k + 1)} />} />

      {serverError && <div style={{ padding: 12, background: "#fef2f2", borderRadius: 6, marginBottom: 16, fontSize: 13, color: "#dc2626" }}>{serverError}</div>}
      {actionError && <div style={{ padding: 8, background: actionError.includes("已保存") ? "#f0fdf4" : "#fef2f2", borderRadius: 6, marginBottom: 12, fontSize: 13, color: actionError.includes("已保存") ? "#16a34a" : "#dc2626" }}>{actionError}</div>}

      {hasData ? (
        <div style={{ overflowX: "auto", border: "1px solid #e7e5e4", borderRadius: 8, background: "#fff" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid #e7e5e4", background: "#fafaf9", textAlign: "left" }}>
              <th style={thStyle}>排序</th>
              <th style={thStyle}>标题</th>
              <th style={thStyle}>分类</th>
              <th style={thStyle}>状态</th>
              <th style={thStyle}>工作流</th>
              <th style={thStyle}>发布日期</th>
              <th style={{ ...thStyle, textAlign: "right" }}>操作</th>
            </tr></thead>
            <tbody>{rows.map((r: any) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f5f5f4" }}>
                <td style={tdStyle}>
                  <button onClick={() => handleMove(r.id, "up")} style={sortBtnStyle}>↑</button>
                  <span style={{ margin: "0 4px", color: "#a8a29e", fontSize: 11 }}>{r.sort_order}</span>
                  <button onClick={() => handleMove(r.id, "down")} style={sortBtnStyle}>↓</button>
                </td>
                <td style={{ ...tdStyle, fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</td>
                <td style={tdStyle}>{r.category || "—"}</td>
                <td style={tdStyle}><StatusBadge status={r.status} /></td>
                <td style={tdStyle}><WorkflowButtons row={r} onAction={handleWorkflowAction} /></td>
                <td style={{ ...tdStyle, fontSize: 11, color: "#a8a29e" }}>
                  {r.published_at ? new Date(r.published_at).toLocaleDateString("zh-CN") : "—"}
                  {r.status === "SCHEDULED" && r.publish_at && <><br /><span style={{ color: "#9333ea" }}>⏰ {new Date(r.publish_at).toLocaleString("zh-CN")}</span></>}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button onClick={() => handlePreview(r)} style={{ ...actionStyle, color: "#2563eb" }}>预览</button>
                  <button onClick={() => setEditRow(r)} style={actionStyle}>编辑</button>
                  <button onClick={() => setVersionsRow(r)} style={{ ...actionStyle, color: "#7c3aed" }}>版本</button>
                  <button onClick={() => handleSeoSnapshot(r)} style={{ ...actionStyle, color: "#0891b2" }}>SEO</button>
                  <button onClick={() => setDeleteRow(r)} style={{ ...actionStyle, color: "#dc2626" }}>删除</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#a8a29e" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✍️</div>
          <p style={{ fontSize: 15, color: "#57534e", marginBottom: 4 }}>暂无文章</p>
        </div>
      )}

      {/* Edit Modal */}
      {editRow && <CrudModal mode="edit" title="编辑文章" fields={POST_FIELDS}
        initialData={{
          title: editRow.title || "", slug: editRow.slug || "", category: editRow.category || "BRAND",
          excerpt: editRow.excerpt || "", content: editRow.content || "", cover_image: editRow.cover_image || "",
          status: editRow.status || "DRAFT", seo_title: editRow.seo_title || "", seo_description: editRow.seo_description || "",
        }}
        onSubmit={(data) => handleUpdate(editRow.id, data)} onClose={() => setEditRow(null)} />}

      {/* Delete Confirm */}
      {deleteRow && <ConfirmModal title="删除文章" message={`确定要删除「${deleteRow.title}」吗？`} onConfirm={handleDelete} onClose={() => setDeleteRow(null)} />}

      {/* Schedule Dialog */}
      {scheduleRow && <ScheduleDialog row={scheduleRow} onClose={() => setScheduleRow(null)} onSuccess={handleScheduleSuccess} />}

      {/* Reject Dialog */}
      {rejectRow && <RejectDialog row={rejectRow} onClose={() => setRejectRow(null)} onSuccess={handleRejectSuccess} />}

      {/* Version History Modal */}
      {versionsRow && <VersionHistoryModal row={versionsRow} onClose={() => setVersionsRow(null)} />}

      {/* Preview Modal */}
      {previewRow && (
        <div style={modalOverlay} onClick={() => { setPreviewRow(null); setPreviewToken(null); }}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 500, color: "#1c1917", margin: 0 }}>预览 — {previewRow.title}</h3>
              <button onClick={() => { setPreviewRow(null); setPreviewToken(null); }} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#a8a29e" }}>×</button>
            </div>
            {previewLoading && <p style={{ fontSize: 13, color: "#a8a29e" }}>生成预览令牌…</p>}
            {!previewLoading && previewToken && (
              <div>
                <p style={{ fontSize: 13, color: "#57534e", marginBottom: 8 }}>预览链接（24小时内有效）：</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input readOnly value={`https://www.yunwuorigin.com/journal/${previewRow.slug}?preview=${previewToken}`}
                    style={{ ...inputStyle, flex: 1, fontSize: 12, background: "#fafaf9" }}
                    onClick={(e) => (e.target as HTMLInputElement).select()} />
                  <button onClick={() => navigator.clipboard.writeText(`https://www.yunwuorigin.com/journal/${previewRow.slug}?preview=${previewToken}`)}
                    style={{ height: 36, padding: "0 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", background: "#1c1917", color: "#fff", border: "none", whiteSpace: "nowrap" }}>
                    复制
                  </button>
                </div>
              </div>
            )}
            {!previewLoading && !previewToken && <p style={{ fontSize: 13, color: "#dc2626" }}>生成预览令牌失败</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──

function Kpi({ label, value }: { label: string; value: number }) {
  return <div style={{ padding: "8px 14px", background: "#fafaf9", borderRadius: 6, border: "1px solid #e7e5e4", minWidth: 100 }}>
    <div style={{ fontSize: 11, color: "#a8a29e" }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 400, color: "#1c1917" }}>{value}</div>
  </div>;
}

const thStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "#78716c", textTransform: "uppercase" };
const tdStyle: React.CSSProperties = { padding: "8px 12px", color: "#44403c", verticalAlign: "middle" };
const sortBtnStyle: React.CSSProperties = { background: "none", border: "1px solid #e7e5e4", borderRadius: 3, cursor: "pointer", fontSize: 12, color: "#78716c", padding: "0 5px" };
const actionStyle: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#d97706", marginLeft: 8, textDecoration: "underline" };
