"use server";
/**
 * Brand Products — WO-P12B Full CRUD + Publishing Workflow
 * Queries Brand DB directly (table: products)
 * Status changes are routed through the publisher engine.
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
} from "@/lib/publisher";

const TABLE = "products";

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
    // Ensure NOT NULL columns without defaults are included
    const enriched = { ...data, updated_at: new Date().toISOString() };
    const cols = Object.keys(enriched).map(k => `"${k}"`).join(", ");
    const placeholders = Object.keys(enriched).map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${TABLE} (${cols}) VALUES (${placeholders}) RETURNING *`;
    const rows: any[] = await brandPrisma.$queryRawUnsafe(sql, ...Object.values(enriched));
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

    const enriched = { ...data, updated_at: new Date().toISOString() };
    const sets = Object.keys(enriched).map((k, i) => `"${k}" = $${i + 1}`).join(", ");
    const vals = Object.values(enriched);
    const sql = `UPDATE ${TABLE} SET ${sets} WHERE id = $${vals.length + 1} RETURNING *`;
    const afterRows: any[] = await brandPrisma.$queryRawUnsafe(sql, ...vals, id);
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
