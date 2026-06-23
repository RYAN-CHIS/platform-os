import { Suspense } from "react"; import Link from "next/link"; import { notFound } from "next/navigation";
import { Card, Button, LoadingState } from "@yunwu/ui";
import { getProduct, getSkus } from "@/modules/erp/products";

export default function Page({ params }: { params: { id: string } }) {
  return (<div className="max-w-4xl mx-auto"><Suspense fallback={<LoadingState rows={3}/>}><Content id={parseInt(params.id)}/></Suspense></div>);
}
async function Content({ id }: { id: number }) {
  const product = await getProduct(id) as any; if (!product) notFound();
  const skus = await getSkus(id) as any[];
  return (<div className="space-y-6">
    <div className="flex items-center gap-4"><Link href="/platform/erp/products"><Button variant="ghost" size="sm">← 返回</Button></Link><h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">{product.name}</h1><span className="text-sm text-stone-400">{product.code}</span></div>
    <Card><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"><div><p className="text-stone-400">系列</p><p>{product.work?.series?.name||"—"}</p></div><div><p className="text-stone-400">状态</p><p>{product.status}</p></div><div><p className="text-stone-400">描述</p><p>{product.description||"—"}</p></div><div><p className="text-stone-400">SKU 数</p><p className="text-lg font-semibold">{skus?.length||0}</p></div></div></Card>
    {skus?.length>0&&<Card><h2 className="text-lg font-medium mb-4">SKU 列表</h2><table className="w-full text-sm"><thead><tr className="text-left text-stone-500 border-b"><th className="p-2">编码</th><th className="p-2">名称</th><th className="p-2">规格</th><th className="p-2 text-right">价格</th><th className="p-2 text-right">库存</th><th className="p-2">状态</th></tr></thead><tbody>{skus.map((s:any)=>(<tr key={s.id} className="border-b border-stone-100"><td className="p-2 font-mono text-xs">{s.code}</td><td className="p-2">{s.name}</td><td className="p-2 text-stone-500">{s.specification||"—"}</td><td className="p-2 text-right">¥{s.price}</td><td className="p-2 text-right">{s.finishedStock}</td><td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${s.status==="ACTIVE"?"bg-emerald-100 text-emerald-700":"bg-stone-100 text-stone-500"}`}>{s.status}</span></td></tr>))}</tbody></table></Card>}
  </div>);
}
