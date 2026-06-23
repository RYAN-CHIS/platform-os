/**
 * Platform OS — Unified Permission Registry
 *
 * Single source of truth for ALL permission codes.
 * ERP V3 permissions + Brand OS permissions + Platform permissions.
 *
 * WO-P2: Permission Unification
 * Usage: import { PERMISSIONS } from "@yunwu/platform/config/permissions.config"
 */

// ═══════════════════════════════════════════
// ERP Domain Permissions (inherited from ERP V3)
// ═══════════════════════════════════════════

const ERP = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard.view",

  // Products & SKU
  PRODUCT_VIEW: "product.view",
  PRODUCT_EDIT: "product.edit",
  PRODUCT_DELETE: "product.delete",
  SKU_VIEW: "sku.view",
  SKU_EDIT: "sku.edit",
  SKU_DELETE: "sku.delete",

  // Works
  WORK_VIEW: "work.view",
  WORK_EDIT: "work.edit",
  WORK_DELETE: "work.delete",

  // Materials
  MATERIAL_VIEW: "material.view",
  MATERIAL_EDIT: "material.edit",
  MATERIAL_DELETE: "material.delete",

  // Inventory
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_EDIT: "inventory.edit",

  // BOM
  BOM_VIEW: "bom.view",
  BOM_EDIT: "bom.edit",

  // Costs & Profit
  COST_VIEW: "cost.view",
  COST_EDIT: "cost.edit",
  PROFIT_VIEW: "profit.view",

  // Production
  PRODUCTION_VIEW: "production.view",
  PRODUCTION_CREATE: "production.create",
  PRODUCTION_EDIT: "production.edit",

  // Orders
  ORDER_VIEW: "order.view",
  ORDER_EDIT: "order.edit",

  // Customers
  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_EDIT: "customer.edit",

  // User Management
  USER_VIEW: "user.view",
  USER_EDIT: "user.edit",

  // System Settings
  SETTING_VIEW: "setting.view",
  SETTING_EDIT: "setting.edit",

  // Import / Export
  IMPORT_DATA: "import.data",
  EXPORT_DATA: "export.data",

  // Media (shared with Brand)
  MEDIA_VIEW: "media.view",
  MEDIA_UPLOAD: "media.upload",
  MEDIA_DELETE: "media.delete",
  MEDIA_EDIT: "media.edit",
  BANNER_VIEW: "banner.view",
  BANNER_MANAGE: "banner.manage",

  // Super Admin
  SUPER_ADMIN: "super.admin",
} as const;

// ═══════════════════════════════════════════
// Brand OS Domain Permissions (new)
// ═══════════════════════════════════════════

const BRAND = {
  // Brand access gate
  BRAND_ACCESS: "brand.access",

  // Series (narrative)
  BRAND_SERIES_VIEW: "brand.series.view",
  BRAND_SERIES_EDIT: "brand.series.edit",

  // Product display
  BRAND_PRODUCT_VIEW: "brand.product.view",
  BRAND_PRODUCT_EDIT: "brand.product.edit",

  // Journal (articles)
  BRAND_ARTICLE_VIEW: "article.view",       // alias to ERP reserved
  BRAND_ARTICLE_CREATE: "article.create",
  BRAND_ARTICLE_EDIT: "article.edit",
  BRAND_ARTICLE_DELETE: "article.delete",
  BRAND_ARTICLE_PUBLISH: "article.publish",

  // Content pages
  BRAND_PAGE_VIEW: "page.view",
  BRAND_PAGE_EDIT: "page.edit",

  // SEO
  BRAND_SEO_VIEW: "seo.view",
  BRAND_SEO_EDIT: "seo.edit",

  // Tags
  BRAND_TAG_VIEW: "brand.tag.view",
  BRAND_TAG_EDIT: "brand.tag.edit",

  // Materials (narrative)
  BRAND_MATERIAL_VIEW: "brand.material.view",
  BRAND_MATERIAL_EDIT: "brand.material.edit",

  // Media (brand-specific)
  BRAND_MEDIA_UPLOAD: "brand.media.upload",
} as const;

// ═══════════════════════════════════════════
// CRM Domain Permissions
// ═══════════════════════════════════════════

const CRM = {
  CRM_ACCESS: "crm.access",
  LEAD_VIEW: "lead.view",
  LEAD_MANAGE: "lead.manage",
  LEAD_FOLLOWUP: "lead.followup",
} as const;

// ═══════════════════════════════════════════
// Platform Domain Permissions (new)
// ═══════════════════════════════════════════

const PLATFORM = {
  PLATFORM_ACCESS: "platform.access",
  PLATFORM_ADMIN: "platform.admin",
} as const;

// ═══════════════════════════════════════════
// Analytics + Future (reserved)
// ═══════════════════════════════════════════

const ANALYTICS = {
  ANALYTICS_ACCESS: "analytics.access",
  ANALYTICS_VIEW: "analytics.view",
} as const;

const SUPPLIER = {
  SUPPLIER_ACCESS: "supplier.access",
  SUPPLIER_VIEW: "supplier.view",
  SUPPLIER_EDIT: "supplier.edit",
} as const;

const FINANCE = {
  FINANCE_ACCESS: "finance.access",
  FINANCE_VIEW: "finance.view",
  FINANCE_EDIT: "finance.edit",
} as const;

const AI = {
  AI_ACCESS: "ai.access",
  AI_USE: "ai.use",
  AI_MANAGE: "ai.manage",
} as const;

// ═══════════════════════════════════════════
// Unified Permissions Object
// ═══════════════════════════════════════════

export const PERMISSIONS = {
  ...ERP,
  ...BRAND,
  ...CRM,
  ...PLATFORM,
  ...ANALYTICS,
  ...SUPPLIER,
  ...FINANCE,
  ...AI,
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** All permission codes as a flat array */
export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(PERMISSIONS);

/** Count stats */
export const PERMISSION_STATS = {
  erp: Object.keys(ERP).length,
  brand: Object.keys(BRAND).length,
  crm: Object.keys(CRM).length,
  platform: Object.keys(PLATFORM).length,
  analytics: Object.keys(ANALYTICS).length,
  supplier: Object.keys(SUPPLIER).length,
  finance: Object.keys(FINANCE).length,
  ai: Object.keys(AI).length,
  total: Object.keys(PERMISSIONS).length,
};

// ═══════════════════════════════════════════
// Helper: check if user has permission
// ═══════════════════════════════════════════

export function hasPermission(
  userPermissions: string[],
  code: PermissionCode
): boolean {
  if (userPermissions.includes(PERMISSIONS.SUPER_ADMIN)) return true;
  return userPermissions.includes(code);
}

export function hasAnyPermission(
  userPermissions: string[],
  codes: PermissionCode[]
): boolean {
  if (userPermissions.includes(PERMISSIONS.SUPER_ADMIN)) return true;
  return codes.some((c) => userPermissions.includes(c));
}

export function hasAllPermissions(
  userPermissions: string[],
  codes: PermissionCode[]
): boolean {
  if (userPermissions.includes(PERMISSIONS.SUPER_ADMIN)) return true;
  return codes.every((c) => userPermissions.includes(c));
}
