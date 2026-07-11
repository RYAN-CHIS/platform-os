// ═══════════════════════════════════════════════════════════
// @yunwu/auth — 平台身份 & 会话层 (Phase 3)
//
// PlatformUser → RequestContext → AccessContext → Control Plane
//
// 使用方式:
//   import { getPlatformUser, buildRequestContext } from "@yunwu/auth"
//   const user = await getPlatformUser(req);
//   const ctx = buildRequestContext(user, "erp");
// ═══════════════════════════════════════════════════════════

// ── Identity (Phase 3) ──
export {
  createPlatformUser,
  hasCapability,
  canOperate,
  canSwitchSystem,
  toAccessContext,
} from "./identity";
export type { PlatformUser, SystemCapability } from "./identity";

// ── Session Bridge (Phase 3) ──
export { getPlatformUser, requirePlatformUser } from "./session";

// ── User Context (Phase 3) ──
export {
  buildRequestContext,
  switchSystem,
  getAvailableModels,
} from "./user-context";
export type { RequestContext } from "./user-context";

// ── Platform Identity v2 (WO-4.1) ──
export { signIdentity, signFromToken } from "./sign-identity";
export {
  verifyIdentity,
  verifySystemIdentity,
  verifyIdentityResult,
} from "./verify-identity";
export type { IdentityPayload } from "./sign-identity";
export type { VerifyResult } from "./verify-identity";

// ── NextAuth (Phase 1 legacy, still used) ──
export { authOptions } from "./nextauth";
export { getSessionUser, requireAuth, requirePermission } from "./middleware";
export type { SessionUser, AuthPermission } from "./types";
