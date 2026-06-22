// ═══════════════════════════════════════════════════════════
// Control Plane — 系统边界定义
//
// 定义三系统的能力边界：谁可以访问什么。
// ═══════════════════════════════════════════════════════════

export type SystemId = "erp" | "web" | "brand";

export type ActionType = "read" | "write" | "delete" | "admin";

export type ModelDomain =
  | "product"
  | "series"
  | "material"
  | "order"
  | "customer"
  | "media"
  | "journal"
  | "contact"
  | "seo"
  | "page"
  | "tag"
  | "banner"
  | "user"
  | "permission"
  | "audit"
  | "inventory"
  | "production"
  | "bom"
  | "purchase"
  | "sku"
  | "work"
  | "cost";

// ── 系统能力矩阵 ──
// 定义每个系统对每个 domain model 的操作权限

interface SystemCapability {
  name: string;
  label: string;
  description: string;
  // 允许读取的 models
  canRead: ModelDomain[];
  // 允许写入的 models
  canWrite: ModelDomain[];
  // 允许管理的 models
  canAdmin: ModelDomain[];
}

export const SYSTEM_CAPABILITIES: Record<SystemId, SystemCapability> = {
  erp: {
    name: "ERP",
    label: "进销存/财务/供应链",
    description: "业务数据读写，库存/生产/订单管理",
    canRead: [
      "product", "series", "material", "order", "customer",
      "media", "inventory", "production", "bom", "purchase",
      "sku", "work", "cost", "journal", "user", "audit",
    ],
    canWrite: [
      "product", "series", "material", "order", "customer",
      "media", "inventory", "production", "bom", "purchase",
      "sku", "work", "cost",
    ],
    canAdmin: [
      "user", "permission", "audit",
    ],
  },

  web: {
    name: "Web",
    label: "独立站/官网/SEO",
    description: "公开展示数据只读，表单提交写入",
    canRead: [
      "product", "series", "material", "media", "journal",
      "seo", "page", "tag", "banner",
    ],
    canWrite: [
      "contact", // 联系表单
    ],
    canAdmin: [],
  },

  brand: {
    name: "Brand OS",
    label: "品牌系统/内容管理",
    description: "内容/美学/品牌叙事管理，不可操作业务数据",
    canRead: [
      "product", "series", "material", "media", "journal",
      "seo", "page", "tag", "banner", "contact", "audit",
    ],
    canWrite: [
      "product", "series", "material", "media", "journal",
      "seo", "page", "tag", "banner",
    ],
    canAdmin: [
      "journal", "seo", "page", "tag",
    ],
  },
};

// ── 系统边界检查 ──

export function getSystemCapability(system: SystemId): SystemCapability {
  return SYSTEM_CAPABILITIES[system];
}

export function canSystemRead(system: SystemId, model: ModelDomain): boolean {
  return SYSTEM_CAPABILITIES[system].canRead.includes(model);
}

export function canSystemWrite(system: SystemId, model: ModelDomain): boolean {
  return SYSTEM_CAPABILITIES[system].canWrite.includes(model);
}

export function canSystemAdmin(system: SystemId, model: ModelDomain): boolean {
  return SYSTEM_CAPABILITIES[system].canAdmin.includes(model);
}
