// ══════════════════════════════════════════════════════════
// Brand Products — List Page
// WO-P8G: Real operational page
// ══════════════════════════════════════════════════════════

"use client";

import Link from "next/link";
import { Button, Card, EmptyState } from "@yunwu/ui";
import type { BrandProductFilters } from "./actions";

interface Props {
  searchParams: BrandProductFilters;
}

export default function BrandProductsList({ products }: { products: any[] }) {
  if (!products?.length)
    return <EmptyState icon="💎" title="暂无产品" description="点击右上角新建产品" />;

  return (
    <Card padding="sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-stone-500">
              <th className="p-3">SKU</th>
              <th className="p-3">名称</th>
              <th className="p-3">系列</th>
              <th className="p-3">价格</th>
              <th className="p-3">状态</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p: any) => (
              <tr key={p.id} className="border-b border-stone-100 hover:bg-stone-50">
                <td className="p-3 font-mono text-xs">{p.sku}</td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-stone-500">{p.series?.name || "—"}</td>
                <td className="p-3">¥{p.salePrice || 0}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    p.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
                  }`}>
                    {p.status === "published" ? "已上架" : p.status}
                  </span>
                </td>
                <td className="p-3">
                  <Link href={`/brand/products/${p.id}`} className="text-amber-600 text-xs hover:underline">
                    详情
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
