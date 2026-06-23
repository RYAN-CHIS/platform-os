import { Suspense } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import {
  Package, ShoppingCart, PenTool, Users,
  DollarSign, Warehouse, TrendingUp, Search,
} from "lucide-react";
import Link from "next/link";

// ═══════════════════════════════════════════
// Data — fetched via internal API (gateway layer used at runtime)
// ═══════════════════════════════════════════

interface DashboardStats {
  materials: number; products: number; orders: number; inventory: number;
  journal: number; leads: number; connected: boolean;
}

async function getStats(): Promise<DashboardStats> {
  try {
    // Attempt to reach ERP and Brand OS APIs
    // In production, these are proxied through the Platform middleware
    const [matRes, ordRes, jrnRes, leadRes] = await Promise.allSettled([
      fetch("http://localhost:3001/api/materials", { next: { revalidate: 60 } }),
      fetch("http://localhost:3001/api/orders", { next: { revalidate: 60 } }),
      fetch("http://localhost:3003/api/posts", { next: { revalidate: 60 } }),
      fetch("http://localhost:3003/api/contact", { next: { revalidate: 60 } }),
    ]);

    const count = (r: PromiseSettledResult<Response>) =>
      r.status === "fulfilled" && r.value.ok ? r.value.json().then((d: unknown) => Array.isArray(d) ? d.length : 0).catch(() => 0) : Promise.resolve(0);

    const [materials, orders, journal, leads] = await Promise.all([
      count(matRes), count(ordRes), count(jrnRes), count(leadRes),
    ]);

    return { materials, products: 0, orders, inventory: 0, journal, leads, connected: true };
  } catch {
    return { materials: 0, products: 0, orders: 0, inventory: 0, journal: 0, leads: 0, connected: false };
  }
}

// ═══════════════════════════════════════════
// Page
// ═══════════════════════════════════════════

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <Breadcrumb />
      <div className="mb-10">
        <h1 className="text-2xl md:text-3xl font-light tracking-[0.1em] text-stone-800 mb-3">
          允物 Platform OS
        </h1>
        <p className="text-stone-500 text-sm tracking-wider">
          统一管理后台 — ERP 进销存 · Brand OS 品牌系统 · CRM 客户关系
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const stats = await getStats();

  return (
    <>
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Package size={20} />} label="ERP 材料" value={stats.materials} href="/erp/materials" color="amber" />
        <StatCard icon={<ShoppingCart size={20} />} label="ERP 订单" value={stats.orders} href="/erp/orders" color="blue" />
        <StatCard icon={<PenTool size={20} />} label="品牌志" value={stats.journal} href="/admin/journal" color="emerald" />
        <StatCard icon={<Users size={20} />} label="线索" value={stats.leads} href="/admin/leads" color="purple" />
      </div>

      {/* Domain Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <DomainCard
          title="ERP 系统" icon={<Package size={24} />}
          desc="材料管理 · 产品/SKU · BOM · 库存 · 生产 · 订单 · 客户"
          stats={[{ label: "材料", value: stats.materials }, { label: "订单", value: stats.orders }]}
          href="/erp/dashboard" color="amber"
        />
        <DomainCard
          title="Brand OS" icon={<PenTool size={24} />}
          desc="七序叙事 · 器物展示 · 品牌志 · 页面内容 · SEO · 标签"
          stats={[{ label: "品牌志", value: stats.journal }, { label: "线索", value: stats.leads }]}
          href="/admin/journal" color="emerald"
        />
        <DomainCard
          title="CRM" icon={<Users size={24} />}
          desc="潜在线索管理 · 客户跟进"
          stats={[{ label: "待处理", value: stats.leads }]}
          href="/admin/leads" color="blue"
        />
      </div>

      {/* Future Modules */}
      <div className="bg-white/60 border border-stone-200/60 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-medium text-stone-500 tracking-wider mb-4">未来模块</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FutureBadge icon={<TrendingUp size={16} />} label="数据分析" />
          <FutureBadge icon={<DollarSign size={16} />} label="财务管理" />
          <FutureBadge icon={<Warehouse size={16} />} label="供应商管理" />
          <FutureBadge icon={<Search size={16} />} label="AI Center" />
        </div>
      </div>

      {!stats.connected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          ⚠️ ERP 或 Brand OS 服务未启动。请启动后刷新以显示实时数据。
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════

function StatCard({ icon, label, value, href, color }: {
  icon: React.ReactNode; label: string; value: number; href: string;
  color: "amber" | "blue" | "emerald" | "purple";
}) {
  const borders = { amber: "border-l-amber-400", blue: "border-l-blue-400", emerald: "border-l-emerald-400", purple: "border-l-purple-400" };
  return (
    <Link href={href} className="bg-white rounded-xl border border-stone-200 border-l-4 p-4 hover:shadow-sm transition-shadow">
      <div className={`${borders[color]} -ml-4 pl-4`}>
        <div className="flex items-center gap-2 text-stone-400 mb-1">{icon}<span className="text-xs">{label}</span></div>
        <p className="text-2xl font-semibold text-stone-800">{value}</p>
      </div>
    </Link>
  );
}

function DomainCard({ title, desc, stats, href, color, icon }: {
  title: string; desc: string; stats: { label: string; value: number }[];
  href: string; color: "amber" | "emerald" | "blue"; icon: React.ReactNode;
}) {
  const styles = {
    amber: "border-amber-200/60 hover:border-amber-300",
    emerald: "border-emerald-200/60 hover:border-emerald-300",
    blue: "border-blue-200/60 hover:border-blue-300",
  };
  return (
    <Link href={href} className={`bg-white rounded-2xl border p-6 transition-all hover:shadow-md ${styles[color]}`}>
      <div className="text-stone-500 mb-3">{icon}</div>
      <h3 className="text-base font-medium text-stone-800 mb-1">{title}</h3>
      <p className="text-xs text-stone-400 mb-4 leading-relaxed">{desc}</p>
      <div className="flex gap-4">
        {stats.map((s) => (
          <div key={s.label}><p className="text-lg font-semibold text-stone-700">{s.value}</p><p className="text-xs text-stone-400">{s.label}</p></div>
        ))}
      </div>
    </Link>
  );
}

function FutureBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-stone-400">
      {icon}<span>{label}</span>
      <span className="text-xs bg-stone-100 px-1.5 py-0.5 rounded text-stone-400">即将推出</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border border-stone-200 p-6 animate-pulse h-24" />)}</div>
      <div className="grid md:grid-cols-3 gap-6">{[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-stone-200 p-6 animate-pulse h-40" />)}</div>
    </div>
  );
}
