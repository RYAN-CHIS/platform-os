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

export const ALL_MODULES = [
  { code: "erp.products", name: "ERP 产品", domain: "ERP" },
  { code: "erp.materials", name: "ERP 材料", domain: "ERP" },
  { code: "erp.bom", name: "BOM 清单", domain: "ERP" },
  { code: "erp.purchase", name: "采购管理", domain: "ERP" },
  { code: "erp.inventory", name: "库存管理", domain: "ERP" },
  { code: "erp.production", name: "生产记录", domain: "ERP" },
  { code: "erp.orders", name: "订单管理", domain: "ERP" },
  { code: "erp.customers", name: "客户管理", domain: "ERP" },
  { code: "erp.costs", name: "成本核算", domain: "ERP" },
  { code: "brand.products", name: "Brand 产品", domain: "BRAND" },
  { code: "brand.series", name: "七序系列", domain: "BRAND" },
  { code: "brand.journal", name: "品牌志", domain: "BRAND" },
  { code: "brand.home", name: "Brand 首页", domain: "BRAND" },
  { code: "brand.media", name: "媒体素材", domain: "BRAND" },
  { code: "brand.banners", name: "Banner 管理", domain: "BRAND" },
  { code: "brand.seo", name: "SEO 设置", domain: "BRAND" },
  { code: "brand.settings", name: "页面设置", domain: "BRAND" },
  { code: "settings.users", name: "用户管理", domain: "SETTINGS" },
  { code: "settings.roles", name: "角色管理", domain: "SETTINGS" },
  { code: "settings.permissions", name: "权限管理", domain: "SETTINGS" },
  { code: "settings.audit", name: "审计日志", domain: "SETTINGS" },
  { code: "settings.system", name: "系统配置", domain: "SETTINGS" },
];
