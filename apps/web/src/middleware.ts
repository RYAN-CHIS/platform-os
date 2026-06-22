import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// Web app is public-facing only (no admin routes after Brand OS extraction)
export default async function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
