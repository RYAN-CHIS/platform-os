"use server";
/**
 * Brand Journal — ordinary CRUD uses the canonical Brand Runtime client.
 * Publisher transitions remain exclusively owned by the publisher engine.
 */
import {
  brandDb,
  JournalCategory,
  PublishStatus,
  type JournalPost,
} from "@/lib/brand-db";
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

const TABLE = "journal_posts";
const JOURNAL_CREATE_FIELDS = [
  "title", "slug", "excerpt", "content", "cover_image", "coverImage", "category",
  "seo_title", "seoTitle", "seo_description", "seoDescription", "cover_alt", "coverAlt",
  "reading_time", "readingTime", "sort_order", "sortOrder",
] as const;
const JOURNAL_UPDATE_FIELDS = JOURNAL_CREATE_FIELDS;
const WORKFLOW_FIELDS = [
  "status", "publishStatus", "publish_status", "workflowState", "published", "publishedAt", "scheduledAt",
] as const;

const CANONICAL_CATEGORIES = new Map<string, JournalCategory>([
  ["OBJECT", JournalCategory.OBJECT],
  ["MATERIAL", JournalCategory.MATERIAL],
  ["CRAFT", JournalCategory.CRAFT],
  ["DONGHAI", JournalCategory.DONGHAI],
  ["CREATION", JournalCategory.CREATION],
  ["PHILOSOPHY", JournalCategory.PHILOSOPHY],
]);

const LEGACY_CATEGORY_ALIASES = new Map<string, JournalCategory>([
  ["ARTIFACT", JournalCategory.OBJECT],
  ["BRAND", JournalCategory.PHILOSOPHY],
  ["CRAFT", JournalCategory.CRAFT],
]);

type JournalWriteData = {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  content?: string;
  coverImage?: string | null;
  category?: JournalCategory;
  seoTitle?: string | null;
  seoDescription?: string | null;
  coverAlt?: string | null;
  readingTime?: number | null;
  sortOrder?: number;
};

type JournalRow = JournalPost & {
  cover_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
  cover_alt: string | null;
  reading_time: number | null;
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

function toNullableInteger(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 0) throw new Error(`${label}必须是非负整数`);
  return numericValue;
}

function toInteger(value: unknown, defaultValue: number, label: string) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numericValue)) throw new Error(`${label}必须是整数`);
  return numericValue;
}

/** Resolves canonical and approved legacy Journal categories without a database cast. */
function resolveJournalCategory(input: unknown): JournalCategory {
  if (typeof input !== "string" || !input.trim()) throw new Error("请选择明确的文章分类。");
  const value = input.trim().toUpperCase();
  const canonical = CANONICAL_CATEGORIES.get(value);
  if (canonical) return canonical;
  const legacy = LEGACY_CATEGORY_ALIASES.get(value);
  if (legacy) return legacy;
  if (value === "TRAVELER") throw new Error("旧分类‘同行者说’无法自动迁移，请重新选择文章分类。");
  if (value === "OTHER") throw new Error("‘其他’不是有效的文章分类，请选择明确的分类。");
  throw new Error(`‘${input.trim()}’不是有效的文章分类，请选择明确的分类。`);
}

function assertJournalInput(data: Record<string, unknown>, mode: "create" | "update") {
  const allowed = new Set(mode === "create" ? JOURNAL_CREATE_FIELDS : JOURNAL_UPDATE_FIELDS);
  for (const key of Object.keys(data)) {
    if (WORKFLOW_FIELDS.includes(key as (typeof WORKFLOW_FIELDS)[number])) {
      if (mode === "create") continue;
      throw new Error(`Unauthorized workflow field: ${key}`);
    }
    if (!allowed.has(key as (typeof JOURNAL_UPDATE_FIELDS)[number])) throw new Error(`Invalid Journal update field: ${key}`);
  }
}

