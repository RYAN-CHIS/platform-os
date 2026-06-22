/**
 * 允物 Brand OS — 权限系统 V3
 *
 * V3 新增能力：
 * 1. 权限分组（Permission Group）
 * 2. 权限模板（Permission Template）
 * 3. 临时授权（Temporary Permission / TTL）
 * 4. 审计日志（Audit Log）
 *
 * 权限计算：
 * 最终权限 = 角色模板权限 + 用户追加权限 - 用户撤销权限 + 临时权限（未过期）
 */

import { prisma } from "@/lib/prisma";

// ═══════════════════════════════════════════
// 一、权限点字典（34 个权限点）
// ═══════════════════════════════════════════

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard.view",

  // 产品
  PRODUCT_VIEW: "product.view",
  PRODUCT_EDIT: "product.edit",
  PRODUCT_DELETE: "product.delete",

  // SKU
  SKU_VIEW: "sku.view",
  SKU_EDIT: "sku.edit",
  SKU_DELETE: "sku.delete",

  // 作品
  WORK_VIEW: "work.view",
  WORK_EDIT: "work.edit",
  WORK_DELETE: "work.delete",

  // 原材料
  MATERIAL_VIEW: "material.view",
  MATERIAL_EDIT: "material.edit",
  MATERIAL_DELETE: "material.delete",

  // 库存
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_EDIT: "inventory.edit",

  // BOM
  BOM_VIEW: "bom.view",
  BOM_EDIT: "bom.edit",

  // 成本
  COST_VIEW: "cost.view",
  COST_EDIT: "cost.edit",

  // 利润
  PROFIT_VIEW: "profit.view",

  // 生产
  PRODUCTION_VIEW: "production.view",
  PRODUCTION_CREATE: "production.create",
  PRODUCTION_EDIT: "production.edit",

  // 订单
  ORDER_VIEW: "order.view",
  ORDER_EDIT: "order.edit",

  // 客户
  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_EDIT: "customer.edit",

  // 用户
  USER_VIEW: "user.view",
  USER_EDIT: "user.edit",

  // 系统设置
  SETTING_VIEW: "setting.view",
  SETTING_EDIT: "setting.edit",

  // 数据导入导出
  IMPORT_DATA: "import.data",
  EXPORT_DATA: "export.data",

  // 媒体中心 (Phase A)
  MEDIA_VIEW: "media.view",
  MEDIA_UPLOAD: "media.upload",
  MEDIA_DELETE: "media.delete",
  MEDIA_EDIT: "media.edit",
  BANNER_VIEW: "banner.view",
  BANNER_MANAGE: "banner.manage",

  // 内容运营 (Phase B–D 预留)
  ARTICLE_VIEW: "article.view",
  ARTICLE_CREATE: "article.create",
  ARTICLE_EDIT: "article.edit",
  ARTICLE_DELETE: "article.delete",
  ARTICLE_PUBLISH: "article.publish",
  PAGE_VIEW: "page.view",
  PAGE_EDIT: "page.edit",
  SEO_VIEW: "seo.view",
  SEO_EDIT: "seo.edit",

  // 客户线索 (Phase E 预留)
  LEAD_VIEW: "lead.view",
  LEAD_MANAGE: "lead.manage",
  LEAD_FOLLOWUP: "lead.followup",

  // 超级管理员
  SUPER_ADMIN: "super.admin",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** 所有权限点代码列表 */
export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(PERMISSIONS);

