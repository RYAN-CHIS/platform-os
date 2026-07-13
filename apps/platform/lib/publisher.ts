/**
 * Brand Publisher: workflow commands resolve to canonical persistence states.
 * Workflow-only labels (IN_REVIEW, SCHEDULED, REJECTED) are never persisted as
 * PublishStatus values. ADR-001 owns this contract.
 */

"use server";

import crypto from "crypto";
import { brandDb, PublishStatus } from "@/lib/brand-db";
import { createAuditLog } from "@/lib/audit";

export type ContentType = "products" | "series" | "journal" | "banners" | "home";
export type PublisherCommand =
  | "SUBMIT_FOR_REVIEW"
  | "APPROVE"
  | "REJECT"
  | "SCHEDULE"
  | "PUBLISH"
  | "UNPUBLISH"
  | "ARCHIVE";

type IdKind = "integer" | "string";
type PersistenceKind = "product-dual" | "string-status" | "publish-status" | "legacy-raw";
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
  // PageContent does not model Publisher's physical status columns. Home actions
  // are excluded from E1; this narrow raw fallback preserves their existing path.
  home: {
    physicalTable: "page_contents", idKind: "string", persistenceKind: "legacy-raw",
    workflowStatusField: "status", persistenceStatusField: null, publishedAtField: "publishedAt",
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
  if (PUBLISHER_CONTENT_REGISTRY[contentType].idKind === "string") return String(contentId);
  const id = typeof contentId === "number" ? contentId : Number(contentId);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${contentType} id must be a positive integer`);
  return id;
}

type BrandTransaction = Pick<typeof brandDb,
  "legacyBrandProduct" | "legacyBrandSeries" | "journalPost" | "banner" | "publishJob" | "$queryRawUnsafe" | "$executeRawUnsafe"
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
    case "home": {
      const rows = await db.$queryRawUnsafe<{ status: string | null; published_at: Date | null }[]>("SELECT status, published_at FROM page_contents WHERE id = $1", contentId as string);
      return rows[0] ? { status: rows[0].status, rawStatus: rows[0].status, publishedAt: rows[0].published_at } : null;
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
    case "home":
      return db.$executeRawUnsafe(
        "UPDATE page_contents SET status = $1, published_at = CASE WHEN $2 THEN COALESCE(published_at, NOW()) ELSE published_at END, updated_at = NOW() WHERE id = $3",
        transition.workflowStatus, transition.writesPublishedAt, contentId as string,
      );
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
      } catch { /* version history must not roll back a completed publish */ }
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

/** Rollback remains Phase E2: snapshots may contain schema-unmodeled live columns. */
export async function rollbackToVersion(contentType: ContentType, contentId: string | number, targetVersion: number): Promise<{ success: boolean; restoredVersion: number; error?: string }> {
  try {
    const normalizedId = normalizeContentId(contentType, contentId);
    const row = await brandDb.contentVersion.findFirst({ where: { contentType, contentId: String(normalizedId), version: targetVersion } });
    if (!row || !isRecord(row.snapshot)) return { success: false, restoredVersion: 0, error: "Version not found" };
    const snapshot = row.snapshot;
    const fields = Object.entries(snapshot).filter(([key]) => !["id", "created_at", "updated_at", "createdAt", "updatedAt"].includes(key));
    if (fields.length) {
      const table = PUBLISHER_CONTENT_REGISTRY[contentType].physicalTable;
      const clauses = fields.map(([key], index) => `${toSnakeCase(key)} = $${index + 1}`);
      const idIndex = fields.length + 1;
      const idCast = PUBLISHER_CONTENT_REGISTRY[contentType].idKind === "integer" ? "::integer" : "";
      await brandDb.$executeRawUnsafe(`UPDATE ${table} SET ${clauses.join(", ")}, updated_at = NOW() WHERE id = $${idIndex}${idCast}`, ...fields.map(([, value]) => value), normalizedId);
    }
    await createAuditLog({ action: "ROLLBACK", system: "BRAND", module: contentType, targetId: normalizedId, after: { version: targetVersion }, description: `回滚到版本 ${targetVersion}` });
    return { success: true, restoredVersion: targetVersion };
  } catch (error) { return { success: false, restoredVersion: 0, error: error instanceof Error ? error.message : String(error) }; }
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
