// ═══════════════════════════════════════════════════════════
// Data Fabric — Control Plane Integration
//
// 控制层接入 Fabric：确保用户只能看到其系统允许的数据视图。
//
// dataViewCheck(user, "erp", "product") → allowed | denied
// ═══════════════════════════════════════════════════════════

import type { SystemId, ModelDomain } from "../control/system";
import type { AccessContext } from "../control/permission";
import { canRead, canWrite } from "../control/access";
import type { PlatformUser } from "../../auth/identity";
import { canOperate } from "../../auth/identity";

/**
 * 检查用户是否可以读取指定 model 的数据视图
 */
export function canReadView(
  user: AccessContext,
  model: ModelDomain,
): { allowed: boolean; reason?: string } {
  return canRead(user, model);
}

/**
 * 检查用户是否可以写入指定 model
 */
export function canWriteView(
  user: AccessContext,
  model: ModelDomain,
): { allowed: boolean; reason?: string } {
  return canWrite(user, model);
}

/**
 * Platform-level check: 用户是否可以在指定系统中操作数据
 */
export function canAccessDataView(
  platformUser: PlatformUser,
  system: SystemId,
  model: ModelDomain,
  action: "read" | "write",
): { allowed: boolean; reason?: string } {
  if (!canOperate(platformUser, system, model, action)) {
    return {
      allowed: false,
      reason: `用户无权在 ${system} 系统对 ${model} 执行 ${action}`,
    };
  }
  return { allowed: true };
}

/**
 * 确保用户只能查看其系统允许的数据视图。
 *
 * 例如：ERP 用户查看 product → ERP view（库存/成本）
 *       Web 用户查看 product → Web view（价格/图片）
 *       Brand 用户查看 product → Brand view（故事/情感）
 */
export function requireDataView(
  platformUser: PlatformUser,
  system: SystemId,
  model: ModelDomain,
  action: "read" | "write",
): void {
  const check = canAccessDataView(platformUser, system, model, action);
  if (!check.allowed) {
    throw new Error(`[DataFabric] ${check.reason}`);
  }
}

/**
 * 安全解析：先检查权限，再返回视图
 */
export function safeResolveProduct(
  platformUser: PlatformUser,
  system: SystemId,
  raw: any,
  resolveFn: (system: SystemId, raw: any) => any,
) {
  requireDataView(platformUser, system, "product", "read");
  return resolveFn(system, raw);
}
