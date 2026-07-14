/**
 * Brand Publisher: workflow commands resolve to canonical persistence states.
 * Workflow-only labels (IN_REVIEW, SCHEDULED, REJECTED) are never persisted as
 * PublishStatus values. ADR-001 owns this contract.
 */

"use server";

import crypto from "crypto";
import { brandDb, JournalCategory, ObjectCategory, ProductType, PublishStatus } from "@/lib/brand-db";
import { createAuditLog } from "@/lib/audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type ContentType = "products" | "series" | "journal" | "banners";
export type PublisherCommand =
  | "SUBMIT_FOR_REVIEW"
  | "APPROVE"
  | "REJECT"
  | "SCHEDULE"
  | "PUBLISH"
  | "UNPUBLISH"
  | "ARCHIVE";

type IdKind = "integer" | "string";
type PersistenceKind = "product-dual" | "string-status" | "publish-status";
type PublishJobOperation = "none" | "upsert" | "cancel" | "complete";

interface ContentContract {
  readonly physicalTable: string;
  readonly idKind: IdKind;
  readonly persistenceKind: PersistenceKind;
  readonly workflowStatusField: "status" | null;
  readonly persistenceStatusField: "publishStatus" | "status" | null;
  readonly publishedAtField: "publishedAt" | null;
  readonly supportsScheduling: boolean;
  readonly supportsPreview: boolean;
  readonly supportsRejectionMetadata: boolean;
}

/** Closed registry: dynamic SQL may use only these fixed physical tables. */
const PUBLISHER_CONTENT_REGISTRY: Record<ContentType, ContentContract> = {
  products: {
    physicalTable: "products", idKind: "integer", persistenceKind: "product-dual",
    workflowStatusField: "status", persistenceStatusField: "publishStatus", publishedAtField: "publishedAt",
    supportsScheduling: true, supportsPreview: true, supportsRejectionMetadata: true,
  },
  series: {
    physicalTable: "series", idKind: "integer", persistenceKind: "string-status",
    workflowStatusField: "status", persistenceStatusField: "status", publishedAtField: "publishedAt",
    supportsScheduling: true, supportsPreview: true, supportsRejectionMetadata: true,
  },
  journal: {
    physicalTable: "journal_posts", idKind: "string", persistenceKind: "publish-status",
    workflowStatusField: null, persistenceStatusField: "status", publishedAtField: "publishedAt",
    supportsScheduling: true, supportsPreview: true, supportsRejectionMetadata: true,
  },
  banners: {
    physicalTable: "banners", idKind: "integer", persistenceKind: "string-status",
    workflowStatusField: "status", persistenceStatusField: "status", publishedAtField: "publishedAt",
    supportsScheduling: true, supportsPreview: true, supportsRejectionMetadata: true,
  },
};

export interface ResolvedPublisherTransition {
  readonly command: PublisherCommand;
  readonly targetStatus: PublishStatus;
  readonly workflowStatus: string | null;
  readonly publishJobOperation: PublishJobOperation;
  readonly publishAt: Date | null;
  readonly writesPublishedAt: boolean;
  readonly rejectionMetadata: { reason: string } | null;
}

const CANONICAL_STATUSES = new Set(Object.values(PublishStatus));
const LEGACY_STATUS_ALIASES: Record<string, PublishStatus> = {
  IN_REVIEW: PublishStatus.PENDING_REVIEW,
  SCHEDULED: PublishStatus.APPROVED,
  REJECTED: PublishStatus.DRAFT,
};

function canonicalStatus(value: string | null | undefined): PublishStatus | null {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return PublishStatus.DRAFT;
  const canonical = Object.values(PublishStatus).find((candidate) => candidate === normalized);
  if (canonical && CANONICAL_STATUSES.has(canonical)) return canonical;
  return LEGACY_STATUS_ALIASES[normalized] ?? null;
}

function statusForWorkflow(contentType: ContentType, status: PublishStatus): string | null {
  if (contentType === "journal") return null;
  if (contentType === "products" && status === PublishStatus.PENDING_REVIEW) return "IN_REVIEW";
  return status;
}

function parseFuturePublishAt(value: string | undefined): Date {
  if (!value) throw new Error("A future publishAt timestamp is required for scheduling");
  const publishAt = new Date(value);
  if (Number.isNaN(publishAt.getTime()) || publishAt.getTime() <= Date.now()) {
    throw new Error("publishAt must be a valid future timestamp");
  }
  return publishAt;
}

