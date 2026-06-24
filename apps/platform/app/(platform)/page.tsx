/**
 * Platform Dashboard — WO-P11B Real Data
 * 显示 ERP KPI + Brand KPI + 系统状态（真实 DB 查询）
 */
import { Suspense } from "react";
import { getErpKpis, getBrandKpis, getSystemStatus } from "@/modules/dashboard/actions";
import { Card } from "@yunwu/ui";

function KpiCard({ label, value, sub, color }: { label: string; value: string|number; sub?: string; color?: string }) {
  return (
    <Card padding="md" className="relative overflow-hidden">
      <p className="text-xs text-stone-500 tracking-wider uppercase">{label}</p>
      <p className={`text-2xl font-light mt-1 ${color || "text-stone-800"}`}>{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-stone-500 tracking-wider uppercase mt-8 mb-3">{children}</h2>;
}

export default async function DashboardPage() {
  const [erp, brand, sys] = await Promise.all([
    getErpKpis(),
    getBrandKpis(),
    getSystemStatus(),
  ]);

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">Platform OS 总览</h1>
          <p className="text-xs text-stone-400 mt-1">ERP + Brand OS 运营驾驶舱 · {sys.timestamp?.slice(0, 19).replace("T", " ")}</p>
        </div>
        <span className="text-xs text-stone-400">v{sys.version}</span>
      </div>

      {/* ERP KPI */}
      <SectionTitle>ERP 系统</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="商品数" value={erp.productCount} />
        <KpiCard label="SKU 数" value={erp.skuCount} />
        <KpiCard label="材料数" value={erp.materialCount} />
        <KpiCard label="BOM 数" value={erp.bomCount} />
        <KpiCard label="库存流水" value={erp.inventoryCount} />
        <KpiCard label="生产记录" value={erp.productionCount} />
        <KpiCard label="订单数" value={erp.orderCount} />
        <KpiCard label="客户数" value={erp.customerCount} />
        <KpiCard label="采购记录" value={erp.purchaseCount} />
        <KpiCard label="成本总额" value={`¥${(erp.totalCost / 10000).toFixed(1)}万`} color="text-amber-700" />
      </div>

      {/* Brand KPI */}
      <SectionTitle>Brand OS</SectionTitle>
      {!brand.brandConnected && (
        <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">
          ⚠️ Brand DB 未连接：{brand.brandError || "BRAND_DATABASE_URL 未配置"}
        </div>
      )}
      {brand.brandConnected && !brand.bannerTableExists && (
        <div className="mb-3 p-3 rounded bg-amber-50 border border-amber-200 text-sm text-amber-700">
          ⚠️ Banner 表不存在：{brand.bannerError || "需要 migration"}（前台 Banner 控制链路未接通）
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <KpiCard label="前台产品" value={brand.brandProductCount} />
        <KpiCard label="七序系列" value={brand.seriesCount} />
        <KpiCard label="品牌志" value={brand.journalCount} />
        <KpiCard label="Banner" value={brand.bannerTableExists ? brand.bannerCount : "N/A"} sub={brand.bannerTableExists ? undefined : "表缺失"} />
        <KpiCard label="SEO 配置" value={brand.seoCount} />
        <KpiCard label="页面内容" value={brand.pageContentCount} />
        <KpiCard label="媒体素材" value={brand.mediaCount} />
      </div>

      {/* 系统状态 */}
      <SectionTitle>系统状态</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard label="ERP DB" ok={erp.erpConnected} detail={erp.erpConnected ? "已连接" : erp.erpError} />
        <StatusCard label="Brand DB" ok={brand.brandConnected} detail={brand.brandConnected ? "已连接" : "未连接"} />
        <StatusCard label="版本" ok={true} detail={sys.version} />
        <StatusCard label="环境" ok={true} detail={sys.nodeEnv} />
      </div>
    </div>
  );
}

function StatusCard({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <Card padding="sm" className="flex items-center gap-3">
      <span className={`w-2.5 h-2.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
      <div>
        <p className="text-xs text-stone-500">{label}</p>
        {detail && <p className="text-sm text-stone-700">{detail}</p>}
        {!detail && <p className={`text-sm ${ok ? "text-emerald-600" : "text-red-600"}`}>{ok ? "正常" : "异常"}</p>}
      </div>
    </Card>
  );
}
