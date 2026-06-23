/**
 * @yunwu/platform — Platform OS Core
 *
 * Unified admin shell configuration, permissions, domain registry.
 * WO-P2: Permission Unification
 */

export {
  SIDEBAR_CONFIG,
  PLATFORM_PERMISSIONS,
  DEFAULT_ENABLED_MODULES,
  MODULE_LABELS,
  flattenSidebarItems,
  findActiveItem,
} from "./config/sidebar.config";

export type {
  SidebarItem,
  SidebarChild,
  SidebarSection,
  SystemModule,
} from "./config/sidebar.config";

export {
  PERMISSIONS,
  ALL_PERMISSION_CODES,
  PERMISSION_STATS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "./config/permissions.config";

export type { PermissionCode } from "./config/permissions.config";

export {
  ALL_PERMISSION_GROUPS,
  ERP_GROUPS,
  BRAND_GROUPS,
  CRM_GROUPS,
  PLATFORM_GROUPS,
  getGroupsByDomain,
  getGroupByCode,
} from "./config/permission-groups";

export type { PermissionGroup } from "./config/permission-groups";

export {
  TEMPLATES,
  ROLE_TEMPLATE_MAP,
  getTemplateForRole,
  getAllTemplateCodes,
} from "./config/templates";

export type { PermissionTemplate } from "./config/templates";

export {
  DOMAIN_REGISTRY,
  getEntityOwner,
  getDomainDependencies,
  getActiveDomains,
  getAllDomains,
  getMasterSource,
} from "./domain-registry";

export type { DomainKey, DomainConfig } from "./domain-registry";

// Gateway exports — use: import { ... } from "@yunwu/platform/data-gateway"
// NOT exported from main index to prevent build-time Prisma dependency

// Master Data exports
export {
  MASTER_DATA_REGISTRY,
  getEntitiesByOwner,
  getEntity,
  isErpMasterData,
  isBrandExclusive,
  getOwnershipStats,
} from "./master-data";

export {
  ENTITY_BRIDGES,
  getBridgesByStatus,
  getBridge,
  getBridgesForEntity,
} from "./master-data";

export {
  assertEntityOwnership,
  assertFieldOwnership,
  guardWrite,
  allowBrandWrite,
  allowErpWrite,
  getOwnershipMatrix,
} from "./master-data";

export type {
  MasterEntity,
  EntityKey,
  DataOwner,
  SourceDatabase,
  SyncStrategy,
  EntityBridge,
  OwnershipResult,
} from "./master-data";
