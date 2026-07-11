// ═══════════════════════════════════════════════════════════
// Brand DB — 独立 Prisma Client for Brand OS
// ═══════════════════════════════════════════════════════════
//
// 使用 BRAND_DATABASE_URL（如未配置则 fallback 到 DATABASE_URL）
// ═══════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";

function getBrandDbUrl(): string {
  const url = process.env.BRAND_DATABASE_URL;
  if (!url) {
    throw new Error(
      "[brand.ts] BRAND_DATABASE_URL is required — set it in Vercel env. " +
      "This is a security requirement: plaintext credentials are never hardcoded."
    );
  }
  const needsPgbouncer = url.includes("pooler") && !url.includes("pgbouncer=true");
  return needsPgbouncer
    ? url + (url.includes("?") ? "&" : "?") + "pgbouncer=true"
    : url;
}

export function createBrandPrisma() {
  return new PrismaClient({
    datasourceUrl: getBrandDbUrl(),
  });
}

// Singleton — lazily initialized on first use
let _brandPrisma: PrismaClient | undefined;

export function getBrandPrisma(): PrismaClient {
  if (!_brandPrisma) {
    _brandPrisma = createBrandPrisma();
  }
  return _brandPrisma;
}

const brandPrismaProxy = new Proxy<PrismaClient>({} as PrismaClient, {
  get(_, prop) {
    const client = getBrandPrisma();
    return (client as any)[prop];
  },
});

export { brandPrismaProxy as brandPrisma };