/** 权限点中文标签 */
export const PERMISSION_LABELS: Record<PermissionCode, string> = {
  [PERMISSIONS.DASHBOARD_VIEW]: "Dashboard 查看",

  [PERMISSIONS.PRODUCT_VIEW]: "产品查看",
  [PERMISSIONS.PRODUCT_EDIT]: "产品编辑",
  [PERMISSIONS.PRODUCT_DELETE]: "产品删除",

  [PERMISSIONS.SKU_VIEW]: "SKU 查看",
  [PERMISSIONS.SKU_EDIT]: "SKU 编辑",
  [PERMISSIONS.SKU_DELETE]: "SKU 删除",

  [PERMISSIONS.WORK_VIEW]: "作品查看",
  [PERMISSIONS.WORK_EDIT]: "作品编辑",
  [PERMISSIONS.WORK_DELETE]: "作品删除",

  [PERMISSIONS.MATERIAL_VIEW]: "原材料查看",
  [PERMISSIONS.MATERIAL_EDIT]: "原材料编辑",
  [PERMISSIONS.MATERIAL_DELETE]: "原材料删除",

  [PERMISSIONS.INVENTORY_VIEW]: "库存查看",
  [PERMISSIONS.INVENTORY_EDIT]: "库存编辑",

  [PERMISSIONS.BOM_VIEW]: "BOM 查看",
  [PERMISSIONS.BOM_EDIT]: "BOM 编辑",

  [PERMISSIONS.COST_VIEW]: "成本查看",
  [PERMISSIONS.COST_EDIT]: "成本编辑",

  [PERMISSIONS.PROFIT_VIEW]: "利润查看",

  [PERMISSIONS.PRODUCTION_VIEW]: "生产查看",
  [PERMISSIONS.PRODUCTION_CREATE]: "生产创建",
  [PERMISSIONS.PRODUCTION_EDIT]: "生产编辑",

  [PERMISSIONS.ORDER_VIEW]: "订单查看",
  [PERMISSIONS.ORDER_EDIT]: "订单编辑",

  [PERMISSIONS.CUSTOMER_VIEW]: "客户查看",
  [PERMISSIONS.CUSTOMER_EDIT]: "客户编辑",

  [PERMISSIONS.USER_VIEW]: "用户查看",
  [PERMISSIONS.USER_EDIT]: "用户编辑",

  [PERMISSIONS.SETTING_VIEW]: "设置查看",
  [PERMISSIONS.SETTING_EDIT]: "设置编辑",

  [PERMISSIONS.IMPORT_DATA]: "数据导入",
  [PERMISSIONS.EXPORT_DATA]: "数据导出",

  [PERMISSIONS.MEDIA_VIEW]: "媒体查看",
  [PERMISSIONS.MEDIA_UPLOAD]: "媒体上传",
  [PERMISSIONS.MEDIA_DELETE]: "媒体删除",
  [PERMISSIONS.MEDIA_EDIT]: "媒体编辑",
  [PERMISSIONS.BANNER_VIEW]: "Banner 查看",
  [PERMISSIONS.BANNER_MANAGE]: "Banner 管理",

  [PERMISSIONS.ARTICLE_VIEW]: "文章查看",
  [PERMISSIONS.ARTICLE_CREATE]: "文章创建",
  [PERMISSIONS.ARTICLE_EDIT]: "文章编辑",
  [PERMISSIONS.ARTICLE_DELETE]: "文章删除",
  [PERMISSIONS.ARTICLE_PUBLISH]: "文章发布",
  [PERMISSIONS.PAGE_VIEW]: "页面查看",
  [PERMISSIONS.PAGE_EDIT]: "页面编辑",
  [PERMISSIONS.SEO_VIEW]: "SEO 查看",
  [PERMISSIONS.SEO_EDIT]: "SEO 编辑",

  [PERMISSIONS.LEAD_VIEW]: "线索查看",
  [PERMISSIONS.LEAD_MANAGE]: "线索管理",
  [PERMISSIONS.LEAD_FOLLOWUP]: "线索跟进",

  [PERMISSIONS.SUPER_ADMIN]: "超级管理员",
};

// ═══════════════════════════════════════════
// 二、V3 权限分组定义
// ═══════════════════════════════════════════

