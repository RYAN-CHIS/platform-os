/**
 * Platform OS — ERP Gateway Loader
 * WO-P6A: All ERP data through gateway. No direct Prisma in Platform.
 */
import { createErpGateway } from "@yunwu/platform/data-gateway";

const ERP_DB = process.env.ERP_DATABASE_URL || process.env.DATABASE_URL || "";

/** Singleton ERP Gateway */
export const erpGateway = createErpGateway(ERP_DB);
