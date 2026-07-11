/**
 * Platform OS — ERP Gateway Loader
 * WO-P6A: All ERP data through gateway. No direct Prisma in Platform.
 */
import { createErpGateway } from "@yunwu/platform-core/data-gateway";

const ERP_DB = process.env.ERP_DATABASE_URL;

if (!ERP_DB) {
  throw new Error(
    "[erp/gateway] ERP_DATABASE_URL is required — set it in Vercel env. " +
    "Security: no plaintext credentials in source."
  );
}

/** Singleton ERP Gateway */
export const erpGateway = createErpGateway(ERP_DB);
