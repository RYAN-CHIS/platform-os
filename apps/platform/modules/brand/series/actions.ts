"use server";
/**
 * Brand Series — ordinary CRUD uses the canonical Brand Runtime client.
 * Publishing workflow remains owned by the publisher engine.
 */
import { brandDb, type LegacyBrandSeries } from "@/lib/brand-db";
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
  createSeoSnapshot,
} from "@/lib/publisher";

const TABLE = "series";
const SERIES_FIELDS = [
  "name", "slug", "description", "coverImage", "cover_image", "heroText", "hero_text",
  "isActive", "is_active", "longDesc", "long_desc", "shortDesc", "short_desc", "sortOrder", "sort_order",
] as const;
const SERIES_WORKFLOW_FIELDS = ["status", "published_at", "publishedAt"] as const;

type SeriesWriteData = {
  name?: string;
  slug?: string;
  description?: string;
  coverImage?: string;
  heroText?: string;
  isActive?: boolean;
  longDesc?: string | null;
  shortDesc?: string | null;
  sortOrder?: number;
};
type SeriesStringField = "name" | "slug" | "description" | "coverImage" | "heroText";
type SeriesNullableStringField = "longDesc" | "shortDesc";

type SeriesRow = LegacyBrandSeries & {
  cover_image: string;
  hero_text: string;
  is_active: boolean;
  long_desc: string | null;
  short_desc: string | null;
  sort_order: number;
  published_at: Date | null;
};

function hasOwn(data: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(data, key);
}

function inputValue(data: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) if (hasOwn(data, key)) return data[key];
  return undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "未知错误";
}

function toStringValue(value: unknown, defaultValue = "") {
  return value === undefined || value === null ? defaultValue : String(value);
}

function toNullableString(value: unknown) {
  if (value === undefined) return undefined;
  return value === null || value === "" ? null : String(value);
}

function toInteger(value: unknown, defaultValue: number, label: string) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numberValue)) throw new Error(`${label}必须是整数`);
  return numberValue;
}

function toBoolean(value: unknown, label: string) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new Error(`${label}必须是 true 或 false`);
}

function assertSeriesInput(data: Record<string, unknown>) {
  const allowed = new Set(SERIES_FIELDS);
  for (const key of Object.keys(data)) {
    if (SERIES_WORKFLOW_FIELDS.includes(key as (typeof SERIES_WORKFLOW_FIELDS)[number])) {
      throw new Error(`Unauthorized workflow field: ${key}`);
    }
    if (!allowed.has(key as (typeof SERIES_FIELDS)[number])) throw new Error(`Invalid Series update field: ${key}`);
  }
}

function normalizeSeriesData(data: Record<string, unknown>, mode: "create" | "update"): SeriesWriteData {
  assertSeriesInput(data);
  const normalized: SeriesWriteData = {};
  const setString = (key: SeriesStringField, ...aliases: string[]) => {
    const value = inputValue(data, ...aliases);
    if (value !== undefined) normalized[key] = toStringValue(value);
  };
  const setNullableString = (key: SeriesNullableStringField, ...aliases: string[]) => {
    const value = inputValue(data, ...aliases);
    const normalizedValue = toNullableString(value);
    if (normalizedValue !== undefined) normalized[key] = normalizedValue;
  };
  setString("name", "name");
  setString("slug", "slug");
  setString("description", "description");
  setString("coverImage", "coverImage", "cover_image");
  setString("heroText", "heroText", "hero_text");
  const isActive = inputValue(data, "isActive", "is_active");
  if (isActive !== undefined) normalized.isActive = toBoolean(isActive, "启用状态");
  setNullableString("longDesc", "longDesc", "long_desc");
  setNullableString("shortDesc", "shortDesc", "short_desc");
  const sortOrder = inputValue(data, "sortOrder", "sort_order");
  if (sortOrder !== undefined) normalized.sortOrder = toInteger(sortOrder, 0, "排序");

  if (mode === "create") {
    if (!normalized.name?.trim()) throw new Error("name不能为空");
    if (!normalized.slug?.trim()) throw new Error("slug不能为空");
    if (!normalized.description?.trim()) throw new Error("description不能为空");
    return { coverImage: "", heroText: "", isActive: true, sortOrder: 0, ...normalized };
  }
  if (Object.keys(normalized).length === 0) throw new Error("No editable Series fields provided");
  return normalized;
}

function toSeriesRow(series: LegacyBrandSeries): SeriesRow {
  return {
    ...series,
    cover_image: series.coverImage,
    hero_text: series.heroText,
    is_active: series.isActive,
    long_desc: series.longDesc,
    short_desc: series.shortDesc,
    sort_order: series.sortOrder,
    published_at: series.publishedAt,
  };
}

function seriesAuditRecord(series: LegacyBrandSeries | null): Record<string, unknown> | null {
  if (!series) return null;
  return {
    id: series.id, name: series.name, slug: series.slug, description: series.description,
    isActive: series.isActive, status: series.status, sortOrder: series.sortOrder, updatedAt: series.updatedAt,
  };
}