function allowedCommand(current: PublishStatus, command: PublisherCommand, hasPendingJob: boolean): boolean {
  if (command === "ARCHIVE") return current !== PublishStatus.ARCHIVED;
  if (current === PublishStatus.ARCHIVED) return false;
  switch (command) {
    // DRAFT -> PUBLISH is retained because the prior Publisher exposed it.
    case "SUBMIT_FOR_REVIEW": return current === PublishStatus.DRAFT;
    case "APPROVE": return current === PublishStatus.PENDING_REVIEW || (current === PublishStatus.APPROVED && hasPendingJob);
    case "REJECT": return current === PublishStatus.PENDING_REVIEW || current === PublishStatus.APPROVED;
    case "SCHEDULE": return current === PublishStatus.APPROVED;
    case "PUBLISH": return current === PublishStatus.DRAFT || current === PublishStatus.APPROVED || current === PublishStatus.UNPUBLISHED;
    case "UNPUBLISH": return current === PublishStatus.PUBLISHED;
  }
}

/** Pure command resolver. It has no database or environment dependency. */
function resolvePublisherTransition(
  contentType: ContentType,
  command: PublisherCommand,
  currentStatus: string | null | undefined,
  context: { publishAt?: string; reason?: string; hasPendingJob?: boolean } = {},
): ResolvedPublisherTransition {
  const current = canonicalStatus(currentStatus);
  if (!current) throw new Error(`Unsupported persisted status: ${String(currentStatus)}`);
  if (!allowedCommand(current, command, context.hasPendingJob === true)) {
    throw new Error(`Illegal publisher transition: ${current} -> ${command}`);
  }

  let targetStatus: PublishStatus;
  let publishJobOperation: PublishJobOperation = "none";
  let publishAt: Date | null = null;
  let writesPublishedAt = false;
  let rejectionMetadata: { reason: string } | null = null;
  switch (command) {
    case "SUBMIT_FOR_REVIEW": targetStatus = PublishStatus.PENDING_REVIEW; break;
    case "APPROVE": targetStatus = PublishStatus.APPROVED; publishJobOperation = context.hasPendingJob ? "cancel" : "none"; break;
    case "REJECT":
      targetStatus = PublishStatus.DRAFT;
      publishJobOperation = "cancel";
      rejectionMetadata = { reason: context.reason?.trim() || "Rejected without a stated reason" };
      break;
    case "SCHEDULE":
      targetStatus = PublishStatus.APPROVED;
      publishJobOperation = "upsert";
      publishAt = parseFuturePublishAt(context.publishAt);
      break;
    case "PUBLISH": targetStatus = PublishStatus.PUBLISHED; publishJobOperation = "complete"; writesPublishedAt = true; break;
    case "UNPUBLISH": targetStatus = PublishStatus.UNPUBLISHED; publishJobOperation = "cancel"; break;
    case "ARCHIVE": targetStatus = PublishStatus.ARCHIVED; publishJobOperation = "cancel"; break;
  }
  return {
    command,
    targetStatus,
    workflowStatus: statusForWorkflow(contentType, targetStatus),
    publishJobOperation,
    publishAt,
    writesPublishedAt,
    rejectionMetadata,
  };
}

/** Converts legacy UI labels at the Publisher boundary, never in wrappers. */
export async function publisherCommandFromLegacyStatus(value: string): Promise<PublisherCommand | null> {
  switch (value.trim().toUpperCase()) {
    case "IN_REVIEW":
    case "PENDING_REVIEW": return "SUBMIT_FOR_REVIEW";
    case "APPROVED": return "APPROVE";
    case "REJECTED": return "REJECT";
    case "PUBLISHED": return "PUBLISH";
    case "DRAFT":
    case "UNPUBLISHED": return "UNPUBLISH";
    case "ARCHIVED": return "ARCHIVE";
    default: return null;
  }
}

