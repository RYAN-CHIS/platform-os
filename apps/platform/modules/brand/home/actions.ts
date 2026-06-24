// ══════════════════════════════════════════════════════════
// Brand Home — actions (WO-P13C Publishing Workflow)
// ══════════════════════════════════════════════════════════

"use server";

import { brandPrisma } from "@yunwu/db/brand";
import { prisma } from "@yunwu/db";
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
    const [seriesCount, productCount, journalCount] = await Promise.all([
      brandPrisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as count FROM series`),
      brandPrisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as count FROM products`),
      brandPrisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as count FROM journal_posts`),
    ]);
    return {
      seriesCount: seriesCount[0]?.count || 0,
      productCount: productCount[0]?.count || 0,
      journalCount: journalCount[0]?.count || 0,
      materialCount: 0,
      mediaCount: 0,
      bannerCount: await getBannerCount(),
      orderCount: 0,
      contactCount: 0,
    };
  } catch {
    return { seriesCount: 0, productCount: 0, journalCount: 0, materialCount: 0, mediaCount: 0, bannerCount: 0, orderCount: 0, contactCount: 0 };
  }
}

async function getBannerCount() {
  try {
    const rows = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as count FROM banners`);
    return rows[0]?.count || 0;
  } catch { return 0; }
}

// ── Page Contents (Brand DB: page_contents) ──

export async function getPageContents() {
  try {
    const rows = await brandPrisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM page_contents ORDER BY page_key ASC, sort_order ASC`
    );
    return rows;
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
    const id = crypto.randomUUID();
    await brandPrisma.$executeRawUnsafe(
      `INSERT INTO page_contents (id, page_key, section_key, title, content, sort_order, published, status)
       VALUES ($1, $2, $3, $4, $5, $6, false, 'DRAFT')`,
      id,
      data.pageKey,
      data.sectionKey,
      data.title,
      data.content,
      data.sortOrder || 0
    );
    const rows = await brandPrisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM page_contents WHERE id = $1`,
      id
    );
    return { row: rows[0], error: null };
  } catch (e: any) {
    return { row: null, error: e.message };
  }
}

export async function updatePageContent(id: string, data: Record<string, unknown>) {
  try {
    const before = await brandPrisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM page_contents WHERE id = $1`,
      id
    );
    if (!before.length) return { row: null, error: "Content not found" };

    const sets: string[] = [];
    const vals: any[] = [id];
    for (const [k, v] of Object.entries(data)) {
      if (k === "id") continue;
      sets.push(`${toSnakeCase(k)} = $${vals.length + 1}`);
      vals.push(v);
    }
    if (sets.length > 0) {
      vals.push(new Date().toISOString());
      await brandPrisma.$executeRawUnsafe(
        `UPDATE page_contents SET ${sets.join(", ")}, updated_at = $${vals.length} WHERE id = $1`,
        ...vals
      );
    }
    const after = await brandPrisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM page_contents WHERE id = $1`,
      id
    );
    return { row: after[0], error: null };
  } catch (e: any) {
    return { row: null, error: e.message };
  }
}

export async function deletePageContent(id: string) {
  try {
    const before = await brandPrisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM page_contents WHERE id = $1`,
      id
    );
    if (!before.length) return { error: "Content not found" };

    await brandPrisma.$executeRawUnsafe(
      `DELETE FROM page_contents WHERE id = $1`,
      id
    );
    return { error: null };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ── Site Settings ──

export async function getSiteSettings() {
  try {
    const settings = await prisma.siteSetting.findMany();
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  } catch {
    return {};
  }
}

export async function updateSiteSetting(key: string, value: string) {
  try {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return { error: null };
  } catch (e: any) {
    return { error: e.message };
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

// ── Utility ──

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
