/**
 * Platform OS Middleware — Native-first routing with legacy fallback
 *
 * Migrated Platform routes are served locally.
 * Unmigrated ERP and Brand OS routes continue to use the legacy apps.
 *
 * Dev: proxies to localhost. Prod: expects same-origin (nginx/Vercel routing).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const IS_DEV = process.env.NODE_ENV === "development";

const ERP_ORIGIN = IS_DEV ? "http://localhost:3001" : "http://erp:3001";
const BRAND_ORIGIN = IS_DEV ? "http://localhost:3003" : "http://brand-os:3003";

const NATIVE_ERP_ROUTES = [
  "/erp",
  "/erp/materials",
  "/erp/products",
  "/erp/bom",
  "/erp/inventory",
  "/erp/production",
  "/erp/orders",
  "/erp/customers",
  "/erp/costs",
  "/erp/purchase",
  "/erp/settings",
] as const;

// Brand business pages still live in Brand OS. This Platform-owned bridge is
// the only migrated /admin surface in Phase 2A.
const NATIVE_BRAND_ROUTES = ["/admin/brand"] as const;

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isNativeErpRoute(pathname: string) {
  return NATIVE_ERP_ROUTES.some((route) => matchesRoute(pathname, route));
}

function isNativeBrandRoute(pathname: string) {
  return NATIVE_BRAND_ROUTES.some((route) => matchesRoute(pathname, route));
}

function getRefererPathname(referer: string) {
  if (!referer) return "";

  try {
    return new URL(referer).pathname;
  } catch {
    return "";
  }
}

function rewriteTo(request: NextRequest, origin: string) {
  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, origin);
  return NextResponse.rewrite(url);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refererPathname = getRefererPathname(request.headers.get("referer") || "");

  // ══════════════════════════════════════
  // Auth guard: redirect unauthenticated to /login
  // ══════════════════════════════════════
  const isPublicRoute =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/media") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (!isPublicRoute) {
    const sessionToken =
      request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("__Secure-next-auth.session-token")?.value;

    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ══════════════════════════════════════
  // Platform's own routes — serve directly
  // ══════════════════════════════════════
  if (
    pathname === "/platform" ||
    pathname.startsWith("/platform/") ||
    pathname === "/brand" ||
    pathname.startsWith("/brand/") ||
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/media") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/")
  ) {
    return NextResponse.next();
  }

  // ══════════════════════════════════════
  // ERP: native modules first, legacy app fallback
  // ══════════════════════════════════════
  if (pathname === "/erp" || pathname.startsWith("/erp/")) {
    if (isNativeErpRoute(pathname)) {
      return NextResponse.next();
    }

    return rewriteTo(request, ERP_ORIGIN);
  }

  // ══════════════════════════════════════
  // Brand: native Platform bridge first, legacy app fallback
  // ══════════════════════════════════════
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (isNativeBrandRoute(pathname)) {
      return NextResponse.next();
    }

    return rewriteTo(request, BRAND_ORIGIN);
  }

  // ══════════════════════════════════════
  // Next assets: route using the page that requested them
  // ══════════════════════════════════════
  if (pathname.startsWith("/_next/static")) {
    if (isNativeErpRoute(refererPathname) || isNativeBrandRoute(refererPathname)) {
      return NextResponse.next();
    }

    if (refererPathname === "/erp" || refererPathname.startsWith("/erp/")) {
      return rewriteTo(request, ERP_ORIGIN);
    }

    if (refererPathname === "/admin" || refererPathname.startsWith("/admin/")) {
      return rewriteTo(request, BRAND_ORIGIN);
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
      return rewriteTo(request, BRAND_ORIGIN);
    }

    // ERP APIs (catch-all for materials, products, orders, etc.)
    return rewriteTo(request, ERP_ORIGIN);
  }

  // ══════════════════════════════════════
  // Other static assets: use the same native-first referer policy
  // ══════════════════════════════════════
  if (isNativeErpRoute(refererPathname) || isNativeBrandRoute(refererPathname)) {
    return NextResponse.next();
  }

  if (refererPathname === "/erp" || refererPathname.startsWith("/erp/")) {
    return rewriteTo(request, ERP_ORIGIN);
  }

  if (refererPathname === "/admin" || refererPathname.startsWith("/admin/")) {
    return rewriteTo(request, BRAND_ORIGIN);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static/platform|favicon\\.svg|logo\\.png).*)",
  ],
};