/** 权限分组配置（与数据库 permission_groups 表对应） */
export const PERMISSION_GROUP_CONFIGS = [
  { code: "dashboard", name: "Dashboard", codes: [PERMISSIONS.DASHBOARD_VIEW] },
  { code: "product", name: "产品管理", codes: [PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.PRODUCT_EDIT, PERMISSIONS.PRODUCT_DELETE] },
  { code: "sku", name: "SKU 管理", codes: [PERMISSIONS.SKU_VIEW, PERMISSIONS.SKU_EDIT, PERMISSIONS.SKU_DELETE] },
  { code: "work", name: "作品管理", codes: [PERMISSIONS.WORK_VIEW, PERMISSIONS.WORK_EDIT, PERMISSIONS.WORK_DELETE] },
  { code: "material", name: "材料管理", codes: [PERMISSIONS.MATERIAL_VIEW, PERMISSIONS.MATERIAL_EDIT, PERMISSIONS.MATERIAL_DELETE] },
  { code: "inventory", name: "库存管理", codes: [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.INVENTORY_EDIT] },
  { code: "bom", name: "BOM 管理", codes: [PERMISSIONS.BOM_VIEW, PERMISSIONS.BOM_EDIT] },
  { code: "cost", name: "成本管理", codes: [PERMISSIONS.COST_VIEW, PERMISSIONS.COST_EDIT] },
  { code: "profit", name: "利润", codes: [PERMISSIONS.PROFIT_VIEW] },
  { code: "production", name: "生产管理", codes: [PERMISSIONS.PRODUCTION_VIEW, PERMISSIONS.PRODUCTION_CREATE, PERMISSIONS.PRODUCTION_EDIT] },
  { code: "order", name: "订单管理", codes: [PERMISSIONS.ORDER_VIEW, PERMISSIONS.ORDER_EDIT] },
  { code: "customer", name: "客户管理", codes: [PERMISSIONS.CUSTOMER_VIEW, PERMISSIONS.CUSTOMER_EDIT] },
  { code: "user", name: "用户管理", codes: [PERMISSIONS.USER_VIEW, PERMISSIONS.USER_EDIT] },
  { code: "setting", name: "系统设置", codes: [PERMISSIONS.SETTING_VIEW, PERMISSIONS.SETTING_EDIT] },
  { code: "data", name: "数据导入导出", codes: [PERMISSIONS.IMPORT_DATA, PERMISSIONS.EXPORT_DATA] },
  { code: "media", name: "展示管理", codes: [PERMISSIONS.MEDIA_VIEW, PERMISSIONS.MEDIA_UPLOAD, PERMISSIONS.MEDIA_DELETE, PERMISSIONS.MEDIA_EDIT, PERMISSIONS.BANNER_VIEW, PERMISSIONS.BANNER_MANAGE] },
  { code: "content", name: "内容运营", codes: [PERMISSIONS.ARTICLE_VIEW, PERMISSIONS.ARTICLE_CREATE, PERMISSIONS.ARTICLE_EDIT, PERMISSIONS.ARTICLE_DELETE, PERMISSIONS.ARTICLE_PUBLISH, PERMISSIONS.PAGE_VIEW, PERMISSIONS.PAGE_EDIT] },
  { code: "seo", name: "SEO 管理", codes: [PERMISSIONS.SEO_VIEW, PERMISSIONS.SEO_EDIT] },
  { code: "lead", name: "客户线索", codes: [PERMISSIONS.LEAD_VIEW, PERMISSIONS.LEAD_MANAGE, PERMISSIONS.LEAD_FOLLOWUP] },
  { code: "super", name: "超级管理员", codes: [PERMISSIONS.SUPER_ADMIN] },
];

/** 权限分组（兼容 V2 的 PERMISSION_GROUPS 格式） */
export const PERMISSION_GROUPS: { name: string; codes: PermissionCode[] }[] =
  PERMISSION_GROUP_CONFIGS.map((g) => ({ name: g.name, codes: g.codes }));

// ═══════════════════════════════════════════
// 三、角色定义
// ═══════════════════════════════════════════

export enum Role {
  ADMIN = "admin",
  OPERATOR = "operator",
  VIEWER = "viewer",
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: "管理员",
  [Role.OPERATOR]: "运营",
  [Role.VIEWER]: "访客",
};

const ROLE_ALIASES: Record<string, string> = {
  staff: "operator",
};

export function normalizeRole(role: string | null | undefined): Role {
  if (!role) return Role.VIEWER;
  const normalized = ROLE_ALIASES[role] || role;
  if (Object.values(Role).includes(normalized as Role)) return normalized as Role;
  return Role.VIEWER;
}

// ═══════════════════════════════════════════
// 四、V3 角色默认权限（兼容 V2 降级）
// ═══════════════════════════════════════════

/** ADMIN：拥有全部权限 */
export const ADMIN_DEFAULT_PERMISSIONS: Set<PermissionCode> = new Set(ALL_PERMISSION_CODES);

