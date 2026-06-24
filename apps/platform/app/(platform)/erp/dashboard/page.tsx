/**
 * ERP Dashboard — Financial Overview with 3 core metrics
 */
import { prisma } from "@yunwu/db";
import { MaterialService } from "@yunwu/db/domain/material";
import { DollarSign, ShoppingCart, TrendingDown, Package, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  // 1. 库存总额 = Σ (remaining × costPerUsageUnit)
  let inventoryValue = 0;
  try {
    const materials = await prisma.$queryRawUnsafe<any[]>(
      `SELECT remaining, cost_per_usage_unit FROM raw_materials WHERE status != 'ARCHIVED'`
    );
    inventoryValue = materials.reduce((sum, m) => {
      const qty = m.remaining ?? 0;
      const cost = m.cost_per_usage_unit ?? 0;
      return sum + qty * cost;
    }, 0);
  } catch {}

  // 2. 累计采购额 = Σ purchase_records.total_cost
  let totalPurchased = 0;
  try {
    const purchaseAgg = await prisma.$queryRawUnsafe<{ total: number }[]>(
      `SELECT COALESCE(SUM(total_cost), 0) as total FROM purchase_records`
    );
    totalPurchased = purchaseAgg[0]?.total ?? 0;
  } catch {}

  // 3. 已耗材料成本 = production records cost
  let consumedCost = 0;
  try {
    const prodAgg = await prisma.$queryRawUnsafe<{ total: number }[]>(
      `SELECT COALESCE(SUM(total_cost), 0) as total FROM production_records`
    );
    consumedCost = prodAgg[0]?.total ?? 0;
  } catch {}

  // Material stats
  let materialCount = 0;
  let lowStockCount = 0;
  try {
    materialCount = (await prisma.$queryRawUnsafe<{ cnt: number }[]>(
      `SELECT COUNT(*)::int as cnt FROM raw_materials WHERE status != 'ARCHIVED'`
    ))[0]?.cnt ?? 0;
  } catch {}
  try {
    lowStockCount = (await prisma.$queryRawUnsafe<{ cnt: number }[]>(
      `SELECT COUNT(*)::int as cnt FROM raw_materials WHERE safety_stock > 0 AND remaining < safety_stock`
    ))[0]?.cnt ?? 0;
  } catch {}

  return {
    inventoryValue: Math.round(inventoryValue * 100) / 100,
    totalPurchased: Math.round(totalPurchased * 100) / 100,
    consumedCost: Math.round(consumedCost * 100) / 100,
    materialCount,
    lowStockCount,
  };
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tooltip,
  color = "#292524",
}: {
  icon: any;
  label: string;
  value: string;
  tooltip: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e7e5e4",
        borderRadius: 10,
        padding: "18px 20px",
        position: "relative",
      }}
      title={tooltip}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        }}
      >
        <Icon size={18} color={color} />
        <span
          style={{
            fontSize: 13,
            color: "#78716c",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "#a8a29e",
            cursor: "help",
            borderBottom: "1px dotted #d6d3d1",
          }}
        >
          ?
        </span>
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          color: "#1c1917",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 300,
            color: "#292524",
            letterSpacing: "0.05em",
            margin: "0 0 4px",
          }}
        >
          ERP 概览
        </h1>
        <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>
          材料库存资产 · 采购投入 · 生产消耗
        </p>
      </div>

      {/* Core financial metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <MetricCard
          icon={DollarSign}
          label="库存总额"
          value={`¥${data.inventoryValue.toLocaleString()}`}
          tooltip="库存总额 = 当前仓库所有材料剩余数量 × 单颗/单个成本的合计值。反映当前仓库资产价值。"
          color="#059669"
        />
        <MetricCard
          icon={ShoppingCart}
          label="累计采购额"
          value={`¥${data.totalPurchased.toLocaleString()}`}
          tooltip="累计采购额 = 历史所有采购记录的总金额合计。反映历史采购投入总额。"
          color="#2563eb"
        />
        <MetricCard
          icon={TrendingDown}
          label="已耗材料成本"
          value={`¥${data.consumedCost.toLocaleString()}`}
          tooltip="已耗材料成本 = 生产记录消耗的材料成本合计。反映已用于生产的总材料价值。"
          color="#d97706"
        />
      </div>

      {/* Summary / warning row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e7e5e4",
            borderRadius: 10,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <Package size={16} color="#78716c" />
            <span style={{ fontSize: 13, color: "#78716c", fontWeight: 500 }}>
              材料总数
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#1c1917" }}>
            {data.materialCount} 种
          </div>
        </div>

        <div
          style={{
            background: data.lowStockCount > 0 ? "#fffbeb" : "#fff",
            border: `1px solid ${
              data.lowStockCount > 0 ? "#fde68a" : "#e7e5e4"
            }`,
            borderRadius: 10,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <AlertTriangle
              size={16}
              color={data.lowStockCount > 0 ? "#d97706" : "#78716c"}
            />
            <span
              style={{
                fontSize: 13,
                color: data.lowStockCount > 0 ? "#92400e" : "#78716c",
                fontWeight: 500,
              }}
            >
              低库存预警
            </span>
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: data.lowStockCount > 0 ? "#92400e" : "#1c1917",
            }}
          >
            {data.lowStockCount > 0
              ? `${data.lowStockCount} 种材料低于安全库存`
              : "库存充足"}
          </div>
        </div>
      </div>
    </div>
  );
}
