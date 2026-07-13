"use server";

import { brandDb } from "@/lib/brand-db";
import { createCrudAudit } from "@/lib/audit";

const DEFAULT_PAGES = [
  { pageKey: "home", label: "首页" },
  { pageKey: "products", label: "产品页" },
  { pageKey: "series", label: "系列页" },
  { pageKey: "journal", label: "品牌志" },
  { pageKey: "about", label: "关于页" },
  { pageKey: "contact", label: "联系页" },
];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function toSeoRow(config: { id: string; pageKey: string; title: string; description: string; ogImage: string | null; canonical: string | null; updatedAt: Date }) {
  return { id: config.id, page_key: config.pageKey, title: config.title, description: config.description, keywords: null, og_title: null, og_description: null, og_image: config.ogImage, canonical: config.canonical, robots: null, updated_at: config.updatedAt };
}

function defaultSeoRow(page: (typeof DEFAULT_PAGES)[number]) {
  return { id: null, page_key: page.pageKey, title: page.label, description: "", keywords: null, og_title: null, og_description: null, og_image: null, canonical: null, robots: null, updated_at: null };
}

export async function listSeoConfigs() {
  try {
    const configs = await brandDb.seoConfig.findMany({ orderBy: { pageKey: "asc" } });
    const byPageKey = new Map(configs.map((config) => [config.pageKey, config]));
    const merged = DEFAULT_PAGES.map((page) => {
      const config = byPageKey.get(page.pageKey);
      return config ? toSeoRow(config) : defaultSeoRow(page);
    });
    return { configs: merged, total: merged.length, error: null };
  } catch (error) {
    return { configs: DEFAULT_PAGES.map(defaultSeoRow), total: DEFAULT_PAGES.length, error: errorMessage(error) };
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
    const config = await brandDb.seoConfig.upsert({
      where: { pageKey: data.page_key },
      update: { title: data.title, description: data.description ?? "", ogImage: data.og_image || null, canonical: data.canonical || null },
      create: { pageKey: data.page_key, title: data.title, description: data.description ?? "", ogImage: data.og_image || null, canonical: data.canonical || null },
    });
    try { await createCrudAudit({ action: "UPDATE", system: "BRAND", module: "seo", targetId: data.page_key, after: toSeoRow(config) }); } catch {}
    return { error: null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
