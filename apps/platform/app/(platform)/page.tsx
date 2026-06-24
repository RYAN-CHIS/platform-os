/**
 * Platform OS 主仪表盘
 * ERP · Brand OS · 系统状态 — 三区总览
 */
import { getErpKpis, getBrandKpis, getSystemStatus } from "@/modules/dashboard/actions";
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

export default async function DashboardPage() {
  const [erp, brand, system] = await Promise.all([
    getErpKpis(),
    getBrandKpis(),
    getSystemStatus(),
  ]);

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
        Platform 总览
      </h1>
      <p style={{ fontSize: 12, color: "#a8a29e", marginBottom: 32 }}>
        ERP · Brand OS · 系统状态
        {system.timestamp && (
          <span style={{ marginLeft: 12 }}>
            {system.timestamp.slice(0, 19).replace("T", " ")}
          </span>
        )}
      </p>

      {/* ── SECTION 1: ERP ── */}
      <SectionHeader label="ERP 系统" color="#3b82f6" />
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
        <KpiCard label="商品数" value={erp.productCount} />
        <KpiCard label="BOM 数" value={erp.bomCount} />
        <KpiCard label="库存流水" value={erp.inventoryCount} />
        <KpiCard label="生产批次" value={erp.productionCount} />
        <KpiCard label="订单数" value={erp.orderCount} />
        <KpiCard label="客户数" value={erp.customerCount} />
        <KpiCard label="采购记录" value={erp.purchaseCount} />
        <KpiCard
          label="成本总额"
          value={erp.totalCost ? `¥${Number(erp.totalCost).toLocaleString()}` : "—"}
        />
      </div>

      {/* ── SECTION 2: Brand OS ── */}
      <SectionHeader label="Brand OS" color="#10b981" />
      {!brand.brandConnected && (
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
            ⚠️ Brand DB 未连接 —{" "}
            {brand.brandError || "BRAND_DATABASE_URL 未配置"}
          </p>
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <KpiCard label="产品数" value={brand.brandProductCount} />
        <KpiCard label="系列数" value={brand.seriesCount} />
        <KpiCard label="品牌志" value={brand.journalCount} />
        <KpiCard
          label="Banner"
          value={brand.bannerTableExists ? brand.bannerCount : "—"}
          sub={brand.bannerTableExists ? undefined : "表缺失"}
        />
        <KpiCard label="SEO 配置" value={brand.seoCount} />
        <KpiCard label="页面内容" value={brand.pageContentCount} />
        <KpiCard label="发布任务" value={brand.publishJobCount ?? "—"} />
        <KpiCard label="版本记录" value={brand.versionCount ?? "—"} />
      </div>

      {/* ── SECTION 3: 系统状态 ── */}
      <SectionHeader label="系统状态" color="#8b5cf6" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <KpiCard
          label="ERP DB"
          value={system.erpConnected ? "✓ 正常" : "✗ 异常"}
          sub={system.erpConnected ? undefined : "连接失败"}
        />
        <KpiCard
          label="Brand DB"
          value={system.brandConnected ? "✓ 正常" : "✗ 未连接"}
          sub={system.brandConnected ? undefined : "请检查配置"}
        />
        <KpiCard label="版本" value={system.version} />
        <KpiCard label="环境" value={system.nodeEnv} />
      </div>
    </div>
  );
}
