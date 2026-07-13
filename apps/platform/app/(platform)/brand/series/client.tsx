"use client";
/**
 * BrandSeriesClient — WO-P12B + WO-P13C Publishing Workflow
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/ActionBar";
import { ConfirmModal } from "@/components/BrandCrudModal";
import {
  BrandFormModal,
  BrandFormSection,
  BrandFormRow,
  BrandField,
  BrandInput,
  BrandTextarea,
  BrandSelect,
  BrandNumberInput,
  BrandMediaPicker,
  BrandFormFooter,
} from "@/components/brand";
import { toast } from "@/components/toast";
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

function VersionHistoryModal({ id, name, currentStatus, onClose, onRollback }: {
  id: number;
  name: string;
  currentStatus: string;
  onClose: () => void;
  onRollback: () => void;
}) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollingBack, setRollingBack] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [rollbackTarget, setRollbackTarget] = useState<any>(null);
  const [rollbackReason, setRollbackReason] = useState("");

  useEffect(() => {
    getSeriesVersions(id).then((v) => {
      setVersions(v);
      setLoading(false);
    }).catch((e) => {
      setError(e.message || "加载版本失败");
      setLoading(false);
    });
  }, [id]);

  async function handleRollback(version: number, reason: string) {
    setRollingBack(version);
    setError("");
    try {
      const r = await rollbackSeries(id, version, reason);
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
                      onClick={() => setRollbackTarget(v)}
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
          {rollbackTarget && <div style={{ marginTop: 14, padding: 12, border: "1px solid #f59e0b", borderRadius: 6, background: "#fffbeb" }}>
            <strong style={{ color: "#92400e", fontSize: 13 }}>紧急立即恢复确认</strong>
            <p style={{ color: "#92400e", fontSize: 13 }}>此操作会立即使用所选历史版本替换当前线上内容。无需重新审核，操作不可静默撤销。</p>
            {currentStatus === "PUBLISHED" && <p style={{ color: "#b45309", fontSize: 13, fontWeight: 600 }}>线上内容将立即改变</p>}
            <p style={{ fontSize: 12, color: "#57534e" }}>系列: {name} · ID: {id} · v{rollbackTarget.version} · {rollbackTarget.created_at ? new Date(rollbackTarget.created_at).toLocaleString("zh-CN") : "—"} · 当前状态: {currentStatus}</p>
            <textarea value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} placeholder="请输入不少于 5 个字符的紧急恢复原因" style={{ ...inputStyle, width: "100%", minHeight: 68, boxSizing: "border-box" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}><button onClick={() => { setRollbackTarget(null); setRollbackReason(""); }} disabled={rollingBack !== null} style={wfBtnStyle("")}>取消</button><button onClick={() => handleRollback(rollbackTarget.version, rollbackReason)} disabled={rollingBack !== null || rollbackReason.trim().length < 5} style={wfBtnStyle("ROLLBACK")}>{rollingBack !== null ? "恢复中…" : "确认紧急恢复"}</button></div>
          </div>}
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

// ── Series Form Content (shared by add & edit) ──
function SeriesFormContent({ form, setField, errors }: {
  form: Record<string, unknown>; setField: (k: string, v: unknown) => void; errors: Record<string, string>;
}) {
  return (
    <>
      <BrandFormSection title="系列名称" description="系列核心信息">
        <BrandField label="系列名称" required error={errors.name}>
          <BrandInput value={String(form.name ?? "")} onChange={(e) => setField("name", e.target.value)} placeholder="见己" />
        </BrandField>
        <BrandField label="系列编码 (Slug)" required error={errors.slug}>
          <BrandInput value={String(form.slug ?? "")} onChange={(e) => setField("slug", e.target.value)} placeholder="jian-ji" />
        </BrandField>
        <BrandField label="简述" required error={errors.description}>
          <BrandInput value={String(form.description ?? "")} onChange={(e) => setField("description", e.target.value)} placeholder="一段简介..." />
        </BrandField>
        <BrandField label="Hero 文案">
          <BrandInput value={String(form.heroText ?? "")} onChange={(e) => setField("heroText", e.target.value)} placeholder="主标题文案" />
        </BrandField>
        <BrandField label="排序权重">
          <BrandNumberInput value={String(form.sort_order ?? "0")} onChange={(e) => setField("sort_order", Number(e.target.value))} placeholder="0" />
        </BrandField>
        <BrandField label="启用状态">
          <BrandSelect value={String(form.is_active ?? "true")} onChange={(e) => setField("is_active", e.target.value)} options={[{ label: "启用", value: "true" }, { label: "禁用", value: "false" }]} />
        </BrandField>
      </BrandFormSection>

      <BrandFormSection title="系列故事" description="品牌文化与系列叙事">
        <BrandField label="短描述">
          <BrandTextarea value={String(form.short_desc ?? "")} onChange={(e) => setField("short_desc", e.target.value)} placeholder="用于卡片展示的简短描述..." rows={3} />
        </BrandField>
        <BrandFormRow>
          <BrandField label="长描述">
            <BrandTextarea value={String(form.long_desc ?? "")} onChange={(e) => setField("long_desc", e.target.value)} placeholder="详情页长描述..." rows={4} />
          </BrandField>
        </BrandFormRow>
      </BrandFormSection>

      <BrandFormSection title="封面图" description="系列展示封面">
        <BrandFormRow>
          <BrandField label="封面图">
            <BrandMediaPicker value={String(form.coverImage ?? "")} onChange={(v) => setField("coverImage", v)} />
          </BrandField>
        </BrandFormRow>
      </BrandFormSection>
    </>
  );
}

// ── Unified Series Modal (add & edit) ──
function SeriesFormModal({ mode, initialData, onClose }: {
  mode: "add" | "edit"; initialData?: Record<string, unknown>; onClose: () => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>(() => ({
    name: initialData?.name ?? "", slug: initialData?.slug ?? "",
    description: initialData?.description ?? "", coverImage: initialData?.coverImage ?? "",
    heroText: initialData?.heroText ?? "", short_desc: initialData?.short_desc ?? "",
    long_desc: initialData?.long_desc ?? "", sort_order: initialData?.sort_order ?? 0,
    is_active: initialData?.is_active ?? "true",
  }));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  function setField(k: string, v: unknown) { setForm((p) => ({ ...p, [k]: v })); }

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.name) newErrors.name = "请输入系列名称";
    if (!form.slug) newErrors.slug = "请输入 Slug";
    if (!form.description) newErrors.description = "请输入简述";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setSaving(true);
    const id = initialData?.id as number | undefined;
    const r = id ? await updateSeries(id, form) : await createSeries(form);
    setSaving(false);
    if (r.error) { toast({ message: r.error, type: "error" }); return; }
    toast({ message: id ? "已保存" : "已创建", type: "success" });
    onClose();
    router.refresh();
  };

  return (
    <BrandFormModal open title={mode === "add" ? "新增系列" : "编辑系列"} onClose={onClose} width={960}
      footer={<BrandFormFooter onCancel={onClose} onSave={handleSave} saving={saving} saveLabel={mode === "add" ? "创建" : "保存"} />}
    >
      <SeriesFormContent form={form} setField={setField} errors={errors} />
    </BrandFormModal>
  );
}

// ── Main Client ──

export function BrandSeriesClient({ rows, error: serverError, searchQ }: { rows: any[]; error: string | null; searchQ: string; }) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [deleteRow, setDeleteRow] = useState<any>(null);
  const [versionRow, setVersionRow] = useState<any>(null);
  const [scheduleRow, setScheduleRow] = useState<any>(null);
  const [rejectRow, setRejectRow] = useState<any>(null);
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

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
        addLabel="+ 新增系列" onAdd={() => setShowAddModal(true)} />
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
      {showAddModal && <SeriesFormModal mode="add" onClose={() => setShowAddModal(false)} />}
      {editRow && <SeriesFormModal mode="edit" initialData={{ ...editRow, id: editRow.id }} onClose={() => setEditRow(null)} />}
      {deleteRow && <ConfirmModal title="删除系列" message={`确定要删除「${deleteRow.name}」吗？`} onConfirm={handleDelete} onClose={() => setDeleteRow(null)} />}
      {versionRow && (
        <VersionHistoryModal
          id={versionRow.id}
          name={versionRow.name}
          currentStatus={versionRow.status || "UNKNOWN"}
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
