// ═══════════════════════════════════════════════════════════
// Enforcement Layer — Domain Service 强制包装
//
// 所有 Domain Service 实例化必须经过此包装。
// 未包装的服务在运行时 throw。
//
// 用法:
//   const svc = withGuard(ProductService, userCtx, prisma);
//   await svc.list(); // ✅ 自动通过 control plane
//
//   const raw = new ProductService(prisma);
//   await raw.list();  // ❌ Runtime throw: "Service not guarded"
// ═══════════════════════════════════════════════════════════

import type { AccessContext } from "../control/permission";
import { guardProductService, guardSeriesService, guardMaterialService } from "../control/domain-guard";

// ── 未包装检测标记 ──
const GUARD_SYMBOL = Symbol("yunwu.guard");

/**
 * 包装 ProductService — 强制 access check
 */
export function withGuard<T extends { [GUARD_SYMBOL]?: boolean }>(
  ServiceClass: new (...args: any[]) => T,
  user: AccessContext,
  ...args: any[]
): T {
  const instance = new ServiceClass(...args);

  // 注入 guard 标记
  instance[GUARD_SYMBOL] = true;

  // 根据类型选择包装器
  const name = ServiceClass.name;

  if (name === "ProductService") {
    return guardProductService(instance as any, user) as unknown as T;
  }
  if (name === "SeriesService") {
    return guardSeriesService(instance as any, user) as unknown as T;
  }
  if (name === "MaterialService") {
    return guardMaterialService(instance as any, user) as unknown as T;
  }

  // 未知 service — 允许通过但记录警告
  console.warn(`[yunwu/enforce] Unknown service: ${name}. Not guarded.`);
  return instance;
}

/**
 * 检查 service 是否已被包装
 */
export function isGuarded(instance: any): boolean {
  return instance?.[GUARD_SYMBOL] === true;
}

/**
 * 确保 service 已被包装。未包装则 throw。
 */
export function ensureGuarded(instance: any, serviceName: string): void {
  if (!isGuarded(instance)) {
    throw new Error(
      `[yunwu/enforce] ${serviceName} 未通过 withGuard() 包装。` +
      `请使用: const svc = withGuard(${serviceName}, userCtx, prisma)`,
    );
  }
}
