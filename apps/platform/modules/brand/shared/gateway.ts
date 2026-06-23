/**
 * Platform OS — Brand Gateway Loader
 * WO-P5B: All Brand data access through gateway, not direct Prisma.
 */
import { createBrandGateway } from "@yunwu/platform-core/data-gateway";

const BRAND_DB = process.env.BRAND_DATABASE_URL || process.env.DATABASE_URL || "";

/** Singleton Brand Gateway — use this for all Brand data access */
export const brandGateway = createBrandGateway(BRAND_DB);
