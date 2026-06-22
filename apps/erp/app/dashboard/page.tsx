import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { normalizeRole, Role, canViewCost, canViewProfit } from "@/lib/permissions";
import {
  Package,
  Layers,
  DollarSign,
  Warehouse,
  ArrowRight,
  AlertTriangle,
  Gem,
} from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

async function getStats(role: Role, permissions: string[]) {
  const showCost = canViewProfit(role, permissions);

  const [
    materialCount,
    seriesCount,
    worksCount,
    skuCount,
    inventoryTotal,
  ] = await Promise.all([
    prisma.rawMaterial.count(),
    prisma.series.count(),
    prisma.works.count(),
    prisma.productSku.count(),
    prisma.rawMaterial.aggregate({ _sum: { remaining: true } }),
  ]);

  let costTotal = 0;
  let totalGrossProfit = 0;
  let profitRanking: any[] = [];

  if (showCost) {
    const [costAgg] = await Promise.all([
      prisma.productCost.aggregate({ _sum: { totalCost: true } }),
    ]);
    costTotal = costAgg._sum.totalCost ?? 0;

    // SKU 利润排行（Top 5）
    const skusWithCost = await prisma.productSku.findMany({
      where: { cost: { isNot: null } },
      include: { cost: true },
      orderBy: { price: "desc" },
      take: 5,
    });
    profitRanking = skusWithCost
      .map((sku) => ({
        code: sku.code,
        name: sku.name,
        price: sku.price,
        cost: sku.cost?.totalCost ?? 0,
        profit: sku.price - (sku.cost?.totalCost ?? 0),
        margin:
          sku.price > 0
            ? Math.round(((sku.price - (sku.cost?.totalCost ?? 0)) / sku.price) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  }

  return {
    materialCount,
    seriesCount,
    worksCount,
    skuCount,
    inventoryTotal: inventoryTotal._sum.remaining ?? 0,
    costTotal,
    totalGrossProfit,
    profitRanking,
    showCost,
  };
}

async function getRecentPurchases(role: Role, permissions: string[]) {
  const purchases = await prisma.purchaseRecord.findMany({
    include: {
      material: { select: { code: true, name: true, category: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // 非 Admin/非成本权限 不显示金额
  if (!canViewCost(role, permissions)) {
    return purchases.map((p) => ({
      ...p,
      purchasePrice: undefined,
      purchaseUnitPrice: undefined,
    }));
  }
  return purchases;
}

async function getLowInventory() {
  return prisma.rawMaterial.findMany({
    where: { remaining: { lte: 50 } },
    orderBy: { remaining: "asc" },
    take: 5,
  });
}

async function getStockAlerts() {
  const [lowStock, zeroStock] = await Promise.all([
    prisma.rawMaterial.count({ where: { remaining: { gt: 0, lte: 50 } } }),
    prisma.rawMaterial.count({ where: { remaining: { lte: 0 } } }),
  ]);
  return { lowStock, zeroStock };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = normalizeRole((session?.user as any)?.role);
  const permissions: string[] = (session?.user as any)?.permissions || [];

  const [stats, recentPurchases, lowInventory, stockAlerts] = await Promise.all([
    getStats(role, permissions),
    getRecentPurchases(role, permissions),
    getLowInventory(),
    getStockAlerts(),
  ]);

  const showCost = canViewProfit(role, permissions);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
          让物归物，让心归心
        </h1>
        <p style={{ color: "var(--ink-light)", marginTop: 4 }}>
          东方文化品牌管理系统
        </p>
      </div>

      {/* Stats Cards — 所有角色可见基础统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<Package size={20} />}
          label="原材料"
          value={stats.materialCount}
          href="/materials"
          color="var(--zhu)"
        />
        <StatCard
          icon={<Layers size={20} />}
          label="七序系列"
          value={stats.seriesCount}
          href="/series"
          color="var(--zhu)"
        />
        <StatCard
          icon={<DollarSign size={20} />}
          label="作品数"
          value={stats.worksCount}
          href="/works"
          color="var(--zhu)"
        />
        <StatCard
          icon={<Gem size={20} />}
          label="SKU 总数"
          value={stats.skuCount}
          href="/products"
          color="var(--zhu)"
        />
        <StatCard
          icon={<Warehouse size={20} />}
          label="库存总量"
          value={Number(stats.inventoryTotal).toFixed(1)}
          href="/inventory"
          color="var(--jin)"
        />

        {/* Admin 专属：成本和金额卡片 */}
        {showCost && (
          <>
            <StatCard
              icon={<DollarSign size={20} />}
              label="总成本"
              value={`¥${Number(stats.costTotal).toFixed(2)}`}
              href="/costs"
              color="var(--jin)"
            />
          </>
        )}
      </div>

      {/* 库存预警 — 所有角色可见 */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="bg-[var(--paper)] rounded-xl border border-[var(--border)] p-4 flex items-center gap-3"
        >
          <AlertTriangle size={20} style={{ color: stockAlerts.zeroStock > 0 ? "#dc2626" : "#f59e0b" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
              {stockAlerts.zeroStock > 0 ? `${stockAlerts.zeroStock} 种材料已耗尽` : "材料库存正常"}
            </p>
            <p className="text-xs" style={{ color: "var(--ink-light)" }}>
              {stockAlerts.lowStock} 种低库存 · 共 {stats.materialCount} 种材料
            </p>
          </div>
        </div>
        <div
          className="bg-[var(--paper)] rounded-xl border border-[var(--border)] p-4 flex items-center gap-3"
        >
          <Warehouse size={20} style={{ color: "var(--zhu)" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
              {stats.skuCount} 个 SKU
            </p>
            <p className="text-xs" style={{ color: "var(--ink-light)" }}>
              覆盖 {stats.seriesCount} 个序列 · {stats.worksCount} 个作品
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 最近采购 — Operator/Viewer 看不到金额 */}
        <div className="bg-[var(--paper)] rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "var(--ink)" }}>
              最近采购
            </h2>
            <Link href="/materials" className="text-sm flex items-center gap-1" style={{ color: "var(--zhu)" }}>
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentPurchases.length === 0 && (
              <p className="text-sm" style={{ color: "var(--ink-light)" }}>
                暂无采购记录
              </p>
            )}
            {recentPurchases.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                    {p.material?.name ?? "未知材料"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--ink-light)" }}>
                    {p.material?.code} · {p.material?.category || "-"}
                  </p>
                </div>
                <div className="text-right">
                  {showCost && p.purchasePrice !== undefined && (
                    <p className="text-sm font-medium" style={{ color: "var(--zhu)" }}>
                      ¥{Number(p.purchasePrice).toFixed(2)}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: "var(--ink-light)" }}>
                    {p.purchaseQuantity} {p.purchaseUnit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 库存预警 — 所有角色可见 */}
        <div className="bg-[var(--paper)] rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "var(--ink)" }}>
              库存预警
            </h2>
            <Link href="/inventory" className="text-sm flex items-center gap-1" style={{ color: "var(--zhu)" }}>
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {lowInventory.length === 0 && (
              <p className="text-sm" style={{ color: "var(--ink-light)" }}>
                库存充足 ✅
              </p>
            )}
            {lowInventory.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                    {inv.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--ink-light)" }}>
                    {inv.code} · {inv.specification || "-"}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(220,38,38,0.08)",
                    color: "#dc2626",
                  }}
                >
                  余 {inv.remaining} {inv.inventoryUnit}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin 专属：利润排行 */}
      {showCost && stats.profitRanking.length > 0 && (
        <div className="bg-[var(--paper)] rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "var(--ink)" }}>
              SKU 利润排行
            </h2>
            <Link href="/costs" className="text-sm flex items-center gap-1" style={{ color: "var(--zhu)" }}>
              查看全部 <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left p-2 font-medium" style={{ color: "var(--ink-light)" }}>SKU</th>
                  <th className="text-right p-2 font-medium" style={{ color: "var(--ink-light)" }}>售价</th>
                  <th className="text-right p-2 font-medium" style={{ color: "var(--ink-light)" }}>成本</th>
                  <th className="text-right p-2 font-medium" style={{ color: "var(--ink-light)" }}>利润</th>
                  <th className="text-right p-2 font-medium" style={{ color: "var(--ink-light)" }}>毛利率</th>
                </tr>
              </thead>
              <tbody>
                {stats.profitRanking.map((item: any) => (
                  <tr key={item.code} style={{ borderBottom: "1px solid #f0ebe0" }}>
                    <td className="p-2">
                      <span className="font-medium" style={{ color: "var(--ink)" }}>{item.name}</span>
                      <span className="ml-2 text-xs" style={{ color: "var(--ink-light)" }}>{item.code}</span>
                    </td>
                    <td className="text-right p-2" style={{ color: "var(--ink)" }}>¥{item.price}</td>
                    <td className="text-right p-2" style={{ color: "var(--ink)" }}>¥{item.cost}</td>
                    <td className="text-right p-2 font-medium" style={{ color: item.profit >= 0 ? "#16a34a" : "#dc2626" }}>
                      ¥{item.profit}
                    </td>
                    <td className="text-right p-2" style={{ color: item.margin >= 0 ? "#16a34a" : "#dc2626" }}>
                      {item.margin}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="bg-[var(--paper)] rounded-xl border border-[var(--border)] p-5 flex flex-col gap-3 hover:shadow-md transition"
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(185,28,28,0.08)" }}>
        {icon}
      </div>
      <p className="text-sm" style={{ color: "var(--ink-light)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
        {value}
      </p>
    </Link>
  );
}
