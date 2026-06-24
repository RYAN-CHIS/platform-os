/**
 * Settings Audit Actions — WO-P12D
 * Audit log querying for /settings/audit
 */
"use server";

import { prisma } from "@yunwu/db";

export interface AuditLogRow {
  id: string;
  user_id: number;
  user_name: string | null;
  user_email: string;
  action: string;
  system: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditFilter {
  q?: string;
  module?: string;
  userId?: number;
  action?: string;
  from?: string;
  to?: string;
  system?: string;
  targetId?: string;
}

// ── List audit logs ──
export async function listAuditLogs(filter: AuditFilter = {}): Promise<AuditLogRow[]> {
  const conditions: string[] = [];
  const vals: any[] = [];
  let idx = 1;

  if (filter.q) {
    conditions.push(`(u.email ILIKE $${idx} OR u.name ILIKE $${idx} OR a.action ILIKE $${idx} OR a.entity_type ILIKE $${idx})`);
    vals.push(`%${filter.q}%`);
    idx++;
  }
  if (filter.module) {
    conditions.push(`a.entity_type = $${idx}`);
    vals.push(filter.module);
    idx++;
  }
  if (filter.userId) {
    conditions.push(`a.user_id = $${idx}`);
    vals.push(filter.userId);
    idx++;
  }
  if (filter.action) {
    conditions.push(`a.action = $${idx}`);
    vals.push(filter.action);
    idx++;
  }
  if (filter.from) {
    conditions.push(`a.created_at >= $${idx}::timestamp`);
    vals.push(filter.from);
    idx++;
  }
  if (filter.to) {
    conditions.push(`a.created_at <= $${idx}::timestamp`);
    vals.push(filter.to);
    idx++;
  }
  if (filter.system) {
    conditions.push(`a.system = $${idx}`);
    vals.push(filter.system);
    idx++;
  }
  if (filter.targetId) {
    conditions.push(`a.entity_id = $${idx}`);
    vals.push(filter.targetId);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await prisma.$queryRawUnsafe<AuditLogRow[]>(
    `SELECT a.id, a.user_id, u.name as user_name, u.email as user_email,
            a.action, a.system, a.entity_type, a.entity_id, a.details,
            a.ip, a.user_agent, a.created_at::text as created_at
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT 500`,
    ...vals
  );
  return rows;
}

// ── Get distinct entity types (for module filter) ──
export async function getEntityTypes(): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ entity_type: string }[]>(
    `SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type`
  );
  return rows.map(r => r.entity_type);
}

// ── Get users with logs (for user filter) ──
export async function getAuditUsers(): Promise<{ id: number; name: string | null; email: string }[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT DISTINCT u.id, u.name, u.email
     FROM users u
     INNER JOIN audit_logs a ON a.user_id = u.id
     ORDER BY u.email`
  );
  return rows;
}

// ── Get distinct systems (for system filter) ──
export async function getSystems(): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ system: string }[]>(
    `SELECT DISTINCT system FROM audit_logs ORDER BY system`
  );
  return rows.map(r => r.system);
}

// ── Export audit logs as CSV ──
export async function exportAuditLogs(filter: AuditFilter = {}): Promise<string> {
  const rows = await listAuditLogs(filter);
  const headers = ["id", "时间", "用户", "操作", "系统", "模块", "目标ID", "详情", "IP"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const detail = r.details ? r.details.replace(/"/g, '""') : "";
    lines.push([r.id, r.created_at, r.user_name || r.user_email, r.action, r.system, r.entity_type, r.entity_id || "", `"${detail}"`, r.ip || ""].join(","));
  }
  return lines.join("\n");
}

// ── Create audit log (used by other modules) ──
export async function createAuditLog(input: {
  userId: number;
  action: string;
  module: string;
  targetId?: string;
  details?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO audit_logs (id, user_id, action, system, entity_type, entity_id, details, ip, user_agent, created_at)
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    input.userId,
    input.action,
    'ERP',
    input.module,
    input.targetId || null,
    input.details || null,
    input.ip || null,
    input.userAgent || null
  );
}
