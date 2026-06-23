/**
 * Entity Ownership Enforcement
 *
 * WO-P3B: Protects ERP master data from unauthorized write by Brand OS.
 *
 * Rules:
 *   - ERP entities can only be modified by ERP gateway
 *   - Brand entities can only read ERP data (read-only)
 *   - Brand writes are allowed ONLY on Brand-exclusive entities
 *   - Platform can manage USER and PERMISSION entities
 */

import { MASTER_DATA_REGISTRY, isErpMasterData, isBrandExclusive } from "./registry";
import type { EntityKey, DataOwner } from "./types";

// ═══════════════════════════════════════════
// Ownership Assertion
// ═══════════════════════════════════════════

export interface OwnershipResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Assert that a system is allowed to WRITE to an entity.
 *
 * Rules:
 * 1. System matches owner → ALLOW
 * 2. System is in allowedWriters → ALLOW
 * 3. Brand trying to write ERP data → DENY
 * 4. ERP writing Brand data → DENY (unless allowedWriters includes ERP)
 */
export function assertEntityOwnership(
  entityKey: EntityKey,
  writer: DataOwner,
  operation: "READ" | "WRITE" | "DELETE"
): OwnershipResult {
  const entity = MASTER_DATA_REGISTRY[entityKey];
  if (!entity) {
    return { allowed: false, reason: `Unknown entity: ${entityKey}` };
  }

  // Reads are always allowed
  if (operation === "READ") {
    return { allowed: true };
  }

  // Owner can always write
  if (writer === entity.owner) {
    return { allowed: true };
  }

  // Check allowed writers list
  if (entity.allowedWriters?.includes(writer)) {
    return { allowed: true };
  }

  // Brand OS cannot modify ERP master data
  if (writer === "BRAND" && isErpMasterData(entityKey)) {
    return {
      allowed: false,
      reason: `Brand OS 不能修改 ERP 主数据。${entity.label} 的所有者是 ${entity.owner}。请通过 ERP Gateway 操作。`,
    };
  }

  // ERP cannot modify Brand exclusive content
  if (writer === "ERP" && isBrandExclusive(entityKey)) {
    return {
      allowed: false,
      reason: `ERP 不能修改 Brand 内容。${entity.label} 的所有者是 BRAND。`,
    };
  }

  return {
    allowed: false,
    reason: `${writer} 无权对 ${entity.label} 执行 ${operation} 操作。所有者: ${entity.owner}`,
  };
}

/**
 * Assert field-level ownership.
 * For shared entities (e.g., Product — ERP owns SKU/inventory, Brand owns story/gallery).
 */
export function assertFieldOwnership(
  entityKey: EntityKey,
  field: string,
  writer: DataOwner
): OwnershipResult {
  const entity = MASTER_DATA_REGISTRY[entityKey];
  if (!entity) {
    return { allowed: false, reason: `Unknown entity: ${entityKey}` };
  }

  // Owner can write all fields
  if (writer === entity.owner) {
    return { allowed: true };
  }

  // Check field-level ownership
  if (entity.fieldOwnership) {
    const fieldOwner = entity.fieldOwnership[field];
    if (fieldOwner && fieldOwner === writer) {
      return { allowed: true };
    }
    if (fieldOwner && fieldOwner !== writer) {
      return {
        allowed: false,
        reason: `字段 "${field}" 属于 ${fieldOwner}，${writer} 无权修改。`,
      };
    }
  }

  // Fall back to entity-level check
  return assertEntityOwnership(entityKey, writer, "WRITE");
}

/**
 * Gateway-level write guard.
 * Call this before any write operation through the gateway.
 */
export function guardWrite(
  entityKey: EntityKey,
  writer: DataOwner,
  operation: "WRITE" | "DELETE" = "WRITE"
): void {
  const result = assertEntityOwnership(entityKey, writer, operation);
  if (!result.allowed) {
    throw new Error(`[OwnershipGuard] ${result.reason}`);
  }
}

/**
 * Convenience: brand writes are restricted to Brand-only entities.
 */
export function allowBrandWrite(entityKey: EntityKey): boolean {
  return assertEntityOwnership(entityKey, "BRAND", "WRITE").allowed;
}

/**
 * Convenience: ERP can write to ERP-owned entities + allowed writers list.
 */
export function allowErpWrite(entityKey: EntityKey): boolean {
  return assertEntityOwnership(entityKey, "ERP", "WRITE").allowed;
}

// ═══════════════════════════════════════════
// Ownership matrix (pre-computed for audits)
// ═══════════════════════════════════════════

export function getOwnershipMatrix(): Record<string, { erp: string; brand: string; platform: string }> {
  const matrix: Record<string, { erp: string; brand: string; platform: string }> = {};
  for (const [key, entity] of Object.entries(MASTER_DATA_REGISTRY)) {
    matrix[key] = {
      erp: assertEntityOwnership(key as EntityKey, "ERP", "WRITE").allowed ? "✅ WRITE" : "👁 READ",
      brand: assertEntityOwnership(key as EntityKey, "BRAND", "WRITE").allowed ? "✅ WRITE" : "👁 READ",
      platform: assertEntityOwnership(key as EntityKey, "PLATFORM", "WRITE").allowed ? "✅ WRITE" : "👁 READ",
    };
  }
  return matrix;
}
