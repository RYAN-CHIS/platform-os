/**
 * Platform OS — Brand Publishing Workflow Engine (WO-P13C)
 *
 * Unified state machine, versioning, scheduling, preview, SEO snapshots
 * for all Brand content types: products | series | journal | home | banners
 *
 * State machine:
 *   DRAFT → IN_REVIEW → APPROVED → SCHEDULED → PUBLISHED → ARCHIVED
 *     ↑         ↓          ↑  ↓                               ↑
 *     │      REJECTED ←───┘  └── reject ─→ REJECTED ←─────────┘
 *     └─────────── unpublish ──────────────────────────────────┘
 */

"use server";

import { brandPrisma } from "@yunwu/db/brand";
import { createAuditLog, createCrudAudit, createStatusAudit } from "@/lib/audit";
import crypto from "crypto";

// ── Types ──

export type PublishState =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHED"
  | "ARCHIVED"
  | "REJECTED";

export type ContentType = "products" | "series" | "journal" | "home" | "banners";

export interface PublishAction {
  action: string;
  contentType: ContentType;
  contentId: string | number;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  description?: string;
}

// ── State transition validation ──

const VALID_TRANSITIONS: Record<PublishState, PublishState[]> = {
  DRAFT: ["IN_REVIEW", "PUBLISHED", "ARCHIVED"],
  IN_REVIEW: ["APPROVED", "REJECTED", "DRAFT"],
  APPROVED: ["SCHEDULED", "PUBLISHED", "REJECTED", "DRAFT"],
  SCHEDULED: ["PUBLISHED", "APPROVED", "DRAFT"], // cancel schedule = back to APPROVED
  PUBLISHED: ["ARCHIVED", "DRAFT"],
  ARCHIVED: ["DRAFT", "IN_REVIEW"],
  REJECTED: ["DRAFT", "IN_REVIEW"],
};

export async function canTransition(from: string, to: PublishState): Promise<boolean> {
  const allowed = VALID_TRANSITIONS[from as PublishState];
  if (!allowed) return false;
  return allowed.includes(to);
}

export async function getAllowedTransitions(currentStatus: string): Promise<PublishState[]> {
  return VALID_TRANSITIONS[currentStatus as PublishState] || [];
}

// ── Table helpers ──

function getTable(contentType: ContentType): string {
  switch (contentType) {
    case "products": return "products";
    case "series": return "series";
    case "journal": return "journal_posts";
    case "home": return "page_contents";
    case "banners": return "banners";
    default: throw new Error(`Unknown content type: ${contentType}`);
  }
}

function getIdColumn(contentType: ContentType): string {
  return contentType === "journal" || contentType === "home" ? "id" : "id";
}

function usesIntegerId(contentType: ContentType) {
  return contentType === "products" || contentType === "series" || contentType === "banners";
}

function normalizeLiveContentId(contentType: ContentType, contentId: string | number) {
  if (!usesIntegerId(contentType)) return String(contentId);

  const id = typeof contentId === "number" ? contentId : Number(contentId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${contentType} id must be a positive integer`);
  }
  return id;
}

function idPredicate(contentType: ContentType, idCol = "id") {
  return usesIntegerId(contentType) ? `${idCol} = $1::integer` : `${idCol} = $1`;
}

// ── Version management ──

/**
 * Create a version snapshot before publishing or on status change.
 */
export async function createVersion(
  contentType: ContentType,
  contentId: string | number,
  snapshot: Record<string, unknown>,
  status: string
): Promise<{ version: number; versionId: string }> {
  try {
    // Get next version number
    const rows = await brandPrisma.$queryRawUnsafe<{ v: number }[]>(
      `SELECT COALESCE(MAX(version), 0) + 1 as v FROM content_versions WHERE content_type = $1 AND content_id = $2`,
      contentType, String(contentId)
    );
    const version = rows[0]?.v || 1;

    const id = crypto.randomUUID();
    await brandPrisma.$executeRawUnsafe(
      `INSERT INTO content_versions (id, content_type, content_id, version, snapshot, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      id, contentType, String(contentId), version, JSON.stringify(snapshot), status
    );

    return { version, versionId: id };
  } catch (e) {
    console.error(`[publisher] createVersion failed for ${contentType}/${contentId}:`, e);
    throw e;
  }
}

/**
 * Get all version history for a content item.
 */
