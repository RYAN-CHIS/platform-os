/**
 * Brand OS Middleware — WO-P3A
 *
 * Migrated to unified Platform auth.
 * Uses @yunwu/auth/platform-auth for session verification.
 * Backward compatible: existing sessions still work.
 */

import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { signFromToken } from "@yunwu/auth";

export const runtime = "nodejs";

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (pathname === "/admin/login") return NextResponse.next();
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // Auth check
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // WO-P3A: Sign token with "platform" identity (was "brand")
  const role = (token as any).role || "BRAND_ADMIN";
  const permissions: string[] = (token as any).permissions || [];

  const signedToken = signFromToken(
    { sub: token.sub, email: token.email as string, role, permissions },
    "platform", // ← unified identity
    process.env.YUNWU_PLATFORM_SECRET || "yunwu-dev-secret",
  );

  const response = NextResponse.next();
  response.headers.set("x-yunwu-user", signedToken);
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
