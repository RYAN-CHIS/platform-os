"use client";

import { useState } from "react";
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
  DRAFT: "#78716c", PUBLISHED: "#16a34a", SCHEDULED: "#9333ea", ARCHIVED: "#57534e"
};

const POSITION_OPTIONS = [
  { label: "首页", value: "home" },
  { label: "产品页", value: "product" },
  { label: "系列页", value: "series" },
];

const STATUS_OPTIONS = [
  { label: "草稿", value: "DRAFT" },
  { label: "已发布", value: "PUBLISHED" },
  { label: "已归档", value: "ARCHIVED" },
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

      <BrandFormSection title="背景图" description="Banner 背景图片">
        <BrandFormRow>
          <BrandField label="图片">
            <BrandMediaPicker value={form.image_url || ""} onChange={(v) => setForm((p) => ({ ...p, image_url: v }))} />
          </BrandField>
        </BrandFormRow>
      </BrandFormSection>
    </>
  );
}

export default function BrandBannersClient({ initialData }: { initialData: { rows: any[]; total: number; error: string | null } }) {
  const [rows, setRows] = useState(initialData.rows || []);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [msg, setMsg] = useState<{message:string;type:string}|null>(null);

  const [form, setForm] = useState<Record<string, any>>({ title: "", subtitle: "", btn_text: "", image_url: "", link_url: "", position: "home", sort_order: 0, status: "DRAFT" });

  const refresh = async () => {
    setLoading(true);
    const r = await listBanners();
    if (r.error) setMsg({ message: r.error, type: "error" });
    else setRows(r.rows);
    setLoading(false);
  };

  const openCreate = () => {
    setEditRow(null);
    setForm({ title: "", subtitle: "", btn_text: "", image_url: "", link_url: "", position: "home", sort_order: 0, status: "DRAFT" });
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setEditRow(row);
    setForm({
      title: row.title || "", subtitle: row.subtitle || "", btn_text: row.btn_text || "",
      image_url: row.image_url || "", link_url: row.link_url || "",
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
          <p style={{ fontSize: 12, color: "#a8a29e", marginTop: 4 }}>共 {rows.length} 条</p>
        </div>
        <button onClick={openCreate} style={{ height: 36, padding: "0 16px", background: "#292524", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
          + 新增 Banner
        </button>
      </div>

      {rows.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 8, padding: 24 }}>
          <div style={{ textAlign: "center", color: "#a8a29e", padding: 40 }}>暂无 Banner</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {rows.map((row: any) => (
            <div key={row.id} style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 8, padding: 16, display: "flex", gap: 16, alignItems: "center" }}>
              {row.image_url && <img src={row.image_url} alt={row.title} style={{ width: 120, height: 60, objectFit: "cover", borderRadius: 4 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{row.title}</div>
                <div style={{ fontSize: 12, color: "#a8a29e" }}>{row.position} · 排序: {row.sort_order}</div>
              </div>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: STATUS_COLORS[row.status] || "#e7e5e4", color: row.status === "DRAFT" ? "#57534e" : "#fff" }}>{row.status}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => handleMove(row.id, "up")} style={miniBtn}>↑</button>
                <button onClick={() => handleMove(row.id, "down")} style={miniBtn}>↓</button>
                <button onClick={() => openEdit(row)} style={miniBtn}>编辑</button>
                {row.status === "DRAFT" && <button onClick={async () => { await publishBanner(row.id); refresh(); }} style={{ ...miniBtn, color: "#16a34a", borderColor: "#16a34a" }}>发布</button>}
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
