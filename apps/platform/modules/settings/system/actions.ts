/**
 * Settings System Actions — WO-P12D / WO-CONFIG-01
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
  type: string;
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
    `SELECT id, key, value, COALESCE(description,'') as description, COALESCE(type,'string') as type, updated_at::text as updated_at
     FROM system_configs
     ORDER BY key ASC`
  );
  return rows;
}

// ── Create config ──
export async function createSystemConfig(data: {
  key: string; value: string; type?: string; description?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const key = data.key.trim();
    if (!key) return { ok: false, error: "配置项名称不能为空" };

    // Check unique
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM system_configs WHERE key = $1`, key
    );
    if (existing.length > 0) return { ok: false, error: "配置项已存在" };

    await prisma.$executeRawUnsafe(
      `INSERT INTO system_configs (key, value, type, description, updated_at) VALUES ($1, $2, $3, $4, NOW())`,
      key, data.value, data.type || "string", data.description || ""
    );

    try {
      await createAuditLog({
        action: "SYSTEM_CONFIG_UPDATE",
        system: "SETTINGS",
        module: "system",
        targetId: key,
        after: { key, value: data.value, type: data.type },
        description: `System config "${key}" created`,
      });
    } catch {}

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Update config ──
export async function updateSystemConfig(key: string, value: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const beforeRows = await prisma.$queryRawUnsafe<{ value: string }[]>(
      `SELECT value FROM system_configs WHERE key = $1`, key
    );
    const beforeValue = beforeRows[0]?.value ?? null;

    await prisma.$executeRawUnsafe(
      `UPDATE system_configs SET value = $1, updated_at = NOW() WHERE key = $2`, value, key
    );

    try {
      await createAuditLog({
        action: "SYSTEM_CONFIG_UPDATE",
        system: "SETTINGS",
        module: "system",
        targetId: key,
        before: { key, value: beforeValue },
        after: { key, value },
      });
    } catch {}

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Get system status ──
export async function getSystemStatus(): Promise<SystemStatus> {
  let erpConnected = false, brandConnected = false;
  let userCount = 0, productCount = 0, brandProductCount = 0, journalCount = 0, orderCount = 0;

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
      brandPrisma.$queryRawUnsafe<{ cnt: string }[]>(`SELECT COUNT(*)::text as cnt FROM products`),
      brandPrisma.$queryRawUnsafe<{ cnt: string }[]>(`SELECT COUNT(*)::text as cnt FROM journal_posts`),
    ]);
    brandProductCount = parseInt(results[0][0]?.cnt || "0");
    journalCount = parseInt(results[1][0]?.cnt || "0");
  } catch { brandConnected = false; }

  return { erpConnected, brandConnected, userCount, productCount, brandProductCount, journalCount, orderCount,
    nodeEnv: process.env.NODE_ENV || "development", hasDbUrl: !!process.env.DATABASE_URL, hasBrandDbUrl: !!process.env.BRAND_DATABASE_URL };
}
