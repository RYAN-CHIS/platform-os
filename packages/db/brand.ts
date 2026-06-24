// ═══════════════════════════════════════════════════════════
// Brand DB — 独立 Prisma Client for Brand OS
// ═══════════════════════════════════════════════════════════
//
// 使用 BRAND_DATABASE_URL（如未配置则 fallback 到 DATABASE_URL）
// ═══════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";

const BRAND_DB_URL =
  process.env.BRAND_DATABASE_URL || process.env.DATABASE_URL || "";

const needsPgbouncer =
  BRAND_DB_URL.includes("pooler") && !BRAND_DB_URL.includes("pgbouncer=true");
const datasourceUrl = needsPgbouncer
  ? BRAND_DB_URL + (BRAND_DB_URL.includes("?") ? "&" : "?") + "pgbouncer=true"
  : BRAND_DB_URL;

export function createBrandPrisma() {
  return new PrismaClient({
    datasourceUrl: datasourceUrl || undefined,
  });
}

// Singleton（同库不同 client instance，逻辑隔离）
const globalForBrandPrisma = globalThis as unknown as {
  brandPrisma: PrismaClient | undefined;
};
export const brandPrisma =
  globalForBrandPrisma.brandPrisma ?? createBrandPrisma();
if (process.env.NODE_ENV !== "production")
  globalForBrandPrisma.brandPrisma = brandPrisma;
