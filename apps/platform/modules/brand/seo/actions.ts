"use server";

import { prisma } from "@yunwu/db";
import { createCrudAudit } from "@/lib/audit";

// Predefined pages that should have SEO config
const DEFAULT_PAGES = [
  { pageKey: "home", label: "首页" },
  { pageKey: "products", label: "产品页" },
  { pageKey: "series", label: "系列页" },
  { pageKey: "journal", label: "品牌志" },
  { pageKey: "about", label: "关于页" },
  { pageKey: "contact", label: "联系页" },
];

export async function listSeoConfigs() {
  try {
    // Try to query seoConfig from ERP DB
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, page_key, title, description, keywords, og_title, og_description, og_image, canonical, robots, updated_at
      FROM seo_configs ORDER BY page_key ASC
    `);
    // Merge with default pages - ensure all pages exist
    const existing = new Map(rows.map((r: any) => [r.page_key, r]));
    const merged = DEFAULT_PAGES.map((dp) =>
      existing.get(dp.pageKey) || {
        id: null,
        page_key: dp.pageKey,
        title: dp.label,
        description: null,
        keywords: null,
        og_title: null,
        og_description: null,
        og_image: null,
        canonical: null,
        robots: null,
        updated_at: null,
      }
    );
    return { configs: merged, total: merged.length, error: null };
  } catch (e: any) {
    // Fallback: return default pages only
    return {
      configs: DEFAULT_PAGES.map((d) => ({
        id: null,
        page_key: d.pageKey,
        title: d.label,
        description: null,
        keywords: null,
        og_title: null,
        og_description: null,
        og_image: null,
        canonical: null,
        robots: null,
        updated_at: null,
      })),
      total: DEFAULT_PAGES.length,
      error: null,
    };
  }
}

export async function saveSeoConfig(data: {
  page_key: string;
  title: string;
  description?: string;
  keywords?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  canonical?: string;
  robots?: string;
}) {
  try {
    // Try UPSERT
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO seo_configs (id, page_key, title, description, keywords, og_title, og_description, og_image, canonical, robots, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (page_key) DO UPDATE SET
        title = EXCLUDED.title, description = EXCLUDED.description, keywords = EXCLUDED.keywords,
        og_title = EXCLUDED.og_title, og_description = EXCLUDED.og_description, og_image = EXCLUDED.og_image,
        canonical = EXCLUDED.canonical, robots = EXCLUDED.robots, updated_at = NOW()
    `,
      data.page_key,
      data.title,
      data.description || null,
      data.keywords || null,
      data.og_title || null,
      data.og_description || null,
      data.og_image || null,
      data.canonical || null,
      data.robots || null,
    );

    try {
      await createCrudAudit({
        action: "UPDATE",
        system: "BRAND",
        module: "seo",
        targetId: data.page_key,
        after: data,
      });
    } catch {}

    return { error: null };
  } catch (e: any) {
    // If table doesn't exist, create it first
    if (
      e.message.includes("does not exist") ||
      e.message.includes("undefined")
    ) {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS seo_configs (
            id TEXT PRIMARY KEY,
            page_key VARCHAR(100) UNIQUE NOT NULL,
            title VARCHAR(255),
            description TEXT,
            keywords TEXT,
            og_title VARCHAR(255),
            og_description TEXT,
            og_image TEXT,
            canonical TEXT,
            robots VARCHAR(50),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        // Retry
        return saveSeoConfig(data);
      } catch (e2: any) {
        return { error: e2.message };
      }
    }
    return { error: e.message };
  }
}
