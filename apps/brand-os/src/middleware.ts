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

  // Phase 3: Platform Identity injection
  const response = NextResponse.next();
  if (token) {
    response.headers.set(
      "x-yunwu-user",
      Buffer.from(JSON.stringify({
        id: token.sub,
        email: token.email,
        role: (token as any).role || "BRAND_ADMIN",
        system: "brand",
      })).toString("base64"),
    );
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
