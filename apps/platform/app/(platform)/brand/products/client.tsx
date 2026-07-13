"use client";
/**
 * BrandProductsClient — WO-P12B + Publishing Workflow
 * Interactive wrapper: ActionBar + Table + CRUD Modals + Workflow UI
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Star, Trash2 } from "lucide-react";
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
import {
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  moveProduct,
  submitProductForReview,
  approveProduct,
  rejectProduct,
  publishProductNow,
  scheduleProductPublish,
  unpublishProduct,
  archiveProduct,
  getProductVersions,
  rollbackProduct,
  getProductPreviewToken,
  listErpProductsForSelect,
} from "@/modules/brand/products/actions";
import { listSeries } from "@/modules/brand/series/actions";
import { toast } from "@/components/toast";

// ── 器物分类（ObjectCategory enum）──
const OBJECT_CATEGORIES = [
  { label: "珠串", value: "BRACELET" },
  { label: "香器", value: "INCENSE" },
  { label: "印章", value: "SEAL" },
  { label: "瓷器", value: "CERAMIC" },
  { label: "珐琅", value: "ENAMEL" },
  { label: "文房", value: "SCHOLAR" },
];

const CSV_COLUMNS = [
  { key: "sku", label: "SKU" },
  { key: "name", label: "名称" },
  { key: "slug", label: "Slug" },
  { key: "sale_price", label: "售价" },
  { key: "object_category", label: "分类" },
  { key: "status", label: "状态" },
  { key: "erp_product_id", label: "ERP 关联" },
  { key: "sort_order", label: "排序" },
];

// ── Status badge colors ──
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:       { bg: "#f5f5f4", text: "#78716c", label: "草稿" },
  IN_REVIEW:   { bg: "#fef3c7", text: "#d97706", label: "审核中" },
  APPROVED:    { bg: "#dbeafe", text: "#2563eb", label: "已通过" },
  SCHEDULED:   { bg: "#ede9fe", text: "#7c3aed", label: "已定时" },
  PUBLISHED:   { bg: "#ecfdf5", text: "#059669", label: "已发布" },
  UNPUBLISHED: { bg: "#fef3c7", text: "#d97706", label: "已下架" },
  ARCHIVED:    { bg: "#1c1917", text: "#fafaf9", label: "已归档" },
  REJECTED:    { bg: "#fef2f2", text: "#dc2626", label: "已驳回" },
};

function StatusBadge({ status }: { status: string }) {
  const conf = STATUS_COLORS[status] || { bg: "#f5f5f4", text: "#78716c", label: status };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11,
      background: conf.bg, color: conf.text, fontWeight: 500,
    }}>
      {conf.label}
    </span>
  );
}

function parseGallery(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {}
  return [];
}

function ProductGalleryEditor({
  coverImage,
  galleryImages,
  setField,
}: {
  coverImage: string;
  galleryImages: string[];
  setField: (k: string, v: unknown) => void;
}) {
  function setGallery(next: string[]) {
    setField("gallery", next.filter(Boolean));
  }

  function addImage(url: string) {
    if (!url) return;
    setGallery(galleryImages.includes(url) ? galleryImages : [...galleryImages, url]);
  }

  function removeImage(index: number) {
    setGallery(galleryImages.filter((_, i) => i !== index));
  }

  function moveImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= galleryImages.length) return;
    const next = [...galleryImages];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setGallery(next);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <BrandMediaPicker value="" onChange={addImage} placeholder="添加展示图" />
      {galleryImages.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
        }}>
          {galleryImages.map((url, index) => (
            <div key={`${url}-${index}`} style={{
              border: "1px solid #e7e5e4",
              borderRadius: 8,
              overflow: "hidden",
              background: "#fff",
            }}>
              <div style={{ position: "relative", aspectRatio: "4 / 3", background: "#f5f5f4" }}>
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                {url === coverImage && (
                  <span style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "#1c1917",
                    color: "#fff",
                    fontSize: 11,
                  }}>封面</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, padding: 6, justifyContent: "space-between" }}>
                <button type="button" title="上移" aria-label="上移" disabled={index === 0} onClick={() => moveImage(index, -1)} style={iconBtn}>
                  <ArrowUp size={14} />
                </button>
                <button type="button" title="下移" aria-label="下移" disabled={index === galleryImages.length - 1} onClick={() => moveImage(index, 1)} style={iconBtn}>
                  <ArrowDown size={14} />
                </button>
                <button type="button" title="设为封面" aria-label="设为封面" onClick={() => setField("cover_image", url)} style={iconBtn}>
                  <Star size={14} />
                </button>
                <button type="button" title="删除" aria-label="删除" onClick={() => removeImage(index)} style={{ ...iconBtn, color: "#dc2626" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Product Form Content (shared by add & edit) ──
function ProductFormContent({
  form, setField, errors, seriesOptions, erpProducts, erpProductsLoading,
}: {
  form: Record<string, unknown>;
  setField: (k: string, v: unknown) => void;
  errors: Record<string, string>;
  seriesOptions: { label: string; value: string }[];
  erpProducts: { label: string; value: string }[];
  erpProductsLoading: boolean;
}) {
  const noErpLink = !form.erp_product_id || String(form.erp_product_id) === "";
  const hasErpLink = !noErpLink;
  return (
    <>
      {/* 基础信息 */}
      <BrandFormSection title="基础信息" description="产品核心标识与分类">
        <BrandField label="SKU" required error={errors.sku}>
          <BrandInput value={String(form.sku ?? "")} onChange={(e) => setField("sku", e.target.value)} placeholder="PROD-001" />
        </BrandField>
        <BrandField label="名称" required error={errors.name}>
          <BrandInput value={String(form.name ?? "")} onChange={(e) => setField("name", e.target.value)} placeholder="产品名称" />
        </BrandField>
        <BrandField label="Slug" required error={errors.slug}>
          <BrandInput value={String(form.slug ?? "")} onChange={(e) => setField("slug", e.target.value)} placeholder="product-slug" />
        </BrandField>
        <BrandField label="器物分类">
          <BrandSelect value={String(form.object_category ?? "BRACELET")} onChange={(e) => setField("object_category", e.target.value)} options={OBJECT_CATEGORIES} />
        </BrandField>
        <BrandField label="主题">
          <BrandInput value={String(form.theme ?? "")} onChange={(e) => setField("theme", e.target.value)} placeholder="见己 / 归心 / 澄明 / 守拙 / 日用 / 礼赠" />
        </BrandField>
        <BrandField label="所属系列">
          <BrandSelect value={String(form.series_id ?? "")} onChange={(e) => setField("series_id", e.target.value ? Number(e.target.value) : "")} options={seriesOptions} />
        </BrandField>
        <BrandField label="关联 ERP 产品">
          <BrandSelect value={String(form.erp_product_id ?? "")} onChange={(e) => setField("erp_product_id", e.target.value ? Number(e.target.value) : "")} options={erpProducts} disabled={erpProductsLoading} />
        </BrandField>
        {hasErpLink ? (
          <div style={{ padding: "8px 12px", background: "#fffbeb", borderRadius: 6, fontSize: 12, color: "#92400e", border: "1px solid #fde68a", marginTop: 4 }}>
            Price and stock are controlled by ERP. Manual changes will be overwritten.
          </div>
        ) : (
          <div style={{ padding: "8px 12px", background: "#fffbeb", borderRadius: 6, fontSize: 12, color: "#92400e", border: "1px solid #fde68a", marginTop: 4 }}>
            ⚠️ 未关联 ERP 产品，成本/库存不会自动同步。
          </div>
        )}
      </BrandFormSection>

      {/* 价格库存 */}
      <BrandFormSection title="价格与库存" description="定价与库存管理">
        <BrandField label="售价">
          <BrandNumberInput value={String(form.sale_price ?? "")} onChange={(e) => setField("sale_price", e.target.value ? Number(e.target.value) : 0)} placeholder="399" />
        </BrandField>
        <BrandField label="成本价">
          <BrandNumberInput value={String(form.cost_price ?? "")} onChange={(e) => setField("cost_price", e.target.value ? Number(e.target.value) : 0)} placeholder="0" />
        </BrandField>
        <BrandField label="库存">
          <BrandNumberInput value={String(form.stock ?? "")} onChange={(e) => setField("stock", e.target.value ? Number(e.target.value) : 0)} placeholder="0" />
        </BrandField>
      </BrandFormSection>

      {/* 图片媒体 */}
      <BrandFormSection title="图片媒体" description="产品封面与展示图片">
        <BrandFormRow>
          <BrandField label="封面图">
            <BrandMediaPicker value={String(form.cover_image ?? "")} onChange={(v) => setField("cover_image", v)} />
          </BrandField>
        </BrandFormRow>
        <BrandFormRow>
          <BrandField label="展示图">
            <ProductGalleryEditor
              coverImage={String(form.cover_image ?? "")}
              galleryImages={parseGallery(form.gallery)}
              setField={setField}
            />
          </BrandField>
        </BrandFormRow>
      </BrandFormSection>

      {/* 产品故事 */}
      <BrandFormSection title="产品故事" description="品牌文化与作品寓意">
        <BrandFormRow>
          <BrandField label="故事/描述">
            <BrandTextarea value={String(form.story ?? "")} onChange={(e) => setField("story", e.target.value)} placeholder="产品故事..." rows={4} />
          </BrandField>
        </BrandFormRow>
      </BrandFormSection>

    </>
  );
}

