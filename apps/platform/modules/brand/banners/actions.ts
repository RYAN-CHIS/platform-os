"use server";

import { brandDb } from "@/lib/brand-db";
import { createCrudAudit } from "@/lib/audit";
import { transitionStatus } from "@/lib/publisher";
import { revalidatePath } from "next/cache";

const BANNERS_PATH = "/brand/banners";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function toBannerRow(banner: { id: number; title: string; imageUrl: string | null; linkUrl: string | null; position: string | null; sortOrder: number | null; status: string | null; startAt: Date | null; endAt: Date | null; createdAt: Date | null; updatedAt: Date | null; publishedAt: Date | null; subtitle: string | null; btnText: string | null; mobileImageUrl: string | null }) {
  return { id: banner.id, title: banner.title, image_url: banner.imageUrl, link_url: banner.linkUrl, position: banner.position, sort_order: banner.sortOrder, status: banner.status, start_at: banner.startAt, end_at: banner.endAt, created_at: banner.createdAt, updated_at: banner.updatedAt, published_at: banner.publishedAt, subtitle: banner.subtitle, btn_text: banner.btnText, mobile_image_url: banner.mobileImageUrl };
}

function nullableStringInput(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${field} must be a string or null`);
  return value;
}

function integerInput(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(`${field} must be an integer`);
  return value;
}

function dateInput(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${field} must be an ISO date string or null`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${field} must be a valid date`);
  return date;
}

function inputValue(data: Record<string, unknown>, camelKey: string, snakeKey: string) {
  if (Object.prototype.hasOwnProperty.call(data, camelKey)) return data[camelKey];
  if (Object.prototype.hasOwnProperty.call(data, snakeKey)) return data[snakeKey];
  return undefined;
}

const BANNER_UPDATE_KEYS = new Set(["title", "subtitle", "btnText", "btn_text", "imageUrl", "image_url", "mobileImageUrl", "mobile_image_url", "linkUrl", "link_url", "position", "sortOrder", "sort_order", "status", "startAt", "start_at", "endAt", "end_at"]);

export async function listBanners(params?: { status?: string; position?: string; sort?: string; order?: string }) {
  try {
    // 直接读取真实数据库，不做任何状态过滤 —— 确保 DRAFT / IN_REVIEW / APPROVED /
    // SCHEDULED / PUBLISHED / ARCHIVED / REJECTED 等所有状态的 Banner 都进入管理列表。
    const banners = await brandDb.banner.findMany({
      where: {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.position ? { position: params.position } : {}),
      },
    });
    // Preserve SQL ORDER BY COALESCE(sort_order, 0) ASC, created_at DESC.
    banners.sort((left, right) => {
      const sortOrder = (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
      if (sortOrder !== 0) return sortOrder;
      const leftCreatedAt = left.createdAt?.getTime();
      const rightCreatedAt = right.createdAt?.getTime();
      if (leftCreatedAt == null) return rightCreatedAt == null ? 0 : -1;
      if (rightCreatedAt == null) return 1;
      return rightCreatedAt - leftCreatedAt;
    });
    const rows = banners.map(toBannerRow);
    return { rows, total: rows.length, error: null };
  } catch (error) { return { rows: [], total: 0, error: errorMessage(error) }; }
}

export async function createBanner(data: { title: string; subtitle?: string; btn_text?: string; image_url?: string; mobile_image_url?: string; link_url?: string; position?: string; sort_order?: number; status?: string; start_at?: string; end_at?: string }) {
  try {
    const banner = await brandDb.banner.create({ data: { title: data.title, subtitle: data.subtitle || null, btnText: data.btn_text || null, imageUrl: data.image_url || null, mobileImageUrl: data.mobile_image_url || null, linkUrl: data.link_url || null, position: data.position || "home", sortOrder: data.sort_order || 0, status: data.status || "DRAFT", startAt: dateInput(data.start_at, "start_at") ?? null, endAt: dateInput(data.end_at, "end_at") ?? null } });
    const row = toBannerRow(banner);
    try { await createCrudAudit({ action: "CREATE", system: "BRAND", module: "banners", targetId: banner.id, after: row }); } catch {}
    revalidatePath(BANNERS_PATH);
    return { row, error: null };
  } catch (error) { return { row: null, error: errorMessage(error) }; }
}

export async function updateBanner(id: number, data: Record<string, unknown>) {
  try {
    const invalidKey = Object.keys(data).find((key) => !BANNER_UPDATE_KEYS.has(key));
    if (invalidKey) return { row: null, error: `Invalid Banner update field: ${invalidKey}` };
    const before = await brandDb.banner.findUnique({ where: { id } });
    if (!before) return { row: null, error: "Banner not found" };
    const title = nullableStringInput(data.title, "title");
    if (title === null) return { row: null, error: "title must not be empty" };
    const subtitle = nullableStringInput(data.subtitle, "subtitle");
    const btnText = nullableStringInput(inputValue(data, "btnText", "btn_text"), "btnText");
    const imageUrl = nullableStringInput(inputValue(data, "imageUrl", "image_url"), "imageUrl");
    const mobileImageUrl = nullableStringInput(inputValue(data, "mobileImageUrl", "mobile_image_url"), "mobileImageUrl");
    const linkUrl = nullableStringInput(inputValue(data, "linkUrl", "link_url"), "linkUrl");
    const position = nullableStringInput(data.position, "position");
    const sortOrder = integerInput(inputValue(data, "sortOrder", "sort_order"), "sortOrder");
    const status = nullableStringInput(data.status, "status");
    const startAt = dateInput(inputValue(data, "startAt", "start_at"), "startAt");
    const endAt = dateInput(inputValue(data, "endAt", "end_at"), "endAt");
    const updateData = { ...(title === undefined ? {} : { title }), ...(subtitle === undefined ? {} : { subtitle }), ...(btnText === undefined ? {} : { btnText }), ...(imageUrl === undefined ? {} : { imageUrl }), ...(mobileImageUrl === undefined ? {} : { mobileImageUrl }), ...(linkUrl === undefined ? {} : { linkUrl }), ...(position === undefined ? {} : { position }), ...(sortOrder === undefined ? {} : { sortOrder }), ...(status === undefined ? {} : { status }), ...(startAt === undefined ? {} : { startAt }), ...(endAt === undefined ? {} : { endAt }) };
    if (Object.keys(updateData).length === 0) return { row: toBannerRow(before), error: null };
    const after = await brandDb.banner.update({ where: { id }, data: { ...updateData, updatedAt: new Date() } });
    const beforeRow = toBannerRow(before);
    const afterRow = toBannerRow(after);
    try { await createCrudAudit({ action: "UPDATE", system: "BRAND", module: "banners", targetId: id, before: beforeRow, after: afterRow }); } catch {}
    revalidatePath(BANNERS_PATH);
    return { row: afterRow, error: null };
  } catch (error) { return { row: null, error: errorMessage(error) }; }
}

export async function deleteBanner(id: number) {
  try {
    const before = await brandDb.banner.findUnique({ where: { id } });
    if (!before) return { error: null };
    await brandDb.banner.delete({ where: { id } });
    try { await createCrudAudit({ action: "DELETE", system: "BRAND", module: "banners", targetId: id, before: toBannerRow(before) }); } catch {}
    revalidatePath(BANNERS_PATH);
    return { error: null };
  } catch (error) { return { error: errorMessage(error) }; }
}

export async function moveBanner(id: number, direction: "up" | "down") {
  try {
    const rows = await brandDb.banner.findMany({ select: { id: true, sortOrder: true } });
    rows.sort((left, right) => {
      if (left.sortOrder === null) return right.sortOrder === null ? left.id - right.id : 1;
      if (right.sortOrder === null) return -1;
      return left.sortOrder - right.sortOrder || left.id - right.id;
    });
    const idx = rows.findIndex((row) => row.id === id);
    if (idx < 0) return { error: "未找到" };
    if (direction === "up" && idx === 0) return { error: "已是第一个" };
    if (direction === "down" && idx === rows.length - 1) return { error: "已是最后一个" };
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    await brandDb.banner.update({ where: { id }, data: { sortOrder: rows[swapIdx].sortOrder, updatedAt: new Date() } });
    await brandDb.banner.update({ where: { id: rows[swapIdx].id }, data: { sortOrder: rows[idx].sortOrder, updatedAt: new Date() } });
    revalidatePath(BANNERS_PATH);
    return { error: null };
  } catch (error) { return { error: errorMessage(error) }; }
}

// Publishing workflow
export async function publishBanner(id: number) {
  try {
    const result = await transitionStatus("banners", id, "PUBLISH");
    if (!result.success) return { error: result.error };
    const banner = await brandDb.banner.findUnique({ where: { id } });
    revalidatePath(BANNERS_PATH);
    return { row: banner ? toBannerRow(banner) : null, error: null };
  } catch (e: any) { return { row: null, error: e.message }; }
}

export async function unpublishBanner(id: number) {
  try {
    const result = await transitionStatus("banners", id, "UNPUBLISH");
    if (!result.success) return { error: result.error };
    const banner = await brandDb.banner.findUnique({ where: { id } });
    revalidatePath(BANNERS_PATH);
    return { row: banner ? toBannerRow(banner) : null, error: null };
  } catch (e: any) { return { row: null, error: e.message }; }
}
