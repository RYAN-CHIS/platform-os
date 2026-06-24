/**
 * Platform OS — Unified Sidebar Configuration
 *
 * 菜单配置驱动。新增模块只需在此文件中添加条目。
 * 支持：权限过滤、模块开关、多级菜单、动态图标。
 *
 * WO-P8D: 按工单要求重建 Sidebar 配置
 */

import type { LucideIcon } from "lucide-react";
import { PERMISSIONS } from "./permissions.config";

// ════════════════════════════════════════════
// Material Categories (可扩展的配置数组)
// ════════════════════════════════════════════

export interface MaterialCategory {
  key: string;
  label: string;
  query: string;        // URL query parameter value
  icon: string;         // Lucide icon name
  permission?: string;  // 预留权限 key
}

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  { key: "beads",       label: "珠子",   query: "beads",       icon: "Gem",      permission: "materials.beads.view" },
  { key: "accessories", label: "配件",   query: "accessories", icon: "Link",      permission: "materials.accessories.view" },
  { key: "ceramics",    label: "瓷器",   query: "ceramics",    icon: "FlaskConical", permission: "materials.ceramics.view" },
  { key: "leather",     label: "皮具",   query: "leather",     icon: "PenTool",  permission: "materials.leather.view" },
];

// ════════════════════════════════════════════
// Types
// ════════════════════════════════════════════

export interface SidebarChild {
  key: string;
  label: string;
  href: string;
  permission?: string;
  badge?: { text: string; variant: "new" | "beta" | "count" };
}

export interface SidebarItem {
  key: string;
  label: string;
  icon: string; // Lucide icon name
  href?: string;
  permission?: string;
  module?: SystemModule;
  /** Domain key from domain-registry */
  domain?: string;
  children?: SidebarChild[];
  badge?: { text: string; variant: "new" | "beta" | "count" };
}

export interface SidebarSection {
  key: string;
  label: string;
  permission?: string;
  module?: SystemModule;
  badge?: { text: string; variant: "new" | "beta" | "count" };
  items: SidebarItem[];
}

export type SystemModule =
  | "dashboard"
  | "erp"
  | "brand"
  | "crm"
  | "analytics"
  | "supplier"
  | "finance"
  | "ai"
  | "settings";

/** Re-export for backward compatibility */
export const PLATFORM_PERMISSIONS = PERMISSIONS;

// ════════════════════════════════════════════
// Sidebar Configuration — WO-P8D
// ════════════════════════════════════════════

export const SIDEBAR_CONFIG: SidebarSection[] = [
  // ── Dashboard ──
  {
    key: "dashboard",
    label: "",
    items: [
      {
        key: "dashboard",
        label: "总览",
        icon: "LayoutDashboard",
        href: "/",
        permission: PERMISSIONS.DASHBOARD_VIEW,
        module: "dashboard",
      },
    ],
  },

  // ── ERP 系统 ──
  {
    key: "erp",
    label: "ERP 系统",
    module: "erp",
    permission: PERMISSIONS.ERP_ACCESS,
    items: [
      {
        key: "erp-dashboard",
        label: "ERP 概览",
        icon: "BarChart3",
        href: "/erp",
        permission: PERMISSIONS.DASHBOARD_VIEW,
        module: "erp",
      },
      {
        key: "materials",
        label: "材料管理",
        icon: "Package",
        permission: PERMISSIONS.MATERIAL_VIEW,
        module: "erp",
        children: MATERIAL_CATEGORIES.map((cat) => ({
          key: `materials-${cat.key}`,
          label: cat.label,
          href: `/erp/materials?category=${cat.query}`,
          permission: cat.permission,
        })),
      },
      {
        key: "products",
        label: "产品 / SKU",
        icon: "Gem",
        href: "/erp/products",
        permission: PERMISSIONS.PRODUCT_VIEW,
        module: "erp",
      },
      {
        key: "bom",
        label: "BOM 物料清单",
        icon: "Layers",
        href: "/erp/bom",
        permission: PERMISSIONS.BOM_VIEW,
        module: "erp",
      },
      {
        key: "costs",
        label: "成本核算",
        icon: "DollarSign",
        href: "/erp/costs",
        permission: PERMISSIONS.COST_VIEW,
        module: "erp",
      },
      {
        key: "production",
        label: "生产记录",
        icon: "ClipboardCheck",
        href: "/erp/production",
        permission: PERMISSIONS.PRODUCTION_VIEW,
        module: "erp",
      },
      {
        key: "inventory",
        label: "库存池",
        icon: "Warehouse",
        href: "/erp/inventory",
        permission: PERMISSIONS.INVENTORY_VIEW,
        module: "erp",
      },
      {
        key: "orders",
        label: "销售管理",
        icon: "ShoppingCart",
        href: "/erp/orders",
        permission: PERMISSIONS.ORDER_VIEW,
        module: "erp",
      },
      {
        key: "customers",
        label: "客户管理",
        icon: "Users",
        href: "/erp/customers",
        permission: PERMISSIONS.CUSTOMER_VIEW,
        module: "erp",
      },
      {
        key: "purchase",
        label: "采购管理",
        icon: "Truck",
        href: "/erp/purchase",
        permission: PERMISSIONS.PURCHASE_VIEW,
        module: "erp",
      },
    ],
  },

  // ── Brand OS ──  (WO-P8D: 完整 10 项)
  {
    key: "brand",
    label: "Brand OS",
    module: "brand",
    permission: PERMISSIONS.BRAND_ACCESS,
    items: [
      {
        key: "brand-overview",
        label: "Brand 概览",
        icon: "Sparkle",
        href: "/brand",
        permission: PERMISSIONS.BRAND_PAGE_EDIT,
        module: "brand",
      },
      {
        key: "brand-products",
        label: "产品展示",
        icon: "Gem",
        href: "/brand/products",
        permission: PERMISSIONS.BRAND_PRODUCT_VIEW,
        module: "brand",
      },
      {
        key: "brand-series",
        label: "七序系列",
        icon: "BookOpen",
        href: "/brand/series",
        permission: PERMISSIONS.BRAND_SERIES_VIEW,
        module: "brand",
      },
      {
        key: "brand-materials",
        label: "材料展示",
        icon: "FlaskConical",
        href: "/brand/materials",
        permission: PERMISSIONS.BRAND_MATERIAL_VIEW,
        module: "brand",
      },
      {
        key: "brand-journal",
        label: "品牌志",
        icon: "PenTool",
        href: "/brand/journal",
        permission: PERMISSIONS.BRAND_ARTICLE_VIEW,
        module: "brand",
      },
      {
        key: "brand-media",
        label: "媒体素材",
        icon: "Image",
        href: "/brand/media",
        permission: PERMISSIONS.MEDIA_VIEW,
        module: "brand",
      },
      {
        key: "brand-banners",
        label: "Banner 管理",
        icon: "Layers",
        href: "/brand/banners",
        permission: PERMISSIONS.BANNER_VIEW,
        module: "brand",
      },
      {
        key: "brand-seo",
        label: "SEO 设置",
        icon: "Search",
        href: "/brand/seo",
        permission: PERMISSIONS.BRAND_SEO_VIEW,
        module: "brand",
      },
      {
        key: "brand-settings",
        label: "页面设置",
        icon: "Settings",
        href: "/brand/settings",
        permission: PERMISSIONS.BRAND_PAGE_EDIT,
        module: "brand",
      },
    ],
  },

  // ── 系统设置 ──  (WO-P8D: 完整 3 项)
  {
    key: "settings",
    label: "系统设置",
    module: "settings",
    permission: PERMISSIONS.SETTING_VIEW,
    items: [
      {
        key: "settings-users",
        label: "用户管理",
        icon: "Users",
        href: "/settings/users",
        permission: PERMISSIONS.USER_VIEW,
        module: "settings",
      },
      {
        key: "settings-roles",
        label: "角色管理",
        icon: "UserCog",
        href: "/settings/roles",
        permission: PERMISSIONS.USER_EDIT,
        module: "settings",
      },
      {
        key: "settings-permissions",
        label: "权限矩阵",
        icon: "Shield",
        href: "/settings/permissions",
        permission: PERMISSIONS.USER_EDIT,
        module: "settings",
      },
      {
        key: "settings-audit",
        label: "审计日志",
        icon: "ScrollText",
        href: "/settings/audit",
        permission: PERMISSIONS.SETTING_VIEW,
        module: "settings",
      },
      {
        key: "settings-system",
        label: "系统配置",
        icon: "Settings",
        href: "/settings/system",
        permission: PERMISSIONS.SETTING_EDIT,
        module: "settings",
      },
    ],
  },
];

