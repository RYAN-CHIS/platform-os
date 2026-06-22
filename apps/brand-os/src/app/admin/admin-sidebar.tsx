"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

// ── 角色 → 可见菜单路径（严格按施工单） ──
const PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    "/admin",
    "/admin/products",
    "/admin/series",
    "/admin/objects",
    "/admin/materials",
    "/admin/journal",
    "/admin/media",
    "/admin/seo",
    "/admin/leads",
    "/admin/content",
    "/admin/tags",
    "/admin/audit",
    "/admin/settings",
  ],
  ADMIN: [
    "/admin",
    "/admin/products",
    "/admin/series",
    "/admin/objects",
    "/admin/materials",
    "/admin/journal",
    "/admin/media",
    "/admin/seo",
    "/admin/leads",
    "/admin/content",
    "/admin/tags",
    "/admin/audit",
  ],
  EDITOR: [
    "/admin",
    "/admin/journal",
    "/admin/media",
    "/admin/products",
    "/admin/content",
    "/admin/tags",
  ],
  OPERATOR: [
    "/admin",
    "/admin/products",
    "/admin/journal",
    "/admin/leads",
  ],
};

const allNavItems = [
  { label: "仪表盘", href: "/admin" },
  { label: "品牌资产", items: [
    { label: "七序体系", href: "/admin/series" },
    { label: "器物体系", href: "/admin/objects" },
    { label: "材料研究", href: "/admin/materials" },
  ]},
  { label: "内容中心", items: [
    { label: "品牌志", href: "/admin/journal" },
    { label: "页面内容", href: "/admin/content" },
    { label: "标签系统", href: "/admin/tags" },
  ]},
  { label: "作品中心", href: "/admin/products" },
  { label: "图片资产库", href: "/admin/media" },
  { label: "潜在线索", href: "/admin/leads" },
  { label: "SEO 中心", href: "/admin/seo" },
  { label: "审计日志", href: "/admin/audit" },
  { label: "系统设置", href: "/admin/settings" },
];

/** 根据角色过滤侧边栏菜单 */
function filterNavItems(role: string) {
  const allowed = PERMISSIONS[role] || ["/admin"];
  return allNavItems
    .map((item) => {
      if ("items" in item && item.items) {
        const filtered = item.items.filter((sub) => allowed.includes(sub.href));
        if (filtered.length === 0) return null;
        return { ...item, items: filtered };
      }
      return allowed.includes(item.href) ? item : null;
    })
    .filter(Boolean);
}

// ── 侧边栏配色常量（深蓝灰 #50677D 为基底） ──
const S = {
  bg:         "#50677D",   // 侧边栏底色
  bgHover:    "#425A6F",   // hover 背景
  bgActive:   "#5B7991",   // active 背景
  border:     "#5E7A8F",   // 分割线
  logoText:   "#FFFFFF",   // Logo 主文字
  logoSub:    "#A8C0D4",   // Logo 副文字
  groupLabel: "#9BBAD4",   // 分组标题
  itemText:   "#DCE8F2",   // 菜单项文字
  itemActive: "#FFFFFF",   // 菜单项激活文字
  footerText: "#8BA7BF",   // 底部操作文字
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "ADMIN";
  const navItems = filterNavItems(role);

  // 登录页不渲染管理后台框架（侧边栏）
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--yun-bg, #F6F2ED)" }}>
      {/* Sidebar */}
      <aside className="w-52 shrink-0 flex flex-col overflow-y-auto"
        style={{ background: S.bg }}>

        {/* ── Logo 区 ── */}
        <div className="px-5 pt-5 pb-4">
          <Link href="/admin" className="block group">
            <p className="text-[15px] font-semibold tracking-[0.12em]"
              style={{ color: S.logoText }}>
              允物 Brand OS
            </p>
            <p className="text-[10px] mt-0.5 tracking-widest"
              style={{ color: S.logoSub }}>
              品牌操作系统
            </p>
          </Link>
        </div>

        {/* ── 导航菜单 ── */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item, i) => {
            if (!item) return null;
            if ("items" in item && item.items) {
              return (
                <div key={i} className="mb-3">
                  {/* 分组标题 */}
                  <p className="px-3 py-1 text-[11px] tracking-[0.06em] font-medium"
                    style={{ color: S.groupLabel }}>
                    {item.label}
                  </p>
                  {/* 子菜单 */}
                  {item.items.map((sub) => {
                    const active = pathname === sub.href || pathname.startsWith(sub.href + "/");
                    return (
                      <Link key={sub.href} href={sub.href}
                        className="block px-3 py-[7px] text-[13px] rounded-md transition-all duration-150"
                        style={{
                          color: active ? S.itemActive : S.itemText,
                          background: active ? S.bgActive : "transparent",
                          fontWeight: active ? 500 : 400,
                        }}
                        onMouseEnter={(e) => { if (!active) (e.target as HTMLElement).style.background = S.bgHover; }}
                        onMouseLeave={(e) => { if (!active) (e.target as HTMLElement).style.background = "transparent"; }}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              );
            }
            // 顶层独立菜单项
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}
                className="block px-3 py-[7px] text-[13px] rounded-md transition-all duration-150"
                style={{
                  color: active ? S.itemActive : S.itemText,
                  background: active ? S.bgActive : "transparent",
                  fontWeight: active ? 500 : 400,
                }}
                onMouseEnter={(e) => { if (!active) (e.target as HTMLElement).style.background = S.bgHover; }}
                onMouseLeave={(e) => { if (!active) (e.target as HTMLElement).style.background = "transparent"; }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ── 底部操作区 ── */}
        <div className="px-3 pb-4 pt-2" style={{ borderTop: `1px solid ${S.border}` }}>
          <Link href="/" className="block px-3 py-[6px] text-xs rounded-md transition-colors"
            style={{ color: S.footerText }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
          >
            前往官网
          </Link>
          <button onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="block w-full text-left px-3 py-[6px] text-xs rounded-md transition-colors"
            style={{ color: S.footerText }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "transparent"; }}
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
