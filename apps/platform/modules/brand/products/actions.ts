"use server";
/**
 * Brand Products — WO-P12B Full CRUD + Publishing Workflow
 * Queries Brand DB directly (table: products)
 * Status changes are routed through the publisher engine.
 */
import { brandPrisma } from "@yunwu/db/brand";
import { Prisma } from "@prisma/client";
import { createCrudAudit, createStatusAudit, createAuditLog } from "@/lib/audit";
import {
  transitionStatus,
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

type ProductColumn =
  | "sku"
  | "name"
  | "slug"
  | "series_id"
  | "sale_price"
  | "cost_price"
  | "cover_image"
  | "stock"
  | "object_category"
  | "status"
  | "publish_status"
  | "story"
  | "theme"
  | "gallery"
  | "materials"
  | "inspiration"
  | "keywords"
  | "life_stage"
  | "suitable_for"
  | "sort_order"
  | "published_at"
  | "erp_product_id";

const PRODUCT_CREATE_FIELDS: ProductColumn[] = [
  "sku",
  "name",
  "slug",
  "series_id",
  "sale_price",
  "cost_price",
  "cover_image",
  "stock",
  "object_category",
  "status",
  "story",
  "theme",
];

const PRODUCT_UPDATE_FIELDS: ProductColumn[] = [
  ...PRODUCT_CREATE_FIELDS,
  "publish_status",
  "gallery",
  "materials",
  "inspiration",
  "keywords",
  "life_stage",
  "suitable_for",
  "sort_order",
  "published_at",
  "erp_product_id",
];

const PRODUCT_CREATE_DEFAULTS: Partial<Record<ProductColumn, unknown>> = {
  series_id: null,
  sale_price: 0,
  cost_price: 0,
  cover_image: "",
  stock: 0,
  object_category: "BRACELET",
  status: "DRAFT",
  story: "",
  theme: "",
};

type ObjectCategoryValue = "BRACELET" | "INCENSE" | "SEAL" | "CERAMIC" | "ENAMEL" | "SCHOLAR";
type PublishStatusValue = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED";

const OBJECT_CATEGORY_ALIASES: Record<string, ObjectCategoryValue> = {
  BRACELET: "BRACELET",
  "串珠": "BRACELET",
  "珠串": "BRACELET",
  "手串": "BRACELET",
  INCENSE: "INCENSE",
  "香": "INCENSE",
  "香器": "INCENSE",
  SEAL: "SEAL",
  "印": "SEAL",
  "印章": "SEAL",
  CERAMIC: "CERAMIC",
  PORCELAIN: "CERAMIC",
  "瓷": "CERAMIC",
  "瓷器": "CERAMIC",
  "陶瓷": "CERAMIC",
  ENAMEL: "ENAMEL",
  "珐琅": "ENAMEL",
  SCHOLAR: "SCHOLAR",
  "文房": "SCHOLAR",
  "文房器": "SCHOLAR",
};

const PUBLISH_STATUS_ALIASES: Record<string, PublishStatusValue> = {
  DRAFT: "DRAFT",
  IN_REVIEW: "PENDING_REVIEW",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  SCHEDULED: "APPROVED",
  PUBLISHED: "PUBLISHED",
  UNPUBLISHED: "UNPUBLISHED",
  ARCHIVED: "ARCHIVED",
};

const PRODUCT_STATUS_VALUES = new Set([
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "UNPUBLISHED",
  "ARCHIVED",
  "REJECTED",
]);

const COLUMN_INPUT_ALIASES: Partial<Record<ProductColumn, string[]>> = {
  series_id: ["series_id", "seriesId"],
  sale_price: ["sale_price", "salePrice"],
  cost_price: ["cost_price", "costPrice"],
  cover_image: ["cover_image", "coverImage"],
  object_category: ["object_category", "objectCategory"],
  publish_status: ["publish_status", "publishStatus"],
  life_stage: ["life_stage", "lifeStage"],
  suitable_for: ["suitable_for", "suitableFor"],
  sort_order: ["sort_order", "sortOrder"],
  published_at: ["published_at", "publishedAt"],
  erp_product_id: ["erp_product_id", "erpProductId"],
};

const INTEGER_COLUMNS = new Set<ProductColumn>(["series_id", "stock", "sort_order", "erp_product_id"]);
const FLOAT_COLUMNS = new Set<ProductColumn>(["sale_price", "cost_price"]);
const TIMESTAMP_COLUMNS = new Set<string>(["updated_at"]);
const TIMESTAMPTZ_COLUMNS = new Set<string>(["published_at"]);

function normalizeEnumAlias<T extends string>(
  value: unknown,
  aliases: Record<string, T>,
  label: string,
) {
  const raw = toStringValue(value).trim();
  const normalized = aliases[raw] ?? aliases[raw.toUpperCase()];
  if (!normalized) {
    throw new Error(`${label}必须是允许值：${Array.from(new Set(Object.values(aliases))).join(" / ")}`);
  }
  return normalized;
}

function hasOwn(data: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(data, key);
}

function readInput(data: Record<string, unknown>, column: ProductColumn) {
  const aliases = COLUMN_INPUT_ALIASES[column] ?? [column];
  for (const key of aliases) {
    if (hasOwn(data, key)) return data[key];
  }
  return undefined;
}

function toNullableInteger(value: unknown, label: string) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;

  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${label}必须是有效的数字 ID`);
  }
  return numberValue;
}

function toInteger(value: unknown, defaultValue: number, label: string) {
  if (value === undefined || value === null || value === "") return defaultValue;

  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numberValue)) {
    throw new Error(`${label}必须是整数`);
  }
  return numberValue;
}

function toNumber(value: unknown, defaultValue: number, label: string) {
  if (value === undefined || value === null || value === "") return defaultValue;

  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new Error(`${label}必须是数字`);
  }
  return numberValue;
}

function toStringValue(value: unknown, defaultValue = "") {
  if (value === undefined || value === null) return defaultValue;
  return String(value);
}

function normalizeProductValue(column: ProductColumn, value: unknown) {
  switch (column) {
    case "object_category":
      return normalizeEnumAlias(value, OBJECT_CATEGORY_ALIASES, "器物分类");
    case "publish_status":
      return normalizeEnumAlias(value, PUBLISH_STATUS_ALIASES, "发布状态");
    case "status": {
      const status = toStringValue(value, "DRAFT").trim().toUpperCase();
      if (!PRODUCT_STATUS_VALUES.has(status)) {
        throw new Error(`状态必须是允许值：${Array.from(PRODUCT_STATUS_VALUES).join(" / ")}`);
      }
      return status;
    }
    case "series_id":
      return toNullableInteger(value, "所属系列");
    case "erp_product_id":
      return toNullableInteger(value, "ERP 产品");
    case "stock":
      return toInteger(value, 0, "库存");
    case "sort_order":
      return toInteger(value, 0, "排序");
    case "sale_price":
      return toNumber(value, 0, "售价");
    case "cost_price":
      return toNumber(value, 0, "成本价");
    case "published_at":
      if (value === undefined || value === null || value === "") return null;
      return value instanceof Date ? value : new Date(String(value));
    default:
      return toStringValue(value);
  }
}

function normalizeProductData(data: Record<string, unknown>, mode: "create" | "update") {
  const fields = mode === "create" ? PRODUCT_CREATE_FIELDS : PRODUCT_UPDATE_FIELDS;
  const normalized: Record<string, unknown> = {};

  for (const column of fields) {
    const rawValue = readInput(data, column);
    if (rawValue === undefined && mode === "update") continue;

    const value = rawValue === undefined ? PRODUCT_CREATE_DEFAULTS[column] : rawValue;
    normalized[column] = normalizeProductValue(column, value);
  }

  if (mode === "create") {
    for (const required of ["sku", "name", "slug"] as const) {
      if (!String(normalized[required] ?? "").trim()) {
        throw new Error(`${required}不能为空`);
      }
    }
  }

  normalized.updated_at = new Date();
  return normalized;
}

function sqlIdentifier(column: string) {
  return Prisma.raw(`"${column}"`);
}

function sqlValue(column: string, value: unknown) {
  // ── Null / undefined → typed NULL ──
  if (value === null || value === undefined) {
    if (INTEGER_COLUMNS.has(column as ProductColumn)) return Prisma.sql`NULL::integer`;
    if (FLOAT_COLUMNS.has(column as ProductColumn)) return Prisma.sql`NULL::double precision`;
    if (column === "object_category") return Prisma.sql`NULL::"ObjectCategory"`;
    if (column === "publish_status") return Prisma.sql`NULL::"PublishStatus"`;
    if (TIMESTAMP_COLUMNS.has(column)) return Prisma.sql`NULL::timestamp`;
    if (TIMESTAMPTZ_COLUMNS.has(column)) return Prisma.sql`NULL::timestamptz`;
    return Prisma.sql`NULL`;
  }

  // ── Non-null typed values ──
  if (INTEGER_COLUMNS.has(column as ProductColumn)) return Prisma.sql`${value}::integer`;
  if (FLOAT_COLUMNS.has(column as ProductColumn)) return Prisma.sql`${value}::double precision`;
  // Enum columns: use raw SQL literal because Prisma parameter binding may send type text,
  // and PostgreSQL rejects `$1::"ObjectCategory"` when $1 is typed as text in the wire protocol.
  // Values are pre-validated by normalizeEnumAlias, so raw embedding is safe.
  if (column === "object_category") return Prisma.raw(`'${value}'::"ObjectCategory"`);
  if (column === "publish_status") return Prisma.raw(`'${value}'::"PublishStatus"`);
  if (TIMESTAMP_COLUMNS.has(column)) return Prisma.sql`${value}::timestamp`;
  if (TIMESTAMPTZ_COLUMNS.has(column)) return Prisma.sql`${value}::timestamptz`;
  return Prisma.sql`${value}`;
}

export async function getBrandStats() {
  try {
    const [products, series, journal] = await Promise.all([
      brandPrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM ${TABLE}`),
      brandPrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM series`),
      brandPrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM journal_posts`),
    ]);
    return {
      productCount: (products as any[])[0].count || 0,
      seriesCount: (series as any[])[0].count || 0,
      journalCount: (journal as any[])[0].count || 0,
      mediaCount: 0, // media table not yet in Brand DB
    };
  } catch {
    return { productCount: 0, seriesCount: 0, journalCount: 0, mediaCount: 0 };
  }
}

