"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  DollarSign,
  Warehouse,
  Gem,
  Upload,
  Menu,
  X,
  Sparkle,
  Layers,
  LogOut,
  Settings,
  ShoppingCart,
  ClipboardCheck,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, normalizeRole } from "@/lib/permissions";

// 东方美学深色调色板
const COLORS = {
  bgGradient:     "linear-gradient(175deg, #3D5265 0%, #50677D 40%, #445B6F 100%)",
  text:           "#F5F2EE",
  textMuted:      "rgba(245,242,238,0.78)",
  textDim:        "rgba(245,242,238,0.55)",
  border:         "rgba(245,242,238,0.12)",
  hoverBg:        "rgba(245,242,238,0.10)",
  activeBg:       "linear-gradient(135deg, rgba(251,191,36,0.14), rgba(251,191,36,0.05))",
  activeBorder:   "rgba(251,191,36,0.30)",
  activeText:     "#FBBF24",
  indicatorGrad:  "linear-gradient(180deg, #fbbf24, #b45309)",
  childActive:    "#FBBF24",
  childActiveBg:  "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(180,83,9,0.05))",
  logoFilter:     "none",
  mobileBg:       "#50677D",
  mobileBorder:   "rgba(245,242,238,0.25)",
  logoutText:     "rgba(245,242,238,0.65)",
  logoutHoverBg:  "rgba(220,38,38,0.18)",
  logoutHoverText:"rgba(248,113,113,0.95)",
  copyright:      "rgba(245,242,238,0.42)",
  avatarBorder:   "rgba(251,191,36,0.22)",
  userRoleText:   "rgba(245,242,238,0.68)",
  submenuText:    "rgba(245,242,238,0.72)",
  submenuHover:   "rgba(245,242,238,0.92)",
  expandArrow:    "rgba(245,242,238,0.62)",
} as const;

