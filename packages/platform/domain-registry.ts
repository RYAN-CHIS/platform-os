/**
 * Platform OS — Domain Registry v2
 *
 * Defines domain ownership for all entities.
 * ERP = Master Data System. Brand = Content Layer.
 *
 * WO-P1: Architecture Consolidated
 */

// ═══════════════════════════════════════════
// Domain Definitions
// ═══════════════════════════════════════════

export interface DomainConfig {
  label: string;
  description: string;
  entities: string[];
  schemas: string[];
  dependsOn?: string[];
  status: "active" | "planned" | "deprecated";
}

export const DOMAIN_REGISTRY: Record<string, DomainConfig> = {
  erp: {
    label: "ERP 系统",
    description: "进销存 / 供应链 / 制造 — 主数据系统",
    entities: [
      "material",
      "product",
      "sku",
      "bom",
      "inventory",
      "production",
      "order",
      "customer",
      "cost",
      "work",
      "media",
    ],
    schemas: [
      "erp_series",
      "erp_works",
      "erp_works_assets",
      "erp_products",
      "erp_product_skus",
      "erp_bom",
      "erp_materials",
      "erp_inventory_transactions",
      "erp_production_records",
      "erp_orders",
      "erp_customers",
      "erp_product_costs",
      "erp_purchase_records",
      "erp_media_assets",
      "erp_media_references",
      "erp_banners",
    ],
    status: "active",
  },

  brand: {
    label: "Brand OS",
    description: "品牌系统 / 内容 / 叙事 — 内容层",
    entities: [
      "series",
      "product-display",
      "journal",
      "content",
      "seo",
      "tag",
      "lead",
    ],
    schemas: [
      "brand_series",
      "brand_products",
      "brand_product_materials",
      "brand_product_tags",
      "journal_posts",
      "journal_tags",
      "page_contents",
      "seo_configs",
      "site_settings",
      "brand_tags",
      "contact_leads",
      "brand_materials",
    ],
    dependsOn: ["erp.material", "erp.product"],
    status: "active",
  },

  crm: {
    label: "CRM",
    description: "客户关系管理",
    entities: ["lead", "customer", "interaction"],
    schemas: [],
    dependsOn: ["erp.customer", "brand.lead"],
    status: "planned",
  },

  supplier: {
    label: "供应商管理",
    description: "供应商 / 采购 / 合同管理",
    entities: ["supplier", "purchase", "contract"],
    schemas: [],
    dependsOn: ["erp.material"],
    status: "planned",
  },

  finance: {
    label: "财务管理",
    description: "应收应付 / 总账 / 利润报表",
    entities: ["revenue", "cost", "profit", "ar", "ap", "gl"],
    schemas: [],
    dependsOn: ["erp.order", "erp.cost", "erp.production"],
    status: "planned",
  },

  analytics: {
    label: "数据分析",
    description: "销售 / 库存 / 生产 / 内容分析",
    entities: ["report", "dashboard", "metric"],
    schemas: [],
    dependsOn: ["erp.order", "erp.inventory", "erp.production", "brand.journal"],
    status: "planned",
  },

  ai: {
    label: "AI Center",
    description: "AI 内容生成 / 洞察 / 自动化",
    entities: ["prompt", "generation", "model"],
    schemas: [],
    dependsOn: ["brand.journal", "brand.product-display", "erp.customer"],
    status: "planned",
  },
} as const;

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

export type DomainKey = keyof typeof DOMAIN_REGISTRY;

/** Returns which domain owns a given entity */
export function getEntityOwner(entity: string): DomainKey | null {
  for (const [domain, config] of Object.entries(DOMAIN_REGISTRY)) {
    if (config.entities.includes(entity)) return domain as DomainKey;
  }
  return null;
}

/** Returns entities that a domain depends on */
export function getDomainDependencies(domain: DomainKey): string[] {
  return DOMAIN_REGISTRY[domain].dependsOn || [];
}

/** Returns all active domains */
export function getActiveDomains(): DomainKey[] {
  return Object.entries(DOMAIN_REGISTRY)
    .filter(([_, config]) => config.status === "active")
    .map(([key]) => key as DomainKey);
}

/** Returns all domains (active + planned) */
export function getAllDomains(): DomainKey[] {
  return Object.keys(DOMAIN_REGISTRY) as DomainKey[];
}

/** Returns the master data source for an entity */
export function getMasterSource(entity: string): DomainKey | null {
  // ERP is always the master for operational data
  const owner = getEntityOwner(entity);
  if (owner === "brand") {
    // Check if ERP has a counterpart
    if (["material", "product", "order", "media"].includes(entity)) return "erp";
  }
  return owner;
}
