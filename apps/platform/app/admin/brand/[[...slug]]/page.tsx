/**
 * Platform OS — Brand Route Handler (WO-P5B)
 *
 * Proxies /admin/brand/* to Brand OS app.
 * In production, Brand OS app is deprecated — routes serve from Platform modules directly.
 */
import { redirect } from "next/navigation";

export default function BrandProxyPage({ params }: { params: { slug?: string[] } }) {
  // During migration: redirect to Brand OS app
  // Post-migration: serve from apps/platform/modules/brand/*
  const path = params.slug?.join("/") || "";
  redirect(`/admin/${path}`);
}