function normalizeContentId(contentType: ContentType, contentId: string | number): string | number {
  const contract = PUBLISHER_CONTENT_REGISTRY[contentType];
  if (!contract) throw new Error(`Unsupported publisher content type: ${String(contentType).toUpperCase()}`);
  if (contract.idKind === "string") return String(contentId);
  const id = typeof contentId === "number" ? contentId : Number(contentId);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${contentType} id must be a positive integer`);
  return id;
}

type BrandTransaction = Pick<typeof brandDb,
  "legacyBrandProduct" | "legacyBrandSeries" | "journalPost" | "banner" | "publishJob"
>;

async function readCurrentState(db: BrandTransaction, contentType: ContentType, contentId: string | number) {
  switch (contentType) {
    case "products": {
      const item = await db.legacyBrandProduct.findUnique({ where: { id: contentId as number }, select: { status: true, publishStatus: true, publishedAt: true } });
      return item ? { status: item.publishStatus, rawStatus: item.status, publishedAt: item.publishedAt } : null;
    }
    case "series": {
      const item = await db.legacyBrandSeries.findUnique({ where: { id: contentId as number }, select: { status: true, publishedAt: true } });
      return item ? { status: item.status, rawStatus: item.status, publishedAt: item.publishedAt } : null;
    }
    case "journal": {
      const item = await db.journalPost.findUnique({ where: { id: contentId as string }, select: { status: true, publishedAt: true } });
      return item ? { status: item.status, rawStatus: item.status, publishedAt: item.publishedAt } : null;
    }
    case "banners": {
      const item = await db.banner.findUnique({ where: { id: contentId as number }, select: { status: true, publishedAt: true } });
      return item ? { status: item.status, rawStatus: item.status, publishedAt: item.publishedAt } : null;
    }
  }
}

async function pendingPublishJobCount(db: BrandTransaction, contentType: ContentType, contentId: string | number) {
  return db.publishJob.count({ where: { contentType, contentId: String(contentId), status: "pending" } });
}

async function persistTransition(db: BrandTransaction, contentType: ContentType, contentId: string | number, transition: ResolvedPublisherTransition) {
  const publishedAt = transition.writesPublishedAt ? new Date() : undefined;
  switch (contentType) {
    case "products":
      return db.legacyBrandProduct.update({ where: { id: contentId as number }, data: { status: transition.workflowStatus ?? PublishStatus.DRAFT, publishStatus: transition.targetStatus, ...(publishedAt ? { publishedAt } : {}) } });
    case "series":
      return db.legacyBrandSeries.update({ where: { id: contentId as number }, data: {
        status: transition.workflowStatus,
        ...(publishedAt ? { publishedAt } : {}),
        ...(transition.command === "PUBLISH" ? { isActive: true } : {}),
        ...(transition.command === "UNPUBLISH" ? { isActive: false } : {}),
      } });
    case "journal":
      return db.journalPost.update({ where: { id: contentId as string }, data: { status: transition.targetStatus, ...(publishedAt ? { publishedAt } : {}) } });
    case "banners":
      return db.banner.update({ where: { id: contentId as number }, data: { status: transition.workflowStatus, ...(publishedAt ? { publishedAt } : {}) } });
  }
}

async function persistPublishJob(db: BrandTransaction, contentType: ContentType, contentId: string | number, transition: ResolvedPublisherTransition) {
  const where = { contentType, contentId: String(contentId), status: "pending" };
  if (transition.publishJobOperation === "upsert" && transition.publishAt) {
    const updated = await db.publishJob.updateMany({ where, data: { publishAt: transition.publishAt } });
    if (updated.count === 0) await db.publishJob.create({ data: { contentType, contentId: String(contentId), publishAt: transition.publishAt, status: "pending" } });
  }
  if (transition.publishJobOperation === "cancel") await db.publishJob.updateMany({ where, data: { status: "cancelled" } });
  if (transition.publishJobOperation === "complete") await db.publishJob.updateMany({ where, data: { status: "published" } });
}

export async function canTransition(currentStatus: string, command: PublisherCommand): Promise<boolean> {
  try { resolvePublisherTransition("journal", command, currentStatus); return true; } catch { return false; }
}

export async function getAllowedTransitions(currentStatus: string): Promise<PublisherCommand[]> {
  const commands: PublisherCommand[] = ["SUBMIT_FOR_REVIEW", "APPROVE", "REJECT", "SCHEDULE", "PUBLISH", "UNPUBLISH", "ARCHIVE"];
  return commands.filter((command) => {
    try { resolvePublisherTransition("journal", command, currentStatus); return true; } catch { return false; }
  });
}

/** Single transition owner for all Publisher wrappers. */
export async function transitionStatus(
  contentType: ContentType,
  contentId: string | number,
  command: PublisherCommand,
  options: { reason?: string; publishAt?: string } = {},
): Promise<{ success: boolean; error?: string; previousStatus?: string }> {
  try {
    const normalizedId = normalizeContentId(contentType, contentId);
    const completed = await brandDb.$transaction(async (tx) => {
      const current = await readCurrentState(tx, contentType, normalizedId);
      if (!current) return null;
      const pendingJobs = await pendingPublishJobCount(tx, contentType, normalizedId);
      const transition = resolvePublisherTransition(contentType, command, current.status, { ...options, hasPendingJob: pendingJobs > 0 });
      await persistTransition(tx, contentType, normalizedId, transition);
      await persistPublishJob(tx, contentType, normalizedId, transition);
      return { current, transition };
    });
    if (!completed) return { success: false, error: "Content not found" };
    // Preserve the previous Publisher's non-blocking version snapshot side effect.
    if (completed.transition.command === "PUBLISH") {
      try {
        const snapshot = await getPreviewContent(contentType, String(normalizedId));
        if (snapshot) await createVersion(contentType, normalizedId, snapshot, PublishStatus.PUBLISHED);
      } catch (error) {
        console.error("[publisher] failed to create publish snapshot", {
          contentType,
          contentId: normalizedId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    try {
      await createAuditLog({
        action: command, system: "BRAND", module: contentType, targetId: normalizedId,
        before: { status: completed.current.rawStatus, publishStatus: completed.current.status },
        after: { status: completed.transition.workflowStatus, publishStatus: completed.transition.targetStatus },
        description: completed.transition.rejectionMetadata?.reason || `${completed.current.status} -> ${completed.transition.targetStatus}`,
        extra: completed.transition.rejectionMetadata ? { rejection: completed.transition.rejectionMetadata } : undefined,
      });
    } catch { /* non-blocking audit remains outside the Brand transaction */ }
    return { success: true, previousStatus: String(completed.current.rawStatus ?? completed.current.status) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function submitForReview(contentType: ContentType, contentId: string | number) { return transitionStatus(contentType, contentId, "SUBMIT_FOR_REVIEW"); }
export async function approveContent(contentType: ContentType, contentId: string | number) { return transitionStatus(contentType, contentId, "APPROVE"); }
export async function rejectContent(contentType: ContentType, contentId: string | number, reason?: string) { return transitionStatus(contentType, contentId, "REJECT", { reason }); }
export async function publishNow(contentType: ContentType, contentId: string | number) { return transitionStatus(contentType, contentId, "PUBLISH"); }
export async function schedulePublish(contentType: ContentType, contentId: string | number, publishAt: string) { return transitionStatus(contentType, contentId, "SCHEDULE", { publishAt }); }
export async function unpublishContent(contentType: ContentType, contentId: string | number) { return transitionStatus(contentType, contentId, "UNPUBLISH"); }
export async function archiveContent(contentType: ContentType, contentId: string | number) { return transitionStatus(contentType, contentId, "ARCHIVE"); }

export async function processPublishJobs(): Promise<{ processed: number; errors: number }> {
  const jobs = await brandDb.publishJob.findMany({ where: { status: "pending", publishAt: { lte: new Date() } }, select: { id: true, contentType: true, contentId: true, publishAt: true } });
  let processed = 0;
  let errors = 0;
  for (const job of jobs) {
    if (!(job.contentType in PUBLISHER_CONTENT_REGISTRY)) { await brandDb.publishJob.update({ where: { id: job.id }, data: { status: "failed" } }); errors += 1; continue; }
    const result = await transitionStatus(job.contentType as ContentType, job.contentId, "PUBLISH");
    if (result.success) { processed += 1; } else { await brandDb.publishJob.update({ where: { id: job.id }, data: { status: "failed" } }); errors += 1; }
  }
  return { processed, errors };
}

export async function createVersion(contentType: ContentType, contentId: string | number, snapshot: Record<string, unknown>, status: string) {
  const latest = await brandDb.contentVersion.aggregate({ where: { contentType, contentId: String(contentId) }, _max: { version: true } });
  const version = (latest._max.version ?? 0) + 1;
  const record = await brandDb.contentVersion.create({ data: { contentType, contentId: String(contentId), version, snapshot: JSON.parse(JSON.stringify(snapshot)), status } });
  return { version, versionId: record.id };
}

export async function getVersions(contentType: ContentType, contentId: string | number): Promise<Array<{ id: string; version: number; snapshot: Record<string, unknown>; status: string; created_at: string }>> {
  const rows = await brandDb.contentVersion.findMany({ where: { contentType, contentId: String(contentId) }, orderBy: { version: "desc" } });
  return rows.map((row) => ({ id: row.id, version: row.version, snapshot: isRecord(row.snapshot) ? row.snapshot : {}, status: row.status ?? "", created_at: row.createdAt?.toISOString() ?? "" }));
}

const ROLLBACK_CONTENT_TYPES = new Set<ContentType>(["products", "series", "journal", "banners"]);
const ROLLBACK_REASON_MIN_LENGTH = 5;
const ROLLBACK_REASON_MAX_LENGTH = 500;
const SENSITIVE_REASON_PATTERN = /(?:https?|postgres(?:ql)?|mysql|mongodb):\/\/|(?:password|passwd|token|secret|api[_-]?key)\s*[:=]/i;

type RollbackActor = { userId: string; role: string };
type ProductRestoreData = {
  name?: string; slug?: string; objectCategory?: ObjectCategory; theme?: string; story?: string;
  materials?: string; coverImage?: string; gallery?: string; inspiration?: string | null;
  keywords?: string | null; lifeStage?: string | null; suitableFor?: string | null; sortOrder?: number;
  materialOrigin?: string | null; craftMethod?: string | null; completionDate?: Date | null;
  serialNumber?: string | null; creationStory?: string | null; emotionalState?: string | null;
  companionsCount?: number; productType?: ProductType;
};
type SeriesRestoreData = {
  slug?: string; name?: string; description?: string; coverImage?: string; heroText?: string;
  longDesc?: string | null; shortDesc?: string | null; sortOrder?: number;
};
type JournalRestoreData = {
  title?: string; slug?: string; excerpt?: string | null; content?: string; coverImage?: string | null;
  category?: JournalCategory; seoTitle?: string | null; seoDescription?: string | null;
  coverAlt?: string | null; readingTime?: number | null; sortOrder?: number;
};
type BannerRestoreData = {
  title?: string; imageUrl?: string | null; linkUrl?: string | null; position?: string | null;
  sortOrder?: number | null; startAt?: Date | null; endAt?: Date | null; subtitle?: string | null;
  btnText?: string | null; mobileImageUrl?: string | null;
};

/** Inclusion-only fields. Lifecycle, identities, ERP/inventory and relations are never restored. */
const PRODUCT_RESTORE_FIELDS = ["name", "slug", "objectCategory", "theme", "story", "materials", "coverImage", "gallery", "inspiration", "keywords", "lifeStage", "suitableFor", "sortOrder", "materialOrigin", "craftMethod", "completionDate", "serialNumber", "creationStory", "emotionalState", "companionsCount", "productType"] as const;
const SERIES_RESTORE_FIELDS = ["slug", "name", "description", "coverImage", "heroText", "longDesc", "shortDesc", "sortOrder"] as const;
const JOURNAL_RESTORE_FIELDS = ["title", "slug", "excerpt", "content", "coverImage", "category", "seoTitle", "seoDescription", "coverAlt", "readingTime", "sortOrder"] as const;
const BANNER_RESTORE_FIELDS = ["title", "imageUrl", "linkUrl", "position", "sortOrder", "startAt", "endAt", "subtitle", "btnText", "mobileImageUrl"] as const;

function own(snapshot: Record<string, unknown>, key: string): boolean { return Object.prototype.hasOwnProperty.call(snapshot, key); }
function optionalString(snapshot: Record<string, unknown>, key: string, nullable = false): string | null | undefined {
  if (!own(snapshot, key)) return undefined;
  const value = snapshot[key];
  if (nullable && value === null) return null;
  if (typeof value !== "string") throw new Error(`Invalid ${key} in rollback snapshot`);
  return value;
}
function optionalInteger(snapshot: Record<string, unknown>, key: string, nullable = false): number | null | undefined {
  if (!own(snapshot, key)) return undefined;
  const value = snapshot[key];
  if (nullable && value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(`Invalid ${key} in rollback snapshot`);
  return value;
}
function optionalDate(snapshot: Record<string, unknown>, key: string): Date | null | undefined {
  if (!own(snapshot, key)) return undefined;
  const value = snapshot[key];
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`Invalid ${key} in rollback snapshot`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${key} in rollback snapshot`);
  return date;
}
function optionalObjectCategory(snapshot: Record<string, unknown>): ObjectCategory | undefined {
  if (!own(snapshot, "objectCategory")) return undefined;
  const value = snapshot.objectCategory;
  if (value === ObjectCategory.BRACELET || value === ObjectCategory.INCENSE || value === ObjectCategory.SEAL || value === ObjectCategory.CERAMIC || value === ObjectCategory.ENAMEL || value === ObjectCategory.SCHOLAR) return value;
  throw new Error("Invalid objectCategory in rollback snapshot");
}
function optionalProductType(snapshot: Record<string, unknown>): ProductType | undefined {
  if (!own(snapshot, "productType")) return undefined;
  const value = snapshot.productType;
  if (value === ProductType.STANDARD || value === ProductType.BATCHED) return value;
  throw new Error("Invalid productType in rollback snapshot");
}
function optionalJournalCategory(snapshot: Record<string, unknown>): JournalCategory | undefined {
  if (!own(snapshot, "category")) return undefined;
  const value = snapshot.category;
  if (value === JournalCategory.OBJECT || value === JournalCategory.MATERIAL || value === JournalCategory.CRAFT || value === JournalCategory.DONGHAI || value === JournalCategory.CREATION || value === JournalCategory.PHILOSOPHY) return value;
  throw new Error("Invalid category in rollback snapshot");
}
function addString(data: Record<string, unknown>, key: string, value: string | null | undefined) { if (value !== undefined) data[key] = value; }
function addInteger(data: Record<string, unknown>, key: string, value: number | null | undefined) { if (value !== undefined) data[key] = value; }
function addDate(data: Record<string, unknown>, key: string, value: Date | null | undefined) { if (value !== undefined) data[key] = value; }

