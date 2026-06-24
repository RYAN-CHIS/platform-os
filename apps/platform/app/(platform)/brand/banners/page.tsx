/**
 * Brand OS — Banner 管理
 *
 * WO-P11B: Banner 表在 Brand DB 中不存在。
 * 页面必须明确标记 BLOCKED_BY_SCHEMA，
 * 不允许 404 / 500 / 静默空状态。
 */
import { brandPrisma } from "@yunwu/db/brand";
import { Card } from "@yunwu/ui";

export default async function BrandBannersPage() {
  let bannerCount = 0;
  let tableExists = false;
  let dbError: string | null = null;

  // 尝试查询，捕获"表不存在"错误
  try {
    bannerCount = await brandPrisma.brandBanner.count();
    tableExists = true;
  } catch (e: any) {
    dbError = e.message || "Unknown error";
    // tableExists remains false
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800">
            Banner 管理
          </h1>
          <p className="text-xs text-stone-400 mt-1">前台首页轮播控制</p>
        </div>
      </div>

      {/* BLOCKED_BY_SCHEMA 状态 */}
      {!tableExists && (
        <Card padding="lg" className="border-amber-200 bg-amber-50 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-sm font-medium text-amber-800 mb-1">
                BLOCKED_BY_SCHEMA
              </h3>
              <p className="text-sm text-amber-700 mb-2">
                Brand DB 中 <code className="bg-amber-100 px-1 rounded">banners</code> 表不存在，
                需要执行数据库迁移（migration）后才能使用此功能。
              </p>
              <div className="text-xs text-amber-600 font-mono bg-amber-100/50 p-2 rounded mt-2">
                {dbError || "table does not exist"}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 前台控制链路说明 */}
      <Card padding="md" className="mb-6 border-stone-200">
        <h3 className="text-sm font-medium text-stone-700 mb-2">前台 Banner 控制链路</h3>
        <div className="text-xs text-stone-500 space-y-1">
          <p>① Brand OS → Banner 管理 → 创建/排序/启用 Banner</p>
          <p>② Brand DB <code className="bg-stone-100 px-1 rounded">banners</code> 表存储</p>
          <p>③ 前台 (www.yunwuorigin.com) → API → 读取 banners 表 → 首页轮播</p>
          <p className="text-amber-600 font-medium mt-2">
            ⚠️ 当前链路断开：步骤 ① 和 ② 需要先执行 Brand DB migration 创建 banners 表。
          </p>
        </div>
      </Card>

      {/* 如果表存在，显示真实数据（当前不会执行到这里） */}
      {tableExists && (
        <Card className="overflow-x-auto">
          <p className="p-4 text-sm text-stone-500">
            共有 {bannerCount} 条 Banner 记录（列表功能待实现）
          </p>
        </Card>
      )}

      {/* 解决建议 */}
      <details className="mt-6">
        <summary className="text-xs text-stone-400 cursor-pointer">如何解决（技术人员）</summary>
        <pre className="mt-2 p-3 bg-stone-50 rounded text-xs text-stone-600 overflow-x-auto">
{`# 1. 确认 Brand DB schema 中有 BrandBanner model
# 2. 执行 migration
cd packages/db
npx prisma db push --schema=brand.prisma

# 3. 验证表已创建
# 在 Brand DB 中查询: SELECT * FROM banners LIMIT 1;
`}
        </pre>
      </details>
    </div>
  );
}