/** OPERATOR：默认运营权限（不含成本/利润/设置/用户管理） */
export const OPERATOR_DEFAULT_PERMISSIONS: Set<PermissionCode> = new Set([
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.PRODUCT_EDIT,
  PERMISSIONS.SKU_VIEW, PERMISSIONS.SKU_EDIT,
  PERMISSIONS.WORK_VIEW, PERMISSIONS.WORK_EDIT,
  PERMISSIONS.ORDER_VIEW, PERMISSIONS.ORDER_EDIT,
  PERMISSIONS.CUSTOMER_VIEW, PERMISSIONS.CUSTOMER_EDIT,
  PERMISSIONS.PRODUCTION_VIEW, PERMISSIONS.PRODUCTION_CREATE,
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.BOM_VIEW,
  PERMISSIONS.MATERIAL_VIEW,
  PERMISSIONS.MEDIA_VIEW, PERMISSIONS.MEDIA_UPLOAD, PERMISSIONS.MEDIA_EDIT, PERMISSIONS.MEDIA_DELETE,
  PERMISSIONS.BANNER_VIEW, PERMISSIONS.BANNER_MANAGE,
]);

/** VIEWER：仅只读 */
export const VIEWER_DEFAULT_PERMISSIONS: Set<PermissionCode> = new Set([
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.PRODUCT_VIEW,
  PERMISSIONS.SKU_VIEW,
  PERMISSIONS.WORK_VIEW,
]);

/** 角色 → 默认权限集映射（V2 降级用，V3 优先使用模板） */
export const ROLE_DEFAULT_PERMISSION_SETS: Record<string, Set<PermissionCode>> = {
  admin: ADMIN_DEFAULT_PERMISSIONS,
  operator: OPERATOR_DEFAULT_PERMISSIONS,
  viewer: VIEWER_DEFAULT_PERMISSIONS,
};

// ═══════════════════════════════════════════
// 五、PermissionSet 类
// ═══════════════════════════════════════════

export class PermissionSet {
  private codes: Set<string>;

  constructor(codes: string[] = []) {
    this.codes = new Set(codes.includes(PERMISSIONS.SUPER_ADMIN) ? ALL_PERMISSION_CODES : codes);
  }

  has(code: PermissionCode): boolean {
    return this.codes.has(code);
  }

  hasAll(...codes: PermissionCode[]): boolean {
    return codes.every((c) => this.codes.has(c));
  }

  hasAny(...codes: PermissionCode[]): boolean {
    return codes.some((c) => this.codes.has(c));
  }

  toArray(): PermissionCode[] {
    return Array.from(this.codes) as PermissionCode[];
  }

  get size(): number {
    return this.codes.size;
  }

  static fromSet(set: Set<PermissionCode>): PermissionSet {
    return new PermissionSet(Array.from(set));
  }

  static fromMerge(
    roleDefaults: Set<PermissionCode>,
    added: PermissionCode[],
    removed: PermissionCode[]
  ): PermissionSet {
    const merged = new Set(roleDefaults);
    for (const code of added) merged.add(code);
    for (const code of removed) merged.delete(code);
    if (merged.has(PERMISSIONS.SUPER_ADMIN)) {
      ALL_PERMISSION_CODES.forEach((c) => merged.add(c));
    }
    return PermissionSet.fromSet(merged as Set<PermissionCode>);
  }
}

// ═══════════════════════════════════════════
// 六、V3 核心：有效权限计算（数据库驱动）
// ═══════════════════════════════════════════

export type PermissionStore = string[];

/**
 * V3 有效权限计算
 *
 * 最终权限 =
 *   角色模板权限
 *   + 用户追加权限 (UserPermission type=GRANT)
 *   - 用户撤销权限 (UserPermission type=REVOKE)
 *   + 临时权限（未过期）
 *
 * @param userId 用户ID
 * @param role 用户角色（admin 直接返回全部权限）
 * @returns 最终权限代码列表
 */
