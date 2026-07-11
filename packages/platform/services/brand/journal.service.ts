/** BrandJournalService — WO-P9B: Direct Brand DB access. */
import { PrismaClient } from "@prisma/client";
const BRAND_URL = process.env.BRAND_DATABASE_URL;

if (!BRAND_URL) {
  throw new Error(
    "[brand/journal.service] BRAND_DATABASE_URL is required -- set it in Vercel env. " +
    "This is a security requirement: plaintext credentials are never hardcoded."
  );
}

export const BrandJournalService = {
  async list(filters?: { category?: string; status?: string; q?: string }) {
    const p = new PrismaClient({ datasourceUrl: BRAND_URL });
    try {
      const where: string[] = [];
      if (filters?.category) where.push(`category = '${filters.category}'`);
      if (filters?.status) where.push(`status = '${filters.status}'`);
      if (filters?.q) where.push(`(title ILIKE '%${filters.q}%' OR slug ILIKE '%${filters.q}%')`);
      const w = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
      return await (p as any).$queryRawUnsafe(`SELECT * FROM journal_posts ${w} ORDER BY updated_at DESC LIMIT 50`);
    } finally { await p.$disconnect(); }
  },
  async count() {
    const p = new PrismaClient({ datasourceUrl: BRAND_URL });
    try { const r = await (p as any).$queryRaw`SELECT COUNT(*) as c FROM journal_posts`; return Number(r[0].c); }
    finally { await p.$disconnect(); }
  },
};
