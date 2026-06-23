/**
 * Master Data — Type Definitions
 *
 * WO-P3B: Every entity has a clear owner, source database, and gateway.
 */

/** Which system owns this entity's truth */
export type DataOwner = "ERP" | "BRAND" | "PLATFORM" | "CRM";

/** Which database stores the canonical data */
export type SourceDatabase = "ERP_DB" | "BRAND_DB" | "PLATFORM_DB";

/** How data flows between systems */
export type SyncStrategy =
  | "ERP_TO_BRAND"     // ERP is source, Brand reads from ERP
  | "BRAND_ONLY"       // Brand owns this data exclusively
  | "BIDIRECTIONAL"    // Both can write, merge strategy needed
  | "PLATFORM_ONLY";   // Platform owns, neither ERP nor Brand

/** A registered master data entity */
export interface MasterEntity {
  /** Unique key */
  key: string;
  /** Human-readable name */
  label: string;
  /** Which system owns this entity */
  owner: DataOwner;
  /** Where the canonical data lives */
  sourceDatabase: SourceDatabase;
  /** How to access this entity through the gateway */
  gatewayPath: string;
  /** How data syncs between systems */
  syncStrategy: SyncStrategy;
  /** Description of the entity */
  description: string;
  /** Allowed writers (other than owner) */
  allowedWriters?: DataOwner[];
  /** Fields owned by each system (for shared entities) */
  fieldOwnership?: Record<string, DataOwner>;
}

/** All known master entities */
export type EntityKey =
  | "MATERIAL"
  | "PRODUCT"
  | "SKU"
  | "BOM"
  | "INVENTORY"
  | "PRODUCTION"
  | "ORDER"
  | "CUSTOMER"
  | "SUPPLIER"
  | "MEDIA"
  | "SERIES"
  | "JOURNAL"
  | "CONTENT"
  | "SEO"
  | "TAG"
  | "LEAD"
  | "USER"
  | "PERMISSION";
