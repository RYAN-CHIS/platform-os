/**
 * Platform OS — Permission Groups
 *
 * Organizes permissions into logical groups for UI display and template building.
 * WO-P2: Permission Unification
 */

import { PERMISSIONS, type PermissionCode } from "./permissions.config";

export interface PermissionGroup {
  code: string;
  name: string;
  domain: "erp" | "brand" | "crm" | "platform" | "analytics" | "supplier" | "finance" | "ai";
  permissions: PermissionCode[];
}

// ═══════════════════════════════════════════
// ERP Groups
// ═══════════════════════════════════════════

export const ERP_GROUPS: PermissionGroup[] = [
  {
    code: "erp.dashboard",
    name: "Dashboard",
    domain: "erp",
    permissions: [PERMISSIONS.DASHBOARD_VIEW],
  },
  {
    code: "erp.products",
    name: "产品管理",
    domain: "erp",
    permissions: [
      PERMISSIONS.PRODUCT_VIEW,
      PERMISSIONS.PRODUCT_EDIT,
      PERMISSIONS.PRODUCT_DELETE,
      PERMISSIONS.SKU_VIEW,
      PERMISSIONS.SKU_EDIT,
      PERMISSIONS.SKU_DELETE,
    ],
  },
  {
    code: "erp.works",
    name: "作品管理",
    domain: "erp",
    permissions: [
      PERMISSIONS.WORK_VIEW,
      PERMISSIONS.WORK_EDIT,
      PERMISSIONS.WORK_DELETE,
    ],
  },
  {
    code: "erp.materials",
    name: "材料管理",
    domain: "erp",
    permissions: [
      PERMISSIONS.MATERIAL_VIEW,
      PERMISSIONS.MATERIAL_EDIT,
      PERMISSIONS.MATERIAL_DELETE,
    ],
  },
  {
    code: "erp.inventory",
    name: "库存管理",
    domain: "erp",
    permissions: [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_EDIT],
  },
  {
    code: "erp.bom",
    name: "BOM 管理",
    domain: "erp",
    permissions: [PERMISSIONS.BOM_VIEW, PERMISSIONS.BOM_EDIT],
  },
  {
    code: "erp.costs",
    name: "成本管理",
    domain: "erp",
    permissions: [PERMISSIONS.COST_VIEW, PERMISSIONS.COST_EDIT, PERMISSIONS.PROFIT_VIEW],
  },
  {
    code: "erp.production",
    name: "生产管理",
    domain: "erp",
    permissions: [
      PERMISSIONS.PRODUCTION_VIEW,
      PERMISSIONS.PRODUCTION_CREATE,
      PERMISSIONS.PRODUCTION_EDIT,
    ],
  },
  {
    code: "erp.orders",
    name: "订单管理",
    domain: "erp",
    permissions: [PERMISSIONS.ORDER_VIEW, PERMISSIONS.ORDER_EDIT],
  },
  {
    code: "erp.customers",
    name: "客户管理",
    domain: "erp",
    permissions: [PERMISSIONS.CUSTOMER_VIEW, PERMISSIONS.CUSTOMER_EDIT],
  },
  {
    code: "erp.users",
    name: "用户管理",
    domain: "erp",
    permissions: [PERMISSIONS.USER_VIEW, PERMISSIONS.USER_EDIT],
  },
  {
    code: "erp.settings",
    name: "系统设置",
    domain: "erp",
    permissions: [PERMISSIONS.SETTING_VIEW, PERMISSIONS.SETTING_EDIT],
  },
  {
    code: "erp.data",
    name: "数据导入导出",
    domain: "erp",
    permissions: [PERMISSIONS.IMPORT_DATA, PERMISSIONS.EXPORT_DATA],
  },
  {
    code: "erp.media",
    name: "媒体管理",
    domain: "erp",
    permissions: [
      PERMISSIONS.MEDIA_VIEW,
      PERMISSIONS.MEDIA_UPLOAD,
      PERMISSIONS.MEDIA_DELETE,
      PERMISSIONS.MEDIA_EDIT,
      PERMISSIONS.BANNER_VIEW,
      PERMISSIONS.BANNER_MANAGE,
    ],
  },
];

