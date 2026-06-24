"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  DollarSign,
  Warehouse,
  Gem,
  Menu,
  X,
  Sparkle,
  Layers,
  LogOut,
  Settings,
  ShoppingCart,
  ClipboardCheck,
  Image,
  FileText,
  BookOpen,
  PenTool,
  Tag,
  Users,
  Shield,
  Search,
  ScrollText,
  FlaskConical,
  BarChart3,
  UserCog,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SIDEBAR_CONFIG,
  DEFAULT_ENABLED_MODULES,
  findActiveItem,
} from "@yunwu/platform-core";
import { getRoleLabel } from "@/modules/settings/users/role-labels";
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  LayoutDashboard,
  Package,
  DollarSign,
  Warehouse,
  Gem,
  Sparkle,
  Layers,
  ShoppingCart,
  ClipboardCheck,
  Image,
  FileText,
  BookOpen,
  PenTool,
  Tag,
  Users,
  Shield,
  Search,
  ScrollText,
  FlaskConical,
  BarChart3,
  Settings,
  UserCog,
};

// ─── 东方美学深色调色板 (from unified tokens) ───
import { colors } from "@yunwu/ui/tokens";
const COLORS = {
  bgGradient: colors.sidebar.bgGradient,
  text: colors.sidebar.text,
  textMuted: colors.sidebar.textMuted,
  textDim: colors.sidebar.textDim,
  border: colors.sidebar.border,
  hoverBg: colors.sidebar.hoverBg,
  activeBg: colors.sidebar.bgActive,
  activeBorder: colors.sidebar.bgActive,
  activeText: colors.sidebar.itemActive,
  indicatorGrad: colors.sidebar.bgActive,
  childActive: colors.sidebar.itemActive,
  childActiveBg: colors.sidebar.bgHover,
  logoFilter: "none",
  mobileBg: colors.sidebar.bg,
  mobileBorder: colors.sidebar.border,
  logoutText: colors.sidebar.logoutText,
  logoutHoverBg: colors.sidebar.logoutHoverBg,
  logoutHoverText: colors.sidebar.logoutHoverText,
  copyright: colors.sidebar.copyright,
  avatarBorder: colors.sidebar.avatarBorder,
  userRoleText: colors.sidebar.userRoleText,
  submenuText: colors.sidebar.itemText,
  submenuHover: colors.sidebar.text,
  expandArrow: colors.sidebar.textDim,
};
export default function PlatformSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "viewer";
  const searchParams = useSearchParams();
  const enabledModules: SystemModule[] = DEFAULT_ENABLED_MODULES;

  // WO-P8E: Temporarily disable permission filter — force show all menus
  const isAdmin = true;
  const hasPerm = (code?: string) => true;

  // Filter config by permissions + modules
  const visibleSections = useMemo(() => {
    return SIDEBAR_CONFIG
      .map((section) => {
        // Module filter
        if (section.module && !enabledModules.includes(section.module)) return null;
        // Section permission
        if (section.permission && !hasPerm(section.permission)) return null;

        // Filter items
        const visibleItems = section.items.filter((item) => {
          if (item.module && !enabledModules.includes(item.module)) return false;
          if (item.permission && !hasPerm(item.permission)) return false;
          return true;
        });

        if (visibleItems.length === 0) return null;
        return { ...section, items: visibleItems };
      })
      .filter(Boolean) as SidebarSection[];
  }, [enabledModules]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isSectionActive = (section: SidebarSection) => {
    const active = findActiveItem(pathname, SIDEBAR_CONFIG);
    return active.sectionKey === section.key;
  };

  const isItemActive = (href: string) => {
    // Root path only matches exact "/" (not everything)
    if (href === "/") return pathname === "/" || pathname === "/platform";
    // If href contains query params, check both pathname and category param
    if (href.includes("?")) {
      const [base, query] = href.split("?");
      if (!pathname.startsWith(base)) return false;
      const params = new URLSearchParams(query);
      for (const [k, v] of params.entries()) {
        if (searchParams.get(k) !== v) return false;
      }
      return true;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden flex items-center justify-center w-9 h-9 rounded-lg shadow-md"
        style={{ background: COLORS.mobileBg, color: COLORS.text, border: `1px solid ${COLORS.mobileBorder}` }}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/35 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-60 flex flex-col transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          background: COLORS.bgGradient,
          boxShadow: "4px 0 32px rgba(0,0,0,0.25)",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "22px 18px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
          <Link href="/" className="flex flex-col items-center gap-1.5" onClick={() => setOpen(false)}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.95)",
                border: "1px solid rgba(255,255,255,0.25)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.20)",
                overflow: "hidden",
              }}
            >
              <img
                src="/logo.svg"
                alt="允物"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 13 }}
              />
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.2rem",
                fontWeight: 700,
                color: COLORS.text,
                letterSpacing: "0.15em",
                fontFamily: "var(--font-serif-zh), serif",
              }}
            >
              允物 Platform
            </h1>
          </Link>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
          {visibleSections.map((section) => {
            const sectionActive = isSectionActive(section);
            const isExpanded = expandedSections.has(section.key);

            return (
              <div key={section.key} className="mb-1">
                {/* Section header — clickable toggle */}
                {section.label && (
                  <button
                    onClick={() => toggleSection(section.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      width: "100%",
                      padding: "10px 14px 6px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: sectionActive ? COLORS.activeText : COLORS.textMuted,
                      letterSpacing: "0.06em",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      transition: "color 0.15s",
                    }}
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    {section.label}
                    {section.badge && (
                      <span className="ml-1 px-1.5 py-0.5 text-[0.55rem] rounded bg-amber-500/20 text-amber-400">
                        {section.badge.text}
                      </span>
                    )}
                  </button>
                )}

                {/* Items — visible when section is expanded */}
                {isExpanded && section.items.map((item) => {
                  const hasChildren = item.children && item.children.length > 0;
                  const itemActive = !hasChildren && item.href ? isItemActive(item.href) : false;
                  const childActive = hasChildren && item.children!.some((c) => isItemActive(c.href));
                  const showChildren = hasChildren && isExpanded && (expandedSections.has(item.key) || childActive);

                  // Get icon
                  const IconComponent = ICON_MAP[item.icon] || Layers;

                  if (!hasChildren) {
                    return (
                      <Link
                        key={item.key}
                        href={item.href || "#"}
                        onClick={() => setOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 11,
                          padding: "10px 14px",
                          borderRadius: 10,
                          fontSize: "0.85rem",
                          fontWeight: itemActive ? 600 : 400,
                          color: itemActive ? COLORS.activeText : COLORS.textMuted,
                          background: itemActive ? COLORS.activeBg : "transparent",
                          border: itemActive ? `1px solid ${COLORS.activeBorder}` : "1px solid transparent",
                          transition: "all 0.2s ease",
                          textDecoration: "none",
                          marginBottom: 3,
                          position: "relative" as const,
                          overflow: "hidden",
                        }}
                        onMouseEnter={(e) => {
                          if (!itemActive) {
                            e.currentTarget.style.background = COLORS.hoverBg;
                            e.currentTarget.style.color = COLORS.text;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!itemActive) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = COLORS.textMuted;
                          }
                        }}
                      >
                        {itemActive && (
                          <div
                            style={{
                              position: "absolute",
                              left: 0,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 3,
                              height: 20,
                              borderRadius: "0 2px 2px 0",
                              background: COLORS.indicatorGrad,
                              boxShadow: "0 0 8px rgba(251,191,36,0.4)",
                            }}
                          />
                        )}
                        <IconComponent size={17} style={{ flexShrink: 0, opacity: itemActive ? 1 : 0.75 }} />
                        {item.label}
                        {item.badge && (
                          <span className="ml-auto px-1.5 py-0.5 text-[0.6rem] rounded bg-amber-500/20 text-amber-400">
                            {item.badge.text}
                          </span>
                        )}
                      </Link>
                    );
                  }

                  // Has children — expandable
                  const active = itemActive || childActive;
                  return (
                    <div key={item.key}>
                      <button
                        onClick={() => toggleSection(item.key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 11,
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 10,
                          fontSize: "0.85rem",
                          fontWeight: active ? 600 : 400,
                          color: active ? COLORS.activeText : COLORS.textMuted,
                          background: active ? COLORS.activeBg : "transparent",
                          border: active ? `1px solid ${COLORS.activeBorder}` : "1px solid transparent",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          marginBottom: 3,
                          position: "relative" as const,
                        }}
                        onMouseEnter={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = COLORS.hoverBg;
                            e.currentTarget.style.color = COLORS.text;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = COLORS.textMuted;
                          }
                        }}
                      >
                        {active && (
                          <div
                            style={{
                              position: "absolute",
                              left: 0,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 3,
                              height: 20,
                              borderRadius: "0 2px 2px 0",
                              background: COLORS.indicatorGrad,
                              boxShadow: "0 0 8px rgba(251,191,36,0.4)",
                            }}
                          />
                        )}
                        <IconComponent size={17} style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }} />
                        <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: expandedSections.has(item.key) ? "rotate(90deg)" : "rotate(0deg)",
                            transition: "transform 0.25s ease",
                            opacity: 0.4,
                            flexShrink: 0,
                          }}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>

                      {/* Children */}
                      {showChildren && (
                        <div style={{ paddingLeft: 22 }}>
                          {item.children!.map((child) => {
                            const childActive = isItemActive(child.href);
                            return (
                              <Link
                                key={child.key}
                                href={child.href}
                                onClick={() => setOpen(false)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 9,
                                  padding: "8px 14px",
                                  borderRadius: 8,
                                  fontSize: "0.8rem",
                                  fontWeight: childActive ? 600 : 400,
                                  color: childActive ? COLORS.childActive : COLORS.submenuText,
                                  background: childActive ? COLORS.childActiveBg : "transparent",
                                  border: childActive ? "1px solid rgba(251,191,36,0.18)" : "1px solid transparent",
                                  transition: "all 0.2s ease",
                                  textDecoration: "none",
                                  marginBottom: 2,
                                }}
                              >
                                {child.label}
                                {child.badge && (
                                  <span className="ml-auto px-1 py-0.5 text-[0.55rem] rounded bg-amber-500/20 text-amber-400">
                                    {child.badge.text}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            borderTop: `1px solid ${COLORS.border}`,
            padding: "10px 14px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            position: "relative" as const,
          }}
        >
          {session?.user && (
            <div ref={userMenuRef} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, cursor: "pointer" }}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer", flex: 1, minWidth: 0 }}
              >
                <div
                  style={{
                    width: 30, height: 30, borderRadius: 9, overflow: "hidden", flexShrink: 0,
                    background: "rgba(255,255,255,0.10)", border: `1px solid ${COLORS.avatarBorder}`,
                  }}
                >
                  {(session.user as any).avatar ? (
                    <img src={(session.user as any).avatar} alt="头像"
                      style={{ width: 30, height: 30, objectFit: "cover" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 600, color: COLORS.text }}>
                      {(session.user.name || session.user.email || "A").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 500, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2 }}>
                    {session.user.name || session.user.email}
                  </p>
                  <p style={{ margin: "1px 0 0 0", fontSize: "0.6rem", color: COLORS.userRoleText, lineHeight: 1.2 }}>
                    {getRoleLabel(role)}
                  </p>
                </div>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={COLORS.textDim} strokeWidth="2.5" style={{ transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s" }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {userMenuOpen && (
                <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: 4, background: COLORS.sidebarBg, border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
                  <Link href="/settings/profile" onClick={() => setUserMenuOpen(false)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: "0.82rem", color: COLORS.text, textDecoration: "none", transition: "0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = COLORS.bgHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <UserCog size={14} /> 个人信息
                  </Link>
                  <Link href="/settings/profile?tab=password" onClick={() => setUserMenuOpen(false)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: "0.82rem", color: COLORS.text, textDecoration: "none", transition: "0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = COLORS.bgHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <Shield size={14} /> 修改密码
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", fontSize: "0.82rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderTop: `1px solid ${COLORS.border}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = COLORS.bgHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <LogOut size={14} /> 退出登录
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "0 20px 10px",
            fontSize: "0.6rem",
            color: COLORS.copyright,
            letterSpacing: "0.05em",
            textAlign: "center",
          }}
        >
          © 2026 允物 Platform OS · vP9C
        </div>
      </aside>
    </>
  );
}
