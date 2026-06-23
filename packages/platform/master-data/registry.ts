/**
 * Master Data Registry
 *
 * Single source of truth for entity ownership.
 * WO-P3B: ERP = Master Data System.
 */

import type { MasterEntity, EntityKey } from "./types";

// ═══════════════════════════════════════════
// Registry
// ═══════════════════════════════════════════

export const MASTER_DATA_REGISTRY: Record<EntityKey, MasterEntity> = {
  // ── ERP Master Data ──
  MATERIAL: {
    key: "MATERIAL",
    label: "材料",
    owner: "ERP",
    sourceDatabase: "ERP_DB",
    gatewayPath: "erp.materials",
    syncStrategy: "ERP_TO_BRAND",
    description: "原材料库存、采购、成本。Brand 材料研究为叙事层，通过 erpMaterialCode 桥接。",
    allowedWriters: [],
    fieldOwnership: {
      inventory: "ERP",
      cost: "ERP",
      supplier: "ERP",
      narrative: "BRAND",
    },
  },

  PRODUCT: {
    key: "PRODUCT",
    label: "产品",
    owner: "ERP",
    sourceDatabase: "ERP_DB",
    gatewayPath: "erp.products",
    syncStrategy: "ERP_TO_BRAND",
    description: "产品定义、SKU 变体。Brand 产品展示为展示层，通过 sku 桥接。",
    allowedWriters: [],
    fieldOwnership: {
      code: "ERP",
      sku: "ERP",
      inventory: "ERP",
      cost: "ERP",
      price: "ERP",
      status: "ERP",
      // Brand display fields (in brand_product_content)
      story: "BRAND",
      gallery: "BRAND",
      presentation: "BRAND",
      seo: "BRAND",
      highlights: "BRAND",
      coverImage: "BRAND",
      theme: "BRAND",
      objectCategory: "BRAND",
    },
  },

  SKU: {
    key: "SKU",
    label: "SKU",
    owner: "ERP",
    sourceDatabase: "ERP_DB",
    gatewayPath: "erp.products.getSkus",
    syncStrategy: "ERP_TO_BRAND",
    description: "产品变体，库存单位。Brand 通过 sku code 引用。",
  },

  BOM: {
    key: "BOM",
    label: "物料清单",
    owner: "ERP",
    sourceDatabase: "ERP_DB",
    gatewayPath: "erp.bom",
    syncStrategy: "ERP_TO_BRAND",
    description: "产品-材料关联及用量。",
  },

  INVENTORY: {
    key: "INVENTORY",
    label: "库存",
    owner: "ERP",
    sourceDatabase: "ERP_DB",
    gatewayPath: "erp.inventory",
    syncStrategy: "ERP_TO_BRAND",
    description: "库存流水。出入库、调整。",
  },

  PRODUCTION: {
    key: "PRODUCTION",
    label: "生产",
    owner: "ERP",
    sourceDatabase: "ERP_DB",
    gatewayPath: "erp.production",
    syncStrategy: "ERP_TO_BRAND",
    description: "生产批次及成本核算。",
  },

  ORDER: {
    key: "ORDER",
    label: "订单",
    owner: "ERP",
    sourceDatabase: "ERP_DB",
    gatewayPath: "erp.orders",
    syncStrategy: "ERP_TO_BRAND",
    description: "所有订单（ERP + Brand Web）。Brand Order 已废弃，合并入 ERP。",
    allowedWriters: [],
  },

  CUSTOMER: {
    key: "CUSTOMER",
    label: "客户",
    owner: "ERP",
    sourceDatabase: "ERP_DB",
    gatewayPath: "erp.customers",
    syncStrategy: "ERP_TO_BRAND",
    description: "客户信息及订单历史。",
  },

  SUPPLIER: {
    key: "SUPPLIER",
    label: "供应商",
    owner: "ERP",
    sourceDatabase: "ERP_DB",
    gatewayPath: "erp.materials", // currently embedded
    syncStrategy: "ERP_TO_BRAND",
    description: "供应商信息。当前嵌入 Material.supplier 字段，待独立建模。",
  },

  MEDIA: {
    key: "MEDIA",
    label: "媒体",
    owner: "ERP",
    sourceDatabase: "ERP_DB",
    gatewayPath: "erp.materials", // erp.media when added
    syncStrategy: "ERP_TO_BRAND",
    description: "统一媒体资产库。Brand 媒体已废弃，合并入 ERP MediaAsset。",
  },

  // ── Brand Exclusive ──
  SERIES: {
    key: "SERIES",
    label: "七序体系",
    owner: "BRAND",
    sourceDatabase: "BRAND_DB",
    gatewayPath: "brand.series",
    syncStrategy: "BRAND_ONLY",
    description: "品牌叙事七序。ERP 七序为制造分类（独立），通过 slug 关联。",
  },

  JOURNAL: {
    key: "JOURNAL",
    label: "品牌志",
    owner: "BRAND",
    sourceDatabase: "BRAND_DB",
    gatewayPath: "brand.journal",
    syncStrategy: "BRAND_ONLY",
    description: "品牌志文章。纯内容，无 ERP 对应。",
  },

  CONTENT: {
    key: "CONTENT",
    label: "页面内容",
    owner: "BRAND",
    sourceDatabase: "BRAND_DB",
    gatewayPath: "brand.content",
    syncStrategy: "BRAND_ONLY",
    description: "页面内容块 CMS。",
  },

  SEO: {
    key: "SEO",
    label: "SEO 配置",
    owner: "BRAND",
    sourceDatabase: "BRAND_DB",
    gatewayPath: "brand.seo",
    syncStrategy: "BRAND_ONLY",
    description: "SEO 元数据配置。",
  },

  TAG: {
    key: "TAG",
    label: "标签",
    owner: "BRAND",
    sourceDatabase: "BRAND_DB",
    gatewayPath: "brand.tags",
    syncStrategy: "BRAND_ONLY",
    description: "内容标签系统。",
  },

  LEAD: {
    key: "LEAD",
    label: "线索",
    owner: "BRAND",
    sourceDatabase: "BRAND_DB",
    gatewayPath: "brand.leads",
    syncStrategy: "BRAND_ONLY",
    description: "潜在线索。未来 CRM 可从 Brand 同步。",
  },

  // ── Platform Owned ──
  USER: {
    key: "USER",
    label: "用户",
    owner: "PLATFORM",
    sourceDatabase: "PLATFORM_DB",
    gatewayPath: "platform.users",
    syncStrategy: "PLATFORM_ONLY",
    description: "统一用户及权限。ERP 和 Brand 共享同一用户表。",
  },

  PERMISSION: {
    key: "PERMISSION",
    label: "权限",
    owner: "PLATFORM",
    sourceDatabase: "PLATFORM_DB",
    gatewayPath: "platform.permissions",
    syncStrategy: "PLATFORM_ONLY",
    description: "统一权限点、组、模板。",
  },
};

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

/** Get all entities owned by a system */
export function getEntitiesByOwner(owner: string): MasterEntity[] {
  return Object.values(MASTER_DATA_REGISTRY).filter((e) => e.owner === owner);
}

/** Get entity by key */
export function getEntity(key: EntityKey): MasterEntity {
  return MASTER_DATA_REGISTRY[key];
}

/** Check if an entity is ERP master data */
export function isErpMasterData(key: EntityKey): boolean {
  return MASTER_DATA_REGISTRY[key]?.owner === "ERP";
}

/** Check if an entity is Brand exclusive */
export function isBrandExclusive(key: EntityKey): boolean {
  return MASTER_DATA_REGISTRY[key]?.owner === "BRAND";
}

/** Count entities by owner */
export function getOwnershipStats() {
  const stats: Record<string, number> = {};
  for (const e of Object.values(MASTER_DATA_REGISTRY)) {
    stats[e.owner] = (stats[e.owner] || 0) + 1;
  }
  return stats;
}
