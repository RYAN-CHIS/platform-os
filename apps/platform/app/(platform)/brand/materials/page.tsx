import { listBrandMaterials, getMaterialStats } from "../../../../modules/brand/materials/actions";
import { Card, EmptyState } from "@yunwu/ui";

export default async function BrandMaterialsPage() {
  const [materials, total] = await Promise.all([
    listBrandMaterials(),
    getMaterialStats(),
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">
          材料展示管理
        </h1>
        <div className="text-sm text-stone-500">共 {total} 条</div>
      </div>

      {materials.length === 0 ? (
        <EmptyState icon="🪨" title="暂无材料" description="前往 Database 创建 brand_materials 表后显示数据" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-stone-500">
                <th className="text-left py-2">名称</th>
                <th className="text-left py-2">别名</th>
                <th className="text-left py-2">类型</th>
                <th className="text-left py-2">产地</th>
                <th className="text-left py-2">描述</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-2 font-medium">{m.name}</td>
                  <td className="py-2 text-stone-500">{m.alias || "—"}</td>
                  <td className="py-2">{m.type || "—"}</td>
                  <td className="py-2">{m.origin || "—"}</td>
                  <td className="py-2 text-stone-500 max-w-xs truncate">
                    {m.description || "—"}
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