// ═══════════════════════════════════════════
// Brand OS Groups
// ═══════════════════════════════════════════

export const BRAND_GROUPS: PermissionGroup[] = [
  {
    code: "brand.access",
    name: "Brand OS 访问",
    domain: "brand",
    permissions: [PERMISSIONS.BRAND_ACCESS],
  },
  {
    code: "brand.series",
    name: "七序叙事",
    domain: "brand",
    permissions: [PERMISSIONS.BRAND_SERIES_VIEW, PERMISSIONS.BRAND_SERIES_EDIT],
  },
  {
    code: "brand.products",
    name: "器物展示",
    domain: "brand",
    permissions: [PERMISSIONS.BRAND_PRODUCT_VIEW, PERMISSIONS.BRAND_PRODUCT_EDIT],
  },
  {
    code: "brand.journal",
    name: "品牌志",
    domain: "brand",
    permissions: [
      PERMISSIONS.BRAND_ARTICLE_VIEW,
      PERMISSIONS.BRAND_ARTICLE_CREATE,
      PERMISSIONS.BRAND_ARTICLE_EDIT,
      PERMISSIONS.BRAND_ARTICLE_DELETE,
      PERMISSIONS.BRAND_ARTICLE_PUBLISH,
    ],
  },
  {
    code: "brand.content",
    name: "页面内容",
    domain: "brand",
    permissions: [PERMISSIONS.BRAND_PAGE_VIEW, PERMISSIONS.BRAND_PAGE_EDIT],
  },
  {
    code: "brand.seo",
    name: "SEO 管理",
    domain: "brand",
    permissions: [PERMISSIONS.BRAND_SEO_VIEW, PERMISSIONS.BRAND_SEO_EDIT],
  },
  {
    code: "brand.tags",
    name: "标签系统",
    domain: "brand",
    permissions: [PERMISSIONS.BRAND_TAG_VIEW, PERMISSIONS.BRAND_TAG_EDIT],
  },
  {
    code: "brand.materials",
    name: "材料研究",
    domain: "brand",
    permissions: [PERMISSIONS.BRAND_MATERIAL_VIEW, PERMISSIONS.BRAND_MATERIAL_EDIT],
  },
  {
    code: "brand.media",
    name: "媒体上传",
    domain: "brand",
    permissions: [PERMISSIONS.BRAND_MEDIA_UPLOAD],
  },
];

// ═══════════════════════════════════════════
// CRM Groups
// ═══════════════════════════════════════════

export const CRM_GROUPS: PermissionGroup[] = [
  {
    code: "crm.access",
    name: "CRM 访问",
    domain: "crm",
    permissions: [PERMISSIONS.CRM_ACCESS],
  },
  {
    code: "crm.leads",
    name: "线索管理",
    domain: "crm",
    permissions: [
      PERMISSIONS.LEAD_VIEW,
      PERMISSIONS.LEAD_MANAGE,
      PERMISSIONS.LEAD_FOLLOWUP,
    ],
  },
];

// ═══════════════════════════════════════════
// Platform Groups
// ═══════════════════════════════════════════

export const PLATFORM_GROUPS: PermissionGroup[] = [
  {
    code: "platform.access",
    name: "Platform 访问",
    domain: "platform",
    permissions: [PERMISSIONS.PLATFORM_ACCESS],
  },
  {
    code: "platform.admin",
    name: "Platform 管理",
    domain: "platform",
    permissions: [PERMISSIONS.PLATFORM_ADMIN],
  },
];

// ═══════════════════════════════════════════
// All Groups Combined
// ═══════════════════════════════════════════

export const ALL_PERMISSION_GROUPS: PermissionGroup[] = [
  ...ERP_GROUPS,
  ...BRAND_GROUPS,
  ...CRM_GROUPS,
  ...PLATFORM_GROUPS,
];

/** Get groups for a specific domain */
export function getGroupsByDomain(domain: PermissionGroup["domain"]): PermissionGroup[] {
  return ALL_PERMISSION_GROUPS.filter((g) => g.domain === domain);
}

/** Get group by code */
export function getGroupByCode(code: string): PermissionGroup | undefined {
  return ALL_PERMISSION_GROUPS.find((g) => g.code === code);
}
