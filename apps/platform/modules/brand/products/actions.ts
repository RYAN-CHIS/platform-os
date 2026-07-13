"use server";
/**
 * Brand Products — ordinary CRUD uses the canonical Brand Runtime client.
 * Workflow transitions remain exclusively owned by the publisher engine.
 */
import { prisma as erpDb } from "@yunwu/db";
import { Prisma } from "@prisma/client";
import { brandDb, ObjectCategory, type LegacyBrandProduct } from "@/lib/brand-db";
import { createCrudAudit, createAuditLog } from "@/lib/audit";
import {
  transitionStatus,
  publisherCommandFromLegacyStatus,
  submitForReview,
  approveContent,
  rejectContent,
  publishNow,
  schedulePublish,
  unpublishContent,
  archiveContent,
  getVersions,
  rollbackToVersion,
  generatePreviewToken,
  getContentStatus,
} from "@/lib/publisher";

const TABLE = "products";
const ERP_PRODUCT_TABLE = "products";
const ERP_PRODUCT_SKU_TABLE = "product_skus";

const PRODUCT_CREATE_FIELDS = [
  "sku", "name", "slug", "series_id", "seriesId", "sale_price", "salePrice",
  "cost_price", "costPrice", "cover_image", "coverImage", "gallery", "stock",
  "object_category", "objectCategory", "story", "theme", "erp_product_id", "erpProductId",
] as const;

const PRODUCT_UPDATE_FIELDS = [
  ...PRODUCT_CREATE_FIELDS,
  "materials", "inspiration", "keywords", "life_stage", "lifeStage", "suitable_for",
  "suitableFor", "sort_order", "sortOrder",
] as const;

const WORKFLOW_FIELDS = ["status", "publish_status", "publishStatus"] as const;

const OBJECT_CATEGORY_ALIASES: Record<string, ObjectCategory> = {
  BRACELET: ObjectCategory.BRACELET,
  "串珠": ObjectCategory.BRACELET,
  "珠串": ObjectCategory.BRACELET,
  "手串": ObjectCategory.BRACELET,
  INCENSE: ObjectCategory.INCENSE,
  "香": ObjectCategory.INCENSE,
  "香器": ObjectCategory.INCENSE,
  SEAL: ObjectCategory.SEAL,
  "印": ObjectCategory.SEAL,
  "印章": ObjectCategory.SEAL,
  CERAMIC: ObjectCategory.CERAMIC,
  PORCELAIN: ObjectCategory.CERAMIC,
  "瓷": ObjectCategory.CERAMIC,
  "瓷器": ObjectCategory.CERAMIC,
  "陶瓷": ObjectCategory.CERAMIC,
  ENAMEL: ObjectCategory.ENAMEL,
  "珐琅": ObjectCategory.ENAMEL,
  SCHOLAR: ObjectCategory.SCHOLAR,
  "文房": ObjectCategory.SCHOLAR,
  "文房器": ObjectCategory.SCHOLAR,
};

type ProductRow = LegacyBrandProduct & {
  series_id: number;
  sale_price: number;
  cost_price: number;
  cover_image: string;
  object_category: ObjectCategory;
  erp_product_id: number | null;
  sort_order: number;
  life_stage: string | null;
  suitable_for: string | null;
  published_at: Date | null;
  coverImage: string;
  galleryImages: string[];
  gallery_images: string[];
};

type ProductWriteData = {
  sku?: string;
  name?: string;
  slug?: string;
  seriesId?: number;
  salePrice?: number;
  costPrice?: number;
  coverImage?: string;
  gallery?: string;
  stock?: number;
  objectCategory?: ObjectCategory;
  story?: string;
  theme?: string;
  erpProductId?: number | null;
  materials?: string;
  inspiration?: string | null;
  keywords?: string | null;
  lifeStage?: string | null;
  suitableFor?: string | null;
  sortOrder?: number;
};
type ProductStringField = "sku" | "name" | "slug" | "coverImage" | "story" | "theme" | "materials";
type ProductNullableStringField = "inspiration" | "keywords" | "lifeStage" | "suitableFor";

