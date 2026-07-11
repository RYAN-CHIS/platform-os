import { PrismaClient } from "@prisma/brand-client";

function brandDatabaseUrl(): string {
  const url = process.env.BRAND_DATABASE_URL;
  if (!url) throw new Error("BRAND_DATABASE_URL is required for Brand Runtime database access.");
  return url.includes("pooler") && !url.includes("pgbouncer=true")
    ? `${url}${url.includes("?") ? "&" : "?"}pgbouncer=true`
    : url;
}

export function createBrandDb(): PrismaClient {
  return new PrismaClient({ datasourceUrl: brandDatabaseUrl() });
}

const globalForBrandDb = globalThis as typeof globalThis & { __yunwuBrandDb?: PrismaClient };

export function getBrandDb(): PrismaClient {
  if (!globalForBrandDb.__yunwuBrandDb) globalForBrandDb.__yunwuBrandDb = createBrandDb();
  return globalForBrandDb.__yunwuBrandDb;
}

export const brandDb = new Proxy({} as PrismaClient, {
  get(_, property) {
    return Reflect.get(getBrandDb(), property);
  },
});

export { PrismaClient };
export {
  AdminRole,
  JournalCategory,
  MediaCategory,
  ObjectCategory,
  ProductType,
  PublishStatus,
  TagType,
} from "@prisma/brand-client";
export type {
  LegacyBrandProduct,
  LegacyBrandSeries,
  LegacyBrandMaterial,
  LegacyBrandProductContent,
  LegacyBrandMaterialLink,
  LegacyJournalTag,
  LegacyProductMaterial,
  LegacyOrder,
  Tag,
  ProductTag,
  Media,
  JournalPost,
  Banner,
  ContactLead,
  PageContent,
  SeoConfig,
  SiteSetting,
  PublishJob,
  ContentVersion,
  SeoSnapshot,
  AdminUser,
  AuditLog,
} from "@prisma/brand-client";
