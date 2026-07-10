"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { listBanners, createBanner, updateBanner, deleteBanner, moveBanner, publishBanner, unpublishBanner } from "@/modules/brand/banners/actions";
import {
  BrandFormModal,
  BrandFormSection,
  BrandFormRow,
  BrandField,
  BrandInput,
  BrandSelect,
  BrandNumberInput,
  BrandMediaPicker,
  BrandFormFooter,
} from "@/components/brand";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#78716c",
  IN_REVIEW: "#2563eb",
  PENDING_REVIEW: "#2563eb",
  APPROVED: "#0891b2",
  SCHEDULED: "#9333ea",
  PUBLISHED: "#16a34a",
  ARCHIVED: "#57534e",
  REJECTED: "#dc2626",
};

const POSITION_OPTIONS = [
  { label: "首页", value: "home" },
  { label: "产品页", value: "product" },
  { label: "系列页", value: "series" },
];

// 覆盖系统全部状态，确保任何现有 Banner 状态都能正确显示与编辑
const STATUS_OPTIONS = [
  { label: "草稿", value: "DRAFT" },
  { label: "待审核", value: "IN_REVIEW" },
  { label: "已通过", value: "APPROVED" },
  { label: "已排期", value: "SCHEDULED" },
  { label: "已发布", value: "PUBLISHED" },
  { label: "已归档", value: "ARCHIVED" },
  { label: "已驳回", value: "REJECTED" },
];

function BannerFormContent({ form, setForm }: {
  form: Record<string, any>;
  setForm: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
}) {
  return (
    <>
      <BrandFormSection title="基础信息" description="Banner 标题与文案">
        <BrandField label="标题">
          <BrandInput value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Banner 标题" />
        </BrandField>
        <BrandField label="副标题">
          <BrandInput value={form.subtitle || ""} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} placeholder="副标题文案（可选）" />
        </BrandField>
        <BrandField label="按钮文案">
          <BrandInput value={form.btn_text || ""} onChange={(e) => setForm((p) => ({ ...p, btn_text: e.target.value }))} placeholder="按钮文字" />
        </BrandField>
        <BrandField label="链接 URL">
          <BrandInput value={form.link_url || ""} onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))} placeholder="https://..." />
        </BrandField>
        <BrandField label="位置">
          <BrandSelect value={form.position} onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))} options={POSITION_OPTIONS} />
        </BrandField>
        <BrandField label="排序">
          <BrandNumberInput value={String(form.sort_order ?? 0)} onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
        </BrandField>
        <BrandField label="状态">
          <BrandSelect value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} options={STATUS_OPTIONS} />
        </BrandField>
      </BrandFormSection>

      <BrandFormSection title="背景图" description="桌面端 / 移动端图片（移动端缺省时回退桌面端）">
        <BrandFormRow>
          <BrandField label="桌面端图片">
            <BrandMediaPicker value={form.image_url || ""} onChange={(v) => setForm((p) => ({ ...p, image_url: v }))} />
          </BrandField>
          <BrandField label="移动端图片（可选）">
            <BrandMediaPicker value={form.mobile_image_url || ""} onChange={(v) => setForm((p) => ({ ...p, mobile_image_url: v }))} />
          </BrandField>
        </BrandFormRow>
      </BrandFormSection>
    </>
  );
}

