/**
 * Entity Bridge Mappings
 *
 * Maps Brand display entities to their ERP master data counterparts.
 * WO-P3B: All bridges documented and type-checked.
 */

import type { EntityKey } from "./types";

// ═══════════════════════════════════════════
// Bridge Definition
// ═══════════════════════════════════════════

export interface EntityBridge {
  /** Human-readable name */
  label: string;
  /** Source entity (ERP master) */
  source: {
    entity: EntityKey;
    table: string;
    field: string;
  };
  /** Target entity (Brand display) */
  target: {
    entity: EntityKey;
    table: string;
    field: string;
  };
  /** Direction of data flow */
  direction: "ONE_WAY" | "BIDIRECTIONAL";
  /** How to resolve (exact match, fuzzy, manual) */
  resolution: "EXACT" | "FUZZY" | "MANUAL";
  /** Status */
  status: "ACTIVE" | "PLANNED" | "DEPRECATED";
}

// ═══════════════════════════════════════════
// Registered Bridges
// ═══════════════════════════════════════════

export const ENTITY_BRIDGES: Record<string, EntityBridge> = {
  // ── Brand Product ↔ ERP Product SKU ──
  ProductSkuBridge: {
    label: "BrandProduct.sku ↔ ErpProductSku.code",
    source: {
      entity: "SKU",
      table: "product_skus",
      field: "code",
    },
    target: {
      entity: "PRODUCT",
      table: "products", // Brand products table
      field: "sku",
    },
    direction: "ONE_WAY",
    resolution: "EXACT",
    status: "ACTIVE",
  },

  // ── Product SSOT Bridge (WO-P4A) ──
  ProductSkuToContent: {
    label: "BrandProduct.erpProductId ↔ ErpProduct.id (SSOT)",
    source: {
      entity: "PRODUCT",
      table: "erp_products",
      field: "id",
    },
    target: {
      entity: "PRODUCT",
      table: "brand_products",
      field: "erp_product_id",
    },
    direction: "ONE_WAY",
    resolution: "MANUAL",
    status: "ACTIVE",
  },

  // ── Brand Material ↔ ERP Material ──
  MaterialBridge: {
    label: "BrandMaterial.erpMaterialCode ↔ ErpMaterial.code",
    source: {
      entity: "MATERIAL",
      table: "raw_materials",
      field: "code",
    },
    target: {
      entity: "MATERIAL",
      table: "brand_materials",
      field: "erp_material_code",
    },
    direction: "ONE_WAY",
    resolution: "FUZZY",
    status: "PLANNED",
  },

  // ── Brand Media ↔ ERP Media ──
  MediaBridge: {
    label: "BrandMedia → ErpMediaAsset (deprecated)",
    source: {
      entity: "MEDIA",
      table: "media_assets",
      field: "id",
    },
    target: {
      entity: "MEDIA",
      table: "media", // Brand media table (to be deprecated)
      field: "id",
    },
    direction: "ONE_WAY",
    resolution: "MANUAL",
    status: "DEPRECATED",
  },

  // ── Brand Series ↔ ERP Series ──
  SeriesBridge: {
    label: "BrandSeries.slug ↔ ErpSeries.code",
    source: {
      entity: "SERIES",
      table: "series", // ERP series
      field: "code",
    },
    target: {
      entity: "SERIES",
      table: "brand_series",
      field: "slug",
    },
    direction: "BIDIRECTIONAL",
    resolution: "MANUAL",
    status: "ACTIVE",
  },
};

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

/** Get bridges by status */
export function getBridgesByStatus(status: EntityBridge["status"]): EntityBridge[] {
  return Object.values(ENTITY_BRIDGES).filter((b) => b.status === status);
}

/** Get bridge between two entities */
export function getBridge(source: EntityKey, target: EntityKey): EntityBridge | undefined {
  return Object.values(ENTITY_BRIDGES).find(
    (b) => b.source.entity === source && b.target.entity === target
  );
}

/** Get all bridges for an entity */
export function getBridgesForEntity(entity: EntityKey): EntityBridge[] {
  return Object.values(ENTITY_BRIDGES).filter(
    (b) => b.source.entity === entity || b.target.entity === entity
  );
}
