/**
 * Settings System Actions — WO-P12D
 * System config CRUD for /settings/system
 */
"use server";

import { prisma } from "@yunwu/db";
import { brandPrisma } from "@yunwu/db/brand";
import { createAuditLog } from "@/lib/audit";

export interface SystemConfigRow {
  id: number;
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export interface SystemStatus {
  erpConnected: boolean;
  brandConnected: boolean;
  userCount: number;
  productCount: number;
  brandProductCount: number;
  journalCount: number;
  orderCount: number;
  nodeEnv: string;
  hasDbUrl: boolean;
  hasBrandDbUrl: boolean;
}

// ── List configs ──
export async function listSystemConfigs(): Promise<SystemConfigRow[]> {
  const rows = await prisma.$queryRawUnsafe<SystemConfigRow[]>(
    `SELECT id, key, value, description, updated_at::text as updated_at
     FROM system_configs
     ORDER BY key ASC`
  );
  return rows;
}

// ── Update config ──
export async function updateSystemConfig(key: string, value: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // Fetch before state
    const beforeRows = await prisma.$queryRawUnsafe<{ value: string }[]>(
      `SELECT value FROM system_configs WHERE key = $1`,
      key
    );
    const beforeValue = beforeRows[0]?.value ?? null;

    await prisma.$executeRawUnsafe(
      `UPDATE system_configs SET value = $1, updated_at = NOW() WHERE key = $2`,
      value, key
    );

    // Audit
    try {
      await createAuditLog({
        action: "SYSTEM_CONFIG_UPDATE",
        system: "SETTINGS",
        module: "system",
        targetId: key,
        before: { key, value: beforeValue },
        after: { key, value },
        description: `System config "${key}" updated`,
      });
    } catch {}

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Get system status ──
export async function getSystemStatus(): Promise<SystemStatus> {
  let erpConnected = false;
  let brandConnected = false;
  let userCount = 0;
  let productCount = 0;
  let brandProductCount = 0;
  let journalCount = 0;
  let orderCount = 0;

  try {
    erpConnected = true;
    const results = await Promise.all([
      prisma.$queryRawUnsafe<{ cnt: string }[]>(`SELECT COUNT(*)::text as cnt FROM users`),
      prisma.$queryRawUnsafe<{ cnt: string }[]>(`SELECT COUNT(*)::text as cnt FROM products`),
      prisma.$queryRawUnsafe<{ cnt: string }[]>(`SELECT COUNT(*)::text as cnt FROM orders`),
    ]);
    userCount = parseInt(results[0][0]?.cnt || "0");
    productCount = parseInt(results[1][0]?.cnt || "0");
    orderCount = parseInt(results[2][0]?.cnt || "0");
  } catch { erpConnected = false; }

  try {
    brandConnected = true;
    const results = await Promise.all([
      brandPrisma.$queryRawUnsafe<{ cnt: string }[]>(`SELECT COUNT(*)::text as cnt FROM brand_products`),
      brandPrisma.$queryRawUnsafe<{ cnt: string }[]>(`SELECT COUNT(*)::text as cnt FROM journal_posts`),
    ]);
    brandProductCount = parseInt(results[0][0]?.cnt || "0");
    journalCount = parseInt(results[1][0]?.cnt || "0");
  } catch { brandConnected = false; }

  return {
    erpConnected,
    brandConnected,
    userCount,
    productCount,
    brandProductCount,
    journalCount,
    orderCount,
    nodeEnv: process.env.NODE_ENV || "development",
    hasDbUrl: !!process.env.DATABASE_URL,
    hasBrandDbUrl: !!process.env.BRAND_DATABASE_URL,
  };
}
