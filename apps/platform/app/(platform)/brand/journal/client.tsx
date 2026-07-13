"use client";
/**
 * BrandJournalClient — WO-P12B (wired to Publisher Engine)
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
  BrandMediaPicker,
  BrandFormFooter,
} from "@/components/brand";
import { toast } from "@/components/toast";
import {
  createPost, updatePost, deletePost, togglePostStatus, movePost,
  submitPostForReview, approvePost, rejectPost, publishPostNow,
  schedulePost, unpublishPost, archivePost,
  getPostVersions, rollbackPost, getPostPreviewToken,
  updatePostSeo,
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

const CATEGORY_OPTIONS = [
  { label: "器物", value: "OBJECT" },
  { label: "材料", value: "MATERIAL" },
  { label: "工艺", value: "CRAFT" },
  { label: "东海", value: "DONGHAI" },
  { label: "创作", value: "CREATION" },
  { label: "哲思", value: "PHILOSOPHY" },
];

const CSV_COLUMNS = [
  { key: "title", label: "标题" }, { key: "slug", label: "Slug" }, { key: "category", label: "分类" },
  { key: "status", label: "状态" }, { key: "published_at", label: "发布日期" }, { key: "sort_order", label: "排序" },
];

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPostVersions(row.id);
        if (!cancelled) setVersions(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "加载版本历史失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [row.id]);

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

// ── Journal Form Content (shared by add & edit) ──
function PostFormContent({ form, setField, errors }: {
  form: Record<string, unknown>; setField: (k: string, v: unknown) => void; errors: Record<string, string>;
}) {
  return (
    <>
      <BrandFormSection title="基础信息" description="文章标题与分类">
        <BrandField label="标题" required error={errors.title}>
          <BrandInput value={String(form.title ?? "")} onChange={(e) => setField("title", e.target.value)} placeholder="文章标题" />
        </BrandField>
        <BrandField label="Slug" required error={errors.slug}>
          <BrandInput value={String(form.slug ?? "")} onChange={(e) => setField("slug", e.target.value)} placeholder="article-slug" />
        </BrandField>
        <BrandField label="分类" required>
          <BrandSelect value={String(form.category ?? "OBJECT")} onChange={(e) => setField("category", e.target.value)} options={CATEGORY_OPTIONS} />
        </BrandField>
      </BrandFormSection>

      <BrandFormSection title="封面图" description="文章封面图片">
        <BrandFormRow>
          <BrandField label="封面图">
            <BrandMediaPicker value={String(form.cover_image ?? "")} onChange={(v) => setField("cover_image", v)} />
          </BrandField>
        </BrandFormRow>
      </BrandFormSection>

      <BrandFormSection title="正文内容" description="文章主体">
        <BrandField label="摘要">
          <BrandTextarea value={String(form.excerpt ?? "")} onChange={(e) => setField("excerpt", e.target.value)} placeholder="文章摘要..." rows={3} />
        </BrandField>
        <BrandFormRow>
          <BrandField label="正文">
            <BrandTextarea value={String(form.content ?? "")} onChange={(e) => setField("content", e.target.value)} placeholder="文章正文内容..." rows={8} />
          </BrandField>
        </BrandFormRow>
      </BrandFormSection>

      <BrandFormSection title="SEO 信息" description="搜索引擎优化">
        <BrandField label="SEO 标题">
          <BrandInput value={String(form.seo_title ?? "")} onChange={(e) => setField("seo_title", e.target.value)} placeholder="SEO 优化标题" />
        </BrandField>
        <BrandFormRow>
          <BrandField label="SEO 描述">
            <BrandTextarea value={String(form.seo_description ?? "")} onChange={(e) => setField("seo_description", e.target.value)} placeholder="SEO 优化描述..." rows={3} />
          </BrandField>
        </BrandFormRow>
      </BrandFormSection>
    </>
  );
}

// ── Unified Journal Modal (add & edit) ──
function PostFormModal({ mode, initialData, onClose }: {
  mode: "add" | "edit"; initialData?: Record<string, unknown>; onClose: () => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>(() => ({
    title: initialData?.title ?? "", slug: initialData?.slug ?? "",
    category: initialData?.category ?? "OBJECT", excerpt: initialData?.excerpt ?? "",
    content: initialData?.content ?? "", cover_image: initialData?.cover_image ?? "",
    seo_title: initialData?.seo_title ?? "",
    seo_description: initialData?.seo_description ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  function setField(k: string, v: unknown) { setForm((p) => ({ ...p, [k]: v })); }

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.title) newErrors.title = "请输入标题";
    if (!form.slug) newErrors.slug = "请输入 Slug";
    if (!form.category) newErrors.category = "请选择分类";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setSaving(true);
    const id = initialData?.id as string | undefined;
    const r = id ? await updatePost(id, form) : await createPost(form);
    setSaving(false);
    if (r.error) { toast({ message: r.error, type: "error" }); return; }
    toast({ message: id ? "已保存" : "已创建", type: "success" });
    onClose();
    router.refresh();
  };

  return (
    <BrandFormModal open title={mode === "add" ? "新增文章" : "编辑文章"} onClose={onClose} width={960}
      footer={<BrandFormFooter onCancel={onClose} onSave={handleSave} saving={saving} saveLabel={mode === "add" ? "创建" : "保存"} />}
    >
      <PostFormContent form={form} setField={setField} errors={errors} />
    </BrandFormModal>
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

// ── SEO Edit Modal ──

function SeoEditModal({ row, onClose }: { row: any; onClose: () => void }) {
  const [seoTitle, setSeoTitle] = useState(row.seo_title || "");
  const [seoDescription, setSeoDescription] = useState(row.seo_description || "");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const r = await updatePostSeo(row.id, {
        seo_title: seoTitle,
        seo_description: seoDescription,
        seo_keywords: seoKeywords,
        og_image: ogImage,
      });
      if (!r.success) {
        setError(r.error || "保存失败");
      } else {
        onClose();
        router.refresh();
      }
    } catch (e: any) {
      setError(e.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={{ ...modalBox, minWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: "#1c1917", margin: 0 }}>SEO 设置 — {row.title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#a8a29e" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "#57534e", marginBottom: 4 }}>SEO 标题</label>
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="SEO 优化标题" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "#57534e", marginBottom: 4 }}>SEO 描述</label>
            <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="SEO 优化描述..." rows={3} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "#57534e", marginBottom: 4 }}>SEO 关键词</label>
            <input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="关键词1, 关键词2, ..." style={inputStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, color: "#57534e", marginBottom: 4 }}>OG 图片 URL</label>
            <input value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="https://..." style={inputStyle} />
          </div>
        </div>

        {error && <div style={{ padding: 8, background: "#fef2f2", borderRadius: 6, marginTop: 12, fontSize: 12, color: "#dc2626" }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ height: 36, padding: "0 16px", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#fff", color: "#44403c", border: "1px solid #e7e5e4" }}>取消</button>
          <button onClick={handleSave} disabled={saving} style={{ height: 36, padding: "0 16px", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#0891b2", color: "#fff", border: "none" }}>
            {saving ? "保存中…" : "保存 SEO"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Client ──

export function BrandJournalClient({ rows, error: serverError, searchQ }: { rows: any[]; error: string | null; searchQ: string; }) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [deleteRow, setDeleteRow] = useState<any>(null);
  const [scheduleRow, setScheduleRow] = useState<any>(null);
  const [rejectRow, setRejectRow] = useState<any>(null);
  const [versionsRow, setVersionsRow] = useState<any>(null);
  const [previewRow, setPreviewRow] = useState<any>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [seoEditRow, setSeoEditRow] = useState<any>(null);
  const [actionError, setActionError] = useState("");

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
      // Open internal preview page in a new tab
      window.open(`/preview/journal/${row.id}?token=${token}`, "_blank");
    } catch (e: any) {
      setActionError("生成预览令牌失败");
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleSeoEdit(row: any) {
    setSeoEditRow(row);
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
        addLabel="+ 新增文章" onAdd={() => setShowAddModal(true)} />

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
                  <button onClick={() => handleSeoEdit(r)} style={{ ...actionStyle, color: "#0891b2" }}>SEO</button>
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
      {showAddModal && <PostFormModal mode="add" onClose={() => setShowAddModal(false)} />}
      {editRow && <PostFormModal mode="edit" initialData={{ ...editRow, id: editRow.id }} onClose={() => setEditRow(null)} />}

      {/* Delete Confirm */}
      {deleteRow && <ConfirmModal title="删除文章" message={`确定要删除「${deleteRow.title}」吗？`} onConfirm={handleDelete} onClose={() => setDeleteRow(null)} />}

      {/* Schedule Dialog */}
      {scheduleRow && <ScheduleDialog row={scheduleRow} onClose={() => setScheduleRow(null)} onSuccess={handleScheduleSuccess} />}

      {/* Reject Dialog */}
      {rejectRow && <RejectDialog row={rejectRow} onClose={() => setRejectRow(null)} onSuccess={handleRejectSuccess} />}

      {/* Version History Modal */}
      {versionsRow && <VersionHistoryModal row={versionsRow} onClose={() => setVersionsRow(null)} />}

      {/* SEO Edit Modal */}
      {seoEditRow && <SeoEditModal row={seoEditRow} onClose={() => setSeoEditRow(null)} />}

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
const modalOverlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(28, 25, 23, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 };
const modalBox: React.CSSProperties = { width: "100%", maxWidth: 480, background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 20px 50px rgba(28, 25, 23, 0.2)" };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid #e7e5e4", borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none" };
