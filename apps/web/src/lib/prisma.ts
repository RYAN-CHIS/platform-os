// ═══════════════════════════════════════════════════════════
// Web Prisma 入口 — 使用本地 schema
// 本地 Schema: apps/web/prisma/schema.prisma (16 models)
// 权威 Schema（Phase 3 目标）: packages/db/schema.prisma
// ═══════════════════════════════════════════════════════════
import { PrismaClient } from "@prisma/web-client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
