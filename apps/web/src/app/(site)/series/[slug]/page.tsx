import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params;
  const series = await prisma.series.findUnique({
    where: { slug },
    include: {
      products: {
        where: { status: 'published' },
        orderBy: { salePrice: 'asc' },
      },
    },
  });

  if (!series) notFound();

  return (
    <>
      {/* Hero */}
      <section className="min-h-[60vh] flex items-center justify-center pt-16">
        <div className="text-center max-w-2xl px-6">
          <p className="text-xs text-yun-accent tracking-[0.2em] mb-4">
            第{series.sortOrder}序
          </p>
          <h1 className="text-4xl md:text-5xl font-light tracking-[0.12em] mb-6">
            {series.name}
          </h1>
          <div className="divider mb-8" />
          <p className="text-lg font-light tracking-wider text-yun-accent/80 mb-6 leading-relaxed">
            {series.shortDesc}
          </p>
          <p className="text-sm text-yun-text/60 leading-loose max-w-xl mx-auto">
            {series.longDesc}
          </p>
        </div>
      </section>

      {/* 作品列表 */}
      <section className="py-20">
        <div className="container-brand">
          <h2 className="text-center text-sm font-light tracking-[0.15em] text-yun-text/40 mb-12">
            {series.name} · 作品
          </h2>

          {series.products.length === 0 ? (
            <p className="text-center text-sm text-yun-text/40">作品筹备中</p>
          ) : (
            <div className="grid md:grid-cols-4 gap-8">
              {series.products.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="group"
                >
                  <div className="aspect-[3/4] bg-yun-grey/20 rounded-brand mb-4 flex items-center justify-center">
                    <span className="text-6xl font-display text-yun-text/20 group-hover:text-yun-accent/30 transition-colors">
                      {p.name.charAt(0)}
                    </span>
                  </div>
                  <h3 className="text-base font-light tracking-wider mb-1 group-hover:text-yun-accent transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-yun-text/40 mb-2 line-clamp-2">{p.theme}</p>
                  <p className="text-sm text-yun-text/50">¥{p.salePrice.toLocaleString()}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 返回导航 */}
      <div className="text-center pb-20">
        <Link href="/" className="text-sm text-yun-accent tracking-wider hover:opacity-70 transition-opacity">
          ← 返回首页
        </Link>
      </div>
    </>
  );
}

export async function generateStaticParams() {
  const series = await prisma.series.findMany({ select: { slug: true } });
  return series.map((s) => ({ slug: s.slug }));
}

export const revalidate = 60;
