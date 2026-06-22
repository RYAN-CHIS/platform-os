import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * 在 API Route Handler 中校验当前用户是否拥有指定角色。
 *
 * 使用方式（示例）：
 * ```ts
 * export async function DELETE(req: NextRequest, { params }) {
 *   const auth = await requireRole(req, ["SUPER_ADMIN", "ADMIN"]);
 *   if (auth instanceof NextResponse) return auth; // 401 / 403
 *   const userId = auth.user.id;
 *   // ... 正常业务逻辑
 * }
 * ```
 *
 * @param req        NextRequest
 * @param allowed    允许访问的角色列表（全部四个角色之一或多个）
 * @returns           session（通过）| NextResponse（未登录返回 401，权限不足返回 403）
 */
export async function requireRole(
  req: NextRequest,
  allowed: ("SUPER_ADMIN" | "ADMIN" | "EDITOR" | "OPERATOR")[]
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const role = (session.user as any).role as string;
  if (!allowed.includes(role as any)) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }
  return session;
}
