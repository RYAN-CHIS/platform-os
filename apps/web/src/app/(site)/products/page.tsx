import Link from 'next/link';
import prisma from '@/lib/prisma';
import SectionWrapper from '@/components/ui/SectionWrapper';
import ProductCard from '@/components/ui/ProductCard';

export const metadata = {
  title: '全部作品｜允物',
  description: '浏览允物全部作品，探索七序体系中的每一件器物。每一件作品都是东方审美与现代生活的相遇。',
};

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    where: { status: 'PUBLISHED' },
    include: { series: true },
    orderBy: [{ series: { sortOrder: 'asc' } }, { salePrice: 'asc' }],
  });

  // 按序分组
  const grouped: Record<string, typeof products> = {};
  for (const p of products) {
    const key = p.series.name;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  }

  return (
    <main className="bg-[var(--yun-paper)] min-h-screen">
      {/* Hero */}
      <SectionWrapper className="min-h-[30vh] flex items-center justify-center">
        <div className="text-center fade-in">
          <p className="font-display text-6xl md:text-8xl text-[var(--yun-gray)]/5 tracking-widest leading-none mb-8">
            WORKS
          </p>
          <h1 className="text-3xl md:text-4xl font-light tracking-[0.15em] text-[var(--yun-ink)] mb-6">
            全部作品
          </h1>
          <div className="divider mb-6" />
          <p className="text-sm text-[var(--yun-gray)] leading-loose max-w-xl mx-auto">
            每一件器物，都承载着材料、工艺与时间的温度。
          </p>
        </div>
      </SectionWrapper>

      {/* 分组作品列表 */}
      {Object.entries(grouped).map(([seriesName, items], groupIdx) => (
        <SectionWrapper key={seriesName}>
          <div className="fade-in" style={{ animationDelay: `${groupIdx * 0.1}s` }}>
            <h2 className="text-lg font-light tracking-[0.1em] text-[var(--yun-ink)] mb-8 pb-4 border-b border-[var(--yun-border)]/30">
              {seriesName}
              <span className="text-sm text-[var(--yun-gray)] ml-2">{items.length} 件作品</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {items.map((p) => (
                <ProductCard
                  key={p.id}
                  slug={p.slug}
                  name={p.name}
                  coverImage={p.coverImage}
                  seriesName={p.series?.name}
                  seriesSlug={p.series?.slug}
                  salePrice={p.salePrice}
                  objectCategory={p.objectCategory}
                />
              ))}
            </div>
          </div>
        </SectionWrapper>
      ))}

      {/* 返回 */}
      <div className="text-center pb-24">
        <Link href="/" className="text-sm text-[var(--yun-jade)] tracking-wider hover:opacity-70 transition-opacity">
          ← 返回首页
        </Link>
      </div>
    </main>
  );
}

export const revalidate = 60;
