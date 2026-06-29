"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIDEBAR_CONFIG, flattenSidebarItems } from "@yunwu/platform-core";
import { DEFAULT_ENABLED_MODULES } from "@yunwu/platform-core";
import { ChevronRight, Home } from "lucide-react";

/**
 * Breadcrumb — auto-generates from sidebar config
 *
 * Maps URL paths to human-readable labels using sidebar.config.ts
 */
export default function Breadcrumb() {
  const pathname = usePathname();

  // Dashboard doesn't need breadcrumb
  if (pathname === "/" || pathname === "/erp/dashboard") return null;

  // Build breadcrumb segments
  const segments = pathname.split("/").filter(Boolean);

  // Map: path segment → label
  const flatItems = flattenSidebarItems(SIDEBAR_CONFIG, DEFAULT_ENABLED_MODULES, []);
  const labelMap = new Map<string, string>();
  for (const item of flatItems) {
    const lastSegment = item.href.split("/").pop() || item.href;
    labelMap.set(item.href, item.label);
    labelMap.set(lastSegment, item.label);
  }

  // Build crumbs
  const crumbs: { label: string; href: string }[] = [
    { label: "仪表盘", href: "/erp/dashboard" },
  ];

  let accumulated = "";
  for (const seg of segments) {
    accumulated += "/" + seg;
    const label = labelMap.get(accumulated) || labelMap.get(seg) || seg;
    if (label !== "仪表盘") {
      crumbs.push({ label, href: accumulated });
    }
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm text-stone-400 mb-6">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={12} />}
          {i === crumbs.length - 1 ? (
            <span className="text-stone-700 font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-stone-600 transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
