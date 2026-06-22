// ═══════════════════════════════════════════════════════════
// @yunwu/db/canonical — Canonical Data Core (Phase 4)
//
// 唯一事实模型。所有系统从这里读写。
//
// 使用方式:
//   import { mapToProductCanonical, ProductCore } from "@yunwu/db/canonical"
//   const core = mapToProductCanonical(domainProduct, "erp");
// ═══════════════════════════════════════════════════════════

// Core types
export type { ProductCore, CoreMediaRef, CoreSkuRef } from "./product.core";
export { createProductCore, mergeProductCore } from "./product.core";

export type { SeriesCore } from "./series.core";
export { createSeriesCore } from "./series.core";

export type { MaterialCore } from "./material.core";
export { createMaterialCore } from "./material.core";

// Mappers
export {
  mapToProductCanonical,
  mapToSeriesCanonical,
  mapToMaterialCanonical,
  mapAndMergeProducts,
  mapErpProductToCanonical,
  mapBrandProductToCanonical,
  mapWebProductToCanonical,
} from "./canonical-mapper";