function productRestoreData(snapshot: Record<string, unknown>): ProductRestoreData {
  const data: Record<string, unknown> = {};
  for (const key of ["name", "slug", "theme", "story", "materials", "coverImage", "gallery"] as const) addString(data, key, optionalString(snapshot, key));
  for (const key of ["inspiration", "keywords", "lifeStage", "suitableFor", "materialOrigin", "craftMethod", "serialNumber", "creationStory", "emotionalState"] as const) addString(data, key, optionalString(snapshot, key, true));
  addInteger(data, "sortOrder", optionalInteger(snapshot, "sortOrder"));
  addInteger(data, "companionsCount", optionalInteger(snapshot, "companionsCount"));
  addDate(data, "completionDate", optionalDate(snapshot, "completionDate"));
  addString(data, "objectCategory", optionalObjectCategory(snapshot));
  addString(data, "productType", optionalProductType(snapshot));
  if (Object.keys(data).length === 0) throw new Error("Rollback snapshot has no Product restore fields");
  return data;
}
function seriesRestoreData(snapshot: Record<string, unknown>): SeriesRestoreData {
  const data: Record<string, unknown> = {};
  for (const key of ["slug", "name", "description", "coverImage", "heroText"] as const) addString(data, key, optionalString(snapshot, key));
  for (const key of ["longDesc", "shortDesc"] as const) addString(data, key, optionalString(snapshot, key, true));
  addInteger(data, "sortOrder", optionalInteger(snapshot, "sortOrder"));
  if (Object.keys(data).length === 0) throw new Error("Rollback snapshot has no Series restore fields");
  return data;
}
function journalRestoreData(snapshot: Record<string, unknown>): JournalRestoreData {
  const data: Record<string, unknown> = {};
  for (const key of ["title", "slug", "content"] as const) addString(data, key, optionalString(snapshot, key));
  for (const key of ["excerpt", "coverImage", "seoTitle", "seoDescription", "coverAlt"] as const) addString(data, key, optionalString(snapshot, key, true));
  addInteger(data, "readingTime", optionalInteger(snapshot, "readingTime", true));
  addInteger(data, "sortOrder", optionalInteger(snapshot, "sortOrder"));
  addString(data, "category", optionalJournalCategory(snapshot));
  if (Object.keys(data).length === 0) throw new Error("Rollback snapshot has no Journal restore fields");
  return data;
}
function bannerRestoreData(snapshot: Record<string, unknown>): BannerRestoreData {
  const data: Record<string, unknown> = {};
  addString(data, "title", optionalString(snapshot, "title"));
  for (const key of ["imageUrl", "linkUrl", "position", "subtitle", "btnText", "mobileImageUrl"] as const) addString(data, key, optionalString(snapshot, key, true));
  addInteger(data, "sortOrder", optionalInteger(snapshot, "sortOrder", true));
  addDate(data, "startAt", optionalDate(snapshot, "startAt"));
  addDate(data, "endAt", optionalDate(snapshot, "endAt"));
  if (Object.keys(data).length === 0) throw new Error("Rollback snapshot has no Banner restore fields");
  return data;
}

