// ═══════════════════════════════════════════════════════════
// Schema Guard — Phase 4.5.1 Schema Lock Enforcement
//
// 运行时 + 构建时双重保护，禁止未经授权的 Schema 变更。
// ═══════════════════════════════════════════════════════════

import { readFileSync } from "fs";
import { join } from "path";

interface SchemaLock {
  version: string;
  status: string;
  rules: {
    allowNewModels: boolean;
    allowSchemaEditDirect: boolean;
    requireMigrationForChange: boolean;
    allowCrossDomainRelation: string;
  };
  domains: Record<string, { ownership: string[] }>;
}

let _lock: SchemaLock | null = null;

function getLock(): SchemaLock {
  if (!_lock) {
    const path = join(__dirname, "..", "schema-lock.json");
    _lock = JSON.parse(readFileSync(path, "utf-8"));
  }
  return _lock!;
}

export type SchemaAction =
  | "direct_schema_change"
  | "new_model"
  | "field_type_change"
  | "cross_domain_relation"
  | "migration"
  | "read";

/**
 * Assert that the schema is in LOCKED state and the action is allowed.
 * Throws if the action violates the lock policy.
 */
export function assertSchemaLocked(action: SchemaAction): void {
  const lock = getLock();

  if (lock.status !== "LOCKED") {
    throw new Error(
      `[SchemaGuard] Schema status is "${lock.status}", expected "LOCKED". ` +
      `Cannot perform action: ${action}`,
    );
  }

  if (action === "direct_schema_change" && !lock.rules.allowSchemaEditDirect) {
    throw new Error(
      "[SchemaGuard] ❌ Direct schema modification is forbidden. " +
      "All schema changes must go through: pnpm --filter @yunwu/db db:migrate",
    );
  }

  if (action === "new_model" && !lock.rules.allowNewModels) {
    throw new Error(
      "[SchemaGuard] ❌ New models are forbidden in Phase 4.5.1. " +
      "Submit a migration proposal first.",
    );
  }

  if (
    action === "cross_domain_relation" &&
    lock.rules.allowCrossDomainRelation === "explicit-only"
  ) {
    throw new Error(
      "[SchemaGuard] ❌ Cross-domain relations require explicit approval. " +
      "Add the relation to schema-lock.json domains first.",
    );
  }
}

/**
 * Check which domain owns a given model.
 */
export function getDomainOwnership(modelName: string): string | null {
  const lock = getLock();
  for (const [domain, config] of Object.entries(lock.domains)) {
    if (config.ownership.includes(modelName)) {
      return domain;
    }
  }
  return null;
}

/**
 * Verify that a model is only accessed by its owning domain.
 * Returns true if access is allowed.
 */
export function verifyDomainAccess(
  modelName: string,
  accessingDomain: string,
): boolean {
  const owner = getDomainOwnership(modelName);
  if (!owner) return false;
  if (owner === "shared") return true;
  return owner === accessingDomain;
}

/**
 * Get the current schema lock status.
 */
export function getSchemaLockStatus(): {
  version: string;
  status: string;
  lockedAt: string;
  domainCount: number;
  modelCount: number;
} {
  const lock = getLock();
  let modelCount = 0;
  for (const config of Object.values(lock.domains)) {
    modelCount += config.ownership.length;
  }
  return {
    version: lock.version,
    status: lock.status,
    lockedAt: (lock as any).lockedAt,
    domainCount: Object.keys(lock.domains).length,
    modelCount,
  };
}
