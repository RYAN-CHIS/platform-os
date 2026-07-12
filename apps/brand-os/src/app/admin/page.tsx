export const dynamic = 'force-dynamic'

import Link from "next/link";
import { brandDb } from "@/lib/brand-db-adapter";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/admin/login");

  // 安全地获取统计数据，容错处理
  let stats: { label: string; value: number; href: string; color: string }[] = [];
  let recentJournals: { id: string; title: string; status: string; updatedAt: Date }[] = [];
  let recentProducts: { id: number; name: string; status: string; updatedAt: Date }[] = [];

  try {
    const [productCount, materialCount, journalCount, leadCount] =
      await Promise.all([
        brandDb.legacyBrandProduct.count(),
        brandDb.legacyBrandMaterial.count(),
        brandDb.journalPost.count(),
        brandDb.contactLead.count(),
      ]);

    const categoryCount = 6; // ObjectCategory 枚举值数量（BRACELET~SCHOLAR）

    stats = [
      { label: "作品总数", value: productCount, href: "/admin/products", color: "var(--yun-accent)" },
      { label: "器物分类", value: categoryCount, href: "/admin/objects", color: "#639922" },
      { label: "材料数量", value: materialCount, href: "/admin/materials", color: "#378ADD" },
      { label: "品牌志", value: journalCount, href: "/admin/journal", color: "#993556" },
      { label: "潜在线索", value: leadCount, href: "/admin/leads", color: "#BA7517" },
    ];

    recentJournals = await brandDb.journalPost.findMany({
      take: 5, orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, status: true, updatedAt: true },
    });

    recentProducts = await brandDb.legacyBrandProduct.findMany({
      take: 5, orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, status: true, updatedAt: true },
    });
  } catch (error) {
    console.error("[Admin Dashboard] 数据加载失败:", error);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-medium tracking-[0.1em]" style={{ color: "var(--yun-text)" }}>仪表盘</h1>
        <p className="text-sm mt-1" style={{ color: "var(--yun-subtext)" }}>
          欢迎回来，{session.user?.name || session.user?.email}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}
            className="p-4 bg-white border rounded transition-all hover:shadow-sm"
            style={{ borderColor: "var(--yun-line)" }}>
            <p className="text-xs" style={{ color: "var(--yun-subtext)" }}>{s.label}</p>
            <p className="text-2xl font-medium mt-1" style={{ color: s.color }}>{s.value}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent journals */}
        <div className="bg-white border rounded p-4" style={{ borderColor: "var(--yun-line)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium" style={{ color: "var(--yun-text)" }}>最近品牌志</h2>
            <Link href="/admin/journal/new" className="text-xs" style={{ color: "var(--yun-accent)" }}>
              新建文章
            </Link>
          </div>
          {recentJournals.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--yun-subtext)" }}>暂无文章</p>
          ) : (
            <div className="space-y-2">
              {recentJournals.map((j) => (
                <Link key={j.id} href={`/admin/journal/${j.id}`}
                  className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                  style={{ borderColor: "var(--yun-line)", color: "var(--yun-text)" }}>
                  <span className="truncate mr-2">{j.title}</span>
                  <span className="text-xs shrink-0" style={{
                    color: j.status === "PUBLISHED" ? "#639922" : "var(--yun-subtext)"
                  }}>{j.status === "PUBLISHED" ? "已发" : "草稿"}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent products */}
        <div className="bg-white border rounded p-4" style={{ borderColor: "var(--yun-line)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium" style={{ color: "var(--yun-text)" }}>最近作品</h2>
            <Link href="/admin/products" className="text-xs" style={{ color: "var(--yun-accent)" }}>
              管理作品
            </Link>
          </div>
          {recentProducts.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--yun-subtext)" }}>暂无作品</p>
          ) : (
            <div className="space-y-2">
              {recentProducts.map((p) => (
                <div key={p.id}
                  className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                  style={{ borderColor: "var(--yun-line)", color: "var(--yun-text)" }}>
                  <span className="truncate mr-2">{p.name}</span>
                  <span className="text-xs shrink-0" style={{
                    color: p.status === "published" ? "#639922" : "var(--yun-subtext)"
                  }}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