function sessionValue(user: object, key: string): unknown { return Reflect.get(user, key); }
async function requireEmergencyRollbackPermission(): Promise<RollbackActor> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Emergency rollback requires an authenticated publisher");
  const roleValue = sessionValue(session.user, "role");
  const role = typeof roleValue === "string" ? roleValue : "";
  if (role !== "SUPER_ADMIN" && role !== "BRAND_ADMIN") throw new Error("Emergency rollback requires Publisher administrator permission");
  const userIdValue = sessionValue(session.user, "id");
  const userId = typeof userIdValue === "string" && userIdValue ? userIdValue : session.user.email;
  if (!userId) throw new Error("Emergency rollback requires an auditable actor");
  return { userId, role };
}
function validateRollbackReason(reason: string): string {
  const normalized = reason.trim();
  if (normalized.length < ROLLBACK_REASON_MIN_LENGTH || normalized.length > ROLLBACK_REASON_MAX_LENGTH) throw new Error(`Rollback reason must be ${ROLLBACK_REASON_MIN_LENGTH}-${ROLLBACK_REASON_MAX_LENGTH} characters`);
  if (SENSITIVE_REASON_PATTERN.test(normalized)) throw new Error("Rollback reason must not include URLs or credentials");
  return normalized;
}
function lifecycleForRollback(contentType: ContentType, current: { status?: string | null; publishStatus?: PublishStatus | null }): PublishStatus {
  const rawStatus = contentType === "products" ? current.publishStatus : current.status;
  const lifecycle = canonicalStatus(rawStatus);
  if (!lifecycle) throw new Error("Unsupported current lifecycle state");
  if (lifecycle === PublishStatus.ARCHIVED) throw new Error("Archived content cannot be rolled back");
  return lifecycle;
}
function rollbackSnapshot(record: object, metadata: Record<string, unknown>) {
  return JSON.parse(JSON.stringify({ ...record, rollback: metadata }));
}

