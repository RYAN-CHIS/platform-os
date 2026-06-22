import Link from 'next/link';
import { Metadata } from 'next';
import prisma from '@/lib/prisma';

export const metadata: Metadata = {
  title: '东方器物｜允物 ORIGIN',
  description: '允物器物中心。珠串、香器、印章、瓷器、珐琅、文房——以东方文化为根，以器物回应当代人的精神生活。',
};

const categoryConfig: Record<string, { name: string; english: string; desc: string; icon: string }> = {
  BRACELET:  { name: '珠串',  english: 'Bracelets',  desc: '人与材质的关系',  icon: '○' },
  INCENSE:  { name: '香器',  english: 'Incense Objects', desc: '人与气味的关系',  icon: '△' },
  SEAL:     { name: '印章',  english: 'Seals',     desc: '人与文字的关系',  icon: '□' },
  CERAMIC: { name: '瓷器',  english: 'Ceramics',  desc: '人与日常的关系',  icon: '◇' },
  ENAMEL:  { name: '珐琅',  english: 'Enamel',    desc: '人与工艺的关系',  icon: '☆' },
  SCHOLAR: { name: '文房',  english: 'Scholar Objects', desc: '人与精神空间的关系', icon: '一' },
};

export default async function ObjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const activeCategory = params.category || null;

  const where: any = {
    status: 'published',
    ...(activeCategory ? { objectCategory: activeCategory.toUpperCase() as any } : {}),
  };

  const products = await prisma.product.findMany({
    where,
    include: { series: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="min-h-screen bg-yun-bg">
      {/* Hero */}
      <section className="py-24 md:py-32 px-6 md:px-12 pt-32 md:pt-40">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-display text-6xl md:text-8xl text-yun-accent/10 tracking-widest leading-none mb-8">
            OBJECTS
          </p>
          <h1 className="text-3xl md:text-4xl font-light tracking-[0.15em] text-yun-text mb-6">
            东方器物
          </h1>
          <div className="divider mt-0 mb-8" />
          <p className="text-sm text-yun-text/50 max-w-lg mx-auto leading-loose">
            器物不仅被使用，<br />
            也被观看、触摸、陪伴与记忆。
          </p>
        </div>
      </section>

      {/* 分类导航 */}
      <section className="px-6 md:px-12 pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href="/objects"
              className={`px-5 py-2 text-sm tracking-wider border transition-colors ${
                !activeCategory
                  ? 'border-yun-accent text-yun-accent bg-yun-accent/5'
                  : 'border-yun-line text-yun-subtext hover:border-yun-accent/30'
              }`}
            >
              全部
            </a>
            {Object.entries(categoryConfig).map(([key, cfg]) => (
              <a
                key={key}
                href={`/objects?category=${key}`}
                className={`px-5 py-2 text-sm tracking-wider border transition-colors ${
                  activeCategory === key
                    ? 'border-yun-accent text-yun-accent bg-yun-accent/5'
                    : 'border-yun-line text-yun-subtext hover:border-yun-accent/30'
                }`}
              >
                {cfg.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 器物网格 */}
      <section className="px-6 md:px-12 pb-24">
        <div className="max-w-5xl mx-auto">
          {products.length === 0 ? (
            /* 空态：展示六大门类入口 */
            <div>
              <p className="text-center text-yun-subtext/60 text-sm mb-16">
                {activeCategory
                  ? `${categoryConfig[activeCategory]?.name || ''}系列正在筹备中，敬请期待。`
                  : '器物陆续上架，敬请期待。'}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-yun-grey/20">
                {Object.entries(categoryConfig).map(([key, cfg]) => (
                  <a
                    key={key}
                    href={`/objects?category=${key}`}
                    className="group bg-yun-white p-8 md:p-10 hover:bg-yun-bg/60 transition-colors text-center"
                  >
                    <div className="text-3xl text-yun-accent/30 group-hover:text-yun-accent/60 transition-colors mb-4 font-light">
                      {cfg.icon}
                    </div>
                    <h3 className="text-base font-light tracking-[0.12em] mb-1 group-hover:text-yun-accent transition-colors">
                      {cfg.name}
                    </h3>
                    <p className="text-xs text-yun-text/40 tracking-widest mb-2">{cfg.english}</p>
                    <p className="text-xs text-yun-text/50 leading-relaxed">{cfg.desc}</p>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-10">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="group"
                >
                  <div className="aspect-[3/4] bg-yun-grey/20 rounded-brand mb-4 flex items-center justify-center overflow-hidden">
                    <span className="text-yun-text/20 text-6xl font-display">
                      {p.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-yun-accent/60 tracking-wider">
                      {categoryConfig[p.objectCategory]?.name || p.objectCategory}
                    </span>
                    <span className="text-xs text-yun-text/30">·</span>
                    <span className="text-xs text-yun-text/40 tracking-wider">{p.series.name}</span>
                  </div>
                  <h3 className="text-base font-light tracking-wider mb-1 group-hover:text-yun-accent transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-sm text-yun-text/50">¥{p.salePrice.toLocaleString()}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
