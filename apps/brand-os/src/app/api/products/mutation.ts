import type { PublishStatus } from "@/lib/brand-db-adapter";

const DRAFT_STATUS = "draft";
const DRAFT_PUBLISH_STATUS: PublishStatus = "DRAFT";

const WORKFLOW_FIELDS = ["status", "publish_status", "publishStatus"] as const;
const PRODUCT_MUTATION_FIELDS = new Set([
  "sku",
  "name",
  "slug",
  "seriesId",
  "series_id",
  "objectCategory",
  "object_category",
  "theme",
  "story",
  "materials",
  "coverImage",
  "cover_image",
  "gallery",
  "costPrice",
  "cost_price",
  "salePrice",
  "sale_price",
  "stock",
  "erpProductId",
  "erp_product_id",
  "inspiration",
  "keywords",
  "lifeStage",
  "life_stage",
  "suitableFor",
  "suitable_for",
  "sortOrder",
  "sort_order",
] as const);

type ProductMutationMode = "create" | "update";

function hasWorkflowField(data: Record<string, unknown>) {
  return WORKFLOW_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(data, field));
}

function hasUnknownField(data: Record<string, unknown>) {
  return Object.keys(data).some((key) => key !== "id" && !PRODUCT_MUTATION_FIELDS.has(key as any) && key !== "status" && key !== "publish_status" && key !== "publishStatus");
}

function getValue(data: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];
  }
  return undefined;
}

function normalizeGallery(value: unknown): string {
  if (value == null) return "[]";
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => String(item).trim()).filter(Boolean));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "[]";
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return JSON.stringify(parsed.map((item) => String(item).trim()).filter(Boolean));
    } catch {}
    return trimmed;
  }
  return JSON.stringify([String(value).trim()].filter(Boolean));
}

function toNumberOrZero(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const num = Number(value);
  if (!Number.isFinite(num)) throw new Error("数值字段格式不正确");
  return num;
}

export function prepareProductMutationData(data: Record<string, unknown>, mode: ProductMutationMode) {
  if (hasWorkflowField(data)) {
    throw new Error("Product status cannot be set through this endpoint. Use the publishing workflow.");
  }

  if (hasUnknownField(data)) {
    throw new Error("包含不支持的字段");
  }

  const mutation: Record<string, unknown> = {};
  const setString = (target: string, ...keys: string[]) => {
    const value = getValue(data, ...keys);
    if (value !== undefined) mutation[target] = String(value).trim();
  };
  const setNullableString = (target: string, ...keys: string[]) => {
    const value = getValue(data, ...keys);
    if (value !== undefined) mutation[target] = value == null ? null : String(value).trim();
  };

  setString("sku", "sku");
  setString("name", "name");
  setString("slug", "slug");

  const seriesValue = getValue(data, "seriesId", "series_id");
  if (seriesValue !== undefined) {
    const seriesId = Number(seriesValue);
    if (!Number.isInteger(seriesId) || seriesId <= 0) throw new Error("seriesId 必须为正整数");
    mutation.seriesId = seriesId;
  }

  const objectCategory = getValue(data, "objectCategory", "object_category");
  if (objectCategory !== undefined) mutation.objectCategory = String(objectCategory).trim();

  setString("theme", "theme");
  setString("story", "story");
  setString("materials", "materials");
  setNullableString("coverImage", "coverImage", "cover_image");
  const gallery = getValue(data, "gallery");
  if (gallery !== undefined) mutation.gallery = normalizeGallery(gallery);
  const costPrice = getValue(data, "costPrice", "cost_price");
  if (costPrice !== undefined) mutation.costPrice = toNumberOrZero(costPrice);
  const salePrice = getValue(data, "salePrice", "sale_price");
  if (salePrice !== undefined) mutation.salePrice = toNumberOrZero(salePrice);
  const stock = getValue(data, "stock");
  if (stock !== undefined) mutation.stock = toNumberOrZero(stock);
  const erpProductId = getValue(data, "erpProductId", "erp_product_id");
  if (erpProductId !== undefined) {
    const parsed = erpProductId === null || erpProductId === "" ? null : Number(erpProductId);
    if (parsed !== null && (!Number.isInteger(parsed) || parsed <= 0)) throw new Error("erpProductId 必须为正整数");
    mutation.erpProductId = parsed;
  }
  setNullableString("inspiration", "inspiration");
  setNullableString("keywords", "keywords");
  setNullableString("lifeStage", "lifeStage", "life_stage");
  setNullableString("suitableFor", "suitableFor", "suitable_for");
  const sortOrder = getValue(data, "sortOrder", "sort_order");
  if (sortOrder !== undefined) mutation.sortOrder = toNumberOrZero(sortOrder);

  if (mode === "create") {
    if (!mutation.sku) throw new Error("sku不能为空");
    if (!mutation.name) throw new Error("name不能为空");
    if (!mutation.slug) throw new Error("slug不能为空");
    if (!mutation.seriesId) throw new Error("seriesId不能为空");
    return {
      ...mutation,
      objectCategory: mutation.objectCategory || "BRACELET",
      theme: mutation.theme || "",
      story: mutation.story || "",
      materials: mutation.materials || "",
      coverImage: mutation.coverImage || "",
      gallery: mutation.gallery || "[]",
      costPrice: mutation.costPrice ?? 0,
      salePrice: mutation.salePrice ?? 0,
      stock: mutation.stock ?? 0,
      publishStatus: DRAFT_PUBLISH_STATUS,
      status: DRAFT_STATUS,
    };
  }

  if (Object.keys(mutation).length === 0) {
    throw new Error("No editable Product fields provided");
  }

  return mutation;
}
