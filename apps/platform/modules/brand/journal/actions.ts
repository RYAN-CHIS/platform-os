"use server";
/**
 * Brand Journal — WO-P12B Full CRUD
 * Queries Brand DB directly (table: journal_posts)
 */
import { brandPrisma } from "@yunwu/db/brand";
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
  createSeoSnapshot,
} from "@/lib/publisher";

const TABLE = "journal_posts";

export async function listPosts(search?: string) {
  try {
    let where = "";
    const params: any[] = [];
    if (search) {
      where = `WHERE (title ILIKE $1 OR excerpt ILIKE $1)`;
      params.push(`%${search}%`);
    }
    const sql = `SELECT * FROM ${TABLE} ${where} ORDER BY sort_order ASC, created_at DESC LIMIT 200`;
    const rows: any[] = await brandPrisma.$queryRawUnsafe(sql, ...params);
    return { rows, error: null };
  } catch (e: any) {
    return { rows: [] as any[], error: e.message };
  }
}

export async function createPost(data: Record<string, unknown>) {
  try {
    const rawStatus = String(data.status || "DRAFT").toUpperCase();
    const validStatuses = ["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED", "REJECTED"];
    const status = validStatuses.includes(rawStatus) ? rawStatus : "DRAFT";
    const enriched = {
      ...data,
      id: data.id || `cj${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      status,
      updated_at: new Date().toISOString(),
    };
    const cols = Object.keys(enriched).map(k => `"${k}"`).join(", ");
    const placeholders = Object.keys(enriched).map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${TABLE} (${cols}) VALUES (${placeholders}) RETURNING *`;
    const rows: any[] = await brandPrisma.$queryRawUnsafe(sql, ...Object.values(enriched));
    const row = rows[0];

    try {
      await createCrudAudit({ action: "CREATE", system: "BRAND", module: "journal", targetId: row.id, after: row });
    } catch {}

    return { row, error: null };
  } catch (e: any) {
    return { row: null, error: e.message };
  }
}

export async function updatePost(cuid: string, data: Record<string, unknown>) {
  try {
    const beforeRows: any[] = await brandPrisma.$queryRawUnsafe(`SELECT * FROM ${TABLE} WHERE id = $1`, cuid);
    const before = beforeRows[0] || null;

    const enriched = { ...data, updated_at: new Date().toISOString() };
    const sets = Object.keys(enriched).map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const vals = Object.values(enriched);
    const sql = `UPDATE ${TABLE} SET ${sets} WHERE id = $${vals.length + 1} RETURNING *`;
    const afterRows: any[] = await brandPrisma.$queryRawUnsafe(sql, ...vals, cuid);
    const after = afterRows[0] || null;

    try {
      await createCrudAudit({ action: "UPDATE", system: "BRAND", module: "journal", targetId: cuid, before, after });
    } catch {}

    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deletePost(cuid: string) {
  try {
    const beforeRows: any[] = await brandPrisma.$queryRawUnsafe(`SELECT * FROM ${TABLE} WHERE id = $1`, cuid);
    const before = beforeRows[0] || null;

    await brandPrisma.$queryRawUnsafe(`DELETE FROM ${TABLE} WHERE id = $1`, cuid);

    try {
      await createCrudAudit({ action: "DELETE", system: "BRAND", module: "journal", targetId: cuid, before });
    } catch {}

    return { error: null };
  } catch (e: any) {
    return { error: e.message };
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

export async function rollbackPost(cuid: string, version: number) {
  return rollbackToVersion("journal", cuid, version);
}

export async function getPostPreviewToken(cuid: string) {
  return generatePreviewToken("journal", cuid);
}

export async function getPostStatus(cuid: string) {
  return getContentStatus("journal", cuid);
}

export async function savePostSeoSnapshot(cuid: string) {
  const rows = await brandPrisma.$queryRawUnsafe<any[]>(
    `SELECT title, slug, seo_title, seo_description, excerpt FROM journal_posts WHERE id = $1`,
    cuid
  );
  if (!rows.length) return;
  const p = rows[0];
  return createSeoSnapshot("journal", cuid, {
    title: p.seo_title || p.title,
    slug: p.slug,
    description: p.seo_description || p.excerpt || "",
    keywords: "",
  });
}

// ── Status toggle (uses publisher engine) ──

export async function togglePostStatus(cuid: string, newStatus: string): Promise<{ row: any; error: string | null }> {
  const result = await transitionStatus("journal", cuid, newStatus as any);
  if (!result.success) return { row: null, error: result.error || "状态变更失败" };
  const rows = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT * FROM ${TABLE} WHERE id = $1`, cuid);
  return { row: rows[0] || null, error: null };
}

export async function movePost(cuid: string, direction: "up" | "down") {
  try {
    const rows: any[] = await brandPrisma.$queryRawUnsafe(
      `SELECT id, sort_order FROM ${TABLE} WHERE id = $1`, cuid
    );
    if (!rows.length) return { error: "Post not found" };

    const current = rows[0].sort_order;
    const op = direction === "up" ? "<" : ">";
    const orderDir = direction === "up" ? "DESC" : "ASC";

    const neighbors: any[] = await brandPrisma.$queryRawUnsafe(
      `SELECT id, sort_order FROM ${TABLE} WHERE sort_order ${op} $1 ORDER BY sort_order ${orderDir} LIMIT 1`,
      current
    );
    if (!neighbors.length) return { error: null };

    const neighbor = neighbors[0];

    const before = { [cuid]: current, [neighbor.id]: neighbor.sort_order };

    await brandPrisma.$queryRawUnsafe(
      `UPDATE ${TABLE} SET sort_order = $1 WHERE id = $2`, neighbor.sort_order, cuid
    );
    await brandPrisma.$queryRawUnsafe(
      `UPDATE ${TABLE} SET sort_order = $1 WHERE id = $2`, current, neighbor.id
    );

    const after = { [cuid]: neighbor.sort_order, [neighbor.id]: current };

    try {
      await createAuditLog({ action: "SORT_CHANGE", system: "BRAND", module: "journal", targetId: cuid, before, after });
    } catch {}

    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}
