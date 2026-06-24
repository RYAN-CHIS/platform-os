// ══════════════════════════════════════════════════════════
// Brand Materials — Full CRUD with raw SQL
// ══════════════════════════════════════════════════════════
"use server";

import { brandPrisma } from "@yunwu/db/brand";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export interface BrandMaterialRow {
  id: number;
  name: string;
  slug: string;
  alias: string | null;
  category: string;
  origin: string;
  description: string;
  short_desc: string | null;
  features: string | null;
  story: string | null;
  applicable_products: string | null;
  status: string;
  sort_order: number;
  image: string;
  cover_image: string | null;
  detail_images: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  created_at: string;
  updated_at: string;
}

// ── Ensure table exists (idempotent) ──
async function ensureTable() {
  try {
    await brandPrisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS brand_materials (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        slug TEXT DEFAULT '',
        alias TEXT,
        category TEXT DEFAULT '',
        origin TEXT DEFAULT '',
        description TEXT DEFAULT '',
        short_desc TEXT DEFAULT '',
        features TEXT,
        story TEXT DEFAULT '',
        applicable_products TEXT DEFAULT '',
        status TEXT DEFAULT 'DRAFT',
        sort_order INTEGER DEFAULT 0,
        image TEXT DEFAULT '',
        cover_image TEXT DEFAULT '',
        detail_images TEXT DEFAULT '[]',
        seo_title TEXT DEFAULT '',
        seo_description TEXT DEFAULT '',
        seo_keywords TEXT DEFAULT '',
        related_articles TEXT DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
  } catch (e: any) {
    console.error("ensureTable error:", e.message);
  }
}

// ── Check if old schema needs migration ──
async function ensureColumns() {
  try {
    // Add new columns if they don't exist
    const newCols = [
      { name: "slug", def: "slug TEXT DEFAULT ''" },
      { name: "category", def: "category TEXT DEFAULT ''" },
      { name: "short_desc", def: "short_desc TEXT DEFAULT ''" },
      { name: "story", def: "story TEXT DEFAULT ''" },
      { name: "applicable_products", def: "applicable_products TEXT DEFAULT ''" },
      { name: "status", def: "status TEXT DEFAULT 'DRAFT'" },
      { name: "sort_order", def: "sort_order INTEGER DEFAULT 0" },
      { name: "cover_image", def: "cover_image TEXT DEFAULT ''" },
      { name: "detail_images", def: "detail_images TEXT DEFAULT '[]'" },
      { name: "seo_title", def: "seo_title TEXT DEFAULT ''" },
      { name: "seo_description", def: "seo_description TEXT DEFAULT ''" },
      { name: "seo_keywords", def: "seo_keywords TEXT DEFAULT ''" },
    ];
    for (const col of newCols) {
      await brandPrisma.$executeRawUnsafe(
        `ALTER TABLE brand_materials ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`
      );
    }
  } catch {}
}

// ── Map DB row to BrandMaterialRow ──
function mapRow(row: any): BrandMaterialRow {
  const toStr = (v: any, def = ""): string => v ?? def;
  return {
    id: row.id,
    name: toStr(row.name),
    slug: toStr(row.slug),
    alias: row.alias || null,
    category: toStr(row.category, row.type || ""),
    origin: toStr(row.origin),
    description: toStr(row.description),
    short_desc: row.short_desc || null,
    features: row.features || null,
    story: row.story || row.history || null,
    applicable_products: row.applicable_products || null,
    status: toStr(row.status, "DRAFT"),
    sort_order: row.sort_order ?? 0,
    image: toStr(row.image),
    cover_image: row.cover_image || null,
    detail_images: row.detail_images || null,
    seo_title: row.seo_title || null,
    seo_description: row.seo_description || null,
    seo_keywords: row.seo_keywords || null,
    created_at: row.created_at?.toISOString?.() || String(row.created_at || ""),
    updated_at: row.updated_at?.toISOString?.() || String(row.updated_at || ""),
  };
}

// ── List ──
export async function listBrandMaterials(q?: string): Promise<BrandMaterialRow[]> {
  try {
    await ensureTable();
    await ensureColumns();
    const rows = await brandPrisma.$queryRawUnsafe<any[]>(
      q
        ? `SELECT * FROM brand_materials WHERE name ILIKE $1 OR description ILIKE $1 ORDER BY sort_order ASC, id DESC`
        : `SELECT * FROM brand_materials ORDER BY sort_order ASC, id DESC`,
      ...(q ? [`%${q}%`] : [])
    );
    return rows.map(mapRow);
  } catch {
    return [];
  }
}

// ── Stats ──
export async function getMaterialStats(): Promise<number> {
  try {
    await ensureTable();
    const rows = await brandPrisma.$queryRawUnsafe<{ cnt: string }[]>(
      `SELECT COUNT(*)::text as cnt FROM brand_materials`
    );
    return parseInt(rows[0]?.cnt || "0");
  } catch {
    return 0;
  }
}

// ── Create ──
export async function createBrandMaterial(data: Record<string, any>): Promise<{ ok: boolean; error?: string }> {
  try {
    await ensureTable();
    await ensureColumns();

    const name = String(data.name || "").trim();
    if (!name) return { ok: false, error: "请输入材料名称" };

    await brandPrisma.$executeRawUnsafe(
      `INSERT INTO brand_materials (name, slug, category, origin, description, short_desc, features, story,
        applicable_products, status, sort_order, image, cover_image, detail_images,
        seo_title, seo_description, seo_keywords, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())`,
      name,
      String(data.slug || ""),
      String(data.category || ""),
      String(data.origin || ""),
      String(data.description || ""),
      String(data.shortDesc || data.short_desc || ""),
      String(data.features || ""),
      String(data.story || ""),
      String(data.applicableProducts || data.applicable_products || ""),
      String(data.status || "DRAFT"),
      parseInt(data.sortOrder ?? data.sort_order ?? 0),
      String(data.image || ""),
      String(data.coverImage || data.cover_image || ""),
      JSON.stringify(data.detailImages || data.detail_images || []),
      String(data.seoTitle || data.seo_title || ""),
      String(data.seoDescription || data.seo_description || ""),
      String(data.seoKeywords || data.seo_keywords || ""),
    );

    try {
      await createAuditLog({
        action: "MATERIAL_CREATE",
        system: "BRAND",
        module: "materials",
        after: { name, category: data.category },
      });
    } catch {}

    revalidatePath("/brand/materials");
    return { ok: true };
  } catch (e: any) {
    if (e.message?.includes("unique") || e.message?.includes("duplicate")) {
      return { ok: false, error: "材料名称已存在" };
    }
    return { ok: false, error: e.message };
  }
}

// ── Update ──
export async function updateBrandMaterial(id: number, data: Record<string, any>): Promise<{ ok: boolean; error?: string }> {
  try {
    await ensureColumns();

    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    const fields: [string, string][] = [
      ["name", "name"], ["slug", "slug"], ["category", "category"],
      ["origin", "origin"], ["description", "description"],
      ["shortDesc", "short_desc"], ["short_desc", "short_desc"],
      ["features", "features"], ["story", "story"],
      ["applicableProducts", "applicable_products"],
      ["applicable_products", "applicable_products"],
      ["status", "status"],
      ["sortOrder", "sort_order"], ["sort_order", "sort_order"],
      ["image", "image"], ["coverImage", "cover_image"], ["cover_image", "cover_image"],
      ["seoTitle", "seo_title"], ["seo_title", "seo_title"],
      ["seoDescription", "seo_description"], ["seo_description", "seo_description"],
      ["seoKeywords", "seo_keywords"], ["seo_keywords", "seo_keywords"],
    ];

    for (const [key, col] of fields) {
      if (data[key] !== undefined) {
        sets.push(`${col} = $${idx++}`);
        vals.push(String(data[key]));
      }
    }

    if (data.detailImages !== undefined || data.detail_images !== undefined) {
      sets.push(`detail_images = $${idx++}`);
      vals.push(JSON.stringify(data.detailImages || data.detail_images || []));
    }

    if (sets.length === 0) return { ok: true };
    sets.push(`updated_at = NOW()`);

    vals.push(id);
    await brandPrisma.$executeRawUnsafe(
      `UPDATE brand_materials SET ${sets.join(", ")} WHERE id = $${idx}`,
      ...vals
    );

    try {
      await createAuditLog({
        action: "MATERIAL_UPDATE",
        system: "BRAND",
        module: "materials",
        targetId: id,
        after: { name: data.name, category: data.category },
      });
    } catch {}

    revalidatePath("/brand/materials");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Delete ──
export async function deleteBrandMaterial(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await brandPrisma.$executeRawUnsafe(`DELETE FROM brand_materials WHERE id = $1`, id);

    try {
      await createAuditLog({
        action: "MATERIAL_DELETE",
        system: "BRAND",
        module: "materials",
        targetId: id,
      });
    } catch {}

    revalidatePath("/brand/materials");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Toggle status ──
export async function toggleMaterialStatus(id: number, status: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await brandPrisma.$executeRawUnsafe(
      `UPDATE brand_materials SET status = $1, updated_at = NOW() WHERE id = $2`,
      status, id
    );
    revalidatePath("/brand/materials");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