export async function listProducts(search?: string) {
  try {
    let where = "";
    const params: any[] = [];
    if (search) {
      where = `WHERE (name ILIKE $1 OR sku ILIKE $1)`;
      params.push(`%${search}%`);
    }
    const sql = `SELECT * FROM ${TABLE} ${where} ORDER BY sort_order ASC, created_at DESC LIMIT 200`;
    const rows: any[] = await brandPrisma.$queryRawUnsafe(sql, ...params);
    return { rows, error: null };
  } catch (e: any) {
    return { rows: [] as any[], error: e.message };
  }
}

export async function createProduct(data: Record<string, unknown>) {
  try {
    const enriched = normalizeProductData(data, "create");
    const columns = Object.keys(enriched);
    const rows: any[] = await brandPrisma.$queryRaw(Prisma.sql`
      INSERT INTO products (${Prisma.join(columns.map(sqlIdentifier))})
      VALUES (${Prisma.join(columns.map((column) => sqlValue(column, enriched[column])))})
      RETURNING *
    `);
    const row = rows[0];

    // Audit
    try {
      await createCrudAudit({ action: "CREATE", system: "BRAND", module: "products", targetId: row.id, after: row });
    } catch {}

    return { row, error: null };
  } catch (e: any) {
    return { row: null, error: e.message };
  }
}

