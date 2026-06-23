import { Suspense } from "react";
import Link from "next/link";
import { Button, Card, EmptyState, LoadingState } from "@yunwu/ui";
import { listMaterials } from "./actions";
import type { MaterialFilters } from "./types";

interface Props { searchParams: { status?: string; materialType?: string; category?: string; keyword?: string } }

export default function MaterialsPage({ searchParams }: Props) {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">材料管理</h1>
        <Link href="/platform/erp/materials/new"><Button variant="primary" size="sm">+ 新建材料</Button></Link>
      </div>
      <Suspense fallback={<LoadingState rows={5} />}>
        <MaterialsList filters={searchParams} />
      </Suspense>
    </div>
  );
}

async function MaterialsList({ filters }: { filters: MaterialFilters }) {
  const materials = await listMaterials(filters);
  if (!materials || materials.length === 0) {
    return <EmptyState icon="📦" title="暂无材料" description="点击右上角新建材料开始管理库存" />;
  }
  return (
    <Card padding="sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-stone-200 text-left text-stone-500">
            <th className="p-3">编码</th><th className="p-3">名称</th><th className="p-3">分类</th><th className="p-3">类型</th><th className="p-3 text-right">库存</th><th className="p-3 text-right">单价</th><th className="p-3">状态</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {(materials as any[]).map((m: any) => (
              <tr key={m.id} className="border-b border-stone-100 hover:bg-stone-50">
                <td className="p-3 font-mono text-xs">{m.code}</td>
                <td className="p-3 font-medium">{m.name}</td>
                <td className="p-3 text-stone-500">{m.category || "—"}</td>
                <td className="p-3 text-stone-500">{m.materialType || "—"}</td>
                <td className="p-3 text-right">{m.remaining} {m.inventoryUnit}</td>
                <td className="p-3 text-right">{m.unitCost ? `¥${m.unitCost}` : "—"}</td>
                <td className="p-3"><StatusBadge status={m.status} /></td>
                <td className="p-3"><Link href={`/platform/erp/materials/${m.id}`} className="text-amber-600 text-xs hover:underline">详情</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { READY: "bg-emerald-100 text-emerald-700", ACTIVE: "bg-blue-100 text-blue-700", DRAFT: "bg-stone-100 text-stone-500", ARCHIVED: "bg-red-100 text-red-500" };
  return <span className={`px-2 py-0.5 rounded text-xs ${colors[status] || "bg-stone-100"}`}>{status || "—"}</span>;
}
