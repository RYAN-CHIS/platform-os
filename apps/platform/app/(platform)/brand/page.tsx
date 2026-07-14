/**
 * Brand OS 概览 — 品牌运营总览
 * 产品展示 · 内容资产 · 媒体管理 · 页面运营
 */
import { prisma } from "@yunwu/db";
import { brandPrisma } from "@yunwu/db/brand";
import { brandDb } from "@/lib/brand-db";

async function getBrandOverview() {
  const results: any = {};

  // Products
  try {
    const r = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM products`);
    results.productCount = r[0]?.c || 0;
    const active = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM products WHERE status = 'PUBLISHED'`);
    results.publishedProductCount = active[0]?.c || 0;
    const draft = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM products WHERE status <> 'PUBLISHED'`);
    results.draftProductCount = draft[0]?.c || 0;
  } catch { results.productCount = 0; results.publishedProductCount = 0; results.draftProductCount = 0; }

  // Series
  try {
    const r = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM series`);
    results.seriesCount = r[0]?.c || 0;
    const active = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM series WHERE is_active = true`);
    results.activeSeriesCount = active[0]?.c || 0;
  } catch { results.seriesCount = 0; results.activeSeriesCount = 0; }

  // Journal
  try {
    const r = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM journal_posts`);
    results.journalCount = r[0]?.c || 0;
    const pub = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM journal_posts WHERE status = 'PUBLISHED'`);
    results.publishedJournalCount = pub[0]?.c || 0;
    const draft = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM journal_posts WHERE status = 'DRAFT'`);
    results.draftJournalCount = draft[0]?.c || 0;
  } catch { results.journalCount = 0; results.publishedJournalCount = 0; results.draftJournalCount = 0; }

  // Media
  try {
    const r = await prisma.erpMediaAsset.count({ where: { category: "BRAND" } });
    results.mediaCount = r || 0;
  } catch { results.mediaCount = 0; }
  try {
    const img = await prisma.erpMediaAsset.count({ where: { category: "BRAND", mediaType: "IMAGE" } });
    results.imageCount = img || 0;
    const vid = await prisma.erpMediaAsset.count({ where: { category: "BRAND", mediaType: "VIDEO" } });
    results.videoCount = vid || 0;
  } catch { results.imageCount = 0; results.videoCount = 0; }

  // Banners
  try {
    const r = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM banners`);
    results.bannerCount = r[0]?.c || 0;
    const active = await brandPrisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM banners WHERE status = 'PUBLISHED'`);
    results.activeBannerCount = active[0]?.c || 0;
  } catch { results.bannerCount = 0; results.activeBannerCount = 0; }

  // SEO
  try {
    let seoCount = 0;
    try { seoCount = await prisma.$queryRawUnsafe<any[]>(`SELECT COUNT(*)::int as c FROM seo_configs`).then(r => r[0]?.c || 0); } catch {}
    results.seoCount = seoCount || 6;
    results.missingSeoCount = 6 - results.seoCount;
    if (results.missingSeoCount < 0) results.missingSeoCount = 0;
  } catch { results.seoCount = 0; results.missingSeoCount = 6; }

  // Page content
  try {
    results.pageContentCount = await brandDb.pageContent.count();
    results.publishedPageCount = await brandDb.pageContent.count({ where: { published: true } });
  } catch { results.pageContentCount = 0; results.publishedPageCount = 0; }

  return results;
}

function KpiCard({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div style={{ background: "#fafaf9", padding: "16px", borderRadius: 8, textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 500, color: "#292524" }}>{value ?? "—"}</div>
      <div style={{ fontSize: 12, color: "#78716c", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#a8a29e", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <h2 style={{ fontSize: 16, fontWeight: 500, color: "#44403c", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 4, height: 20, background: color, borderRadius: 2, display: "inline-block" }} />
      {label}
    </h2>
  );
}

function StatGroup({ title, items, color }: { title: string; items: { label: string; value: any }[]; color: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 8, padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 500, color: "#292524", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
        {title}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "#78716c" }}>{item.label}</span>
            <span style={{ fontWeight: 500, color: "#292524" }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function BrandOverviewPage() {
  const stats = await getBrandOverview();

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: "0.1em", color: "#292524", marginBottom: 8 }}>
        Brand OS 概览
      </h1>
      <p style={{ fontSize: 12, color: "#a8a29e", marginBottom: 32 }}>
        品牌展示 · 内容资产 · 媒体管理 · 页面运营
      </p>

      {/* Top KPIs */}
      <SectionHeader label="核心指标" color="#10b981" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
        <KpiCard label="产品展示" value={stats.productCount} sub={`${stats.publishedProductCount} 已发布`} />
        <KpiCard label="七序系列" value={stats.seriesCount} sub={`${stats.activeSeriesCount} 启用中`} />
        <KpiCard label="品牌志" value={stats.journalCount} sub={`${stats.publishedJournalCount} 已发布`} />
        <KpiCard label="媒体素材" value={stats.mediaCount} sub={`${stats.imageCount} 图片 · ${stats.videoCount} 视频`} />
      </div>

      {/* Mid — Operations */}
      <SectionHeader label="运营管理" color="#3b82f6" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 32 }}>
        <StatGroup title="产品展示管理" color="#3b82f6" items={[
          { label: "已发布产品", value: stats.publishedProductCount },
          { label: "草稿/未发布", value: stats.draftProductCount },
          { label: "产品总数", value: stats.productCount },
        ]} />
        <StatGroup title="七序系列管理" color="#8b5cf6" items={[
          { label: "系列总数", value: stats.seriesCount },
          { label: "启用中系列", value: stats.activeSeriesCount },
          { label: "未启用系列", value: stats.seriesCount - stats.activeSeriesCount },
        ]} />
        <StatGroup title="品牌志管理" color="#f59e0b" items={[
          { label: "已发布文章", value: stats.publishedJournalCount },
          { label: "草稿文章", value: stats.draftJournalCount },
          { label: "文章总数", value: stats.journalCount },
        ]} />
        <StatGroup title="媒体素材管理" color="#10b981" items={[
          { label: "图片数量", value: stats.imageCount },
          { label: "视频数量", value: stats.videoCount },
          { label: "Banner 数量", value: stats.bannerCount },
        ]} />
      </div>

      {/* Bottom — Brand Status */}
      <SectionHeader label="品牌运营状态" color="#78716c" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        <StatGroup title="SEO 状态" color="#06b6d4" items={[
          { label: "已配置页面", value: stats.seoCount },
          { label: "待配置页面", value: stats.missingSeoCount },
        ]} />
        <StatGroup title="Banner 状态" color="#ec4899" items={[
          { label: "Banner 总数", value: stats.bannerCount },
          { label: "启用中", value: stats.activeBannerCount },
          { label: "未启用", value: (stats.bannerCount || 0) - (stats.activeBannerCount || 0) },
        ]} />
        <StatGroup title="页面设置状态" color="#a855f7" items={[
          { label: "已配置页面", value: stats.publishedPageCount },
          { label: "待配置页面", value: (stats.pageContentCount || 0) - (stats.publishedPageCount || 0) },
        ]} />
      </div>
    </div>
  );
}
