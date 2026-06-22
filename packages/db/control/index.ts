// ═══════════════════════════════════════════════════════════
// @yunwu/db/control — System Control Plane
//
// 使用方式:
//   import { guard, canRead, canWrite } from "@yunwu/db/control"
//   const check = guard(user).forModel("product").write();
//
// 规则:
//   ✅ 所有 API 操作必须经过 control plane
//   ✅ Domain Service 在写操作前检查权限
//   ❌ 不允许绕过 control plane 直接写入
// ═══════════════════════════════════════════════════════════

// System boundaries
export {
  SYSTEM_CAPABILITIES,
  canSystemRead,
  canSystemWrite,
  canSystemAdmin,
  getSystemCapability,
} from "./system";
export type { SystemId, ActionType, ModelDomain } from "./system";

// Permission types
export { ANONYMOUS_CONTEXT, getRoleCapabilities } from "./permission";
export type { AccessContext, AccessDecision, UserRole } from "./permission";

// Access engine
export {
  canAccess,
  canRead,
  canWrite,
  canAdmin,
  guard,
  withReadCheck,
  withWriteCheck,
} from "./access";

// Domain Service guards
export {
  guardProductService,
  guardSeriesService,
  guardMaterialService,
} from "./domain-guard";
