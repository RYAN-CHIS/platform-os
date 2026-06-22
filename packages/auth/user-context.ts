// ═══════════════════════════════════════════════════════════
// @yunwu/auth — User Context Factory
//
// 构建完整的请求上下文（user + system + capabilities）。
// 这是 API Gateway 在调用 handler 之前做的最后一步。
// ═══════════════════════════════════════════════════════════

import type { PlatformUser, SystemCapability } from "./identity";
import { canOperate, hasCapability, toAccessContext } from "./identity";
import type { SystemId, ModelDomain } from "../db/control/system";
import type { AccessContext } from "../db/control/permission";

// ── Request Context（API handler 接收的完整上下文）──

export interface RequestContext {
  /** 平台用户 */
  user: PlatformUser;
  /** 当前系统 */
  system: SystemId;
  /** 当前系统的能力 */
  capabilities: SystemCapability;
  /** 降级为 control plane 格式 */
  access: AccessContext;
}

/**
 * 构建请求上下文
 */
export function buildRequestContext(
  user: PlatformUser,
  system: SystemId,
): RequestContext {
  const capabilities = user.access[system] ?? {
    canRead: false,
    canWrite: false,
    canAdmin: false,
  };

  return {
    user,
    system,
    capabilities,
    access: toAccessContext(user, system),
  };
}

/**
 * 切换活跃系统（如：ERP 用户切换到 Web 只读查看）
 */
export function switchSystem(
  ctx: RequestContext,
  targetSystem: SystemId,
): RequestContext | null {
  if (!hasCapability(ctx.user, targetSystem, "canRead")) {
    return null;
  }
  return buildRequestContext(
    { ...ctx.user, activeSystem: targetSystem },
    targetSystem,
  );
}

/**
 * 获取用户在指定系统中的可用 models
 */
export function getAvailableModels(
  ctx: RequestContext,
  action: "read" | "write",
): ModelDomain[] {
  const models: ModelDomain[] = [
    "product", "series", "material", "order", "customer",
    "media", "journal", "contact", "seo", "page", "tag",
    "banner", "user", "audit", "inventory", "production",
    "bom", "purchase", "sku", "work", "cost", "permission",
  ];

  return models.filter((m) => canOperate(ctx.user, ctx.system, m, action));
}
