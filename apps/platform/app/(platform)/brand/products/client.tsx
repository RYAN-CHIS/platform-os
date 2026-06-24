"use client";
/**
 * BrandProductsClient — WO-P12B + Publishing Workflow
 * Interactive wrapper: ActionBar + Table + CRUD Modals + Workflow UI
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/ActionBar";
import { CrudModal, ConfirmModal, FormField } from "@/components/BrandCrudModal";
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
} from "@/modules/brand/products/actions";
import { toast } from "@/components/toast";

const PRODUCT_FIELDS: FormField[] = [
  { key: "sku", label: "SKU", type: "text", required: true, placeholder: "PROD-001" },
  { key: "name", label: "名称", type: "text", required: true, placeholder: "产品名称" },
  { key: "slug", label: "Slug", type: "text", required: true, placeholder: "product-slug" },
  { key: "series_id", label: "系列 ID", type: "number", placeholder: "关联系列 ID" },
  { key: "sale_price", label: "售价", type: "number", placeholder: "399" },
  { key: "cost_price", label: "成本价", type: "number", placeholder: "0" },
  { key: "cover_image", label: "封面图 URL", type: "text", placeholder: "/images/..." },
  { key: "stock", label: "库存", type: "number", placeholder: "0" },
  { key: "object_category", label: "器物分类", type: "select", options: [
    { label: "手串 (BRACELET)", value: "BRACELET" },
    { label: "挂件 (PENDANT)", value: "PENDANT" },
    { label: "摆件 (ORNAMENT)", value: "ORNAMENT" },
    { label: "配饰 (ACCESSORY)", value: "ACCESSORY" },
    { label: "其他 (OTHER)", value: "OTHER" },
  ]},
  { key: "status", label: "状态", type: "select", options: [
    { label: "草稿 (DRAFT)", value: "DRAFT" },
    { label: "审核中 (IN_REVIEW)", value: "IN_REVIEW" },
    { label: "已通过 (APPROVED)", value: "APPROVED" },
    { label: "已定时 (SCHEDULED)", value: "SCHEDULED" },
    { label: "已发布 (PUBLISHED)", value: "PUBLISHED" },
    { label: "已下架 (UNPUBLISHED)", value: "UNPUBLISHED" },
    { label: "已归档 (ARCHIVED)", value: "ARCHIVED" },
    { label: "已驳回 (REJECTED)", value: "REJECTED" },
  ]},
  { key: "story", label: "故事/描述", type: "textarea", placeholder: "产品故事..." },
  { key: "theme", label: "主题", type: "text", placeholder: "见己 / 留痕 / 栖居 / 随行 / 传藏" },
];

const CSV_COLUMNS = [
  { key: "sku", label: "SKU" },
  { key: "name", label: "名称" },
  { key: "slug", label: "Slug" },
  { key: "sale_price", label: "售价" },
  { key: "object_category", label: "分类" },
  { key: "status", label: "状态" },
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

// ── Add Form ──
function AddProductForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    PRODUCT_FIELDS.forEach((f) => { init[f.key] = f.defaultValue ?? ""; });
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const r = await createProduct(form);
    setLoading(false);
    if (r.error) { setError(r.error); return; }
    onSuccess();
    router.refresh();
  }

  function setField(k: string, v: unknown) { setForm((p) => ({ ...p, [k]: v })); }

  return (
    <form onSubmit={handleSubmit} style={{ padding: "4px 0" }}>
      {PRODUCT_FIELDS.map((f) => (
        <div key={f.key} style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, color: "#57534e", marginBottom: 4 }}>
            {f.label}{f.required && <span style={{ color: "#dc2626" }}> *</span>}
          </label>
          {f.type === "textarea" ? (
            <textarea value={String(form[f.key] ?? "")} onChange={(e) => setField(f.key, e.target.value)}
              placeholder={f.placeholder} required={f.required} rows={3} style={inputStyle} />
          ) : f.type === "select" && f.options ? (
            <select value={String(form[f.key] ?? f.options[0].value)} onChange={(e) => setField(f.key, e.target.value)} style={inputStyle}>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input type={f.type === "number" ? "number" : "text"} value={String(form[f.key] ?? "")}
              onChange={(e) => setField(f.key, f.type === "number" ? Number(e.target.value) : e.target.value)}
              placeholder={f.placeholder} required={f.required} step={f.type === "number" ? "0.01" : undefined} style={inputStyle} />
          )}
        </div>
      ))}
      {error && <div style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 6, marginBottom: 12, fontSize: 13, color: "#dc2626" }}>{error}</div>}
      <button type="submit" disabled={loading} style={{ height: 36, padding: "0 16px", borderRadius: 6, fontSize: 13, cursor: "pointer", background: "#1c1917", color: "#fff", border: "1px solid #1c1917" }}>
        {loading ? "创建中…" : "创建"}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 10px", border: "1px solid #e7e5e4", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", boxSizing: "border-box", fontFamily: "inherit" };

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
  const [addRefreshKey, setAddRefreshKey] = useState(0);
  const [editRow, setEditRow] = useState<any>(null);
  const [deleteRow, setDeleteRow] = useState<any>(null);

  // Workflow UI state
  const [versionModalId, setVersionModalId] = useState<number | null>(null);
  const [versionList, setVersionList] = useState<any[]>([]);
  const [versionLoading, setVersionLoading] = useState(false);
  const [scheduleModalId, setScheduleModalId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);

  function refresh() { router.refresh(); }

  async function handleUpdate(id: number, data: Record<string, unknown>) {
    const r = await updateProduct(id, data);
    if (!r.error) { setEditRow(null); refresh(); }
    return r;
  }

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
    setVersionLoading(false);
  }

  async function handleRollback(id: number, version: number) {
    if (!confirm(`确定要回滚到版本 ${version} 吗？`)) return;
    setVersionLoading(true);
    const r = await rollbackProduct(id, version);
    setVersionLoading(false);
    if ('error' in r && r.error) toast({ message: r.error, type: "error" });
    else { toast({ message: `已回滚到版本 ${version}`, type: "success" }); setVersionModalId(null); refresh(); }
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
        addModalContent={<AddProductForm key={addRefreshKey} onSuccess={() => setAddRefreshKey((k) => k + 1)} />}
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

      {/* Edit Modal */}
      {editRow && (
        <CrudModal mode="edit" title="编辑产品" fields={PRODUCT_FIELDS}
          initialData={{
            sku: editRow.sku, name: editRow.name, slug: editRow.slug,
            series_id: editRow.series_id ?? "", sale_price: String(editRow.sale_price ?? 0),
            cost_price: String(editRow.cost_price ?? 0), cover_image: editRow.cover_image ?? "",
            stock: String(editRow.stock ?? 0), object_category: editRow.object_category ?? "BRACELET",
            status: editRow.status ?? "DRAFT", story: editRow.story ?? "", theme: editRow.theme ?? "",
          }}
          onSubmit={(data) => handleUpdate(editRow.id, data)}
          onClose={() => setEditRow(null)} />
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
              <button onClick={() => setVersionModalId(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#78716c" }}>×</button>
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
                        <button onClick={() => handleRollback(versionModalId, v.version)}
                          disabled={versionLoading} style={wfBtnStyle("#d97706")}>回滚</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000,
};
const modalContentStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: 24, maxWidth: 600, width: "90%",
  maxHeight: "80vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
};