export async function listSeries(search?: string) {
  try {
    const series = await brandDb.legacyBrandSeries.findMany({
      where: search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { slug: { contains: search, mode: "insensitive" } }] } : undefined,
      orderBy: [{ sortOrder: "asc" }, { id: "desc" }], take: 100,
    });
    return { rows: series.map(toSeriesRow), error: null };
  } catch (error) {
    return { rows: [] as SeriesRow[], error: errorMessage(error) };
  }
}

export async function createSeries(data: Record<string, unknown>) {
  try {
    const normalized = normalizeSeriesData(data, "create");
    const series = await brandDb.legacyBrandSeries.create({
      data: {
        name: normalized.name!, slug: normalized.slug!, description: normalized.description!,
        coverImage: normalized.coverImage!, heroText: normalized.heroText!, isActive: normalized.isActive!,
        longDesc: normalized.longDesc ?? null, shortDesc: normalized.shortDesc ?? null, sortOrder: normalized.sortOrder!,
      },
    });
    try { await createCrudAudit({ action: "CREATE", system: "BRAND", module: "series", targetId: series.id, after: seriesAuditRecord(series) }); } catch {}
    return { row: toSeriesRow(series), error: null };
  } catch (error) {
    return { row: null, error: errorMessage(error) };
  }
}

export async function updateSeries(id: number, data: Record<string, unknown>) {
  try {
    const before = await brandDb.legacyBrandSeries.findUnique({ where: { id } });
    if (!before) return { error: "Series not found" };
    const normalized = normalizeSeriesData(data, "update");
    const after = await brandDb.legacyBrandSeries.update({ where: { id }, data: normalized });
    try { await createCrudAudit({ action: "UPDATE", system: "BRAND", module: "series", targetId: id, before: seriesAuditRecord(before), after: seriesAuditRecord(after) }); } catch {}
    return { error: null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function deleteSeries(id: number) {
  try {
    const before = await brandDb.legacyBrandSeries.findUnique({ where: { id } });
    if (!before) return { error: null };
    await brandDb.legacyBrandSeries.delete({ where: { id } });
    try { await createCrudAudit({ action: "DELETE", system: "BRAND", module: "series", targetId: id, before: seriesAuditRecord(before) }); } catch {}
    return { error: null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

// ── Publishing Workflow (WO-P13C) ──

export async function submitSeriesForReview(id: number) {
  return submitForReview("series", id);
}

export async function approveSeries(id: number) {
  return approveContent("series", id);
}

export async function rejectSeries(id: number, reason?: string) {
  return rejectContent("series", id, reason);
}

export async function publishSeriesNow(id: number) {
  return publishNow("series", id);
}

export async function scheduleSeriesPublish(id: number, publishAt: string) {
  return schedulePublish("series", id, publishAt);
}

export async function unpublishSeries(id: number) {
  return unpublishContent("series", id);
}

export async function archiveSeries(id: number) {
  return archiveContent("series", id);
}

export async function getSeriesVersions(id: number) {
  return getVersions("series", id);
}

export async function rollbackSeries(id: number, version: number, reason: string) {
  return rollbackToVersion("series", id, version, reason);
}

export async function getSeriesPreviewToken(id: number) {
  return generatePreviewToken("series", id);
}

export async function getSeriesStatus(id: number) {
  return getContentStatus("series", id);
}

export async function createSeriesSeoSnapshot(
  id: number,
  seoData: {
    title: string;
    slug: string;
    description?: string;
    keywords?: string;
    ogImage?: string;
    canonicalUrl?: string;
  }
) {
  return createSeoSnapshot("series", id, seoData);
}

// ── Legacy toggle (now routed through publisher engine) ──

export async function toggleSeriesActive(id: number, active: boolean): Promise<{ row: any; error: string | null }> {
  const result = await transitionStatus("series", id, active ? "PUBLISH" : "UNPUBLISH");
  if (!result.success) return { row: null, error: result.error || "状态变更失败" };
  const row = await brandDb.legacyBrandSeries.findUnique({ where: { id } });
  return { row, error: null };
}

export async function moveSeries(id: number, direction: "up" | "down") {
  try {
    const current = await brandDb.legacyBrandSeries.findUnique({ where: { id }, select: { id: true, sortOrder: true } });
    if (!current) return { error: "Series not found" };
    const neighbor = await brandDb.legacyBrandSeries.findFirst({
      where: direction === "up" ? { sortOrder: { lt: current.sortOrder } } : { sortOrder: { gt: current.sortOrder } },
      orderBy: direction === "up" ? [{ sortOrder: "desc" }, { id: "asc" }] : [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, sortOrder: true },
    });
    if (!neighbor) return { error: null };
    const before = { [id]: current.sortOrder, [neighbor.id]: neighbor.sortOrder };
    await brandDb.legacyBrandSeries.update({ where: { id }, data: { sortOrder: neighbor.sortOrder } });
    await brandDb.legacyBrandSeries.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } });
    const after = { [id]: neighbor.sortOrder, [neighbor.id]: current.sortOrder };
    try { await createAuditLog({ action: "SORT_CHANGE", system: "BRAND", module: "series", targetId: id, before, after }); } catch {}
    return { error: null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
