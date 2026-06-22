"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

async function getAuthSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/admin/login");
  return session;
}

export async function requireRole(allowed: string[]) {
  const session = await getAuthSession();
  const role = (session.user as any).role as string;
  if (!allowed.includes(role)) redirect("/admin");
  return session;
}

/** 所有已登录角色 */
export async function requireAnyRole() {
  return requireRole(["SUPER_ADMIN", "ADMIN", "EDITOR", "OPERATOR"]);
}

/** SUPER_ADMIN + ADMIN */
export async function requireAdmin() {
  return requireRole(["SUPER_ADMIN", "ADMIN"]);
}

/** 仅 SUPER_ADMIN */
export async function requireSuperAdmin() {
  return requireRole(["SUPER_ADMIN"]);
}

/** 所有已登录角色（品牌志 / 内容编辑） */
export async function requireContentEditor() {
  return requireRole(["SUPER_ADMIN", "ADMIN", "EDITOR", "OPERATOR"]);
}

/** SUPER_ADMIN + ADMIN + OPERATOR */
export async function requireLeadsAccess() {
  return requireRole(["SUPER_ADMIN", "ADMIN", "OPERATOR"]);
}