// ── Unified Product Modal (add & edit) ──
function ProductFormModal({
  mode, initialData, onClose,
}: {
  mode: "add" | "edit";
  initialData?: Record<string, unknown>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Record<string, unknown>>(() => ({
    sku: initialData?.sku ?? "", name: initialData?.name ?? "", slug: initialData?.slug ?? "",
    series_id: initialData?.series_id ?? "", sale_price: initialData?.sale_price ?? 0,
    cost_price: initialData?.cost_price ?? 0, cover_image: initialData?.cover_image ?? "",
    gallery: initialData?.galleryImages ?? initialData?.gallery_images ?? parseGallery(initialData?.gallery),
    stock: initialData?.stock ?? 0, object_category: initialData?.object_category ?? "BRACELET",
    story: initialData?.story ?? "", theme: initialData?.theme ?? "",
    erp_product_id: initialData?.erp_product_id ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [seriesOptions, setSeriesOptions] = useState<{ label: string; value: string }[]>([
    { label: "加载中…", value: "" },
  ]);
  const [erpProducts, setErpProducts] = useState<{ label: string; value: string }[]>([]);
  const [erpProductsLoading, setErpProductsLoading] = useState(true);
  const router = useRouter();

  // Load series list on mount
  useEffect(() => {
    (async () => {
      const result = await listSeries();
      if (result.rows && result.rows.length > 0) {
        setSeriesOptions(result.rows.map((s: any) => ({
          label: s.name || s.slug || `#${s.id}`,
          value: String(s.id),
        })));
      } else {
        setSeriesOptions([{ label: "暂无系列，请先创建系列", value: "" }]);
      }
    })();
  }, []);

  // Load ERP products on mount
  useEffect(() => {
    (async () => {
      setErpProductsLoading(true);
      const result = await listErpProductsForSelect();
      if (result.products && result.products.length > 0) {
        setErpProducts([
          { label: "（不关联）", value: "" },
          ...result.products.map((p: any) => ({
            label: `${p.code} - ${p.name}${p.skuCode ? ` (${p.skuCode})` : ""}${p.skuStock != null ? ` • 库存:${p.skuStock}` : ""}`,
            value: String(p.id),
          })),
        ]);
      } else {
        setErpProducts([{ label: "暂无 ERP 产品", value: "" }]);
      }
      setErpProductsLoading(false);
    })();
  }, []);

  function setField(k: string, v: unknown) { setForm((p) => ({ ...p, [k]: v })); }

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.sku) newErrors.sku = "请输入 SKU";
    if (!form.name) newErrors.name = "请输入名称";
    if (!form.slug) newErrors.slug = "请输入 Slug";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setSaving(true);
    const id = initialData?.id as number | undefined;
    const r = id
      ? await updateProduct(id, form)
      : await createProduct(form);
    setSaving(false);
    if (r.error) { toast({ message: r.error, type: "error" }); return; }
    if (r.drift && (r.drift.sale_price || r.drift.stock)) {
      toast({ message: "ERP latest price/stock has been applied.", type: "success" });
    }
    toast({ message: id ? "已保存" : "已创建", type: "success" });
    onClose();
    router.refresh();
  };

  return (
    <BrandFormModal
      open
      title={mode === "add" ? "新增产品" : "编辑产品"}
      onClose={onClose}
      width={960}
      footer={
        <BrandFormFooter
          onCancel={onClose}
          onSave={handleSave}
          saving={saving}
          saveLabel={mode === "add" ? "创建" : "保存"}
        />
      }
    >
      <ProductFormContent form={form} setField={setField} errors={errors} seriesOptions={seriesOptions} erpProducts={erpProducts} erpProductsLoading={erpProductsLoading} />
    </BrandFormModal>
  );
}

// ── Workflow action buttons per status ──
function WorkflowButtons({ row, onRefresh }: { row: any; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);

  async function exec(action: () => Promise<any>, successMsg: string) {
    setLoading(true);
    const r = await action();
    setLoading(false);
    if (r.error) toast({ message: r.error, type: "error" });
    else { toast({ message: successMsg, type: "success" }); onRefresh(); }
  }

  const status = row.status as string;

  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {/* DRAFT → submit for review */}
      {status === "DRAFT" && (
        <button onClick={() => exec(() => submitProductForReview(row.id), "已提交审核")}
          disabled={loading} style={wfBtnStyle("#2563eb")}>提交审核</button>
      )}

      {/* IN_REVIEW → approve / reject */}
      {status === "IN_REVIEW" && (
        <>
          <button onClick={() => exec(() => approveProduct(row.id), "已通过")}
            disabled={loading} style={wfBtnStyle("#059669")}>通过</button>
          <button onClick={() => {
            const reason = prompt("驳回原因（可选）：");
            exec(() => rejectProduct(row.id, reason || undefined), "已驳回");
          }} disabled={loading} style={wfBtnStyle("#dc2626")}>驳回</button>
        </>
      )}

      {/* APPROVED → publish now / schedule */}
      {status === "APPROVED" && (
        <>
          <button onClick={() => exec(() => publishProductNow(row.id), "已发布")}
            disabled={loading} style={wfBtnStyle("#059669")}>立即发布</button>
          <button onClick={() => {
            const el = document.getElementById(`schedule-btn-${row.id}`);
            if (el) el.click();
          }} disabled={loading} style={wfBtnStyle("#2563eb")}>定时发布</button>
        </>
      )}

      {/* SCHEDULED → cancel schedule (unpublish to return to APPROVED) */}
      {status === "SCHEDULED" && (
        <button onClick={() => exec(() => unpublishProduct(row.id), "已取消定时发布")}
          disabled={loading} style={wfBtnStyle("#d97706")}>取消定时</button>
      )}

      {/* PUBLISHED → unpublish / archive */}
      {status === "PUBLISHED" && (
        <>
          <button onClick={() => exec(() => unpublishProduct(row.id), "已下架")}
            disabled={loading} style={wfBtnStyle("#d97706")}>下架</button>
          <button onClick={() => exec(() => archiveProduct(row.id), "已归档")}
            disabled={loading} style={wfBtnStyle("#78716c")}>归档</button>
        </>
      )}

      {/* ARCHIVED or REJECTED → re-edit (move to DRAFT) */}
      {(status === "ARCHIVED" || status === "REJECTED") && (
        <button onClick={() => exec(() => toggleProductStatus(row.id, "DRAFT"), "已移至草稿")}
          disabled={loading} style={wfBtnStyle("#2563eb")}>重新编辑</button>
      )}

      {/* Always show: preview + version history */}
      <button onClick={async () => {
        setLoading(true);
        try {
          const token = await getProductPreviewToken(row.id);
          if (typeof token === 'string') {
            window.open(`/preview/products/${row.id}?token=${token}`, "_blank");
          }
        } catch (e: any) { toast({ message: e.message || "预览失败", type: "error" }); }
        setLoading(false);
      }} disabled={loading} style={wfBtnStyle("#78716c")}>预览</button>
    </span>
  );
}

function wfBtnStyle(color: string): React.CSSProperties {
  return {
    padding: "2px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer",
    background: "transparent", color, border: `1px solid ${color}`, fontWeight: 500,
  };
}

export function BrandProductsClient({ rows, error: serverError, searchQ }: {
  rows: any[]; error: string | null; searchQ: string;
}) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [deleteRow, setDeleteRow] = useState<any>(null);

  // Workflow UI state
  const [versionModalId, setVersionModalId] = useState<number | null>(null);
  const [versionList, setVersionList] = useState<any[]>([]);
  const [versionLoading, setVersionLoading] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<any>(null);
  const [rollbackReason, setRollbackReason] = useState("");
  const [scheduleModalId, setScheduleModalId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);

  function refresh() { router.refresh(); }

  async function handleDelete() {
    if (!deleteRow) return;
    await deleteProduct(deleteRow.id);
    setDeleteRow(null);
    refresh();
  }

  async function handleToggle(id: number, newStatus: string) {
    await toggleProductStatus(id, newStatus);
    refresh();
  }

  async function handleMove(id: number, dir: "up" | "down") {
    await moveProduct(id, dir);
    refresh();
  }

  async function openVersionHistory(id: number) {
    setVersionModalId(id);
    setVersionLoading(true);
    const versions = await getProductVersions(id);
    setVersionList(Array.isArray(versions) ? versions : []);
    setRollbackTarget(null);
    setRollbackReason("");
    setVersionLoading(false);
  }

  async function handleRollback(id: number, version: number, reason: string) {
    setVersionLoading(true);
    const r = await rollbackProduct(id, version, reason);
    setVersionLoading(false);
    if ('error' in r && r.error) toast({ message: r.error, type: "error" });
    else { toast({ message: `已回滚到版本 ${version}`, type: "success" }); setVersionModalId(null); setRollbackTarget(null); setRollbackReason(""); refresh(); }
  }

  async function handleSchedulePublish() {
    if (!scheduleModalId || !scheduleDate) return;
    setScheduleLoading(true);
    const r = await scheduleProductPublish(scheduleModalId, scheduleDate);
    setScheduleLoading(false);
    if (r.error) toast({ message: r.error, type: "error" });
    else { toast({ message: "已设定定时发布", type: "success" }); setScheduleModalId(null); setScheduleDate(""); refresh(); }
  }

  const hasData = rows && rows.length > 0;

  return (
    <div style={{ maxWidth: "100%", padding: "0 4px" }}>
      <h1 style={{ fontSize: 20, fontWeight: 300, letterSpacing: "0.1em", color: "#1c1917", marginBottom: 4 }}>产品展示管理</h1>
      <p style={{ fontSize: 13, color: "#a8a29e", marginBottom: 16 }}>管理 Brand OS 前台产品。操作将影响 www.yunwuorigin.com。</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Kpi label="产品总数" value={rows?.length || 0} />
        <Kpi label="已发布" value={rows?.filter((r: any) => r.status === "PUBLISHED").length || 0} />
        <Kpi label="草稿" value={rows?.filter((r: any) => r.status === "DRAFT").length || 0} />
        <Kpi label="审核中" value={rows?.filter((r: any) => r.status === "IN_REVIEW").length || 0} />
      </div>

      <ActionBar
        module="brand-products"
        csvColumns={CSV_COLUMNS}
        data={rows || []}
        searchPlaceholder="搜索产品名称或 SKU..."
        searchParam="q"
        addLabel="+ 新增产品"
        onAdd={() => setShowAddModal(true)}
      />

      {serverError && <div style={{ padding: 12, background: "#fef2f2", borderRadius: 6, marginBottom: 16, fontSize: 13, color: "#dc2626" }}>{serverError}</div>}

      {hasData ? (
        <div style={{ overflowX: "auto", border: "1px solid #e7e5e4", borderRadius: 8, background: "#fff" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e7e5e4", background: "#fafaf9", textAlign: "left" }}>
                <th style={thStyle}>排序</th>
                <th style={thStyle}>SKU</th>
                <th style={thStyle}>名称</th>
                <th style={thStyle}>ERP</th>
                <th style={thStyle}>售价</th>
                <th style={thStyle}>分类</th>
                <th style={thStyle}>状态</th>
                <th style={{ ...thStyle, textAlign: "right" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f5f5f4" }}>
                  <td style={tdStyle}>
                    <button onClick={() => handleMove(r.id, "up")} style={sortBtnStyle}>↑</button>
                    <span style={{ margin: "0 4px", color: "#a8a29e", fontSize: 11 }}>{r.sort_order}</span>
                    <button onClick={() => handleMove(r.id, "down")} style={sortBtnStyle}>↓</button>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>{r.sku}</td>
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{r.name}</td>
                  <td style={{ ...tdStyle, fontSize: 11 }}>
                    {r.erp_product_id ? (
                      <span style={{ color: "#059669", fontWeight: 500 }}>✅ 已关联</span>
                    ) : (
                      <span style={{ color: "#a8a29e" }}>—</span>
                    )}
                  </td>
                  <td style={tdStyle}>¥{r.sale_price ?? 0}</td>
                  <td style={tdStyle}>{r.object_category || "—"}</td>
                  <td style={tdStyle}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <button onClick={() => setEditRow(r)} style={actionStyle}>编辑</button>
                    <button onClick={() => setDeleteRow(r)} style={{ ...actionStyle, color: "#dc2626" }}>删除</button>
                    <button onClick={() => openVersionHistory(r.id)} style={{ ...actionStyle, color: "#2563eb" }}>版本</button>
                    {/* Hidden schedule trigger per row */}
                    <span style={{ display: "none" }}>
                      <button id={`schedule-btn-${r.id}`} onClick={() => setScheduleModalId(r.id)} />
                    </span>
                    <div style={{ marginTop: 4 }}>
                      <WorkflowButtons row={r} onRefresh={refresh} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#a8a29e" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💎</div>
          <p style={{ fontSize: 15, color: "#57534e", marginBottom: 4 }}>暂无产品</p>
          <p style={{ fontSize: 13 }}>点击「+ 新增」创建第一个产品</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && <ProductFormModal mode="add" onClose={() => setShowAddModal(false)} />}

      {/* Edit Modal */}
      {editRow && (
        <ProductFormModal
          mode="edit"
          initialData={{ ...editRow, id: editRow.id }}
          onClose={() => setEditRow(null)}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteRow && (
        <ConfirmModal title="删除产品" message={`确定要删除「${deleteRow.name}」(SKU: ${deleteRow.sku}) 吗？此操作不可撤销。`}
          onConfirm={handleDelete} onClose={() => setDeleteRow(null)} />
      )}

      {/* Version History Modal */}
      {versionModalId != null && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: "#1c1917" }}>版本历史 — ID: {versionModalId}</h3>
              <button onClick={() => { setVersionModalId(null); setRollbackTarget(null); setRollbackReason(""); }} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#78716c" }}>×</button>
            </div>
            {versionLoading ? (
              <div style={{ padding: 20, textAlign: "center", color: "#a8a29e" }}>加载中…</div>
            ) : versionList.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#a8a29e" }}>暂无版本记录</div>
            ) : (
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e7e5e4", background: "#fafaf9" }}>
                    <th style={thStyle}>版本</th>
                    <th style={thStyle}>状态</th>
                    <th style={thStyle}>时间</th>
                    <th style={thStyle}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {versionList.map((v: any) => (
                    <tr key={v.version} style={{ borderBottom: "1px solid #f5f5f4" }}>
                      <td style={tdStyle}>v{v.version}</td>
                      <td style={tdStyle}><StatusBadge status={v.status} /></td>
                      <td style={{ ...tdStyle, fontSize: 12, color: "#a8a29e" }}>{v.created_at ? new Date(v.created_at).toLocaleString("zh-CN") : "—"}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <button onClick={() => setRollbackTarget(v)}
                          disabled={versionLoading} style={wfBtnStyle("#d97706")}>回滚</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {rollbackTarget && (() => {
              const current = rows.find((item: any) => item.id === versionModalId);
              const currentStatus = current?.publish_status || current?.publishStatus || current?.status || "UNKNOWN";
              const isPublished = currentStatus === "PUBLISHED";
              const reasonValid = rollbackReason.trim().length >= 5;
              return <div style={{ marginTop: 16, padding: 12, border: "1px solid #f59e0b", borderRadius: 6, background: "#fffbeb" }}>
                <div style={{ fontWeight: 600, color: "#92400e", marginBottom: 8 }}>紧急立即恢复确认</div>
                <p style={{ fontSize: 13, color: "#92400e", margin: "0 0 8px" }}>此操作会立即使用所选历史版本替换当前线上内容。无需重新审核，操作不可静默撤销。</p>
                {isPublished && <p style={{ fontSize: 13, color: "#b45309", fontWeight: 600, margin: "0 0 8px" }}>线上内容将立即改变</p>}
                <p style={{ fontSize: 12, color: "#57534e", margin: "0 0 8px" }}>内容 ID: {versionModalId} · v{rollbackTarget.version} · {rollbackTarget.created_at ? new Date(rollbackTarget.created_at).toLocaleString("zh-CN") : "—"} · 当前状态: {currentStatus}</p>
                <textarea value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} placeholder="请输入不少于 5 个字符的紧急恢复原因" style={{ ...inputStyle, minHeight: 72, width: "100%", boxSizing: "border-box" }} />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <button onClick={() => { setRollbackTarget(null); setRollbackReason(""); }} disabled={versionLoading} style={wfBtnStyle("#78716c")}>取消</button>
                  <button onClick={() => handleRollback(versionModalId, rollbackTarget.version, rollbackReason)} disabled={versionLoading || !reasonValid} style={wfBtnStyle("#b45309")}>{versionLoading ? "恢复中…" : "确认紧急恢复"}</button>
                </div>
              </div>;
            })()}
          </div>
        </div>
      )}

      {/* Schedule Publish Dialog */}
      {scheduleModalId != null && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalContentStyle, maxWidth: 400 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: "#1c1917" }}>定时发布</h3>
              <button onClick={() => { setScheduleModalId(null); setScheduleDate(""); }} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#78716c" }}>×</button>
            </div>
            <label style={{ display: "block", fontSize: 13, color: "#57534e", marginBottom: 4 }}>发布时间</label>
            <input type="datetime-local" value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              style={{ ...inputStyle, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setScheduleModalId(null); setScheduleDate(""); }}
                style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#f5f5f4", color: "#57534e", border: "1px solid #e7e5e4" }}>
                取消
              </button>
              <button onClick={handleSchedulePublish} disabled={scheduleLoading || !scheduleDate}
                style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, cursor: scheduleDate ? "pointer" : "not-allowed", background: scheduleDate ? "#2563eb" : "#e7e5e4", color: "#fff", border: "none" }}>
                {scheduleLoading ? "设定中…" : "确认发布"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
const iconBtn: React.CSSProperties = {
  width: 26,
  height: 26,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #e7e5e4",
  borderRadius: 4,
  background: "#fff",
  color: "#57534e",
  cursor: "pointer",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #e7e5e4",
  borderRadius: 6,
  fontSize: 13,
  color: "#1c1917",
  background: "#fff",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000,
};
const modalContentStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: 24, maxWidth: 600, width: "90%",
  maxHeight: "80vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
};