type ErpProduct = { id: number; code: string; name: string; status: string };
type ErpSku = { id: number; code: string; name: string; price: number; finished_stock: number };
type ErpProductSelectRow = ErpProduct & { skuCode: string | null; skuPrice: number | null; skuStock: number | null };

function hasOwn(data: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(data, key);
}

function inputValue(data: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (hasOwn(data, key)) return data[key];
  }
  return undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "未知错误";
}

function toPositiveIntegerId(value: unknown, label = "产品 ID") {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) throw new Error(`${label}必须是有效的数字 ID`);
  return numberValue;
}

function toNullableInteger(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") return null;
  return toPositiveIntegerId(value, label);
}

function toInteger(value: unknown, defaultValue: number, label: string) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numberValue)) throw new Error(`${label}必须是整数`);
  return numberValue;
}

function toNumber(value: unknown, defaultValue: number, label: string) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) throw new Error(`${label}必须是数字`);
  return numberValue;
}

function toStringValue(value: unknown, defaultValue = "") {
  if (value === undefined || value === null) return defaultValue;
  return String(value);
}

function toNullableString(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return String(value);
}

function normalizeGallery(value: unknown) {
  if (value === undefined || value === null || value === "") return "[]";
  if (Array.isArray(value)) return JSON.stringify(value.map((item) => String(item).trim()).filter(Boolean));
  const raw = String(value).trim();
  if (!raw) return "[]";
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return JSON.stringify(parsed.map((item) => String(item).trim()).filter(Boolean));
  } catch {}
  return JSON.stringify(raw.split("\n").map((item) => item.trim()).filter(Boolean));
}

function parseGallery(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {}
  return [];
}

function normalizeObjectCategory(value: unknown) {
  const raw = toStringValue(value, "BRACELET").trim();
  const category = OBJECT_CATEGORY_ALIASES[raw] ?? OBJECT_CATEGORY_ALIASES[raw.toUpperCase()];
  if (!category) throw new Error(`器物分类必须是允许值：${Object.values(ObjectCategory).join(" / ")}`);
  return category;
}

function assertProductInput(data: Record<string, unknown>, mode: "create" | "update") {
  const allowed = new Set(mode === "create" ? PRODUCT_CREATE_FIELDS : PRODUCT_UPDATE_FIELDS);
  for (const key of Object.keys(data)) {
    if (WORKFLOW_FIELDS.includes(key as (typeof WORKFLOW_FIELDS)[number])) {
      if (mode === "create" && key === "status" && String(data[key]).toUpperCase() === "DRAFT") continue;
      throw new Error(`Unauthorized workflow field: ${key}`);
    }
    if (!allowed.has(key as (typeof PRODUCT_UPDATE_FIELDS)[number])) throw new Error(`Invalid Product update field: ${key}`);
  }
}

