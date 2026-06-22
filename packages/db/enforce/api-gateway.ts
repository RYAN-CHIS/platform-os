// ═══════════════════════════════════════════════════════════
// Enforcement Layer — API Gateway
//
// 所有 API route 必须通过此 Gateway 进入。
//
// 用法:
//   export async function GET(req: NextRequest) {
//     return apiGateway(req, "erp", "product", "read", async (ctx, prisma) => {
//       const service = new ProductService(prisma);
//       return Response.json(await service.list());
//     });
//   }
// ═══════════════════════════════════════════════════════════

import type { SystemId, ModelDomain } from "../control/system";
import type { AccessContext } from "../control/permission";
import { AccessDeniedError } from "./require-access";
import { requireAccess } from "./require-access";

// ── 最小接口（不依赖 Next.js）──

export interface GatewayRequest {
  headers: { get(name: string): string | null };
  cookies?: { get(name: string): { value: string } | undefined };
}

import type { PlatformUser } from "../../auth/identity";
import { canOperate, toAccessContext } from "../../auth/identity";

export interface GatewayContext {
  user: AccessContext;
  system: SystemId;
  model: ModelDomain;
  action: "read" | "write" | "admin";
}

export type GatewayHandler<T = Response> = (
  ctx: GatewayContext,
) => Promise<T>;

// ── Phase 3: Platform Gateway Context（完整上下文）──

export interface PlatformGatewayContext {
  platformUser: PlatformUser;
  access: AccessContext;
  system: SystemId;
  model: ModelDomain;
  action: "read" | "write" | "admin";
}

export type PlatformGatewayHandler<T = Response> = (
  ctx: PlatformGatewayContext,
) => Promise<T>;

/**
 * API Gateway — 强制入口 (Phase 2 兼容)
 */
export async function apiGateway<T = Response>(
  req: GatewayRequest,
  getUser: (req: GatewayRequest) => Promise<AccessContext | null>,
  system: SystemId,
  model: ModelDomain,
  action: "read" | "write" | "admin",
  handler: GatewayHandler<T>,
): Promise<T> {
  const user = await getUser(req);
  if (!user) {
    throw new AccessDeniedError("用户未认证");
  }
  requireAccess(user, system, model, action);
  return handler({ user, system, model, action });
}

/**
 * Phase 3 Gateway — 使用 PlatformUser
 *
 * 这是推荐的入口。所有新 API 必须使用此函数。
 */
export async function platformGateway<T = Response>(
  platformUser: PlatformUser,
  system: SystemId,
  model: ModelDomain,
  action: "read" | "write" | "admin",
  handler: PlatformGatewayHandler<T>,
): Promise<T> {
  // 系统能力检查（非角色检查）
  if (!canOperate(platformUser, system, model, action)) {
    throw new AccessDeniedError(
      `用户无权在 ${system} 系统对 ${model} 执行 ${action} 操作`,
    );
  }

  const access = toAccessContext(platformUser, system);
  requireAccess(access, system, model, action);

  return handler({ platformUser, access, system, model, action });
}

export async function apiGatewayWithUser<T = Response>(
  user: AccessContext,
  system: SystemId,
  model: ModelDomain,
  action: "read" | "write" | "admin",
  handler: GatewayHandler<T>,
): Promise<T> {
  requireAccess(user, system, model, action);
  return handler({ user, system, model, action });
}

export function handleAccessError(error: unknown): Response {
  if (error instanceof AccessDeniedError) {
    return new Response(
      JSON.stringify({ error: error.message, code: error.code }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  throw error;
}
