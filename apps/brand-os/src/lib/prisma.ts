// ═══════════════════════════════════════════════════════════
// Brand OS Prisma 入口 — 统一从 @yunwu/db 导入
// 遗留 Schema: apps/brand-os/prisma/schema.prisma (16 models)
// 权威 Schema: packages/db/schema.prisma (37 models)
// Phase 3: 切换到 packages/db 统一 Schema
// ═══════════════════════════════════════════════════════════
import { createPrisma } from "@yunwu/db";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrisma> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
