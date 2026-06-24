import { prisma } from "@yunwu/db";
import { Card, EmptyState } from "@yunwu/ui";

export default async function BrandSettingsPage() {
  let settings: { id: string; key: string; value: string; updatedAt: Date }[] = [];
  let total = 0;

  try {
    [settings, total] = await Promise.all([
      prisma.siteSetting.findMany({
        orderBy: { key: "asc" },
      }),
      prisma.siteSetting.count(),
    ]);
  } catch {}

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">
          页面设置 / Site Settings
        </h1>
        <div className="text-sm text-stone-500">共 {total} 条</div>
      </div>

      {settings.length === 0 ? (
        <EmptyState
          icon="⚙️"
          title="暂无站点设置"
          description="site_settings 表中的配置将在此显示"
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-stone-500">
                <th className="text-left py-2">Key</th>
                <th className="text-left py-2">Value</th>
                <th className="text-left py-2">更新时间</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s) => (
                <tr key={s.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-2 font-mono text-xs font-medium">{s.key}</td>
                  <td className="py-2 max-w-md truncate">{s.value}</td>
                  <td className="py-2 text-stone-500 text-xs">
                    {new Date(s.updatedAt).toLocaleString("zh-CN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* 快捷说明 */}
      <div className="mt-6 p-4 bg-stone-50 rounded text-sm text-stone-500">
        <div className="font-medium mb-1">常用 Key 说明</div>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li><code>site_name</code> — 品牌名称</li>
          <li><code>contact_email</code> — 联系邮箱</li>
          <li><code>contact_phone</code> — 联系电话</li>
          <li><code>social_wechat</code> — 微信</li>
          <li><code>social_weibo</code> — 微博</li>
          <li><code>footer_text</code> — 页脚文案</li>
        </ul>
      </div>
    </div>
  );
}
