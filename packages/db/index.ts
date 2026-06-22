// ═══════════════════════════════════════════════════════════
// ⚠️  CANONICAL DB LAYER
// Phase 4.5.1 LOCKED — schema-lock.json
//
// Rules:
//   - No direct schema modification allowed
//   - All changes must go through migration pipeline
//   - This is system of record for ERP + Brand OS + Web
//   - Domain ownership: erp(16) / brand(13) / shared(8)
//   - Lock status: packages/db/schema-lock.json
//
// import { createPrisma } from "@yunwu/db"  ← MANDATORY
// ═══════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";

export function createPrisma() {
  const url = process.env.DATABASE_URL || "";
  // Neon PgBouncer 兼容
  const needsPgbouncer = url.includes("pooler") && !url.includes("pgbouncer=true");
  const datasourceUrl = needsPgbouncer
    ? url + (url.includes("?") ? "&" : "?") + "pgbouncer=true"
    : url;

  return new PrismaClient({
    datasourceUrl: datasourceUrl || undefined,
  });
}

export { PrismaClient };

// ── Domain Layer (Phase 2.95) ──
export {
  ProductService,
  SeriesService,
  MaterialService,
} from "./domain";

export type {
  DomainProduct,
  DomainSeries,
  DomainMaterial,
  DomainMedia,
  DomainOrder,
  DomainResult,
  DomainListResult,
} from "./domain";

// ── Control Plane (Phase 2.99) ──
export {
  canAccess,
  canRead,
  canWrite,
  canAdmin,
  guard,
  withReadCheck,
  withWriteCheck,
  SYSTEM_CAPABILITIES,
  ANONYMOUS_CONTEXT,
} from "./control";

export type {
  SystemId,
  ActionType,
  ModelDomain,
  AccessContext,
  AccessDecision,
  UserRole,
} from "./control";

// ── Enforcement Layer (Phase 2.999) ──
export {
  requireAccess,
  requireSystemAccess,
  requireReadAccess,
  requireWriteAccess,
  requireAdminAccess,
  apiGateway,
  apiGatewayWithUser,
  handleAccessError,
  withGuard,
  isGuarded,
  ensureGuarded,
  AccessDeniedError,
} from "./enforce";

export type {
  GatewayRequest,
  GatewayContext,
  GatewayHandler,
} from "./enforce";

// ── Data Fabric (Phase 3.5) ──
export {
  resolveProduct,
  resolveSeries,
  resolveMaterial,
  resolveErpProduct,
  resolveWebProduct,
  resolveBrandProduct,
  toUnifiedProduct,
  requireDataView,
  safeResolveProduct,
} from "./fabric";

export type {
  UnifiedProduct,
  UnifiedSeries,
  UnifiedMaterial,
  ErpProductView,
  WebProductView,
  BrandProductView,
  ProductView,
} from "./fabric";

// ── Canonical Core (Phase 4) ──
export {
  createProductCore,
  mergeProductCore,
  mapToProductCanonical,
  mapToSeriesCanonical,
  mapToMaterialCanonical,
  mapAndMergeProducts,
} from "./canonical";

export type {
  ProductCore,
  SeriesCore,
  MaterialCore,
  CoreMediaRef,
} from "./canonical";