/** Emergency Immediate Restore: typed, inclusion-only, and lifecycle-preserving. */
export async function rollbackToVersion(contentType: ContentType, contentId: string | number, targetVersion: number, reason?: string): Promise<{ success: boolean; restoredVersion: number; error?: string }> {
  try {
    if (!ROLLBACK_CONTENT_TYPES.has(contentType)) throw new Error("Rollback is not supported for this content type");
    if (!Number.isInteger(targetVersion) || targetVersion <= 0) throw new Error("Invalid rollback version");
    const normalizedId = normalizeContentId(contentType, contentId);
    const actor = await requireEmergencyRollbackPermission();
    const normalizedReason = validateRollbackReason(reason ?? "");
    const completed = await brandDb.$transaction(async (tx) => {
      const source = await tx.contentVersion.findFirst({ where: { contentType, contentId: String(normalizedId), version: targetVersion } });
      if (!source || !isRecord(source.snapshot)) throw new Error("Rollback version not found or malformed");
      const numericId = typeof normalizedId === "number" ? normalizedId : Number(normalizedId);
      const stringId = String(normalizedId);

      if (contentType === "products") {
        const current = await tx.legacyBrandProduct.findUnique({ where: { id: numericId } });
        if (!current) throw new Error("Content not found");
        const lifecycle = lifecycleForRollback(contentType, current);
        const restored = await tx.legacyBrandProduct.update({ where: { id: numericId }, data: productRestoreData(source.snapshot) });
        return finishRollback(tx, contentType, numericId, targetVersion, source.id, actor, normalizedReason, lifecycle, restored);
      }
      if (contentType === "series") {
        const current = await tx.legacyBrandSeries.findUnique({ where: { id: numericId } });
        if (!current) throw new Error("Content not found");
        const lifecycle = lifecycleForRollback(contentType, current);
        const restored = await tx.legacyBrandSeries.update({ where: { id: numericId }, data: seriesRestoreData(source.snapshot) });
        return finishRollback(tx, contentType, numericId, targetVersion, source.id, actor, normalizedReason, lifecycle, restored);
      }
      if (contentType === "journal") {
        const current = await tx.journalPost.findUnique({ where: { id: stringId } });
        if (!current) throw new Error("Content not found");
        const lifecycle = lifecycleForRollback(contentType, current);
        const restored = await tx.journalPost.update({ where: { id: stringId }, data: journalRestoreData(source.snapshot) });
        return finishRollback(tx, contentType, stringId, targetVersion, source.id, actor, normalizedReason, lifecycle, restored);
      }
      const current = await tx.banner.findUnique({ where: { id: numericId } });
      if (!current) throw new Error("Content not found");
      const lifecycle = lifecycleForRollback(contentType, current);
      const restored = await tx.banner.update({ where: { id: numericId }, data: bannerRestoreData(source.snapshot) });
      return finishRollback(tx, contentType, numericId, targetVersion, source.id, actor, normalizedReason, lifecycle, restored);
    }, { isolationLevel: "Serializable" });
    return { success: true, restoredVersion: completed.restoredVersion };
  } catch (error) { return { success: false, restoredVersion: 0, error: error instanceof Error ? error.message : String(error) }; }
}

