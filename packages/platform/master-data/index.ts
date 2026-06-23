/**
 * Master Data Consolidation Layer
 *
 * WO-P3B: ERP = Master, Brand = Presentation Layer.
 * Import from here for all master data governance.
 */

export type { MasterEntity, EntityKey, DataOwner, SourceDatabase, SyncStrategy } from "./types";

export {
  MASTER_DATA_REGISTRY,
  getEntitiesByOwner,
  getEntity,
  isErpMasterData,
  isBrandExclusive,
  getOwnershipStats,
} from "./registry";

export {
  ENTITY_BRIDGES,
  getBridgesByStatus,
  getBridge,
  getBridgesForEntity,
} from "./bridges";

export type { EntityBridge } from "./bridges";

export {
  assertEntityOwnership,
  assertFieldOwnership,
  guardWrite,
  allowBrandWrite,
  allowErpWrite,
  getOwnershipMatrix,
} from "./ownership";

export type { OwnershipResult } from "./ownership";