export async function computeEffectivePermissions(
  userId: number,
  role: string
): Promise<string[]> {
  const normalizedRole = normalizeRole(role);

  // Admin 拥有全部权限
  if (normalizedRole === Role.ADMIN) {
    return ALL_PERMISSION_CODES;
  }

  try {
    // 1. 获取角色模板权限
    let templatePermissions = new Set<string>();
    const templates = await prisma.permissionTemplate.findMany({
      where: { role: normalizedRole },
      include: {
        items: {
          include: { permission: true },
        },
      },
    });

    for (const tmpl of templates) {
      for (const item of tmpl.items) {
        templatePermissions.add(item.permission.code);
      }
    }

    // 2. 降级：如果没有模板，使用 V2 硬编码默认权限
    if (templatePermissions.size === 0) {
      const defaults = ROLE_DEFAULT_PERMISSION_SETS[normalizedRole];
      if (defaults) {
        templatePermissions = new Set(defaults);
      }
    }

    // 3. 获取用户自定义权限覆盖
    const userPerms = await prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    for (const up of userPerms) {
      if (up.type === "GRANT") {
        templatePermissions.add(up.permission.code);
      } else if (up.type === "REVOKE") {
        templatePermissions.delete(up.permission.code);
      }
    }

    // 4. 获取临时权限（未过期）
    const now = new Date();
    const tempPerms = await prisma.temporaryPermission.findMany({
      where: {
        userId,
        expiresAt: { gt: now },
      },
      include: { permission: true },
    });

    for (const tp of tempPerms) {
      templatePermissions.add(tp.permission.code);
    }

    // 5. SUPER_ADMIN 自动补全
    if (templatePermissions.has(PERMISSIONS.SUPER_ADMIN)) {
      ALL_PERMISSION_CODES.forEach((c) => templatePermissions.add(c));
    }

    return Array.from(templatePermissions);
  } catch (error) {
    console.error("[V3] computeEffectivePermissions 失败:", error);
    // 降级到 V2 默认权限
    const defaults = ROLE_DEFAULT_PERMISSION_SETS[normalizedRole];
    return defaults ? Array.from(defaults) : [];
  }
}

/**
 * V3 有效权限计算（轻量版，仅传入已有的权限列表）
 * 用于 middleware 等已有权限数据的场景
 */
export function composeEffectivePermissions(
  role: string | null | undefined,
  basePermissions: string[],
  tempPermissions: string[] = []
): string[] {
  const normalizedRole = normalizeRole(role);
  const merged = new Set<string>();

  // Admin 全权限
  if (normalizedRole === Role.ADMIN) {
    return ALL_PERMISSION_CODES;
  }

  // 合并基础权限 + 临时权限
  for (const code of basePermissions) merged.add(code);
  for (const code of tempPermissions) merged.add(code);

  // SUPER_ADMIN 补全
  if (merged.has(PERMISSIONS.SUPER_ADMIN)) {
    ALL_PERMISSION_CODES.forEach((c) => merged.add(c));
  }

  return Array.from(merged);
}

// ═══════════════════════════════════════════
// 七、V3 审计日志辅助
// ═══════════════════════════════════════════

export type AuditAction = "GRANT" | "REVOKE" | "TEMP_GRANT" | "TEMP_EXPIRE" | "TEMPLATE_APPLY" | "ROLE_CHANGE";

export async function writeAuditLog(
  actorUserId: number,
  targetUserId: number,
  action: AuditAction,
  permission: string,
  reason?: string
) {
  try {
    await prisma.permissionAuditLog.create({
      data: {
        userId: actorUserId,
        targetUserId,
        action,
        permission,
        reason: reason || null,
      },
    });
  } catch (error) {
    console.error("[V3] 审计日志写入失败:", error);
  }
}

// ═══════════════════════════════════════════
// 八、V3 临时权限清理
// ═══════════════════════════════════════════

export async function cleanupExpiredTempPermissions() {
  try {
    const result = await prisma.temporaryPermission.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    if (result.count > 0) {
      console.log(`[V3] 清理了 ${result.count} 条过期临时权限`);
    }
    return result.count;
  } catch (error) {
    console.error("[V3] 临时权限清理失败:", error);
    return 0;
  }
}

// ═══════════════════════════════════════════
// 九、V3 模板辅助
// ═══════════════════════════════════════════

/**
 * 获取模板的权限代码列表
 */
