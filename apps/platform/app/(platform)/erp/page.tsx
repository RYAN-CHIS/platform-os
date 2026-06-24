/**
 * ERP 系统概览
 * 进销存 / 生产 / 财务 / 供应链 — 纯 ERP 数据看板
 */
import { getErpKpis } from "@/modules/dashboard/actions";

function KpiCard({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div style={{ background: "#fafaf9", padding: "16px", borderRadius: 8, textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 500, color: "#292524" }}>{value ?? "—"}</div>
      <div style={{ fontSize: 12, color: "#78716c", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#a8a29e", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <h2
      style={{
        fontSize: 16,
        fontWeight: 500,
        color: "#44403c",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span
        style={{
          width: 4,
          height: 20,
          background: color,
          borderRadius: 2,
          display: "inline-block",
        }}
      />
      {label}
    </h2>
  );
}

export default async function ErpOverviewPage() {
  const erp = await getErpKpis();

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 300,
          letterSpacing: "0.1em",
          color: "#292524",
          marginBottom: 8,
        }}
      >
        ERP 系统概览
      </h1>
      <p style={{ fontSize: 12, color: "#a8a29e", marginBottom: 32 }}>
        进销存 · 生产 · 财务 · 供应链
      </p>

      {!erp.erpConnected && (
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
            border: "1px solid #fecaca",
            background: "#fef2f2",
          }}
        >
          <p style={{ color: "#dc2626", fontSize: 13, margin: 0 }}>
            ⚠️ ERP DB 未连接 — {erp.erpError || "数据库连接异常"}
          </p>
        </div>
      )}

      {/* 核心指标 */}
      <SectionHeader label="核心指标" color="#3b82f6" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <KpiCard label="SKU 总数" value={erp.skuCount} />
        <KpiCard label="材料总数" value={erp.materialCount} />
        <KpiCard label="产品数" value={erp.productCount} />
        <KpiCard label="BOM 清单" value={erp.bomCount} />
      </div>

      {/* 运营数据 */}
      <SectionHeader label="运营数据" color="#f59e0b" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <KpiCard label="采购记录" value={erp.purchaseCount} />
        <KpiCard label="生产批次" value={erp.productionCount} />
        <KpiCard label="订单数" value={erp.orderCount} />
        <KpiCard label="客户数" value={erp.customerCount} />
        <KpiCard label="库存流水" value={erp.inventoryCount} />
      </div>

      {/* 财务概览 */}
      <SectionHeader label="财务概览" color="#10b981" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <KpiCard
          label="成本总额"
          value={erp.totalCost ? `¥${Number(erp.totalCost).toLocaleString()}` : "—"}
        />
        <KpiCard
          label="采购总额"
          value={erp.totalPurchase ? `¥${Number(erp.totalPurchase).toLocaleString()}` : "—"}
        />
      </div>

      {/* 快捷入口 */}
      <SectionHeader label="快捷入口" color="#8b5cf6" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { href: "/erp/materials", label: "材料" },
          { href: "/erp/products", label: "产品" },
          { href: "/erp/bom", label: "BOM" },
          { href: "/erp/purchase", label: "采购" },
          { href: "/erp/inventory", label: "库存" },
          { href: "/erp/production", label: "生产" },
          { href: "/erp/orders", label: "订单" },
          { href: "/erp/customers", label: "客户" },
          { href: "/erp/costs", label: "成本" },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            style={{
              padding: "8px 16px",
              background: "#f5f5f4",
              borderRadius: 6,
              fontSize: 13,
              color: "#57534e",
              textDecoration: "none",
              border: "1px solid #e7e5e4",
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