function normalizeProductData(data: Record<string, unknown>, mode: "create" | "update"): ProductWriteData {
  assertProductInput(data, mode);
  const normalized: ProductWriteData = {};
  const setString = (key: ProductStringField, ...aliases: string[]) => {
    const value = inputValue(data, ...aliases);
    if (value !== undefined) normalized[key] = toStringValue(value);
  };
  const setNullableString = (key: ProductNullableStringField, ...aliases: string[]) => {
    const value = inputValue(data, ...aliases);
    const normalizedValue = toNullableString(value);
    if (normalizedValue !== undefined) normalized[key] = normalizedValue;
  };

  setString("sku", "sku");
  setString("name", "name");
  setString("slug", "slug");
  const seriesValue = inputValue(data, "series_id", "seriesId");
  if (seriesValue !== undefined) {
    const seriesId = toNullableInteger(seriesValue, "所属系列");
    if (seriesId === null) throw new Error("所属系列不能为空");
    normalized.seriesId = seriesId;
  }
  const salePrice = inputValue(data, "sale_price", "salePrice");
  if (salePrice !== undefined) normalized.salePrice = toNumber(salePrice, 0, "售价");
  const costPrice = inputValue(data, "cost_price", "costPrice");
  if (costPrice !== undefined) normalized.costPrice = toNumber(costPrice, 0, "成本价");
  setString("coverImage", "cover_image", "coverImage");
  const gallery = inputValue(data, "gallery");
  if (gallery !== undefined) normalized.gallery = normalizeGallery(gallery);
  const stock = inputValue(data, "stock");
  if (stock !== undefined) normalized.stock = toInteger(stock, 0, "库存");
  const category = inputValue(data, "object_category", "objectCategory");
  if (category !== undefined) normalized.objectCategory = normalizeObjectCategory(category);
  setString("story", "story");
  setString("theme", "theme");
  const erpProductId = inputValue(data, "erp_product_id", "erpProductId");
  if (erpProductId !== undefined) normalized.erpProductId = toNullableInteger(erpProductId, "ERP 产品");
  setString("materials", "materials");
  setNullableString("inspiration", "inspiration");
  setNullableString("keywords", "keywords");
  setNullableString("lifeStage", "life_stage", "lifeStage");
  setNullableString("suitableFor", "suitable_for", "suitableFor");
  const sortOrder = inputValue(data, "sort_order", "sortOrder");
  if (sortOrder !== undefined) normalized.sortOrder = toInteger(sortOrder, 0, "排序");

  if (mode === "create") {
    if (!normalized.sku?.trim()) throw new Error("sku不能为空");
    if (!normalized.name?.trim()) throw new Error("name不能为空");
    if (!normalized.slug?.trim()) throw new Error("slug不能为空");
    if (!normalized.seriesId) throw new Error("所属系列不能为空");
    return {
      salePrice: 0,
      costPrice: 0,
      coverImage: "",
      gallery: "[]",
      stock: 0,
      objectCategory: ObjectCategory.BRACELET,
      story: "",
      theme: "",
      ...normalized,
    };
  }

  if (Object.keys(normalized).length === 0) throw new Error("No editable Product fields provided");
  return normalized;
}

function toProductRow(product: LegacyBrandProduct): ProductRow {
  const galleryImages = parseGallery(product.gallery);
  return {
    ...product,
    series_id: product.seriesId,
    sale_price: product.salePrice,
    cost_price: product.costPrice,
    cover_image: product.coverImage,
    object_category: product.objectCategory,
    erp_product_id: product.erpProductId,
    sort_order: product.sortOrder,
    life_stage: product.lifeStage,
    suitable_for: product.suitableFor,
    published_at: product.publishedAt,
    coverImage: product.coverImage,
    galleryImages,
    gallery_images: galleryImages,
  };
}

function productAuditRecord(product: LegacyBrandProduct | null): Record<string, unknown> | null {
  if (!product) return null;
  return {
    id: product.id, sku: product.sku, name: product.name, slug: product.slug, seriesId: product.seriesId,
    salePrice: product.salePrice, costPrice: product.costPrice, stock: product.stock, status: product.status,
    publishStatus: product.publishStatus, updatedAt: product.updatedAt,
  };
}