export async function getTemplatePermissionCodes(templateId: number): Promise<string[]> {
  const items = await prisma.permissionTemplateItem.findMany({
    where: { templateId },
    include: { permission: true },
  });
  return items.map((i) => i.permission.code);
}

/**
 * 应用模板到用户（替换用户所有自定义权限）
 */
export async function applyTemplateToUser(
  userId: number,
  templateId: number
): Promise<string[]> {
  const template = await prisma.permissionTemplate.findUnique({
    where: { id: templateId },
    include: {
      items: { include: { permission: true } },
    },
  });

  if (!template) throw new Error(`模板 ${templateId} 不存在`);

  const templateCodes = template.items.map((i) => i.permission.code);

  // 事务：清除用户原有自定义权限，写入模板权限
  await prisma.$transaction(async (tx) => {
    await tx.userPermission.deleteMany({ where: { userId } });

    const perms = await tx.permission.findMany({
      where: { code: { in: templateCodes } },
      select: { id: true, code: true },
    });

    for (const perm of perms) {
      await tx.userPermission.create({
        data: { userId, permissionId: perm.id, type: "GRANT" },
      });
    }
  });

  return templateCodes;
}

// ═══════════════════════════════════════════
// 十、V3 模板名称定义
// ═══════════════════════════════════════════

/** 预设模板配置（用于 seed） */
export const PRESET_TEMPLATES = [
  {
    name: "管理员模板",
    role: "admin",
    description: "拥有系统全部权限",
    codes: ALL_PERMISSION_CODES,
  },
  {
    name: "运营模板",
    role: "operator",
    description: "日常运营权限，不含成本和用户管理",
    codes: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.PRODUCT_EDIT,
      PERMISSIONS.SKU_VIEW, PERMISSIONS.SKU_EDIT,
      PERMISSIONS.WORK_VIEW, PERMISSIONS.WORK_EDIT,
      PERMISSIONS.ORDER_VIEW, PERMISSIONS.ORDER_EDIT,
      PERMISSIONS.CUSTOMER_VIEW, PERMISSIONS.CUSTOMER_EDIT,
      PERMISSIONS.PRODUCTION_VIEW, PERMISSIONS.PRODUCTION_CREATE,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.BOM_VIEW,
      PERMISSIONS.MATERIAL_VIEW,
      PERMISSIONS.MEDIA_VIEW, PERMISSIONS.MEDIA_UPLOAD, PERMISSIONS.MEDIA_EDIT, PERMISSIONS.MEDIA_DELETE,
      PERMISSIONS.BANNER_VIEW, PERMISSIONS.BANNER_MANAGE,
    ],
  },
  {
    name: "仓库模板",
    role: "operator",
    description: "仓库管理权限，查看库存和材料",
    codes: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.INVENTORY_VIEW,
      PERMISSIONS.MATERIAL_VIEW,
      PERMISSIONS.BOM_VIEW,
      PERMISSIONS.PRODUCTION_VIEW,
      PERMISSIONS.SKU_VIEW,
      PERMISSIONS.PRODUCT_VIEW,
    ],
  },
  {
    name: "财务模板",
    role: "operator",
    description: "财务权限，可查看成本和利润",
    codes: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.COST_VIEW,
      PERMISSIONS.PROFIT_VIEW,
      PERMISSIONS.ORDER_VIEW,
      PERMISSIONS.PRODUCT_VIEW,
      PERMISSIONS.SKU_VIEW,
    ],
  },
  {
    name: "访客模板",
    role: "viewer",
    description: "仅只读基础信息",
    codes: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.PRODUCT_VIEW,
      PERMISSIONS.SKU_VIEW,
      PERMISSIONS.WORK_VIEW,
    ],
  },
];

// ═══════════════════════════════════════════
// 十一、V2 兼容：PermissionSet 工厂
// ═══════════════════════════════════════════

export function createPermissionSetFromCodes(codes: PermissionStore | null | undefined): PermissionSet {
  if (!codes || !Array.isArray(codes)) return new PermissionSet([]);
  return new PermissionSet(codes);
}

export function getDefaultPermissionSet(role: string | null | undefined): Set<PermissionCode> {
  const normalized = normalizeRole(role);
  return ROLE_DEFAULT_PERMISSION_SETS[normalized] ?? VIEWER_DEFAULT_PERMISSIONS;
}