export async function getVersions(
  contentType: ContentType,
  contentId: string | number
): Promise<Array<{ id: string; version: number; snapshot: Record<string, unknown>; status: string; created_at: string }>> {
  try {
    const rows = await brandPrisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT id, version, snapshot, status, created_at FROM content_versions WHERE content_type = $1 AND content_id = $2 ORDER BY version DESC`,
      contentType, String(contentId)
    );
    return rows.map(r => ({
      id: r.id as string,
      version: r.version as number,
      snapshot: typeof r.snapshot === "string" ? JSON.parse(r.snapshot as string) : (r.snapshot as Record<string, unknown>),
      status: r.status as string,
      created_at: r.created_at as string,
    }));
  } catch (e) {
    console.error(`[publisher] getVersions failed:`, e);
    return [];
  }
}

/**
 * Rollback content to a specific version.
 * Reads the snapshot from content_versions and restores it to the live table.
 */
export async function rollbackToVersion(
  contentType: ContentType,
  contentId: string | number,
  targetVersion: number
): Promise<{ success: boolean; restoredVersion: number; error?: string }> {
  try {
    const liveContentId = normalizeLiveContentId(contentType, contentId);
    // Fetch the target snapshot
    const rows = await brandPrisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT version, snapshot, status FROM content_versions WHERE content_type = $1 AND content_id = $2 AND version = $3`,
      contentType, String(contentId), targetVersion
    );
    if (!rows.length) {
      return { success: false, restoredVersion: 0, error: "Version not found" };
    }

    const snapshot = typeof rows[0].snapshot === "string"
      ? JSON.parse(rows[0].snapshot as string)
      : rows[0].snapshot as Record<string, unknown>;

    const table = getTable(contentType);

    // Build UPDATE statement from snapshot (exclude internal fields)
    const skipFields = ["id", "created_at", "updated_at", "createdAt", "updatedAt"];
    const entries = Object.entries(snapshot).filter(([k]) => !skipFields.includes(k));

    if (entries.length > 0) {
      const setClauses = entries.map((_, i) => `${toSnakeCase(entries[i][0])} = $${i + 1}`);
      const values = entries.map(([_, v]) => v);
      const idParamIndex = values.length + 1;

      const idCol = "id";
      await brandPrisma.$executeRawUnsafe(
        `UPDATE ${table} SET ${setClauses.join(", ")}, updated_at = NOW() WHERE ${idCol} = $${idParamIndex}${usesIntegerId(contentType) ? "::integer" : ""}`,
        ...values, liveContentId
      );
    }

    // Write rollback audit
    try {
      await createAuditLog({
        action: "ROLLBACK",
        system: "BRAND",
        module: contentType,
        targetId: contentId,
        before: { status: rows[0].status },
        after: { version: targetVersion, status: snapshot.status },
        description: `回滚到版本 ${targetVersion}`,
        extra: { version: targetVersion, snapshotId: rows[0].id },
      });
    } catch { /* audit is non-blocking */ }

    return { success: true, restoredVersion: targetVersion };
  } catch (e: any) {
    return { success: false, restoredVersion: 0, error: e.message };
  }
}

// ── Status transitions ──

/**
 * Update content status with validation, audit, and optional auto-publish.
 */
