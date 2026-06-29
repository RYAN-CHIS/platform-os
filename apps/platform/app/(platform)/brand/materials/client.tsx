"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionBar } from "@/components/ActionBar";
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
  createBrandMaterial,
  updateBrandMaterial,
  deleteBrandMaterial,
  toggleMaterialStatus,
  getErpMaterialsForSelect,
  type BrandMaterialRow,
} from "@/modules/brand/materials/actions";

const CATEGORY_OPTIONS = [
  { label: "天然水晶", value: "天然水晶" },
  { label: "宝玉石", value: "宝玉石" },
  { label: "金属", value: "金属" },
  { label: "陶瓷", value: "陶瓷" },
  { label: "皮革", value: "皮革" },
  { label: "绳线", value: "绳线" },
  { label: "香材", value: "香材" },
  { label: "包材", value: "包材" },
  { label: "其他", value: "其他" },
];

const STATUS_OPTIONS = [
  { label: "草稿", value: "DRAFT" },
  { label: "已发布", value: "PUBLISHED" },
  { label: "已归档", value: "ARCHIVED" },
];

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT: { bg: "#f5f5f4", color: "#78716c", label: "草稿" },
  PUBLISHED: { bg: "#dcfce7", color: "#16a34a", label: "已发布" },
  ARCHIVED: { bg: "#fef2f2", color: "#dc2626", label: "已归档" },
};

function MaterialFormContent({ form, setField, errors, erpMaterials, erpMaterialsLoading }: {
  form: Record<string, any>;
  setField: (k: string, v: any) => void;
  errors: Record<string, string>;
  erpMaterials: { label: string; value: string }[];
  erpMaterialsLoading: boolean;
}) {
  return (
    <>
      <BrandFormSection title="基础信息" description="材料名称、分类与状态">
        <BrandField label="材料名称" required error={errors.name}>
          <BrandInput value={form.name || ""} onChange={(e) => setField("name", e.target.value)} placeholder="如 天然白水晶" />
        </BrandField>
        <BrandField label="Slug" required error={errors.slug}>
          <BrandInput value={form.slug || ""} onChange={(e) => setField("slug", e.target.value)} placeholder="natural-white-crystal" />
        </BrandField>
        <BrandField label="材料分类">
          <BrandSelect value={form.category || ""} onChange={(e) => setField("category", e.target.value)} options={CATEGORY_OPTIONS} />
        </BrandField>
        <BrandField label="状态">
          <BrandSelect value={form.status || "DRAFT"} onChange={(e) => setField("status", e.target.value)} options={STATUS_OPTIONS} />
        </BrandField>
        <BrandField label="展示排序">
          <BrandNumberInput value={String(form.sortOrder ?? 0)} onChange={(e) => setField("sortOrder", parseInt(e.target.value) || 0)} />
        </BrandField>
        <BrandField label="简短描述">
          <BrandInput value={form.description || ""} onChange={(e) => setField("description", e.target.value)} placeholder="简短描述该材料" />
        </BrandField>
        <BrandField label="关联 ERP 材料">
          <BrandSelect value={String(form.erp_material_id ?? "")} onChange={(e) => setField("erp_material_id", e.target.value)} options={erpMaterials} disabled={erpMaterialsLoading} />
        </BrandField>
        {(!form.erp_material_id || String(form.erp_material_id) === "") && (
          <div style={{ padding: "8px 12px", background: "#fffbeb", borderRadius: 6, fontSize: 12, color: "#92400e", border: "1px solid #fde68a", marginTop: 4 }}>
            ⚠️ 未关联 ERP 材料，库存和成本不会自动同步。
          </div>
        )}
      </BrandFormSection>

      <BrandFormSection title="展示内容" description="材料故事、材质说明与来源">
        <BrandField label="产地 / 来源">
          <BrandInput value={form.origin || ""} onChange={(e) => setField("origin", e.target.value)} placeholder="如 巴西/中国 云南" />
        </BrandField>
        <BrandField label="适用产品">
          <BrandInput value={form.applicableProducts || ""} onChange={(e) => setField("applicableProducts", e.target.value)} placeholder="如 手串 挂件 摆件" />
        </BrandField>
        <BrandFormRow>
          <BrandField label="材质说明">
            <BrandTextarea value={form.features || ""} onChange={(e) => setField("features", e.target.value)} placeholder="材质特性、硬度、颜色等" rows={3} />
          </BrandField>
        </BrandFormRow>
        <BrandFormRow>
          <BrandField label="材料故事">
            <BrandTextarea value={form.story || ""} onChange={(e) => setField("story", e.target.value)} placeholder="材料的文化寓意与品牌故事..." rows={4} />
          </BrandField>
        </BrandFormRow>
      </BrandFormSection>

      <BrandFormSection title="图片媒体" description="封面图与详情图">
        <BrandFormRow>
          <BrandField label="封面图">
            <BrandMediaPicker value={form.coverImage || form.image || ""} onChange={(v) => { setField("coverImage", v); setField("image", v); }} />
          </BrandField>
        </BrandFormRow>
      </BrandFormSection>

      <BrandFormSection title="SEO 信息" description="搜索引擎优化">
        <BrandField label="SEO 标题">
          <BrandInput value={form.seoTitle || ""} onChange={(e) => setField("seoTitle", e.target.value)} placeholder="SEO 标题" />
        </BrandField>
        <BrandField label="SEO 关键词">
          <BrandInput value={form.seoKeywords || ""} onChange={(e) => setField("seoKeywords", e.target.value)} placeholder="关键词1, 关键词2, …" />
        </BrandField>
        <BrandFormRow>
          <BrandField label="SEO 描述">
            <BrandTextarea value={form.seoDescription || ""} onChange={(e) => setField("seoDescription", e.target.value)} placeholder="SEO 描述..." rows={2} />
          </BrandField>
        </BrandFormRow>
      </BrandFormSection>
    </>
  );
}

