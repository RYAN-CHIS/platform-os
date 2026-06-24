import { prisma } from "@yunwu/db";
import { Card, EmptyState } from "@yunwu/ui";

export default async function BrandSeoPage() {
  let configs: {
    id: string;
    pageKey: string;
    title: string;
    description: string | null;
    ogImage: string | null;
  }[] = [];
  let total = 0;

  try {
    [configs, total] = await Promise.all([
      prisma.seoConfig.findMany({
        orderBy: { pageKey: "asc" },
      }),
      prisma.seoConfig.count(),
    ]);
  } catch {}

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">
          SEO 设置
        </h1>
        <div className="text-sm text-stone-500">共 {total} 条</div>
      </div>

      {configs.length === 0 ? (
        <EmptyState icon="🔍" title="暂无 SEO 配置" description="为各页面配置 SEO 信息后将在此显示" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-stone-500">
                <th className="text-left py-2">页面</th>
                <th className="text-left py-2">标题</th>
                <th className="text-left py-2">描述</th>
                <th className="text-left py-2">OG 图片</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((c) => (
                <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-2 font-mono text-xs">{c.pageKey}</td>
                  <td className="py-2">{c.title}</td>
                  <td className="py-2 text-stone-500 max-w-xs truncate">
                    {c.description || "—"}
                  </td>
                  <td className="py-2">
                    {c.ogImage ? (
                      <img
                        src={c.ogImage}
                        alt="OG"
                        className="w-10 h-6 object-cover rounded"
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