export default function BrandBannersClient({ initialData }: { initialData: { rows: any[]; total: number; error: string | null } }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialData.rows || []);
  // 计数必须来自真实查询结果，而非客户端 state 长度
  const [total, setTotal] = useState<number>(initialData.total ?? (initialData.rows || []).length);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [msg, setMsg] = useState<{message:string;type:string}|null>(null);
  // 查询失败必须明确展示，绝不静默显示空列表
  const [queryError, setQueryError] = useState<string | null>(initialData.error || null);

  // 筛选状态：默认“全部”，不遗漏任何状态的 Banner（含 PUBLISHED）
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [positionFilter, setPositionFilter] = useState<string>("");

  const [form, setForm] = useState<Record<string, any>>({ title: "", subtitle: "", btn_text: "", image_url: "", mobile_image_url: "", link_url: "", position: "home", sort_order: 0, status: "DRAFT" });

  const load = async (params?: { status?: string; position?: string }) => {
    setLoading(true);
    const r = await listBanners(params);
    if (r.error) {
      setQueryError(r.error);
      setMsg({ message: `加载失败：${r.error}`, type: "error" });
    } else {
      setQueryError(null);
      setRows(r.rows);
      setTotal(r.total);
    }
    setLoading(false);
    // 同步服务端缓存，确保硬刷新后数据依然存在
    router.refresh();
  };

  const refresh = () => load({ status: statusFilter || undefined, position: positionFilter || undefined });
  const onStatusFilter = (v: string) => { setStatusFilter(v); load({ status: v || undefined, position: positionFilter || undefined }); };
  const onPositionFilter = (v: string) => { setPositionFilter(v); load({ status: statusFilter || undefined, position: v || undefined }); };

  const openCreate = () => {
    setEditRow(null);
    setForm({ title: "", subtitle: "", btn_text: "", image_url: "", mobile_image_url: "", link_url: "", position: "home", sort_order: 0, status: "DRAFT" });
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setEditRow(row);
    setForm({
      title: row.title || "", subtitle: row.subtitle || "", btn_text: row.btn_text || "",
      image_url: row.image_url || "", mobile_image_url: row.mobile_image_url || "", link_url: row.link_url || "",
      position: row.position || "home", sort_order: row.sort_order || 0, status: row.status || "DRAFT",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    const r = editRow ? await updateBanner(editRow.id, form) : await createBanner(form);
    setLoading(false);
    if (r.error) { setMsg({ message: r.error, type: "error" }); return; }
    setModalOpen(false);
    refresh();
    setMsg({ message: editRow ? "已更新" : "已创建", type: "success" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除？")) return;
    setLoading(true);
    const r = await deleteBanner(id);
    setLoading(false);
    if (r.error) setMsg({ message: r.error, type: "error" });
    else { setMsg({ message: "已删除", type: "success" }); refresh(); }
  };

  const handleMove = async (id: number, dir: "up"|"down") => {
    const r = await moveBanner(id, dir);
    if (r.error) setMsg({ message: r.error, type: "error" });
    else refresh();
  };

  return (
    <div>
      {msg && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 100, padding: "8px 16px", borderRadius: 8,
          background: msg.type === "error" ? "#fee2e2" : "#dcfce7", cursor: "pointer" }}
          onClick={() => setMsg(null)}>
          {msg.message}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 300, letterSpacing: "0.1em", color: "#1c1917", margin: 0 }}>Banner 管理</h1>
          <p style={{ fontSize: 12, color: "#a8a29e", marginTop: 4 }}>共 {total} 条</p>
        </div>
        <button onClick={openCreate} style={{ height: 36, padding: "0 16px", background: "#292524", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
          + 新增 Banner
        </button>
      </div>

      {/* 筛选栏：默认“全部”，不遗漏已发布等任何状态 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select value={statusFilter} onChange={(e) => onStatusFilter(e.target.value)} style={filterSel}>
          <option value="">全部状态</option>
          <option value="DRAFT">草稿</option>
          <option value="IN_REVIEW">待审核</option>
          <option value="APPROVED">已通过</option>
          <option value="SCHEDULED">已排期</option>
          <option value="PUBLISHED">已发布</option>
          <option value="ARCHIVED">已归档</option>
          <option value="REJECTED">已驳回</option>
        </select>
        <select value={positionFilter} onChange={(e) => onPositionFilter(e.target.value)} style={filterSel}>
          <option value="">全部位置</option>
          <option value="home">首页</option>
          <option value="product">产品页</option>
          <option value="series">系列页</option>
        </select>
        {(statusFilter || positionFilter) && (
          <button onClick={() => { setStatusFilter(""); setPositionFilter(""); load(); }} style={{ ...miniBtn }}>重置筛选</button>
        )}
        {loading && <span style={{ fontSize: 12, color: "#a8a29e" }}>加载中…</span>}
      </div>

      {queryError && rows.length === 0 ? (
        // 加载失败：明确报错，不静默空列表
        <div style={{ background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 8, padding: 24 }}>
          <div style={{ color: "#c2410c", fontWeight: 500 }}>Banner 数据加载失败</div>
          <div style={{ fontSize: 12, color: "#9a3412", marginTop: 6, wordBreak: "break-all" }}>{queryError}</div>
          <button onClick={refresh} style={{ marginTop: 12, height: 32, padding: "0 14px", background: "#292524", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>重试</button>
        </div>
      ) : rows.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 8, padding: 24 }}>
          <div style={{ textAlign: "center", color: "#a8a29e", padding: 40 }}>暂无 Banner</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {rows.map((row: any) => (
            <div key={row.id} style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 8, padding: 16, display: "flex", gap: 16, alignItems: "center" }}>
              {(row.image_url || row.mobile_image_url) && <img src={row.image_url || row.mobile_image_url} alt={row.title} style={{ width: 120, height: 60, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{row.title}{row.subtitle ? <span style={{ fontWeight: 400, color: "#78716c" }}> · {row.subtitle}</span> : ""}</div>
                <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 2 }}>
                  {row.position} · 排序 {row.sort_order}
                  {row.link_url ? ` · 链接 ${row.link_url}` : ""}
                  {row.btn_text ? ` · CTA ${row.btn_text}` : ""}
                </div>
                <div style={{ fontSize: 12, color: "#a8a29e", marginTop: 2 }}>
                  生效 {row.start_at ? new Date(row.start_at).toLocaleString("zh-CN") : "—"}
                  {" / "}
                  失效 {row.end_at ? new Date(row.end_at).toLocaleString("zh-CN") : "—"}
                  {" · "}{row.mobile_image_url ? "移动图✓" : "移动图✗"}
                </div>
              </div>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: STATUS_COLORS[row.status] || "#e7e5e4", color: row.status === "DRAFT" ? "#57534e" : "#fff" }}>{row.status}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => handleMove(row.id, "up")} style={miniBtn}>↑</button>
                <button onClick={() => handleMove(row.id, "down")} style={miniBtn}>↓</button>
                <button onClick={() => openEdit(row)} style={miniBtn}>编辑</button>
                {(row.status === "DRAFT" || row.status === "APPROVED" || row.status === "SCHEDULED") && <button onClick={async () => { await publishBanner(row.id); refresh(); }} style={{ ...miniBtn, color: "#16a34a", borderColor: "#16a34a" }}>发布</button>}
                {row.status === "PUBLISHED" && <button onClick={async () => { await unpublishBanner(row.id); refresh(); }} style={{ ...miniBtn, color: "#d97706", borderColor: "#d97706" }}>下架</button>}
                <button onClick={() => handleDelete(row.id)} style={{ ...miniBtn, color: "#ef4444", borderColor: "#ef4444" }}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unified Modal */}
      <BrandFormModal open={modalOpen} title={editRow ? "编辑 Banner" : "新增 Banner"} onClose={() => setModalOpen(false)} width={960}
        footer={<BrandFormFooter onCancel={() => setModalOpen(false)} onSave={handleSave} saving={loading} saveLabel={editRow ? "保存" : "创建"} />}
      >
        <BannerFormContent form={form} setForm={setForm} />
      </BrandFormModal>
    </div>
  );
}

const miniBtn: React.CSSProperties = {
  padding: "4px 8px", border: "1px solid #e7e5e4", borderRadius: 4,
  background: "#fff", cursor: "pointer", fontSize: 12, fontFamily: "inherit",
};

const filterSel: React.CSSProperties = {
  height: 34, padding: "0 10px", border: "1px solid #e7e5e4", borderRadius: 6,
  background: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#1c1917",
};
