import { Suspense } from "react"; import { Card, EmptyState, LoadingState } from "@yunwu/ui"; import { listInventory } from "./actions";
export default function InventoryPage({ materialId }: { materialId?: number }) {
  return (<div className="max-w-6xl mx-auto"><h1 className="text-2xl font-light tracking-[0.1em] text-stone-800 mb-6">库存流水</h1>
    <Suspense fallback={<LoadingState rows={5}/>}><InventoryList materialId={materialId}/></Suspense></div>);
}
async function InventoryList({ materialId }: { materialId?: number }) {
  const items = await listInventory(materialId);
  if (!items?.length) return <EmptyState icon="🏪" title="暂无库存记录"/>;
  return (<Card padding="sm"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-stone-500"><th className="p-3">材料</th><th className="p-3">类型</th><th className="p-3 text-right">数量</th><th className="p-3 text-right">前</th><th className="p-3 text-right">后</th><th className="p-3">关联单据</th><th className="p-3">时间</th></tr></thead>
    <tbody>{(items as any[]).map((t:any)=>(<tr key={t.id} className="border-b border-stone-100"><td className="p-3">{t.material?.name||t.materialId}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${t.type==="IN"?"bg-emerald-100 text-emerald-700":t.type==="OUT"?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>{t.type}</span></td><td className="p-3 text-right font-mono">{t.quantity}</td><td className="p-3 text-right text-stone-400">{t.beforeQty}</td><td className="p-3 text-right">{t.afterQty}</td><td className="p-3 text-stone-400">{t.relatedDoc||"—"}</td><td className="p-3 text-stone-400 text-xs">{new Date(t.createdAt).toLocaleString()}</td></tr>))}</tbody></table></div></Card>);
}