function normalizeJournalData(data: Record<string, unknown>, mode: "create" | "update"): JournalWriteData {
  assertJournalInput(data, mode);
  const normalized: JournalWriteData = {};
  const title = inputValue(data, "title");
  if (title !== undefined) normalized.title = toStringValue(title);
  const slug = inputValue(data, "slug");
  if (slug !== undefined) normalized.slug = toStringValue(slug);
  const excerpt = toNullableString(inputValue(data, "excerpt"));
  if (excerpt !== undefined) normalized.excerpt = excerpt;
  const content = inputValue(data, "content");
  if (content !== undefined) normalized.content = toStringValue(content);
  const coverImage = toNullableString(inputValue(data, "cover_image", "coverImage"));
  if (coverImage !== undefined) normalized.coverImage = coverImage;
  const category = inputValue(data, "category");
  if (category !== undefined) normalized.category = resolveJournalCategory(category);
  const seoTitle = toNullableString(inputValue(data, "seo_title", "seoTitle"));
  if (seoTitle !== undefined) normalized.seoTitle = seoTitle;
  const seoDescription = toNullableString(inputValue(data, "seo_description", "seoDescription"));
  if (seoDescription !== undefined) normalized.seoDescription = seoDescription;
  const coverAlt = toNullableString(inputValue(data, "cover_alt", "coverAlt"));
  if (coverAlt !== undefined) normalized.coverAlt = coverAlt;
  const readingTime = toNullableInteger(inputValue(data, "reading_time", "readingTime"), "阅读时长");
  if (readingTime !== undefined) normalized.readingTime = readingTime;
  const sortOrder = inputValue(data, "sort_order", "sortOrder");
  if (sortOrder !== undefined) normalized.sortOrder = toInteger(sortOrder, 0, "排序");

  if (mode === "create") {
    if (!normalized.title?.trim()) throw new Error("title不能为空");
    if (!normalized.slug?.trim()) throw new Error("slug不能为空");
    if (!normalized.category) throw new Error("请选择明确的文章分类。");
    return { content: "", sortOrder: 0, ...normalized };
  }
  if (Object.keys(normalized).length === 0) throw new Error("No editable Journal fields provided");
  return normalized;
}

function toJournalRow(post: JournalPost): JournalRow {
  return {
    ...post,
    cover_image: post.coverImage,
    seo_title: post.seoTitle,
    seo_description: post.seoDescription,
    cover_alt: post.coverAlt,
    reading_time: post.readingTime,
    sort_order: post.sortOrder,
    published_at: post.publishedAt,
  };
}

function journalAuditRecord(post: JournalPost | null): Record<string, unknown> | null {
  if (!post) return null;
  return {
    id: post.id, title: post.title, slug: post.slug, category: post.category, status: post.status,
    sortOrder: post.sortOrder, publishedAt: post.publishedAt, updatedAt: post.updatedAt,
  };
}

async function createJournalSeoSnapshot(
  contentId: string,
  seoData: { title: string; slug: string; description?: string | null; keywords?: string; ogImage?: string },
) {
  const latest = await brandDb.seoSnapshot.findFirst({
    where: { contentType: "journal", contentId }, orderBy: { version: "desc" }, select: { version: true },
  });
  await brandDb.seoSnapshot.create({
    data: {
      contentType: "journal", contentId, version: (latest?.version ?? 0) + 1,
      title: seoData.title, slug: seoData.slug, description: seoData.description ?? null,
      keywords: seoData.keywords || null, ogImage: seoData.ogImage || null, publishedAt: new Date(),
    },
  });
}

export async function listPosts(search?: string) {
  try {
    const posts = await brandDb.journalPost.findMany({
      where: search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { excerpt: { contains: search, mode: "insensitive" } }] } : undefined,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], take: 200,
    });
    return { rows: posts.map(toJournalRow), error: null };
  } catch (error) {
    return { rows: [] as JournalRow[], error: errorMessage(error) };
  }
}

export async function createPost(data: Record<string, unknown>) {
  try {
    const normalized = normalizeJournalData(data, "create");
    const post = await brandDb.journalPost.create({
      data: {
        title: normalized.title!, slug: normalized.slug!, content: normalized.content!, category: normalized.category!,
        status: PublishStatus.DRAFT, excerpt: normalized.excerpt ?? null, coverImage: normalized.coverImage ?? null,
        seoTitle: normalized.seoTitle ?? null, seoDescription: normalized.seoDescription ?? null,
        coverAlt: normalized.coverAlt ?? null, readingTime: normalized.readingTime ?? null, sortOrder: normalized.sortOrder!,
      },
    });
    try { await createCrudAudit({ action: "CREATE", system: "BRAND", module: "journal", targetId: post.id, after: journalAuditRecord(post) }); } catch {}
    return { row: toJournalRow(post), error: null };
  } catch (error) {
    return { row: null, error: errorMessage(error) };
  }
}

