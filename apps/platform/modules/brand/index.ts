/**
 * Platform OS — Brand Module
 * WO-P5B: Brand OS migrated into Platform.
 *
 * All data access through @yunwu/platform-core/data-gateway.
 * No direct Prisma calls. No legacy role checks.
 */
export { brandGateway } from "./shared/gateway";
