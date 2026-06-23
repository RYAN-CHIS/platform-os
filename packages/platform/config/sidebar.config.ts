/**
 * Platform OS — Unified Sidebar Configuration
 *
 * 菜单配置驱动。新增模块只需在此文件中添加条目。
 * 支持：权限过滤、模块开关、多级菜单、动态图标。
 */

import type { LucideIcon } from "lucide-react";
import { PERMISSIONS } from "./permissions.config";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

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

// ═══════════════════════════════════════════
// Sidebar Configuration
// ═══════════════════════════════════════════

export const SIDEBAR_CONFIG: SidebarSection[] = [
  // ── Dashboard ──
  {
    key: "dashboard",
    label: "",
    items: [
      {
        key: "dashboard",
        label: "仪表盘",
        icon: "LayoutDashboard",
        href: "/platform",
        permission: PERMISSIONS.DASHBOARD_VIEW,
        module: "dashboard",
      },
    ],
  },

  // ── ERP ──
  {
    key: "erp",
    label: "ERP 系统",
    module: "erp",
    permission: PERMISSIONS.ERP_ACCESS,
    items: [
      {
        key: "erp-dashboard",
        label: "ERP 仪表盘",
        icon: "LayoutDashboard",
        href: "/erp/dashboard",
        permission: PERMISSIONS.DASHBOARD_VIEW,
        module: "erp",
      },
      {
        key: "materials",
        label: "材料管理",
        icon: "Package",
        href: "/erp/materials",
        permission: PERMISSIONS.MATERIAL_VIEW,
        module: "erp",
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
        key: "inventory",
        label: "库存池",
        icon: "Warehouse",
        href: "/erp/inventory",
        permission: PERMISSIONS.INVENTORY_VIEW,
        module: "erp",
      },
      {
        key: "productions",
        label: "生产记录",
        icon: "ClipboardCheck",
        href: "/erp/productions",
        permission: PERMISSIONS.PRODUCTION_VIEW,
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
        key: "orders",
        label: "订单管理",
        icon: "ShoppingCart",
        href: "/erp/orders",
        permission: PERMISSIONS.ORDER_VIEW,
        module: "erp",
        children: [
          {
            key: "orders-list",
            label: "全部订单",
            href: "/erp/orders",
            permission: PERMISSIONS.ORDER_VIEW,
          },
          {
            key: "customers",
            label: "客户管理",
            href: "/erp/customers",
            permission: PERMISSIONS.CUSTOMER_VIEW,
          },
        ],
      },
      {
        key: "works",
        label: "作品管理",
        icon: "Sparkle",
        href: "/erp/works",
        permission: PERMISSIONS.WORK_VIEW,
        module: "erp",
      },
      {
        key: "erp-media",
        label: "ERP 媒体库",
        icon: "Image",
        href: "/erp/media",
        permission: PERMISSIONS.MEDIA_VIEW,
        module: "erp",
      },
      {
        key: "erp-import",
        label: "数据导入",
        icon: "Upload",
        href: "/erp/import",
        permission: PERMISSIONS.IMPORT_DATA,
        module: "erp",
      },
    ],
  },

  // ── Brand OS ──
  {
    key: "brand",
    label: "Brand OS",
    module: "brand",
    permission: PERMISSIONS.BRAND_ACCESS,
    items: [
      {
        key: "series",
        label: "七序叙事",
        icon: "BookOpen",
        href: "/admin/series",
        permission: PERMISSIONS.BRAND_SERIES_VIEW,
        module: "brand",
      },
      {
        key: "objects",
        label: "器物展示",
        icon: "Gem",
        href: "/admin/objects",
        permission: PERMISSIONS.BRAND_PRODUCT_VIEW,
        module: "brand",
      },
      {
        key: "brand-materials",
        label: "材料研究",
        icon: "FlaskConical",
        href: "/admin/materials",
        permission: PERMISSIONS.BRAND_MATERIAL_VIEW,
        module: "brand",
      },
      {
        key: "journal",
        label: "品牌志",
        icon: "PenTool",
        href: "/admin/journal",
        permission: PERMISSIONS.BRAND_JOURNAL_VIEW,
        module: "brand",
        children: [
          {
            key: "journal-list",
            label: "全部文章",
            href: "/admin/journal",
            permission: PERMISSIONS.BRAND_JOURNAL_VIEW,
          },
          {
            key: "journal-new",
            label: "新建文章",
            href: "/admin/journal/new",
            permission: PERMISSIONS.BRAND_JOURNAL_CREATE,
          },
        ],
      },
      {
        key: "content",
        label: "页面内容",
        icon: "FileText",
        href: "/admin/content",
        permission: PERMISSIONS.BRAND_PAGE_EDIT,
        module: "brand",
      },
      {
        key: "tags",
        label: "标签系统",
        icon: "Tag",
        href: "/admin/tags",
        permission: PERMISSIONS.BRAND_TAG_VIEW,
        module: "brand",
      },
      {
        key: "media",
        label: "媒体中心",
        icon: "Image",
        href: "/admin/media",
        permission: PERMISSIONS.MEDIA_VIEW,
        module: "brand",
      },
    ],
  },

  // ── CRM ──
  {
    key: "crm",
    label: "CRM",
    module: "crm",
    permission: PERMISSIONS.CRM_ACCESS,
    items: [
      {
        key: "leads",
        label: "潜在线索",
        icon: "Users",
        href: "/admin/leads",
        permission: PERMISSIONS.LEAD_VIEW,
        module: "crm",
      },
    ],
  },

  // ── Analytics ──
  {
    key: "analytics",
    label: "数据分析",
    module: "analytics",
    permission: PERMISSIONS.ANALYTICS_ACCESS,
    badge: { text: "即将推出", variant: "beta" },
    items: [],
  },

  // ── Supplier (Future) ──
  {
    key: "supplier",
    label: "供应商管理",
    module: "supplier",
    permission: PERMISSIONS.SUPPLIER_ACCESS,
    badge: { text: "即将推出", variant: "beta" },
    items: [],
  },

  // ── Finance (Future) ──
  {
    key: "finance",
    label: "财务管理",
    module: "finance",
    permission: PERMISSIONS.FINANCE_ACCESS,
    badge: { text: "即将推出", variant: "beta" },
    items: [],
  },

  // ── AI Center (Future) ──
  {
    key: "ai",
    label: "AI Center",
    module: "ai",
    permission: PERMISSIONS.AI_ACCESS,
    badge: { text: "即将推出", variant: "beta" },
    items: [],
  },

  // ── Settings ──
  {
    key: "settings",
    label: "系统管理",
    module: "settings",
    permission: PERMISSIONS.SETTING_VIEW,
    items: [
      {
        key: "users",
        label: "用户管理",
        icon: "Users",
        href: "/erp/settings",
        permission: PERMISSIONS.USER_VIEW,
        module: "settings",
      },
      {
        key: "permissions",
        label: "权限管理",
        icon: "Shield",
        href: "/erp/settings",
        permission: PERMISSIONS.USER_EDIT,
        module: "settings",
      },
      {
        key: "seo",
        label: "SEO 配置",
        icon: "Search",
        href: "/admin/seo",
        permission: PERMISSIONS.SEO_VIEW,
        module: "settings",
      },
      {
        key: "audit",
        label: "审计日志",
        icon: "ScrollText",
        href: "/admin/audit",
        permission: PERMISSIONS.AUDIT_VIEW,
        module: "settings",
      },
      {
        key: "system",
        label: "系统设置",
        icon: "Settings",
        href: "/admin/settings",
        permission: PERMISSIONS.SETTING_EDIT,
        module: "settings",
      },
    ],
  },
];

// ═══════════════════════════════════════════
// Module Config
// ═══════════════════════════════════════════

/** 默认启用的模块 */
export const DEFAULT_ENABLED_MODULES: SystemModule[] = [
  "dashboard",
  "erp",
  "brand",
  "crm",
  "settings",
];

/** 模块中文标签 */
export const MODULE_LABELS: Record<SystemModule, string> = {
  dashboard: "仪表盘",
  erp: "ERP 系统",
  brand: "Brand OS",
  crm: "CRM",
  analytics: "数据分析",
  ai: "AI Center",
  settings: "系统管理",
};

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

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
      if (item.href && pathname.startsWith(item.href)) {
        return { sectionKey: section.key, itemKey: item.key };
      }
      // Check children
      if (item.children) {
        for (const child of item.children) {
          if (pathname.startsWith(child.href)) {
            return { sectionKey: section.key, itemKey: item.key };
          }
        }
      }
    }
  }
  return {};
}