export async function updatePost(cuid: string, data: Record<string, unknown>) {
  try {
    const before = await brandDb.journalPost.findUnique({ where: { id: cuid } });
    if (!before) return { error: "Post not found" };
    const normalized = normalizeJournalData(data, "update");
    const after = await brandDb.journalPost.update({ where: { id: cuid }, data: normalized });
    try { await createCrudAudit({ action: "UPDATE", system: "BRAND", module: "journal", targetId: cuid, before: journalAuditRecord(before), after: journalAuditRecord(after) }); } catch {}
    return { error: null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function deletePost(cuid: string) {
  try {
    const before = await brandDb.journalPost.findUnique({ where: { id: cuid } });
    if (!before) return { error: null };
    await brandDb.journalPost.delete({ where: { id: cuid } });
    try { await createCrudAudit({ action: "DELETE", system: "BRAND", module: "journal", targetId: cuid, before: journalAuditRecord(before) }); } catch {}
    return { error: null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

// ── Publishing Workflow ──

export async function submitPostForReview(cuid: string) {
  return submitForReview("journal", cuid);
}

export async function approvePost(cuid: string) {
  return approveContent("journal", cuid);
}

export async function rejectPost(cuid: string, reason?: string) {
  return rejectContent("journal", cuid, reason);
}

export async function publishPostNow(cuid: string) {
  return publishNow("journal", cuid);
}

export async function schedulePost(cuid: string, publishAt: string) {
  return schedulePublish("journal", cuid, publishAt);
}

export async function unpublishPost(cuid: string) {
  return unpublishContent("journal", cuid);
}

export async function archivePost(cuid: string) {
  return archiveContent("journal", cuid);
}

export async function getPostVersions(cuid: string) {
  return getVersions("journal", cuid);
}

export async function rollbackPost(cuid: string, version: number, reason: string) {
  return rollbackToVersion("journal", cuid, version, reason);
}

export async function getPostPreviewToken(cuid: string) {
  return generatePreviewToken("journal", cuid);
}

export async function getPostStatus(cuid: string) {
  return getContentStatus("journal", cuid);
}

export async function savePostSeoSnapshot(cuid: string) {
  const post = await brandDb.journalPost.findUnique({
    where: { id: cuid }, select: { title: true, slug: true, seoTitle: true, seoDescription: true, excerpt: true },
  });
  if (!post) return;
  await createJournalSeoSnapshot(cuid, {
    title: post.seoTitle || post.title, slug: post.slug, description: post.seoDescription || post.excerpt || "",
  });
}

/** Updates only canonical Journal SEO fields and records the supplied snapshot metadata. */
export async function updatePostSeo(
  cuid: string,
  seoData: { seo_title?: string; seo_description?: string; seo_keywords?: string; og_image?: string },
): Promise<{ success: boolean; error: string | null }> {
  try {
    const before = await brandDb.journalPost.findUnique({ where: { id: cuid }, select: { slug: true, excerpt: true } });
    if (!before) return { success: false, error: "Post not found" };
    const post = await brandDb.journalPost.update({
      where: { id: cuid }, data: { seoTitle: seoData.seo_title || null, seoDescription: seoData.seo_description || null },
      select: { title: true, slug: true, excerpt: true, seoTitle: true, seoDescription: true },
    });
    await createJournalSeoSnapshot(cuid, {
      title: post.seoTitle || post.title,
      slug: post.slug,
      description: post.seoDescription || post.excerpt || before.excerpt || "",
      keywords: seoData.seo_keywords || "",
      ogImage: seoData.og_image || "",
    });
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

// ── Status toggle (uses publisher engine) ──

export async function togglePostStatus(cuid: string, newStatus: string): Promise<{ row: any; error: string | null }> {
  const command = await publisherCommandFromLegacyStatus(newStatus);
  if (!command) return { row: null, error: "不支持的发布状态" };
  const result = await transitionStatus("journal", cuid, command);
  if (!result.success) return { row: null, error: result.error || "状态变更失败" };
  const row = await brandDb.journalPost.findUnique({ where: { id: cuid } });
  return { row, error: null };
}

export async function movePost(cuid: string, direction: "up" | "down") {
  try {
    const current = await brandDb.journalPost.findUnique({ where: { id: cuid }, select: { id: true, sortOrder: true } });
    if (!current) return { error: "Post not found" };
    const neighbor = await brandDb.journalPost.findFirst({
      where: direction === "up" ? { sortOrder: { lt: current.sortOrder } } : { sortOrder: { gt: current.sortOrder } },
      orderBy: direction === "up" ? [{ sortOrder: "desc" }, { id: "asc" }] : [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, sortOrder: true },
    });
    if (!neighbor) return { error: null };
    const before = { [cuid]: current.sortOrder, [neighbor.id]: neighbor.sortOrder };
    await brandDb.$transaction([
      brandDb.journalPost.update({ where: { id: cuid }, data: { sortOrder: neighbor.sortOrder } }),
      brandDb.journalPost.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } }),
    ]);
    const after = { [cuid]: neighbor.sortOrder, [neighbor.id]: current.sortOrder };
    try { await createAuditLog({ action: "SORT_CHANGE", system: "BRAND", module: "journal", targetId: cuid, before, after }); } catch {}
    return { error: null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
