/** Platform OS — Master Data Gateway. Import individual gateways from sub-paths to avoid Prisma build-time deps. */
export { createErpGateway } from "./erp-gateway";
export { createBrandGateway } from "./brand-gateway";
// Other gateways: import from "@yunwu/platform-core/data-gateway/media-gateway" etc.
export type { GatewayRegistry, ErpGateway, BrandGateway, ErpMaterialFilters, ErpProductFilters, ErpOrderFilters, BrandJournalFilters } from "./types";
