// ═══════════════════════════════════════════════════════════
// @yunwu/db/fabric — Data Fabric Layer (Phase 3.5)
//
// 统一数据语义层。一个模型，三种视图。
//
// 使用方式:
//   import { resolveProduct } from "@yunwu/db/fabric"
//   const view = resolveProduct("erp", domainProduct);
//   // view.stockStatus, view.costs, view.profitMargin ← ERP view only
// ═══════════════════════════════════════════════════════════

// Unified models
export type {
  UnifiedProduct,
  UnifiedSeries,
  UnifiedMaterial,
  UnifiedOrder,
} from "./types.fab";

// View types
export type {
  ErpProductView,
  WebProductView,
  BrandProductView,
  ErpSeriesView,
  WebSeriesView,
  BrandSeriesView,
  ErpMaterialView,
  WebMaterialView,
  BrandMaterialView,
  ProductView,
  SeriesView,
  MaterialView,
} from "./views";

// Resolvers
export {
  toUnifiedProduct,
  toUnifiedSeries,
  toUnifiedMaterial,
  resolveProduct,
  resolveSeries,
  resolveMaterial,
  resolveErpProduct,
  resolveWebProduct,
  resolveBrandProduct,
} from "./resolver";

// Control Plane Integration
export {
  canReadView,
  canWriteView,
  canAccessDataView,
  requireDataView,
  safeResolveProduct,
} from "./view-check";

// ── Canonical Resolvers (Phase 4) ──
// ProductCore → View（无需 Domain 中间层）
export {
  resolveProductFromCore,
  resolveSeriesFromCore,
  resolveMaterialFromCore,
  resolveErpProductFromCore,
  resolveWebProductFromCore,
  resolveBrandProductFromCore,
} from "./resolver-core";