async function syncProductMediaReferences(productId: number, coverImage: string, galleryImages: string[]) {
  const orderedUrls = [coverImage, ...galleryImages].map((url) => url.trim()).filter(Boolean);
  const urls = Array.from(new Set(orderedUrls));
  if (!urls.length) {
    await erpDb.$executeRaw`
      DELETE FROM media_references
      WHERE entity_type = 'product'
        AND entity_id = ${productId}::integer
        AND field_name IN ('cover_image', 'gallery_images')
    `;
    return;
  }

  const assets = await erpDb.$queryRaw<Array<{ id: number; url: string }>>(Prisma.sql`
    SELECT id, url FROM media_assets WHERE url IN (${Prisma.join(urls)})
  `);
  const assetByUrl = new Map(assets.map((asset) => [asset.url, asset.id]));
  await erpDb.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM media_references
      WHERE entity_type = 'product'
        AND entity_id = ${productId}::integer
        AND field_name IN ('cover_image', 'gallery_images')
    `;
    const coverMediaId = coverImage ? assetByUrl.get(coverImage) : undefined;
    if (coverMediaId) {
      await tx.$executeRaw`
        INSERT INTO media_references (media_id, entity_type, entity_id, field_name, sort_order)
        VALUES (${coverMediaId}::integer, 'product', ${productId}::integer, 'cover_image', 0)
        ON CONFLICT (media_id, entity_type, entity_id, field_name)
        DO UPDATE SET sort_order = EXCLUDED.sort_order
      `;
    }
    for (const [index, url] of galleryImages.entries()) {
      const mediaId = assetByUrl.get(url);
      if (!mediaId) continue;
      await tx.$executeRaw`
        INSERT INTO media_references (media_id, entity_type, entity_id, field_name, sort_order)
        VALUES (${mediaId}::integer, 'product', ${productId}::integer, 'gallery_images', ${index}::integer)
        ON CONFLICT (media_id, entity_type, entity_id, field_name)
        DO UPDATE SET sort_order = EXCLUDED.sort_order
      `;
    }
  });
}

async function syncProductMediaReferencesBestEffort(product: LegacyBrandProduct) {
  try {
    await syncProductMediaReferences(product.id, product.coverImage, parseGallery(product.gallery));
  } catch (error) {
    console.warn(`[brand-products] media reference sync skipped: ${errorMessage(error)}`);
  }
}

async function fetchLinkedErpProduct(erpProductId: number) {
  const products = await erpDb.$queryRawUnsafe<ErpProduct[]>(
    `SELECT id, code, name, status FROM ${ERP_PRODUCT_TABLE} WHERE id = $1`, erpProductId,
  );
  return products[0] ?? null;
}

async function fetchPrimaryErpSku(erpProductId: number) {
  const skus = await erpDb.$queryRawUnsafe<ErpSku[]>(
    `SELECT id, code, name, price, finished_stock FROM ${ERP_PRODUCT_SKU_TABLE} WHERE product_id = $1 ORDER BY id ASC LIMIT 1`, erpProductId,
  );
  return skus[0] ?? null;
}

async function refreshLinkedErpFields(row: ProductWriteData): Promise<ProductWriteData> {
  if (!row.erpProductId) return row;
  const [erpProduct, erpSku] = await Promise.all([
    fetchLinkedErpProduct(row.erpProductId), fetchPrimaryErpSku(row.erpProductId),
  ]);
  if (!erpProduct || !erpSku) throw new Error("已关联 ERP 产品，但无法读取主产品或默认 SKU");
  return {
    ...row,
    name: erpProduct.name ?? row.name,
    costPrice: Number(erpSku.price ?? 0),
    salePrice: Number(erpSku.price ?? 0),
    stock: Number(erpSku.finished_stock ?? 0),
  };
}

export async function getBrandStats() {
  try {
    const [productCount, seriesCount, journalCount] = await Promise.all([
      brandDb.legacyBrandProduct.count(), brandDb.legacyBrandSeries.count(), brandDb.journalPost.count(),
    ]);
    return { productCount, seriesCount, journalCount, mediaCount: 0 };
  } catch {
    return { productCount: 0, seriesCount: 0, journalCount: 0, mediaCount: 0 };
  }
}

export async function listProducts(search?: string) {
  try {
    const products = await brandDb.legacyBrandProduct.findMany({
      where: search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }] } : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], take: 200,
    });
    return { rows: products.map(toProductRow), error: null };
  } catch (error) {
    return { rows: [] as ProductRow[], error: errorMessage(error) };
  }
}

/** Fetch ERP products with SKU summary for the Brand product dropdown selector. */
export async function listErpProductsForSelect() {
  try {
    const products = await erpDb.$queryRaw<ErpProductSelectRow[]>(Prisma.sql`
      SELECT p.id, p.code, p.name, p.status, s.code AS "skuCode", s.price AS "skuPrice", s.finished_stock AS "skuStock"
      FROM products p
      LEFT JOIN LATERAL (
        SELECT code, price, finished_stock FROM product_skus WHERE product_id = p.id ORDER BY id ASC LIMIT 1
      ) s ON true
      WHERE p.status != 'ARCHIVED'
      ORDER BY p.code ASC
    `);
    return { products, error: null };
  } catch (error) {
    return { products: [] as ErpProductSelectRow[], error: errorMessage(error) };
  }
}

export async function createProduct(data: Record<string, unknown>) {
  try {
    const normalized = normalizeProductData(data, "create");
    const linked = await refreshLinkedErpFields(normalized);
    const drift = {
      sale_price: normalized.salePrice !== linked.salePrice ? { before: normalized.salePrice, after: linked.salePrice } : null,
      stock: normalized.stock !== linked.stock ? { before: normalized.stock, after: linked.stock } : null,
    };
    const product = await brandDb.legacyBrandProduct.create({
      data: {
        sku: linked.sku!, name: linked.name!, slug: linked.slug!, seriesId: linked.seriesId!,
        salePrice: linked.salePrice!, costPrice: linked.costPrice!, coverImage: linked.coverImage!,
        gallery: linked.gallery!, stock: linked.stock!, objectCategory: linked.objectCategory!,
        story: linked.story!, theme: linked.theme!, erpProductId: linked.erpProductId ?? null,
      },
    });
    await syncProductMediaReferencesBestEffort(product);
    try { await createCrudAudit({ action: "CREATE", system: "BRAND", module: "products", targetId: product.id, after: productAuditRecord(product) }); } catch {}
    return { row: toProductRow(product), drift, error: null };
  } catch (error) {
    return { row: null, error: errorMessage(error) };
  }
}

export async function updateProduct(id: number | string, data: Record<string, unknown>) {
  try {
    const productId = toPositiveIntegerId(id);
    const before = await brandDb.legacyBrandProduct.findUnique({ where: { id: productId } });
    if (!before) return { error: "Product not found" };
    const normalized = normalizeProductData(data, "update");
    const linked = await refreshLinkedErpFields({
      ...normalized,
      name: normalized.name ?? before.name,
      erpProductId: normalized.erpProductId === undefined ? before.erpProductId : normalized.erpProductId,
    });
    const drift = {
      sale_price: (normalized.salePrice ?? before.salePrice) !== linked.salePrice ? { before: normalized.salePrice ?? before.salePrice, after: linked.salePrice } : null,
      stock: (normalized.stock ?? before.stock) !== linked.stock ? { before: normalized.stock ?? before.stock, after: linked.stock } : null,
    };
    const after = await brandDb.legacyBrandProduct.update({
      where: { id: productId },
      data: {
        ...normalized,
        ...(linked.erpProductId ? {
          name: linked.name, costPrice: linked.costPrice, salePrice: linked.salePrice, stock: linked.stock,
        } : {}),
      },
    });
    const refreshed = await refreshLinkedErpFields({
      name: after.name, erpProductId: after.erpProductId, salePrice: after.salePrice, costPrice: after.costPrice, stock: after.stock,
    });
    const finalProduct = refreshed.erpProductId && (refreshed.salePrice !== after.salePrice || refreshed.stock !== after.stock)
      ? await brandDb.legacyBrandProduct.update({ where: { id: productId }, data: { salePrice: refreshed.salePrice, stock: refreshed.stock } })
      : after;
    await syncProductMediaReferencesBestEffort(finalProduct);
    try { await createCrudAudit({ action: "UPDATE", system: "BRAND", module: "products", targetId: productId, before: productAuditRecord(before), after: productAuditRecord(finalProduct) }); } catch {}
    return { drift, error: null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function deleteProduct(id: number | string) {
  try {
    const productId = toPositiveIntegerId(id);
    const before = await brandDb.legacyBrandProduct.findUnique({ where: { id: productId } });
    if (!before) return { error: null };
    await brandDb.legacyBrandProduct.delete({ where: { id: productId } });
    try { await createCrudAudit({ action: "DELETE", system: "BRAND", module: "products", targetId: productId, before: productAuditRecord(before) }); } catch {}
    return { error: null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function toggleProductStatus(id: number | string, newStatus: string): Promise<{ row: any; error: string | null }> {
  const productId = toPositiveIntegerId(id);
  const command = await publisherCommandFromLegacyStatus(newStatus);
  if (!command) return { row: null, error: "不支持的发布状态" };
  const result = await transitionStatus("products", productId, command);
  if (!result.success) return { row: null, error: result.error || "状态变更失败" };
  const row = await brandDb.legacyBrandProduct.findUnique({ where: { id: productId } });
  return { row, error: null };
}

export async function moveProduct(id: number | string, direction: "up" | "down") {
  try {
    const productId = toPositiveIntegerId(id);
    const current = await brandDb.legacyBrandProduct.findUnique({ where: { id: productId }, select: { id: true, sortOrder: true } });
    if (!current) return { error: "Product not found" };
    const neighbor = await brandDb.legacyBrandProduct.findFirst({
      where: direction === "up" ? { sortOrder: { lt: current.sortOrder } } : { sortOrder: { gt: current.sortOrder } },
      orderBy: direction === "up" ? [{ sortOrder: "desc" }, { id: "asc" }] : [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, sortOrder: true },
    });
    if (!neighbor) return { error: null };
    const before = { [productId]: current.sortOrder, [neighbor.id]: neighbor.sortOrder };
    await brandDb.legacyBrandProduct.update({ where: { id: productId }, data: { sortOrder: neighbor.sortOrder } });
    await brandDb.legacyBrandProduct.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } });
    const after = { [productId]: neighbor.sortOrder, [neighbor.id]: current.sortOrder };
    try { await createAuditLog({ action: "SORT_CHANGE", system: "BRAND", module: "products", targetId: productId, before, after }); } catch {}
    return { error: null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

// ── Publishing Workflow Actions (bound to contentType="products") ──

export async function submitProductForReview(id: number | string) {
  return submitForReview("products", toPositiveIntegerId(id));
}

export async function approveProduct(id: number | string) {
  return approveContent("products", toPositiveIntegerId(id));
}

export async function rejectProduct(id: number | string, reason?: string) {
  return rejectContent("products", toPositiveIntegerId(id), reason);
}

export async function publishProductNow(id: number | string) {
  return publishNow("products", toPositiveIntegerId(id));
}

export async function scheduleProductPublish(id: number | string, publishAt: string) {
  return schedulePublish("products", toPositiveIntegerId(id), publishAt);
}

export async function unpublishProduct(id: number | string) {
  return unpublishContent("products", toPositiveIntegerId(id));
}

export async function archiveProduct(id: number | string) {
  return archiveContent("products", toPositiveIntegerId(id));
}

export async function getProductVersions(id: number | string) {
  return getVersions("products", toPositiveIntegerId(id));
}

export async function rollbackProduct(id: number | string, version: number, reason: string) {
  return rollbackToVersion("products", toPositiveIntegerId(id), version, reason);
}

export async function getProductPreviewToken(id: number | string) {
  return generatePreviewToken("products", toPositiveIntegerId(id));
}

export async function getProductStatus(id: number | string) {
  return getContentStatus("products", toPositiveIntegerId(id));
}
