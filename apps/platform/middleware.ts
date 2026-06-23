/**
 * Platform OS Middleware — Reverse Proxy
 *
 * Routes /erp/* → ERP app (port 3001)
 * Routes /admin/* → Brand OS app (port 3003)
 * Serves Platform pages directly for all other routes.
 *
 * Dev: proxies to localhost. Prod: expects same-origin (nginx/Vercel routing).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const IS_DEV = process.env.NODE_ENV === "development";

const ERP_ORIGIN = IS_DEV ? "http://localhost:3001" : "http://erp:3001";
const BRAND_ORIGIN = IS_DEV ? "http://localhost:3003" : "http://brand-os:3003";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const referer = request.headers.get("referer") || "";

  // ══════════════════════════════════════
  // Platform's own routes — serve directly
  // ══════════════════════════════════════
  if (
    pathname === "/platform" ||
    pathname.startsWith("/platform/") ||
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // ══════════════════════════════════════
  // Proxy ERP app (port 3001)
  // ══════════════════════════════════════
  if (pathname.startsWith("/erp")) {
    const url = new URL(pathname + request.nextUrl.search, ERP_ORIGIN);
    return NextResponse.rewrite(url);
  }

  // ══════════════════════════════════════
  // Proxy Brand OS app (port 3003)
  // ══════════════════════════════════════
  if (pathname.startsWith("/admin")) {
    const url = new URL(pathname + request.nextUrl.search, BRAND_ORIGIN);
    return NextResponse.rewrite(url);
  }

  // ══════════════════════════════════════
  // Asset proxy: route based on Referer
  // ERP pages request /_next/static/... from ERP app
  // Brand pages request /_next/static/... from Brand app
  // ══════════════════════════════════════
  if (pathname.startsWith("/_next/static")) {
    if (referer.includes("/erp")) {
      const url = new URL(pathname + request.nextUrl.search, ERP_ORIGIN);
      return NextResponse.rewrite(url);
    }
    if (referer.includes("/admin")) {
      const url = new URL(pathname + request.nextUrl.search, BRAND_ORIGIN);
      return NextResponse.rewrite(url);
    }
  }

  // ══════════════════════════════════════
  // API proxy
  // ══════════════════════════════════════
  if (pathname.startsWith("/api/")) {
    // Brand OS APIs
    if (
      pathname.startsWith("/api/posts") ||
      pathname.startsWith("/api/contact") ||
      pathname.startsWith("/api/site-settings")
    ) {
      const url = new URL(pathname + request.nextUrl.search, BRAND_ORIGIN);
      return NextResponse.rewrite(url);
    }
    // ERP APIs (catch-all for materials, products, orders, etc.)
    const url = new URL(pathname + request.nextUrl.search, ERP_ORIGIN);
    return NextResponse.rewrite(url);
  }

  // ══════════════════════════════════════
  // Static assets (images, fonts)
  // ══════════════════════════════════════
  if (referer.includes("/erp")) {
    const url = new URL(pathname + request.nextUrl.search, ERP_ORIGIN);
    return NextResponse.rewrite(url);
  }
  if (referer.includes("/admin")) {
    const url = new URL(pathname + request.nextUrl.search, BRAND_ORIGIN);
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static/platform|favicon\\.svg|logo\\.png).*)",
  ],
};
