import { Suspense } from "react"; import { Card, EmptyState, LoadingState } from "@yunwu/ui"; import { listBom } from "./actions";
export default function BomPage({ skuId }: { skuId?: number }) {
  return (<div className="max-w-6xl mx-auto"><h1 className="text-2xl font-light tracking-[0.1em] text-stone-800 mb-6">BOM 物料清单</h1>
    <Suspense fallback={<LoadingState rows={5}/>}><BomList skuId={skuId}/></Suspense></div>);
}
async function BomList({ skuId }: { skuId?: number }) {
  const items = await listBom(skuId);
  if (!items?.length) return <EmptyState icon="📋" title="暂无 BOM 数据"/>;
  return (<Card padding="sm"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-stone-500"><th className="p-3">SKU</th><th className="p-3">材料编码</th><th className="p-3">材料名称</th><th className="p-3 text-right">用量</th><th className="p-3 text-right">单价</th><th className="p-3 text-right">行成本</th></tr></thead>
    <tbody>{(items as any[]).map((b:any)=>(<tr key={b.id} className="border-b border-stone-100"><td className="p-3 font-mono text-xs">{b.sku?.code||b.skuId}</td><td className="p-3 font-mono text-xs">{b.materialCodeSnapshot}</td><td className="p-3">{b.materialNameSnapshot}</td><td className="p-3 text-right">{b.quantity}</td><td className="p-3 text-right">{b.unitPrice?`¥${b.unitPrice}`:"—"}</td><td className="p-3 text-right font-medium">{b.lineCost?`¥${b.lineCost}`:"—"}</td></tr>))}</tbody></table></div></Card>);
}