// ─── 导航项类型定义 ───
interface NavChild {
  href: string;
  label: string;
  icon: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  permission?: string;       // 所需权限点代码
  editorPermission?: string; // 创建/编辑所需权限点
  children?: NavChild[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | false>(false);

  const { data: session } = useSession();
  const role = normalizeRole((session?.user as any)?.role);
  const permissions: string[] = (session?.user as any)?.permissions || [];

  // 是否拥有某权限点
  const hasPerm = (code: string) => {
    if (role === "admin") return true;
    if (permissions.includes("super.admin")) return true;
    return permissions.includes(code);
  };

  // ─── 权限驱动的导航菜单 ───
  const baseNavItems = useMemo((): NavItem[] => {
    const allItems: NavItem[] = [
      { href: "/dashboard",  label: "总览",     icon: LayoutDashboard, permission: "dashboard.view" },
      { href: "/series",     label: "七序管理", icon: Layers,          permission: "work.view" },
      { href: "/works",      label: "作品管理", icon: Sparkle,         permission: "work.view" },
      { href: "/products",   label: "产品/SKU",  icon: Gem,            permission: "product.view" },
      {
        href: "/materials",
        label: "材料管理",
        icon: Package,
        permission: "material.view",
        children: [
          { href: "/materials",            label: "全部材料", icon: "📦" },
          { href: "/materials?view=bead",   label: "珠子系统", icon: "🫧" },
          { href: "/materials?view=metal",  label: "配件系统", icon: "⚙️" },
          { href: "/materials?view=ceramic",label: "瓷器系统", icon: "🏺" },
          { href: "/materials?view=seal",   label: "印章系统", icon: "🔖" },
        ],
      },
      { href: "/bom",         label: "BOM",       icon: Layers,          permission: "bom.view" },
      { href: "/costs",       label: "成本核算", icon: DollarSign,       permission: "cost.view" },
      { href: "/productions", label: "生产记录", icon: ClipboardCheck,   permission: "production.view" },
      { href: "/inventory",   label: "库存池",   icon: Warehouse,       permission: "inventory.view" },
      {
        href: "/orders",
        label: "销售管理",
        icon: ShoppingCart,
        permission: "order.view",
        children: [
          { href: "/orders",  label: "订单管理", icon: "📋" },
          { href: "/customers", label: "客户管理", icon: "👤",  },
        ],
      },
      {
        href: "/media",
        label: "展示管理",
        icon: ImageIcon,
        permission: "media.view",
        children: [
          { href: "/media",              label: "媒体中心", icon: "🖼️" },
          { href: "/media?view=banners", label: "Banner",   icon: "🏴" },
        ],
      },
      { href: "/import",      label: "数据导入", icon: Upload,           permission: "import.data" },
      { href: "/settings",    label: "系统设置", icon: Settings,         permission: "setting.view" },
    ];

    return allItems.filter((item) => {
      // admin 看全部
      if (role === "admin") return true;
      // 有权限点则检查
      if (item.permission) {
        return hasPerm(item.permission);
      }
      return true;
    });
  }, [role, permissions]);

  // 路由变化时自动展开/收起对应的父级菜单
  useEffect(() => {
    const parentItem = baseNavItems.find(
      (item) => "children" in item && item.children?.some((child) => pathname.startsWith(child.href.split("?")[0]))
    );
    setExpanded(!!parentItem ? parentItem.href : false);
  }, [pathname, baseNavItems]);

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
        <div
          className="fixed inset-0 bg-black/35 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(255,255,255,0.25)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.20)",
              overflow: "hidden",
            }}>
              <img src="/logo.png" alt="允物" style={{
                width: "100%", height: "100%",
                objectFit: "cover", borderRadius: 13,
              }} />
            </div>
            <h1 style={{
              margin: 0, fontSize: "1.2rem", fontWeight: 700,
              color: COLORS.text, letterSpacing: "0.15em",
              fontFamily: "var(--font-serif-zh), serif",
            }}>
              允物
            </h1>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
          {baseNavItems.map((item) => {
            const hasChildren = "children" in item && item.children;
            const isActive = !hasChildren && pathname === item.href;
            const isParentActive = hasChildren && pathname.startsWith(item.href);

            if (!hasChildren) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 11,
                    padding: "10px 14px", borderRadius: 10,
                    fontSize: "0.85rem", fontWeight: isActive ? 600 : 400,
                    color: isActive ? COLORS.activeText : COLORS.textMuted,
                    background: isActive ? COLORS.activeBg : "transparent",
                    border: isActive ? `1px solid ${COLORS.activeBorder}` : "1px solid transparent",
                    transition: "all 0.2s ease",
                    textDecoration: "none",
                    marginBottom: 3,
                    position: "relative" as const,
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.target as HTMLElement).style.background = COLORS.hoverBg;
                      (e.target as HTMLElement).style.color = COLORS.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.target as HTMLElement).style.background = "transparent";
                      (e.target as HTMLElement).style.color = COLORS.textMuted;
                    }
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: "absolute",
                      left: 0, top: "50%",
                      transform: "translateY(-50%)",
                      width: 3, height: 20,
                      borderRadius: "0 2px 2px 0",
                      background: COLORS.indicatorGrad,
                      boxShadow: "0 0 8px rgba(251,191,36,0.4)",
                    }} />
                  )}
                  <item.icon size={17} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.75 }} />
                  {item.label}
                </Link>
              );
            }

            // 有子菜单的项
            return (
              <div key={item.href}>
                <button
                  onClick={() => setExpanded(expanded === item.href ? false : item.href)}
                  style={{
                    display: "flex", alignItems: "center", gap: 11,
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    fontSize: "0.85rem", fontWeight: isParentActive ? 600 : 400,
                    color: isParentActive ? COLORS.activeText : COLORS.textMuted,
                    background: isParentActive ? COLORS.activeBg : "transparent",
                    border: isParentActive ? `1px solid ${COLORS.activeBorder}` : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    marginBottom: 3,
                    position: "relative" as const,
                  }}
                  onMouseEnter={(e) => {
                    if (!isParentActive) {
                      e.currentTarget.style.background = COLORS.hoverBg;
                      e.currentTarget.style.color = COLORS.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isParentActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = COLORS.textMuted;
                    }
                  }}
                >
                  {isParentActive && (
                    <div style={{
                      position: "absolute",
                      left: 0, top: "50%",
                      transform: "translateY(-50%)",
                      width: 3, height: 20,
                      borderRadius: "0 2px 2px 0",
                      background: COLORS.indicatorGrad,
                      boxShadow: "0 0 8px rgba(251,191,36,0.4)",
                    }} />
                  )}
                  <item.icon size={17} style={{ flexShrink: 0, opacity: isParentActive ? 1 : 0.75 }} />
                  <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{
                      transform: expanded === item.href ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.25s ease",
                      opacity: 0.4, flexShrink: 0,
                    }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
                {expanded === item.href && (
                  <div style={{ paddingLeft: 22 }}>
                    {item.children!.map((child) => {
                      const childView = new URLSearchParams(
                        child.href.includes("?") ? child.href.split("?")[1] : ""
                      ).get("view");
                      const childActive = childView
                        ? pathname === "/materials" && currentView === childView
                        : pathname === "/materials" && !currentView;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          style={{
                            display: "flex", alignItems: "center", gap: 9,
                            padding: "8px 14px", borderRadius: 8,
                            fontSize: "0.8rem", fontWeight: childActive ? 600 : 400,
                            color: childActive ? COLORS.childActive : COLORS.submenuText,
                            background: childActive ? COLORS.childActiveBg : "transparent",
                            border: childActive ? "1px solid rgba(251,191,36,0.18)" : "1px solid transparent",
                            transition: "all 0.2s ease",
                            textDecoration: "none",
                            marginBottom: 2,
                          }}
                        >
                          <span style={{ fontSize: "0.8rem" }}>{child.icon}</span>
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          borderTop: `1px solid ${COLORS.border}`,
          padding: "10px 14px 12px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {session?.user && (
            <>
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                overflow: "hidden", flexShrink: 0,
                background: "rgba(255,255,255,0.10)",
                border: `1px solid ${COLORS.avatarBorder}`,
              }}>
                {(session.user as any).avatar ? (
                  <img
                    src={(session.user as any).avatar}
                    alt="头像"
                    style={{ width: 30, height: 30, objectFit: "cover" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 600, color: COLORS.text,
                  }}>
                    {(session.user.name || session.user.email || "A").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontSize: "0.78rem", fontWeight: 500,
                  color: COLORS.text,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  lineHeight: 1.2,
                }}>
                  {session.user.name || session.user.email}
                </p>
                <p style={{ margin: "1px 0 0 0", fontSize: "0.6rem", color: COLORS.userRoleText, lineHeight: 1.2 }}>
                  {ROLE_LABELS[role] || "用户"}
                </p>
              </div>
            </>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="退出登录"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30, borderRadius: 8,
              background: "transparent", border: "none",
              cursor: "pointer", flexShrink: 0,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.logoutHoverBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <LogOut size={14} style={{ color: COLORS.logoutText }} />
          </button>
        </div>

        <div style={{
          padding: "0 20px 10px",
          fontSize: "0.6rem", color: COLORS.copyright, letterSpacing: "0.05em",
          textAlign: "center",
        }}>
          © 2026 允物品牌
        </div>
      </aside>
    </>
  );
}
