import { prisma } from "@yunwu/db";
import { Card, EmptyState } from "@yunwu/ui";

export default async function BrandMediaPage() {
  let medias: {
    id: number;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
    mediaType: string;
    createdAt: Date;
  }[] = [];
  let total = 0;

  try {
    [medias, total] = await Promise.all([
      prisma.erpMediaAsset.findMany({
        where: { category: "BRAND" },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.erpMediaAsset.count({ where: { category: "BRAND" } }),
    ]);
  } catch {}

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">
          媒体素材管理
        </h1>
        <div className="text-sm text-stone-500">共 {total} 条</div>
      </div>

      {medias.length === 0 ? (
        <EmptyState icon="🖼️" title="暂无媒体素材" description="上传媒体文件后将在此显示" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-stone-500">
                <th className="text-left py-2">预览</th>
                <th className="text-left py-2">文件名</th>
                <th className="text-left py-2">类型</th>
                <th className="text-left py-2">大小</th>
                <th className="text-left py-2">上传时间</th>
              </tr>
            </thead>
            <tbody>
              {medias.map((m) => (
                <tr key={m.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-2">
                    <img
                      src={m.url}
                      alt={m.filename}
                      className="w-10 h-10 object-cover rounded"
                    />
                  </td>
                  <td className="py-2 font-mono text-xs truncate max-w-xs">
                    {m.filename}
                  </td>
                  <td className="py-2">{m.mimeType}</td>
                  <td className="py-2">{(m.size / 1024).toFixed(1)} KB</td>
                  <td className="py-2 text-stone-500">
                    {new Date(m.createdAt).toLocaleDateString("zh-CN")}
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