function MaterialFormModal({ mode, initialData, onClose }: {
  mode: "add" | "edit"; initialData?: Record<string, any>; onClose: () => void;
}) {
  const [form, setForm] = useState<Record<string, any>>(() => ({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    category: initialData?.category ?? "",
    origin: initialData?.origin ?? "",
    description: initialData?.description ?? "",
    shortDesc: initialData?.shortDesc ?? initialData?.short_desc ?? "",
    features: initialData?.features ?? "",
    story: initialData?.story ?? "",
    applicableProducts: initialData?.applicableProducts ?? initialData?.applicable_products ?? "",
    status: initialData?.status ?? "DRAFT",
    sortOrder: initialData?.sortOrder ?? initialData?.sort_order ?? 0,
    image: initialData?.image ?? "",
    coverImage: initialData?.coverImage ?? initialData?.cover_image ?? "",
    seoTitle: initialData?.seoTitle ?? initialData?.seo_title ?? "",
    seoDescription: initialData?.seoDescription ?? initialData?.seo_description ?? "",
    seoKeywords: initialData?.seoKeywords ?? initialData?.seo_keywords ?? "",
    erp_material_id: initialData?.erp_material_id ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [erpMaterials, setErpMaterials] = useState<{ label: string; value: string }[]>([]);
  const [erpMaterialsLoading, setErpMaterialsLoading] = useState(true);
  const router = useRouter();

  // Load ERP materials on mount
  useEffect(() => {
    (async () => {
      setErpMaterialsLoading(true);
      const result = await getErpMaterialsForSelect();
      if (result.materials && result.materials.length > 0) {
        setErpMaterials([
          { label: "（不关联）", value: "" },
          ...result.materials.map((m: any) => ({
            label: `${m.code} - ${m.name}${m.category ? ` (${m.category})` : ""}${m.remaining != null ? ` · 库存:${m.remaining}` : ""}${m.unitCost != null ? ` · ¥${m.unitCost}` : ""}`,
            value: String(m.id),
          })),
        ]);
      } else {
        setErpMaterials([{ label: "暂无 ERP 材料", value: "" }]);
      }
      setErpMaterialsLoading(false);
    })();
  }, []);

  function setField(k: string, v: any) { setForm((p) => ({ ...p, [k]: v })); }

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!form.name?.trim()) newErrors.name = "请输入材料名称";
    if (!form.slug?.trim()) newErrors.slug = "请输入 Slug";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setSaving(true);
    const id = initialData?.id as number | undefined;
    const r = id
      ? await updateBrandMaterial(id, form)
      : await createBrandMaterial(form);
    setSaving(false);
    if (!r.ok) { toast({ message: r.error || "操作失败", type: "error" }); return; }
    toast({ message: id ? "已保存" : "已创建", type: "success" });
    onClose();
    router.refresh();
  };

  return (
    <BrandFormModal open title={mode === "add" ? "新增材料展示" : "编辑材料展示"} onClose={onClose} width={960}
      footer={<BrandFormFooter onCancel={onClose} onSave={handleSave} saving={saving} saveLabel={mode === "add" ? "创建" : "保存"} />}
    >
      <MaterialFormContent form={form} setField={setField} errors={errors} erpMaterials={erpMaterials} erpMaterialsLoading={erpMaterialsLoading} />
    </BrandFormModal>
  );
}

export default function BrandMaterialsClient({ initialData, searchQ }: {
  initialData: BrandMaterialRow[];
  searchQ: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<BrandMaterialRow | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => { setData(initialData); }, [initialData]);

  const handleSearch = (q: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (q) params.set("q", q); else params.delete("q");
    router.replace(`?${params.toString()}`);
  };

  const handleDelete = async (row: BrandMaterialRow) => {
    if (!confirm(`确定删除材料「${row.name}」？`)) return;
    const r = await deleteBrandMaterial(row.id);
    if (r.ok) { setMsg("已删除"); router.refresh(); }
    else toast({ message: r.error || "删除失败", type: "error" });
  };

  const handleToggle = async (id: number, status: string) => {
    const r = await toggleMaterialStatus(id, status);
    if (r.ok) router.refresh();
    else toast({ message: r.error || "操作失败", type: "error" });
  };

  const formatDate = (v: any) => v ? new Date(v).toLocaleDateString("zh-CN") : "—";

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">材料展示管理</h1>
        <span className="text-sm text-stone-500">共 {data.length} 条</span>
      </div>

      {msg && (
        <div className="mb-4 px-3 py-2 bg-stone-50 border border-stone-200 rounded text-sm text-stone-600">
          {msg} <button className="ml-3 text-stone-400 hover:text-stone-600" onClick={() => setMsg("")}>✕</button>
        </div>
      )}

      <ActionBar
        module="brand-materials"
        csvColumns={[
          { key: "name", label: "名称" },
          { key: "category", label: "分类" },
          { key: "origin", label: "产地" },
          { key: "status", label: "状态" },
          { key: "sort_order", label: "排序" },
        ]}
        data={data.map(d => ({ ...d }))}
        searchPlaceholder="搜索材料名称..."
        searchParam="q"
        addLabel="+ 新增材料展示"
        onAdd={() => setShowAdd(true)}
      />

      {data.length === 0 ? (
        <div className="border border-stone-200 rounded-lg bg-white p-12 text-center">
          <div className="text-4xl mb-3">🪨</div>
          <p className="text-stone-600 text-sm mb-1">暂无材料展示内容</p>
          <p className="text-stone-400 text-xs">点击右上角「新增材料展示」创建第一条材料展示</p>
        </div>
      ) : (
        <div className="border border-stone-200 rounded overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-stone-50 text-stone-500">
                <th className="text-left py-2 px-3 w-16">封面</th>
                <th className="text-left py-2 px-3">材料名称</th>
                <th className="text-left py-2 px-3">分类</th>
                <th className="text-left py-2 px-3">排序</th>
                <th className="text-left py-2 px-3">ERP</th>
                <th className="text-left py-2 px-3">状态</th>
                <th className="text-left py-2 px-3">更新时间</th>
                <th className="text-right py-2 px-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const badge = STATUS_BADGE[row.status] || STATUS_BADGE.DRAFT;
                const coverUrl = row.cover_image || row.image;
                return (
                  <tr key={row.id} className="border-b border-stone-100 hover:bg-stone-50/50">
                    <td className="py-2 px-3">
                      {coverUrl ? (
                        <img src={coverUrl} alt={row.name}
                          style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover", border: "1px solid #e7e5e4" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 4, background: "#f5f5f4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#a8a29e" }}>
                          🪨
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 font-medium">{row.name}</td>
                    <td className="py-2 px-3 text-stone-500 text-xs">{row.category || "—"}</td>
                    <td className="py-2 px-3 text-stone-400 text-xs">{row.sort_order}</td>
                    <td className="py-2 px-3 text-xs">
                      {row.erp_material_id ? (
                        <span style={{ color: "#059669", fontWeight: 500 }}>✅ 已关联</span>
                      ) : (
                        <span style={{ color: "#a8a29e" }}>—</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <select value={row.status} onChange={(e) => handleToggle(row.id, e.target.value)}
                        style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, border: "none", background: badge.bg, color: badge.color, cursor: "pointer" }}>
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-3 text-stone-400 text-xs">{formatDate(row.updated_at)}</td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={() => setEditItem(row)} style={actionBtn}>编辑</button>
                      <button onClick={() => handleDelete(row)} style={{ ...actionBtn, color: "#dc2626" }}>删除</button>
                      {row.status === "PUBLISHED" && (
                        <button onClick={() => window.open(`/preview/materials/${row.id}`, "_blank")} style={{ ...actionBtn, color: "#2563eb" }}>预览</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <MaterialFormModal mode="add" onClose={() => setShowAdd(false)} />}
      {editItem && <MaterialFormModal mode="edit" initialData={editItem} onClose={() => setEditItem(null)} />}
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 12, color: "#d97706", marginLeft: 8, textDecoration: "underline",
  fontFamily: "inherit",
};