export async function transitionStatus(
  contentType: ContentType,
  contentId: string | number,
  newStatus: PublishState,
  options?: { reason?: string; publishAt?: string }
): Promise<{ success: boolean; error?: string; previousStatus?: string }> {
  try {
    const table = getTable(contentType);
    const idCol = "id";
    const liveContentId = normalizeLiveContentId(contentType, contentId);

    // Fetch current state
    const current = await brandPrisma.$queryRawUnsafe<{ status: string }[]>(
      `SELECT status FROM ${table} WHERE ${idPredicate(contentType, idCol)}`, liveContentId
    );
    if (!current.length) return { success: false, error: "Content not found" };

    const fromStatus = current[0].status;

    // Validate transition
    if (!(await canTransition(fromStatus, newStatus))) {
      return {
        success: false,
        error: `不允许从 ${fromStatus} 变更为 ${newStatus}。允许的变更：${(await getAllowedTransitions(fromStatus)).join(", ")}`,
        previousStatus: fromStatus,
      };
    }

    // Handle scheduled publish
    const now = new Date().toISOString();
    const isPublishing = newStatus === "PUBLISHED";

    // For journal posts, status is PublishStatus enum
    if (contentType === "journal") {
      await brandPrisma.$executeRawUnsafe(
        `UPDATE ${table} SET status = CAST($1 AS "PublishStatus"), published_at = CASE WHEN $2 = true THEN COALESCE(published_at, NOW()) ELSE published_at END, updated_at = NOW() WHERE ${idCol} = $3`,
        newStatus, isPublishing, liveContentId
      );
    } else {
      const extraSet = isPublishing ? `, published_at = COALESCE(published_at, NOW())` : "";
      await brandPrisma.$executeRawUnsafe(
        `UPDATE ${table} SET status = $1${extraSet}, updated_at = NOW() WHERE ${idCol} = $2${usesIntegerId(contentType) ? "::integer" : ""}`,
        newStatus, liveContentId
      );
    }

    // Handle publish_jobs
    if (newStatus === "SCHEDULED" && options?.publishAt) {
      await brandPrisma.$executeRawUnsafe(
        `INSERT INTO publish_jobs (id, content_type, content_id, publish_at, status) VALUES ($1, $2, $3, $4, 'pending') ON CONFLICT DO NOTHING`,
        crypto.randomUUID(), contentType, String(contentId), options.publishAt
      );
    }
    // Cancel pending jobs if moving away from SCHEDULED
    if (fromStatus === "SCHEDULED" && newStatus !== "PUBLISHED") {
      await brandPrisma.$executeRawUnsafe(
        `UPDATE publish_jobs SET status = 'cancelled' WHERE content_type = $1 AND content_id = $2 AND status = 'pending'`,
        contentType, String(contentId)
      );
    }

    // Mark jobs as published
    if (isPublishing) {
      await brandPrisma.$executeRawUnsafe(
        `UPDATE publish_jobs SET status = 'published' WHERE content_type = $1 AND content_id = $2 AND status = 'pending'`,
        contentType, String(contentId)
      );
    }

    // Create version snapshot on publish
    if (isPublishing) {
      const fullContent = await brandPrisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT * FROM ${table} WHERE ${idPredicate(contentType, idCol)}`, liveContentId
      );
      if (fullContent.length > 0) {
        try { await createVersion(contentType, contentId, fullContent[0], newStatus); } catch {}
      }
    }

    // Audit
    const auditAction = isPublishing ? "PUBLISH"
      : newStatus === "ARCHIVED" ? "ARCHIVE"
      : newStatus === "IN_REVIEW" ? "SUBMIT_REVIEW"
      : newStatus === "APPROVED" ? "APPROVE"
      : newStatus === "REJECTED" ? "REJECT"
      : options?.publishAt ? "SCHEDULE_PUBLISH"
      : "STATUS_CHANGE";

    try {
      await createAuditLog({
        action: auditAction,
        system: "BRAND",
        module: contentType,
        targetId: contentId,
        before: { status: fromStatus },
        after: { status: newStatus },
        description: options?.reason || `${fromStatus} → ${newStatus}`,
      });
    } catch {}

    return { success: true, previousStatus: fromStatus };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Publishing shortcuts ──

export async function submitForReview(contentType: ContentType, contentId: string | number) {
  return transitionStatus(contentType, contentId, "IN_REVIEW");
}

export async function approveContent(contentType: ContentType, contentId: string | number) {
  return transitionStatus(contentType, contentId, "APPROVED");
}

export async function rejectContent(contentType: ContentType, contentId: string | number, reason?: string) {
  return transitionStatus(contentType, contentId, "REJECTED", { reason });
}

export async function publishNow(contentType: ContentType, contentId: string | number) {
  return transitionStatus(contentType, contentId, "PUBLISHED");
}

export async function schedulePublish(contentType: ContentType, contentId: string | number, publishAt: string) {
  return transitionStatus(contentType, contentId, "SCHEDULED", { publishAt });
}

export async function unpublishContent(contentType: ContentType, contentId: string | number) {
  return transitionStatus(contentType, contentId, "DRAFT");
}

export async function archiveContent(contentType: ContentType, contentId: string | number) {
  return transitionStatus(contentType, contentId, "ARCHIVED");
}

// ── Publish jobs scanner (for cron/worker) ──

/**
 * Process all due publish jobs. Called by cron or manual trigger.
 */
export async function processPublishJobs(): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    const jobs = await brandPrisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT id, content_type, content_id, publish_at FROM publish_jobs WHERE status = 'pending' AND publish_at <= NOW()`
    );

    for (const job of jobs) {
      try {
        const result = await transitionStatus(
          job.content_type as ContentType,
          job.content_id as string,
          "PUBLISHED"
        );

        if (result.success) {
          await brandPrisma.$executeRawUnsafe(
            `UPDATE publish_jobs SET status = 'published' WHERE id = $1`, job.id as string
          );
          processed++;

          // Auto-publish audit
          try {
            await createAuditLog({
              action: "AUTO_PUBLISH",
              system: "BRAND",
              module: job.content_type as string,
              targetId: job.content_id as string,
              description: `定时发布任务 #${job.id}`,
              extra: { jobId: job.id, scheduledAt: job.publish_at },
            });
          } catch {}
        } else {
          await brandPrisma.$executeRawUnsafe(
            `UPDATE publish_jobs SET status = 'failed' WHERE id = $1`, job.id as string
          );
          errors++;
        }
      } catch {
        errors++;
      }
    }
  } catch (e) {
    console.error("[publisher] processPublishJobs failed:", e);
  }

  return { processed, errors };
}

