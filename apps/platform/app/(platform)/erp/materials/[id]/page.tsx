/** Native Route: /platform/erp/materials/[id]. WO-P6B. */
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Card, Button, LoadingState } from "@yunwu/ui";
import { getMaterial } from "@/modules/erp/materials";
import Link from "next/link";

export default function MaterialDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-4xl mx-auto">
      <Suspense fallback={<LoadingState rows={3} />}>
        <MaterialContent id={parseInt(params.id)} />
      </Suspense>
    </div>
  );
}

async function MaterialContent({ id }: { id: number }) {
  const data = await getMaterial(id);
  if (!data) notFound();
  const { material, purchases } = data;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/platform/erp/materials"><Button variant="ghost" size="sm">← 返回</Button></Link>
        <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">{material.name}</h1>
        <span className="text-sm text-stone-400">{material.code}</span>
      </div>
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-stone-400">分类</p><p>{material.category || "—"}</p></div>
          <div><p className="text-stone-400">类型</p><p>{material.materialType}</p></div>
          <div><p className="text-stone-400">库存</p><p className="text-lg font-semibold">{material.remaining} {material.inventoryUnit}</p></div>
          <div><p className="text-stone-400">单价</p><p>{material.unitCost ? `¥${material.unitCost}` : "—"}</p></div>
          <div><p className="text-stone-400">供应商</p><p>{material.supplier || "—"}</p></div>
          <div><p className="text-stone-400">规格</p><p>{material.specification || "—"}</p></div>
          <div><p className="text-stone-400">状态</p><p>{material.status}</p></div>
          <div><p className="text-stone-400">备注</p><p>{material.remark || "—"}</p></div>
        </div>
      </Card>
      {purchases.length > 0 && (
        <Card>
          <h2 className="text-lg font-medium mb-4">采购记录</h2>
          <table className="w-full text-sm"><thead><tr className="text-left text-stone-500 border-b"><th className="p-2">日期</th><th className="p-2">供应商</th><th className="p-2 text-right">数量</th><th className="p-2 text-right">单价</th><th className="p-2 text-right">总价</th></tr></thead>
            <tbody>{(purchases as any[]).map((p: any) => (
              <tr key={p.id} className="border-b border-stone-100"><td className="p-2">{new Date(p.purchaseDate).toLocaleDateString()}</td><td className="p-2">{p.supplier||"—"}</td><td className="p-2 text-right">{p.purchaseQuantity}</td><td className="p-2 text-right">{p.purchaseUnitPrice ? `¥${p.purchaseUnitPrice}`:"—"}</td><td className="p-2 text-right">¥{p.purchasePrice}</td></tr>
            ))}</tbody></table>
        </Card>
      )}
    </div>
  );
}