// ═══════════════════════════════════════════
// 十二、便捷权限断言
// ═══════════════════════════════════════════

export function canViewCost(role: string | null | undefined, permissions?: PermissionStore): boolean {
  if (normalizeRole(role) === Role.ADMIN) return true;
  if (permissions && Array.isArray(permissions)) {
    return permissions.includes(PERMISSIONS.COST_VIEW) || permissions.includes(PERMISSIONS.SUPER_ADMIN);
  }
  return false;
}

export function canViewProfit(role: string | null | undefined, permissions?: PermissionStore): boolean {
  if (normalizeRole(role) === Role.ADMIN) return true;
  if (permissions && Array.isArray(permissions)) {
    return permissions.includes(PERMISSIONS.PROFIT_VIEW) || permissions.includes(PERMISSIONS.SUPER_ADMIN);
  }
  return false;
}

export function canEdit(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return r === Role.ADMIN || r === Role.OPERATOR;
}

export function canManageUsers(role: string | null | undefined): boolean {
  return normalizeRole(role) === Role.ADMIN;
}

export function canEditProducts(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return r === Role.ADMIN || r === Role.OPERATOR;
}

export function canCreateRecords(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return r === Role.ADMIN || r === Role.OPERATOR;
}

export function isReadOnly(role: string | null | undefined): boolean {
  return normalizeRole(role) === Role.VIEWER;
}

export function isAdmin(role: string | null | undefined): boolean {
  return normalizeRole(role) === Role.ADMIN;
}

export function hasPermission(
  role: string | null | undefined,
  code: PermissionCode,
  permissions?: PermissionStore
): boolean {
  if (normalizeRole(role) === Role.ADMIN) return true;
  if (permissions && Array.isArray(permissions)) {
    return permissions.includes(code) || permissions.includes(PERMISSIONS.SUPER_ADMIN);
  }
  const defaults = getDefaultPermissionSet(role);
  return defaults.has(code);
}

// ═══════════════════════════════════════════
// 十三、数据脱敏工具
// ═══════════════════════════════════════════

export function maskMaterialForRole<T extends Record<string, any>>(
  material: T,
  role: string | null | undefined,
  permissions?: PermissionStore
): T {
  if (canViewCost(role, permissions)) return material;
  const masked = { ...material };
  delete (masked as any).unitCost;
  delete (masked as any).totalCost;
  delete (masked as any).purchasePrice;
  return masked;
}

export function maskMaterialsForRole<T extends Record<string, any>>(
  materials: T[],
  role: string | null | undefined,
  permissions?: PermissionStore
): T[] {
  return materials.map((m) => maskMaterialForRole(m, role, permissions));
}

export function maskSkuForRole<T extends Record<string, any>>(
  sku: T,
  role: string | null | undefined,
  permissions?: PermissionStore
): T {
  if (canViewCost(role, permissions)) return sku;
  const masked: any = { ...sku };
  if (masked.cost && typeof masked.cost === "object") {
    const { materialCost, laborCost, packagingCost, totalCost, ...restCost } = masked.cost;
    masked.cost = Object.keys(restCost).length > 0 ? restCost : undefined;
  }
  if (Array.isArray(masked.boms)) {
    masked.boms = masked.boms.map((bom: any) => {
      const clean = { ...bom };
      if (clean.material) {
        clean.material = maskMaterialForRole(clean.material, role, permissions);
      }
      delete clean.unitPrice;
      return clean;
    }) as any;
  }
  return masked as T;
}

export function maskSkusForRole<T extends Record<string, any>>(
  skus: T[],
  role: string | null | undefined,
  permissions?: PermissionStore
): T[] {
  return skus.map((s) => maskSkuForRole(s, role, permissions));
}

// ═══════════════════════════════════════════
// 十四、页面访问清单
// ═══════════════════════════════════════════

