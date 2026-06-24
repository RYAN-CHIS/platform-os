// ═════════════════════════════════════════════════════════
// Brand Overview — Route Page
// WO-P8G: Real operational page with data
// ═════════════════════════════════════════════════════════

import Link from "next/link";
import { Card, StatCard, LoadingState } from "@yunwu/ui";
import { getBrandStats } from "@/modules/brand/products/actions";

export default async function BrandOverviewPage() {
  const stats = await getBrandStats();

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-light tracking-[0.1em] text-stone-800 mb-6">
        Brand OS 概览
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href="/brand/products" className="block">
          <StatCard title="产品数" value={stats.productCount} />
        </Link>
        <Link href="/brand/series" className="block">
          <StatCard title="系列数" value={stats.seriesCount} />
        </Link>
        <Link href="/brand/journal" className="block">
          <StatCard title="Journal 文章" value={stats.journalCount} />
        </Link>
        <Link href="/brand/media" className="block">
          <StatCard title="媒体文件" value={stats.mediaCount} />
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card padding="md" className="hover:shadow-md transition-shadow">
          <Link href="/brand/products" className="block">
            <h3 className="font-medium text-stone-800 mb-1">产品展示管理</h3>
            <p className="text-sm text-stone-500">管理前台展示的产品、价格、状态</p>
          </Link>
        </Card>

        <Card padding="md" className="hover:shadow-md transition-shadow">
          <Link href="/brand/series" className="block">
            <h3 className="font-medium text-stone-800 mb-1">七序系列管理</h3>
            <p className="text-sm text-stone-500">管理品牌系列和排序</p>
          </Link>
        </Card>

        <Card padding="md" className="hover:shadow-md transition-shadow">
          <Link href="/brand/journal" className="block">
            <h3 className="font-medium text-stone-800 mb-1">品牌志管理</h3>
            <p className="text-sm text-stone-500">发布品牌故事和材质知识</p>
          </Link>
        </Card>

        <Card padding="md" className="hover:shadow-md transition-shadow">
          <Link href="/brand/media" className="block">
            <h3 className="font-medium text-stone-800 mb-1">媒体素材管理</h3>
            <p className="text-sm text-stone-500">管理图片、视频等媒体资源</p>
          </Link>
        </Card>
      </div>
    </div>
  );
}
