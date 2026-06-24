/**
 * Platform OS — Unified Audit Library (WO-P13B)
 *
 * Single entry point for all audit log writes across the entire system.
 * Every write operation MUST call one of these functions.
 *
 * Systems:  ERP | BRAND | SETTINGS | AUTH
 * Modules:  materials | products | bom | purchase | inventory | production |
 *           orders | customers | costs | series | journal | media |
 *           banners | seo | home | users | roles | permissions | system
 */

"use server";

import { prisma } from "@yunwu/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { headers } from "next/headers";

// ── Types ──

export type AuditSystem = "ERP" | "BRAND" | "SETTINGS" | "AUTH";

export interface AuditDetails {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  diff?: Record<string, { before: unknown; after: unknown }> | null;
  description?: string;
  [key: string]: unknown;
}

export interface AuditLogInput {
  action: string;
  system: AuditSystem;
  module: string;
  targetId?: string | number;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  description?: string;
  extra?: Record<string, unknown>;
}

// ── Session helper ──

async function getAuditSession(): Promise<{ userId: number; ip: string; ua: string } | null> {
  let userId = 1; // fallback
  let ip = "";
  let ua = "";

  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const user = await prisma.$queryRawUnsafe<{ id: number }[]>(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        session.user.email
      );
      if (user.length > 0) userId = user[0].id;
    }

    const hdrs = await headers();
    ip = hdrs.get("x-forwarded-for") || hdrs.get("x-real-ip") || "";
    ua = hdrs.get("user-agent") || "";
  } catch {
    // Silent fallback — audit should never block operations
  }

  return { userId, ip, ua };
}

// ── Diff computation ──

export async function computeDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): Promise<Record<string, { before: unknown; after: unknown }> | null> {
  if (!before || !after) return null;

  const diff: Record<string, { before: unknown; after: unknown }> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const bVal = before[key];
    const aVal = after[key];
    // Skip internal/audit fields
    if (key === "created_at" || key === "updated_at" || key === "password" || key === "id") continue;
    if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      diff[key] = { before: bVal, after: aVal };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

// ── Core: generic audit log ──

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const session = await getAuditSession();
    const diff = input.before !== undefined && input.after !== undefined
      ? await computeDiff(input.before, input.after)
      : null;

    const details: AuditDetails = {
      before: input.before ?? null,
      after: input.after ?? null,
      diff,
      description: input.description ?? "",
      ...(input.extra || {}),
    };

    await prisma.$executeRawUnsafe(
      `INSERT INTO audit_logs (id, user_id, action, system, entity_type, entity_id, details, ip, user_agent, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      session?.userId ?? 1,
      input.action,
      input.system,
      input.module,
      String(input.targetId ?? ""),
      JSON.stringify(details),
      session?.ip ?? "",
      session?.ua ?? ""
    );
  } catch (e) {
    // Audit failure must NEVER block the main operation
    console.error("[audit] write failed:", e);
  }
}

// ── Convenience: status change audit ──

export async function createStatusAudit(input: {
  system: AuditSystem;
  module: string;
  targetId: string | number;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  description?: string;
}): Promise<void> {
  await createAuditLog({
    action: "STATUS_CHANGE",
    system: input.system,
    module: input.module,
    targetId: input.targetId,
    before: input.before,
    after: input.after,
    description: input.description,
  });
}

// ── Convenience: inventory audit ──

export async function createInventoryAudit(input: {
  action: "INVENTORY_IN" | "INVENTORY_OUT" | "INVENTORY_ADJUST" |
         "PURCHASE_RECEIVED" | "PRODUCTION_START" | "PRODUCTION_COMPLETE" |
         "ORDER_SHIPPED" | "ORDER_COMPLETED";
  materialName?: string;
  productName?: string;
  skuCode?: string;
  quantity: number;
  beforeStock: number;
  afterStock: number;
  purchaseId?: number;
  productionId?: number;
  orderId?: number;
  description?: string;
}): Promise<void> {
  await createAuditLog({
    action: input.action,
    system: "ERP",
    module: "inventory",
    targetId: input.orderId || input.productionId || input.purchaseId,
    before: { stock: input.beforeStock },
    after: { stock: input.afterStock },
    description: input.description,
    extra: {
      materialName: input.materialName,
      productName: input.productName,
      skuCode: input.skuCode,
      quantity: input.quantity,
      purchaseId: input.purchaseId,
      productionId: input.productionId,
      orderId: input.orderId,
    },
  });
}

// ── Convenience: auth audit ──

export async function createAuthAudit(input: {
  action: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOGOUT" | "SESSION_EXPIRED";
  email?: string;
  userId?: number;
  reason?: string;
  ip?: string;
  ua?: string;
}): Promise<void> {
  // For auth events, we may not have a session yet (login attempt), so use provided data
  try {
    let ip = input.ip || "";
    let ua = input.ua || "";
    let userId = input.userId || 1;

    if (!input.ip || !input.ua) {
      try {
        const hdrs = await headers();
        ip = ip || hdrs.get("x-forwarded-for") || hdrs.get("x-real-ip") || "";
        ua = ua || hdrs.get("user-agent") || "";
      } catch { /* ignore */ }
    }

    const details: AuditDetails = {
      description: input.reason || "",
    };
    if (input.email) details.email = input.email;

    await prisma.$executeRawUnsafe(
      `INSERT INTO audit_logs (id, user_id, action, system, entity_type, entity_id, details, ip, user_agent, created_at)
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      userId,
      input.action,
      "AUTH",
      "auth",
      String(userId),
      JSON.stringify(details),
      ip,
      ua
    );
  } catch (e) {
    console.error("[audit] auth write failed:", e);
  }
}

// ── Convenience: generic CRUD audit ──

export async function createCrudAudit(input: {
  action: "CREATE" | "UPDATE" | "DELETE";
  system: AuditSystem;
  module: string;
  targetId?: string | number;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  description?: string;
}): Promise<void> {
  await createAuditLog({
    action: input.action,
    system: input.system,
    module: input.module,
    targetId: input.targetId,
    before: input.before,
    after: input.after,
    description: input.description,
  });
}

// ── Convenience: permission change audit ──

export async function createPermissionAudit(input: {
  roleName: string;
  addedPermissions: string[];
  removedPermissions: string[];
  description?: string;
}): Promise<void> {
  await createAuditLog({
    action: "PERMISSION_MATRIX_UPDATE",
    system: "SETTINGS",
    module: "permissions",
    targetId: input.roleName,
    before: { permissions: input.removedPermissions.length > 0 ? input.removedPermissions : undefined },
    after: { permissions: input.addedPermissions.length > 0 ? input.addedPermissions : undefined },
    description: input.description,
    extra: {
      roleName: input.roleName,
      added: input.addedPermissions,
      removed: input.removedPermissions,
    },
  });
}

// ── Re-export for convenience ──
export { getAuditSession };
