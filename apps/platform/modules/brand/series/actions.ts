"use server";
/**
 * Brand Series — WO-P12B Full CRUD + WO-P13C Publishing Workflow
 * Queries Brand DB directly (table: series)
 */
import { brandPrisma } from "@yunwu/db/brand";
import { createCrudAudit, createAuditLog } from "@/lib/audit";
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

const TABLE = "series";

export async function listSeries(search?: string) {
  try {
    let where = "";
    const params: any[] = [];
    if (search) {
      where = `WHERE (name ILIKE $1 OR slug ILIKE $1)`;
      params.push(`%${search}%`);
    }
    const sql = `SELECT * FROM ${TABLE} ${where} ORDER BY sort_order ASC, id DESC LIMIT 100`;
    const rows: any[] = await brandPrisma.$queryRawUnsafe(sql, ...params);
    return { rows, error: null };
  } catch (e: any) {
    return { rows: [] as any[], error: e.message };
  }
}

export async function createSeries(data: Record<string, unknown>) {
  try {
    // Ensure NOT NULL columns without defaults are included
    const enriched = { ...data, updatedAt: new Date().toISOString() };
    const cols = Object.keys(enriched).map(k => `"${k}"`).join(", ");
    const placeholders = Object.keys(enriched).map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${TABLE} (${cols}) VALUES (${placeholders}) RETURNING *`;
    const rows: any[] = await brandPrisma.$queryRawUnsafe(sql, ...Object.values(enriched));
    const row = rows[0];

    // Audit
    try {
      await createCrudAudit({ action: "CREATE", system: "BRAND", module: "series", targetId: row.id, after: row });
    } catch {}

    return { row, error: null };
  } catch (e: any) {
    return { row: null, error: e.message };
  }
}

export async function updateSeries(id: number, data: Record<string, unknown>) {
  try {
    // Fetch before
    const beforeRows: any[] = await brandPrisma.$queryRawUnsafe(`SELECT * FROM ${TABLE} WHERE id = $1`, id);
    const before = beforeRows[0] || null;

    const enriched = { ...data, updatedAt: new Date().toISOString() };
    const sets = Object.keys(enriched).map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const vals = Object.values(enriched);
    const sql = `UPDATE ${TABLE} SET ${sets} WHERE id = $${vals.length + 1} RETURNING *`;
    const afterRows: any[] = await brandPrisma.$queryRawUnsafe(sql, ...vals, id);
    const after = afterRows[0] || null;

    // Audit
    try {
      await createCrudAudit({ action: "UPDATE", system: "BRAND", module: "series", targetId: id, before, after });
    } catch {}

    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deleteSeries(id: number) {
  try {
    // Fetch before
    const beforeRows: any[] = await brandPrisma.$queryRawUnsafe(`SELECT * FROM ${TABLE} WHERE id = $1`, id);
    const before = beforeRows[0] || null;

    await brandPrisma.$queryRawUnsafe(`DELETE FROM ${TABLE} WHERE id = $1`, id);

    // Audit
    try {
      await createCrudAudit({ action: "DELETE", system: "BRAND", module: "series", targetId: id, before });
    } catch {}

    return { error: null };
  } catch (e: any) {
    return { error: e.message };
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

export async function rollbackSeries(id: number, version: number) {
  return rollbackToVersion("series", id, version);
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
  const newStatus = active ? "PUBLISHED" : "DRAFT";
  const result = await transitionStatus("series", id, newStatus as any);
  if (!result.success) return { row: null, error: result.error || "状态变更失败" };
  const rows = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT * FROM series WHERE id = $1`, id);
  // Also sync is_active
  await brandPrisma.$executeRawUnsafe(`UPDATE series SET is_active = $1 WHERE id = $2`, active, id);
  return { row: rows[0] || null, error: null };
}

export async function moveSeries(id: number, direction: "up" | "down") {
  try {
    const rows: any[] = await brandPrisma.$queryRawUnsafe(
      `SELECT id, sort_order FROM ${TABLE} WHERE id = $1`, id
    );
    if (!rows.length) return { error: "Series not found" };

    const current = rows[0].sort_order;
    const op = direction === "up" ? "<" : ">";
    const orderDir = direction === "up" ? "DESC" : "ASC";

    const neighbors: any[] = await brandPrisma.$queryRawUnsafe(
      `SELECT id, sort_order FROM ${TABLE} WHERE sort_order ${op} $1 ORDER BY sort_order ${orderDir} LIMIT 1`,
      current
    );
    if (!neighbors.length) return { error: null };

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
      await createAuditLog({ action: "SORT_CHANGE", system: "BRAND", module: "series", targetId: id, before, after });
    } catch {}

    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}