async function finishRollback(
  tx: Parameters<typeof brandDb.$transaction>[0] extends (transaction: infer Transaction) => unknown ? Transaction : never,
  contentType: ContentType,
  contentId: string | number,
  sourceVersion: number,
  sourceVersionId: string,
  actor: RollbackActor,
  reason: string,
  lifecycle: PublishStatus,
  restored: object,
) {
  const contentIdString = String(contentId);
  await tx.publishJob.updateMany({ where: { contentType, contentId: contentIdString, status: "pending" }, data: { status: "cancelled" } });
  const latest = await tx.contentVersion.aggregate({ where: { contentType, contentId: contentIdString }, _max: { version: true } });
  const restoredVersion = (latest._max.version ?? 0) + 1;
  const immediatePublicEffect = lifecycle === PublishStatus.PUBLISHED;
  const metadata = { restoredFromVersion: sourceVersion, restoredFromVersionId: sourceVersionId, reason, actor: actor.userId, actorRole: actor.role, lifecycle, immediatePublicEffect };
  await tx.auditLog.create({ data: { userId: actor.userId, action: "ROLLBACK", entityType: contentType, entityId: contentIdString, details: JSON.stringify({ sourceVersion, resultingVersion: restoredVersion, reason, actor: actor.userId, actorRole: actor.role, previousLifecycle: lifecycle, resultingLifecycle: lifecycle, immediatePublicEffect }) } });
  await tx.contentVersion.create({ data: { contentType, contentId: contentIdString, version: restoredVersion, snapshot: rollbackSnapshot(restored, metadata), status: "RESTORED" } });
  return { restoredVersion };
}