export async function updateProduct(id: number, data: Record<string, unknown>) {
  try {
    // Fetch before
    const beforeRows: any[] = await brandPrisma.$queryRawUnsafe(`SELECT * FROM ${TABLE} WHERE id = $1`, id);
    const before = beforeRows[0] || null;

    const enriched = normalizeProductData(data, "update");
    const columns = Object.keys(enriched);
    const sets = columns.map((column) =>
      Prisma.sql`${sqlIdentifier(column)} = ${sqlValue(column, enriched[column])}`
    );
    const afterRows: any[] = await brandPrisma.$queryRaw(Prisma.sql`
      UPDATE products
      SET ${Prisma.join(sets)}
      WHERE id = ${id}::integer
      RETURNING *
    `);
    const after = afterRows[0] || null;

    // Audit
    try {
      await createCrudAudit({ action: "UPDATE", system: "BRAND", module: "products", targetId: id, before, after });
    } catch {}

    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deleteProduct(id: number) {
  try {
    // Fetch before
    const beforeRows: any[] = await brandPrisma.$queryRawUnsafe(`SELECT * FROM ${TABLE} WHERE id = $1`, id);
    const before = beforeRows[0] || null;

    await brandPrisma.$queryRawUnsafe(`DELETE FROM ${TABLE} WHERE id = $1`, id);

    // Audit
    try {
      await createCrudAudit({ action: "DELETE", system: "BRAND", module: "products", targetId: id, before });
    } catch {}

    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function toggleProductStatus(id: number, newStatus: string): Promise<{ row: any; error: string | null }> {
  const result = await transitionStatus("products", id, newStatus as any);
  if (!result.success) return { row: null, error: result.error || "状态变更失败" };
  // Fetch updated row
  const rows = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT * FROM ${TABLE} WHERE id = $1`, id);
  return { row: rows[0] || null, error: null };
}

export async function moveProduct(id: number, direction: "up" | "down") {
  try {
    const rows: any[] = await brandPrisma.$queryRawUnsafe(
      `SELECT id, sort_order FROM ${TABLE} WHERE id = $1`, id
    );
    if (!rows.length) return { error: "Product not found" };

    const current = rows[0].sort_order;
    const op = direction === "up" ? "<" : ">";
    const orderDir = direction === "up" ? "DESC" : "ASC";

    const neighbors: any[] = await brandPrisma.$queryRawUnsafe(
      `SELECT id, sort_order FROM ${TABLE} WHERE sort_order ${op} $1 ORDER BY sort_order ${orderDir} LIMIT 1`,
      current
    );
    if (!neighbors.length) return { error: null }; // Already at edge

    const neighbor = neighbors[0];

    const before = { [id]: current, [neighbor.id]: neighbor.sort_order };

    await brandPrisma.$queryRawUnsafe(
      `UPDATE ${TABLE} SET sort_order = $1 WHERE id = $2`, neighbor.sort_order, id
    );
    await brandPrisma.$queryRawUnsafe(
      `UPDATE ${TABLE} SET sort_order = $1 WHERE id = $2`, current, neighbor.id
    );

    const after = { [id]: neighbor.sort_order, [neighbor.id]: current };

    // Audit
    try {
      await createAuditLog({ action: "SORT_CHANGE", system: "BRAND", module: "products", targetId: id, before, after });
    } catch {}

    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ── Publishing Workflow Actions (bound to contentType="products") ──

export async function submitProductForReview(id: number) {
  return submitForReview("products", id);
}

export async function approveProduct(id: number) {
  return approveContent("products", id);
}

export async function rejectProduct(id: number, reason?: string) {
  return rejectContent("products", id, reason);
}

export async function publishProductNow(id: number) {
  return publishNow("products", id);
}

export async function scheduleProductPublish(id: number, publishAt: string) {
  return schedulePublish("products", id, publishAt);
}

export async function unpublishProduct(id: number) {
  return unpublishContent("products", id);
}

export async function archiveProduct(id: number) {
  return archiveContent("products", id);
}

export async function getProductVersions(id: number) {
  return getVersions("products", id);
}

export async function rollbackProduct(id: number, version: number) {
  return rollbackToVersion("products", id, version);
}

export async function getProductPreviewToken(id: number) {
  return generatePreviewToken("products", id);
}

export async function getProductStatus(id: number) {
  return getContentStatus("products", id);
}
