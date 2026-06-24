/** BrandSeriesService — WO-P9B: Direct Brand DB access. */
import { PrismaClient } from "@prisma/client";
const BRAND_URL = process.env.BRAND_DATABASE_URL || "postgresql://neondb_owner:npg_uDbxK58hWIRf@ep-morning-sun-aoo4dk3t-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

export const BrandSeriesService = {
  async list() {
    const p = new PrismaClient({ datasourceUrl: BRAND_URL });
    try { return await (p as any).$queryRaw`SELECT s.*, (SELECT COUNT(*) FROM products WHERE series_id = s.id) as product_count FROM series s ORDER BY s.sort_order ASC`; }
    finally { await p.$disconnect(); }
  },
  async count() {
    const p = new PrismaClient({ datasourceUrl: BRAND_URL });
    try { const r = await (p as any).$queryRaw`SELECT COUNT(*) as c FROM series`; return Number(r[0].c); }
    finally { await p.$disconnect(); }
  },
};