const PREVIEW_SECRET = process.env.PREVIEW_SECRET || "yunwu-preview-secret-2024";
export async function generatePreviewToken(contentType: ContentType, contentId: string | number): Promise<string> {
  const payload = JSON.stringify({ ct: contentType, cid: String(contentId), exp: Date.now() + 24 * 60 * 60 * 1000 });
  const hmac = crypto.createHmac("sha256", PREVIEW_SECRET); hmac.update(payload);
  return Buffer.from(JSON.stringify({ p: payload, s: hmac.digest("hex") })).toString("base64url");
}
export async function validatePreviewToken(token: string): Promise<{ valid: boolean; contentType?: ContentType; contentId?: string; error?: string }> {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString()) as { p: string; s: string };
    const hmac = crypto.createHmac("sha256", PREVIEW_SECRET); hmac.update(decoded.p);
    if (hmac.digest("hex") !== decoded.s) return { valid: false, error: "Invalid token signature" };
    const data = JSON.parse(decoded.p) as { ct: ContentType; cid: string; exp: number };
    if (Date.now() > data.exp || !(data.ct in PUBLISHER_CONTENT_REGISTRY)) return { valid: false, error: "Token expired" };
    return { valid: true, contentType: data.ct, contentId: data.cid };
  } catch { return { valid: false, error: "Malformed token" }; }
}
export async function getPreviewContent(contentType: ContentType, contentId: string): Promise<Record<string, unknown> | null> {
  const normalizedId = normalizeContentId(contentType, contentId);
  const contract = PUBLISHER_CONTENT_REGISTRY[contentType];
  const cast = contract.idKind === "integer" ? "::integer" : "";
  const rows = await brandDb.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM ${contract.physicalTable} WHERE id = $1${cast}`, normalizedId);
  return rows[0] ?? null;
}
export async function createSeoSnapshot(contentType: ContentType, contentId: string | number, seoData: { title: string; slug: string; description?: string; keywords?: string; ogImage?: string; canonicalUrl?: string }) {
  const latest = await brandDb.seoSnapshot.aggregate({ where: { contentType, contentId: String(contentId) }, _max: { version: true } });
  await brandDb.seoSnapshot.create({ data: { contentType, contentId: String(contentId), version: (latest._max.version ?? 0) + 1, title: seoData.title, slug: seoData.slug, description: seoData.description ?? null, keywords: seoData.keywords ?? null, ogImage: seoData.ogImage ?? null, canonicalUrl: seoData.canonicalUrl ?? null, publishedAt: new Date() } });
}
function toSnakeCase(value: string) { return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
export async function getContentStatus(contentType: ContentType, contentId: string | number): Promise<{ status: string; publishedAt: string | null; allowedTransitions: PublisherCommand[] }> {
  const id = normalizeContentId(contentType, contentId);
  const current = await readCurrentState(brandDb, contentType, id);
  if (!current) return { status: "UNKNOWN", publishedAt: null, allowedTransitions: [] };
  const commands = await getAllowedTransitions(String(current.status));
  return { status: String(current.rawStatus ?? current.status), publishedAt: current.publishedAt ? current.publishedAt.toISOString() : null, allowedTransitions: commands };
}
