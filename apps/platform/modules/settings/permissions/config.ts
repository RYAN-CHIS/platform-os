/**
 * Permissions config — shared types and constants (NOT a server file)
 */
export interface RoleRow {
  id: number;
  role_name: string;
  role_code: string;
  permissions: string[];
  is_active: boolean;
}

export interface PermissionItemRow {
  id: number;
  name: string;
  code: string;
  module: string;
  type: string;
  description: string;
}

export const ALL_MODULES = [
  { code: "erp.products", displayName: "商品管理", domain: "ERP" },
  { code: "erp.materials", displayName: "材料管理", domain: "ERP" },
  { code: "erp.bom", displayName: "BOM 清单", domain: "ERP" },
  { code: "erp.purchase", displayName: "采购管理", domain: "ERP" },
  { code: "erp.inventory", displayName: "库存管理", domain: "ERP" },
  { code: "erp.production", displayName: "生产管理", domain: "ERP" },
  { code: "erp.orders", displayName: "订单管理", domain: "ERP" },
  { code: "erp.customers", displayName: "客户管理", domain: "ERP" },
  { code: "erp.costs", displayName: "成本核算", domain: "ERP" },
  { code: "erp.supplier", displayName: "供应商管理", domain: "ERP" },

  { code: "brand.products", displayName: "产品展示", domain: "BRAND" },
  { code: "brand.series", displayName: "七序系列", domain: "BRAND" },
  { code: "brand.journal", displayName: "品牌志", domain: "BRAND" },
  { code: "brand.home", displayName: "首页管理", domain: "BRAND" },
  { code: "brand.media", displayName: "媒体素材", domain: "BRAND" },
  { code: "brand.banners", displayName: "Banner 管理", domain: "BRAND" },
  { code: "brand.seo", displayName: "SEO 设置", domain: "BRAND" },
  { code: "brand.settings", displayName: "页面设置", domain: "BRAND" },

  { code: "settings.users", displayName: "用户管理", domain: "SETTINGS" },
  { code: "settings.roles", displayName: "角色管理", domain: "SETTINGS" },
  { code: "settings.permissions", displayName: "权限矩阵", domain: "SETTINGS" },
  { code: "settings.audit", displayName: "审计日志", domain: "SETTINGS" },
  { code: "settings.system", displayName: "系统配置", domain: "SETTINGS" },
];
