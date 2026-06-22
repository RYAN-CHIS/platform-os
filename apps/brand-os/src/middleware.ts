import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login page to prevent redirect loops
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Allow public site routes
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Auth check for admin routes
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
