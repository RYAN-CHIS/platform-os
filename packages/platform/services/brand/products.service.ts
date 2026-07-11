/** BrandProductService — WO-P9B: Direct Brand DB access (Singapore). Raw SQL avoids Canonical @@map mismatch. */
import { PrismaClient } from "@prisma/client";

const BRAND_URL = process.env.BRAND_DATABASE_URL;

if (!BRAND_URL) {
  throw new Error(
    "[brand/products.service] BRAND_DATABASE_URL is required -- set it in Vercel env. " +
    "This is a security requirement: plaintext credentials are never hardcoded."
  );
}

export const BrandProductService = {
  async list(filters?: { seriesId?: string; status?: string; q?: string }) {
    const p = new PrismaClient({ datasourceUrl: BRAND_URL }); const db = p as any;
    try {
      const where: string[] = [];
      if (filters?.seriesId) where.push(`series_id = ${parseInt(filters.seriesId)}`);
      if (filters?.status) where.push(`status = '${filters.status}'`);
      if (filters?.q) where.push(`(name ILIKE '%${filters.q}%' OR sku ILIKE '%${filters.q}%')`);
      const w = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
      const rows = await db.$queryRawUnsafe(`SELECT * FROM products ${w} ORDER BY updated_at DESC LIMIT 100`);
      return rows;
    } finally { await p.$disconnect(); }
  },
  async count() {
    const p = new PrismaClient({ datasourceUrl: BRAND_URL }); const db = p as any;
    try { const r = await db.$queryRaw`SELECT COUNT(*) as c FROM products`; return Number(r[0].c); }
    finally { await p.$disconnect(); }
  },
  async getBySku(sku: string) {
    const p = new PrismaClient({ datasourceUrl: BRAND_URL });
    try { const r = await (p as any).$queryRawUnsafe(`SELECT * FROM products WHERE sku = '${sku}' LIMIT 1`); return r[0] || null; }
    finally { await p.$disconnect(); }
  },
};