// ════════════════════════════════════════════
// Module Config
// ════════════════════════════════════════════

/** 默认启用的模块 */
export const DEFAULT_ENABLED_MODULES: SystemModule[] = [
  "dashboard",
  "erp",
  "brand",
  "settings",
];

/** 模块中文标签 */
export const MODULE_LABELS: Record<SystemModule, string> = {
  dashboard: "总览",
  erp: "ERP 系统",
  brand: "Brand OS",
  crm: "CRM",
  analytics: "数据分析",
  supplier: "供应商",
  finance: "财务",
  ai: "AI Center",
  settings: "系统设置",
};

// ════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════

/** Flatten all sidebar items (sections → items → children) into a single list */
export function flattenSidebarItems(
  config: SidebarSection[],
  enabledModules: SystemModule[],
  userPermissions: string[]
): { key: string; label: string; href: string; permission?: string }[] {
  const result: { key: string; label: string; href: string; permission?: string }[] = [];

  for (const section of config) {
    // Module filter
    if (section.module && !enabledModules.includes(section.module)) continue;
    // Section permission
    if (section.permission && !userPermissions.includes(section.permission)) continue;

    for (const item of section.items) {
      if (item.module && !enabledModules.includes(item.module)) continue;
      if (item.permission && !userPermissions.includes(item.permission)) continue;

      if (item.href) {
        result.push({ key: item.key, label: item.label, href: item.href, permission: item.permission });
      }

      if (item.children) {
        for (const child of item.children) {
          if (child.permission && !userPermissions.includes(child.permission)) continue;
          result.push({ key: child.key, label: child.label, href: child.href, permission: child.permission });
        }
      }
    }
  }

  return result;
}

/** Check if a path matches any sidebar item */
export function findActiveItem(
  pathname: string,
  config: SidebarSection[]
): { sectionKey?: string; itemKey?: string } {
  for (const section of config) {
    for (const item of section.items) {
      // Check direct match
      if (item.href) {
        const base = item.href.includes("?") ? item.href.split("?")[0] : item.href;
        const matches = item.href === "/"
          ? (pathname === "/" || pathname === "/platform")
          : pathname.startsWith(base);
        if (matches) return { sectionKey: section.key, itemKey: item.key };
      }
      // Check children
      if (item.children) {
        for (const child of item.children) {
          const base = child.href.includes("?") ? child.href.split("?")[0] : child.href;
          if (pathname.startsWith(base)) {
            return { sectionKey: section.key, itemKey: item.key };
          }
        }
      }
    }
  }
  return {};
}
