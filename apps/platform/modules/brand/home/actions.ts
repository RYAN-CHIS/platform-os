// ══════════════════════════════════════════════════════════
// Brand Home — actions (WO-P13C Publishing Workflow)
// ══════════════════════════════════════════════════════════

"use server";

import { brandDb } from "@/lib/brand-db";
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
  getContentStatus,
} from "@/lib/publisher";

// ── Stats ──

export async function getBrandStats() {
  try {
    const [seriesCount, productCount, journalCount, bannerCount] = await Promise.all([
      brandDb.legacyBrandSeries.count(),
      brandDb.legacyBrandProduct.count(),
      brandDb.journalPost.count(),
      brandDb.banner.count(),
    ]);
    return {
      seriesCount,
      productCount,
      journalCount,
      materialCount: 0,
      mediaCount: 0,
      bannerCount,
      orderCount: 0,
      contactCount: 0,
    };
  } catch {
    return { seriesCount: 0, productCount: 0, journalCount: 0, materialCount: 0, mediaCount: 0, bannerCount: 0, orderCount: 0, contactCount: 0 };
  }
}

// ── Page Contents (Brand DB: page_contents) ──

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function toPageContentRow(content: { id: string; pageKey: string; sectionKey: string; title: string; content: string; image: string | null; sortOrder: number; published: boolean; createdAt: Date; updatedAt: Date }) {
  return { id: content.id, page_key: content.pageKey, section_key: content.sectionKey, title: content.title, content: content.content, image: content.image, sort_order: content.sortOrder, published: content.published, created_at: content.createdAt, updated_at: content.updatedAt };
}

const PAGE_CONTENT_UPDATE_KEYS = new Set(["pageKey", "page_key", "sectionKey", "section_key", "title", "content", "image", "sortOrder", "sort_order", "published"]);

function inputValue(data: Record<string, unknown>, camelKey: string, snakeKey: string) {
  if (Object.prototype.hasOwnProperty.call(data, camelKey)) return data[camelKey];
  if (Object.prototype.hasOwnProperty.call(data, snakeKey)) return data[snakeKey];
  return undefined;
}

function stringInput(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  return value;
}

function nullableStringInput(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`${field} must be a string or null`);
  return value;
}

function integerInput(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(`${field} must be an integer`);
  return value;
}

function booleanInput(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new Error(`${field} must be a boolean`);
  return value;
}

export async function getPageContents() {
  try {
    const contents = await brandDb.pageContent.findMany({ orderBy: [{ pageKey: "asc" }, { sortOrder: "asc" }] });
    return contents.map(toPageContentRow);
  } catch {
    return [];
  }
}

export async function createPageContent(data: {
  pageKey: string;
  sectionKey: string;
  title: string;
  content: string;
  sortOrder?: number;
}) {
  try {
    const content = await brandDb.pageContent.create({ data: { pageKey: data.pageKey, sectionKey: data.sectionKey, title: data.title, content: data.content, sortOrder: data.sortOrder ?? 0, published: false } });
    return { row: toPageContentRow(content), error: null };
  } catch (error) {
    return { row: null, error: errorMessage(error) };
  }
}

export async function updatePageContent(id: string, data: Record<string, unknown>) {
  try {
    const invalidKey = Object.keys(data).find((key) => !PAGE_CONTENT_UPDATE_KEYS.has(key));
    if (invalidKey) return { row: null, error: `Invalid PageContent update field: ${invalidKey}` };
    const before = await brandDb.pageContent.findUnique({ where: { id } });
    if (!before) return { row: null, error: "Content not found" };

    const pageKey = stringInput(inputValue(data, "pageKey", "page_key"), "pageKey");
    const sectionKey = stringInput(inputValue(data, "sectionKey", "section_key"), "sectionKey");
    const title = stringInput(data.title, "title");
    const content = stringInput(data.content, "content");
    const image = nullableStringInput(data.image, "image");
    const sortOrder = integerInput(inputValue(data, "sortOrder", "sort_order"), "sortOrder");
    const published = booleanInput(data.published, "published");
    const updateData = {
      ...(pageKey === undefined ? {} : { pageKey }),
      ...(sectionKey === undefined ? {} : { sectionKey }),
      ...(title === undefined ? {} : { title }),
      ...(content === undefined ? {} : { content }),
      ...(image === undefined ? {} : { image }),
      ...(sortOrder === undefined ? {} : { sortOrder }),
      ...(published === undefined ? {} : { published }),
    };
    if (Object.keys(updateData).length === 0) return { row: toPageContentRow(before), error: null };
    const after = await brandDb.pageContent.update({ where: { id }, data: updateData });
    return { row: toPageContentRow(after), error: null };
  } catch (error) {
    return { row: null, error: errorMessage(error) };
  }
}

export async function deletePageContent(id: string) {
  try {
    const before = await brandDb.pageContent.findUnique({ where: { id }, select: { id: true } });
    if (!before) return { error: "Content not found" };
    await brandDb.pageContent.delete({ where: { id } });
    return { error: null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

// ── Site Settings ──

export async function getSiteSettings() {
  try {
    const settings = await brandDb.siteSetting.findMany({ select: { key: true, value: true } });
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  } catch {
    return {};
  }
}

export async function updateSiteSetting(key: string, value: string) {
  try {
    await brandDb.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return { error: null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

// ── Publishing Workflow Wrappers ──

export async function submitHomeForReview(id: string) {
  return submitForReview("home", id);
}

export async function approveHome(id: string) {
  return approveContent("home", id);
}

export async function rejectHome(id: string, reason?: string) {
  return rejectContent("home", id, reason);
}

export async function publishHomeNow(id: string) {
  return publishNow("home", id);
}

export async function scheduleHomePublish(id: string, publishAt: string) {
  return schedulePublish("home", id, publishAt);
}

export async function unpublishHome(id: string) {
  return unpublishContent("home", id);
}

export async function archiveHome(id: string) {
  return archiveContent("home", id);
}

export async function getHomeVersions(id: string) {
  return getVersions("home", id);
}

export async function rollbackHome(id: string, version: number) {
  return rollbackToVersion("home", id, version);
}

export async function getHomeStatus(id: string) {
  return getContentStatus("home", id);
}
