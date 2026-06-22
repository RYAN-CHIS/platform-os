// ═══════════════════════════════════════════════════════════
// @yunwu/db/enforce — Enforcement Layer
//
// 使用方式:
//   import { requireAccess, apiGateway, withGuard } from "@yunwu/db/enforce"
//
// 规则:
//   🔒 所有 API 必须经过 apiGateway
//   🔒 Domain Service 必须用 withGuard() 包装
//   🔒 禁止 bypass control plane
// ═══════════════════════════════════════════════════════════

// Hard intercepts
export {
  requireSystemAccess,
  requireReadAccess,
  requireWriteAccess,
  requireAdminAccess,
  requireAccess,
  AccessDeniedError,
} from "./require-access";

// API Gateway
export {
  apiGateway,
  apiGatewayWithUser,
  platformGateway,
  handleAccessError,
} from "./api-gateway";
export type {
  GatewayRequest,
  GatewayContext,
  GatewayHandler,
  PlatformGatewayContext,
  PlatformGatewayHandler,
} from "./api-gateway";

// Domain Service guards
export { withGuard, isGuarded, ensureGuarded } from "./with-guard";

// Scanner (build-time only — 不在此导出以避免 Next.js bundle 错误)
// 使用: import { scanViolations } from "@yunwu/db/enforce/scanner" (仅 CLI/scripts)
