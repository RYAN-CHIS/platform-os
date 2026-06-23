import { Suspense } from "react"; import Link from "next/link";
import { Button, Card, EmptyState, LoadingState } from "@yunwu/ui";
import { listProducts } from "./actions"; import type { ProductFilters } from "./types";

interface Props { searchParams: ProductFilters }
export default function ProductsPage({ searchParams }: Props) {
  return (<div className="max-w-6xl mx-auto">
    <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">产品管理</h1><Link href="/platform/erp/products/new"><Button size="sm">+ 新建产品</Button></Link></div>
    <Suspense fallback={<LoadingState rows={5}/>}><ProductsList filters={searchParams}/></Suspense>
  </div>);
}
async function ProductsList({ filters }: { filters: ProductFilters }) {
  const products = await listProducts(filters);
  if (!products?.length) return <EmptyState icon="💎" title="暂无产品" description="点击右上角新建产品"/>;
  return (<Card padding="sm"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-stone-500"><th className="p-3">编码</th><th className="p-3">名称</th><th className="p-3">系列</th><th className="p-3 text-right">SKU数</th><th className="p-3">状态</th><th className="p-3"></th></tr></thead>
    <tbody>{(products as any[]).map((p:any)=>(<tr key={p.id} className="border-b border-stone-100 hover:bg-stone-50"><td className="p-3 font-mono text-xs">{p.code}</td><td className="p-3 font-medium">{p.name}</td><td className="p-3 text-stone-500">{p.work?.series?.name||"—"}</td><td className="p-3 text-right">{p.skus?.length||0}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${p.status==="ACTIVE"?"bg-emerald-100 text-emerald-700":"bg-stone-100 text-stone-500"}`}>{p.status}</span></td><td className="p-3"><Link href={`/platform/erp/products/${p.id}`} className="text-amber-600 text-xs hover:underline">详情</Link></td></tr>))}</tbody></table></div></Card>);
}