/** 页面路径 → 所需权限点映射 */
export const PAGE_PERMISSION_MAP: Record<string, PermissionCode> = {
  "/dashboard": PERMISSIONS.DASHBOARD_VIEW,
  "/series": PERMISSIONS.WORK_VIEW,
  "/works": PERMISSIONS.WORK_VIEW,
  "/products": PERMISSIONS.PRODUCT_VIEW,
  "/materials": PERMISSIONS.MATERIAL_VIEW,
  "/bom": PERMISSIONS.BOM_VIEW,
  "/costs": PERMISSIONS.COST_VIEW,
  "/productions": PERMISSIONS.PRODUCTION_VIEW,
  "/inventory": PERMISSIONS.INVENTORY_VIEW,
  "/orders": PERMISSIONS.ORDER_VIEW,
  "/customers": PERMISSIONS.CUSTOMER_VIEW,
  "/import": PERMISSIONS.IMPORT_DATA,
  "/settings": PERMISSIONS.SETTING_VIEW,
  "/media": PERMISSIONS.MEDIA_VIEW,
};

/** API 路径前缀 → 所需权限点映射 */
export const API_PERMISSION_MAP: Record<string, { GET?: PermissionCode; POST?: PermissionCode; PUT?: PermissionCode; DELETE?: PermissionCode }> = {
  "/api/dashboard": { GET: PERMISSIONS.DASHBOARD_VIEW },
  "/api/materials": { GET: PERMISSIONS.MATERIAL_VIEW, POST: PERMISSIONS.MATERIAL_EDIT, PUT: PERMISSIONS.MATERIAL_EDIT, DELETE: PERMISSIONS.MATERIAL_DELETE },
  "/api/bom": { GET: PERMISSIONS.BOM_VIEW, POST: PERMISSIONS.BOM_EDIT, PUT: PERMISSIONS.BOM_EDIT, DELETE: PERMISSIONS.BOM_EDIT },
  "/api/costs": { GET: PERMISSIONS.COST_VIEW, POST: PERMISSIONS.COST_EDIT },
  "/api/productions": { GET: PERMISSIONS.PRODUCTION_VIEW, POST: PERMISSIONS.PRODUCTION_CREATE, PUT: PERMISSIONS.PRODUCTION_EDIT },
  "/api/sku": { GET: PERMISSIONS.SKU_VIEW, POST: PERMISSIONS.SKU_EDIT, PUT: PERMISSIONS.SKU_EDIT, DELETE: PERMISSIONS.SKU_DELETE },
  "/api/products": { GET: PERMISSIONS.PRODUCT_VIEW, POST: PERMISSIONS.PRODUCT_EDIT, PUT: PERMISSIONS.PRODUCT_EDIT, DELETE: PERMISSIONS.PRODUCT_DELETE },
  "/api/inventory": { GET: PERMISSIONS.INVENTORY_VIEW, POST: PERMISSIONS.INVENTORY_EDIT },
  "/api/orders": { GET: PERMISSIONS.ORDER_VIEW, POST: PERMISSIONS.ORDER_EDIT, PUT: PERMISSIONS.ORDER_EDIT },
  "/api/customers": { GET: PERMISSIONS.CUSTOMER_VIEW, POST: PERMISSIONS.CUSTOMER_EDIT, PUT: PERMISSIONS.CUSTOMER_EDIT },
  "/api/users": { GET: PERMISSIONS.USER_VIEW, POST: PERMISSIONS.USER_EDIT, PUT: PERMISSIONS.USER_EDIT, DELETE: PERMISSIONS.USER_EDIT },
  "/api/settings": { GET: PERMISSIONS.SETTING_VIEW, POST: PERMISSIONS.SETTING_EDIT },
  "/api/permissions": { GET: PERMISSIONS.USER_EDIT, POST: PERMISSIONS.USER_EDIT },
  "/api/export": { GET: PERMISSIONS.EXPORT_DATA },
  "/api/media": { GET: PERMISSIONS.MEDIA_VIEW, POST: PERMISSIONS.MEDIA_UPLOAD, PUT: PERMISSIONS.MEDIA_EDIT, DELETE: PERMISSIONS.MEDIA_DELETE },
  "/api/banners": { GET: PERMISSIONS.BANNER_VIEW, POST: PERMISSIONS.BANNER_MANAGE, PUT: PERMISSIONS.BANNER_MANAGE, DELETE: PERMISSIONS.BANNER_MANAGE },
};