// ── Preview token ──

const PREVIEW_SECRET = process.env.PREVIEW_SECRET || "yunwu-preview-secret-2024";

/**
 * Generate a time-limited preview token for sharing draft content.
 */
export async function generatePreviewToken(
  contentType: ContentType,
  contentId: string | number
): Promise<string> {
  const payload = JSON.stringify({
    ct: contentType,
    cid: String(contentId),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  const hmac = crypto.createHmac("sha256", PREVIEW_SECRET);
  hmac.update(payload);
  const sig = hmac.digest("hex");
  const token = Buffer.from(JSON.stringify({ p: payload, s: sig })).toString("base64url");

  try {
    await createAuditLog({
      action: "PREVIEW_CREATE",
      system: "BRAND",
      module: contentType,
      targetId: contentId,
      description: "预览令牌已生成",
    });
  } catch {}

  return token;
}

/**
 * Validate a preview token and return the content reference if valid.
 */
export async function validatePreviewToken(
  token: string
): Promise<{ valid: boolean; contentType?: ContentType; contentId?: string; error?: string }> {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString());
    const { p: payload, s: sig } = decoded;

    // Verify signature
    const hmac = crypto.createHmac("sha256", PREVIEW_SECRET);
    hmac.update(payload);
    if (hmac.digest("hex") !== sig) {
      return { valid: false, error: "Invalid token signature" };
    }

    const data = JSON.parse(payload);
    if (Date.now() > data.exp) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, contentType: data.ct as ContentType, contentId: data.cid };
  } catch {
    return { valid: false, error: "Malformed token" };
  }
}

/**
 * Fetch content by type and ID (reads draft content for preview).
 */
export async function getPreviewContent(
  contentType: ContentType,
  contentId: string
): Promise<Record<string, unknown> | null> {
  const table = getTable(contentType);
  const liveContentId = normalizeLiveContentId(contentType, contentId);
  const rows = await brandPrisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM ${table} WHERE ${idPredicate(contentType)}`, liveContentId
  );
  return rows.length > 0 ? rows[0] : null;
}

// ── SEO snapshot ──

/**
 * Save an SEO snapshot for a content item on publish.
 */
export async function createSeoSnapshot(
  contentType: ContentType,
  contentId: string | number,
  seoData: {
    title: string;
    slug: string;
    description?: string;
    keywords?: string;
    ogImage?: string;
    canonicalUrl?: string;
  }
): Promise<void> {
  try {
    // Get next version
    const rows = await brandPrisma.$queryRawUnsafe<{ v: number }[]>(
      `SELECT COALESCE(MAX(version), 0) + 1 as v FROM seo_snapshots WHERE content_type = $1 AND content_id = $2`,
      contentType, String(contentId)
    );

    await brandPrisma.$executeRawUnsafe(
      `INSERT INTO seo_snapshots (id, content_type, content_id, version, title, slug, description, keywords, og_image, canonical_url, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      crypto.randomUUID(),
      contentType,
      String(contentId),
      rows[0]?.v || 1,
      seoData.title,
      seoData.slug,
      seoData.description || null,
      seoData.keywords || null,
      seoData.ogImage || null,
      seoData.canonicalUrl || null
    );

    try {
      await createAuditLog({
        action: "SEO_UPDATE",
        system: "BRAND",
        module: contentType,
        targetId: contentId,
        after: seoData as unknown as Record<string, unknown>,
        description: "SEO 快照已保存",
      });
    } catch {}
  } catch (e) {
    console.error("[publisher] createSeoSnapshot failed:", e);
  }
}

// ── Utility ──

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Get current publish status of a content item.
 */
export async function getContentStatus(
  contentType: ContentType,
  contentId: string | number
): Promise<{ status: string; publishedAt: string | null; allowedTransitions: PublishState[] }> {
  const table = getTable(contentType);
  const liveContentId = normalizeLiveContentId(contentType, contentId);
  const rows = await brandPrisma.$queryRawUnsafe<{ status: string; published_at: string | null }[]>(
    `SELECT status, published_at FROM ${table} WHERE ${idPredicate(contentType)}`, liveContentId
  );
  if (!rows.length) {
    return { status: "UNKNOWN", publishedAt: null, allowedTransitions: [] };
  }
  return {
    status: rows[0].status,
    publishedAt: rows[0].published_at,
    allowedTransitions: await getAllowedTransitions(rows[0].status),
  };
}
