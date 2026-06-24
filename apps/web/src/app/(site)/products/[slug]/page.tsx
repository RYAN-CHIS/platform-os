import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Metadata } from 'next';
import BuyButton from './BuyButton';
import SectionWrapper from '@/components/ui/SectionWrapper';

interface Props {
  params: Promise<{ slug: string }>;
}

// ── 动态 SEO Metadata ──
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { series: true },
  });

  if (!product || product.status !== 'PUBLISHED') return {};

  const title = product.sku
    ? `${product.name}｜${product.series?.name || ''}｜允物`
    : `${product.name}｜允物`;

  return {
    title,
    description: product.story || product.theme || `${product.name} — 允物东方器物作品`,
    openGraph: {
      title,
      description: product.story || product.theme || '',
      type: 'website',
      images: product.coverImage ? [product.coverImage] : [],
    },
    keywords: [
      '允物', product.name, product.series?.name || '',
      product.objectCategory || '', '东方器物',
    ].filter(Boolean),
  };
}

// ── 时间性文案生成 ──
function getTemporalText(product: {
  completionDate?: Date | null;
  companionsCount?: number | null;
  remainingQuantity?: number | null;
}): string | null {
  const parts: string[] = [];
  
  if (product.completionDate) {
    const days = Math.floor((Date.now() - new Date(product.completionDate).getTime()) / (1000 * 60 * 60 * 24));
    if (days < 30) {
      parts.push(`完成于 ${days} 日前`);
    } else if (days < 365) {
      parts.push(`完成于 ${Math.floor(days / 30)} 个月前`);
    }
  }
  
  if (product.companionsCount && product.companionsCount > 0) {
    parts.push(`已陪伴 ${product.companionsCount} 位同行者`);
  }
  
  if (product.remainingQuantity !== null && product.remainingQuantity !== undefined && product.remainingQuantity <= 3) {
    parts.push(`此批尚余 ${product.remainingQuantity} 件`);
  }
  
  return parts.length > 0 ? parts.join(' · ') : null;
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      series: true,
      materialsRelation: { include: { material: true } },
    },
  });

  if (!product || product.status !== 'PUBLISHED') notFound();

  // 相关作品：同序的其他作品
  const related = await prisma.product.findMany({
    where: {
      seriesId: product.seriesId,
      id: { not: product.id },
      status: 'PUBLISHED',
    },
    take: 4,
    include: { series: true },
  });

  // ── 时间性文案 ──
  const temporalText = getTemporalText(product);

  // ── JSON-LD 结构化数据 ──
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.story || product.theme || '',
    sku: product.sku || '',
    offers: {
      '@type': 'Offer',
      price: product.salePrice,
      priceCurrency: 'CNY',
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    brand: {
      '@type': 'Brand',
      name: '允物',
    },
    ...(product.coverImage && { image: product.coverImage }),
  };

  return (
    <main className="bg-[var(--yun-paper)] min-h-screen">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="pt-28">
        <SectionWrapper>
          {/* 面包屑 */}
          <nav className="flex items-center gap-2 text-xs text-[var(--yun-gray)] tracking-wider mb-12">
            <Link href="/" className="hover:text-[var(--yun-earth)] transition-colors">首页</Link>
            <span>/</span>
            <Link href={`/series/${product.series.slug}`} className="hover:text-[var(--yun-earth)] transition-colors">{product.series.name}</Link>
            <span>/</span>
            <span className="text-[var(--yun-ink)]">{product.name}</span>
          </nav>

          {/* 产品布局 */}
          <div className="grid md:grid-cols-2 gap-16">
            {/* 左：封面 */}
            <div className="aspect-[3/4] bg-[var(--yun-hover)] rounded-[var(--yun-radius)] flex items-center justify-center">
              <span className="text-[12rem] leading-none font-display text-[var(--yun-ink)]/5">
                {product.name.charAt(0)}
              </span>
            </div>

            {/* 右：信息 */}
            <div className="flex flex-col justify-center">
              <span className="text-xs tracking-[0.15em] text-[var(--yun-jade)] bg-[var(--yun-jade)]/5 rounded-full px-3 py-1 inline-block w-fit mb-4">
                {product.series.name}
              </span>
              <h1 className="text-3xl font-light tracking-[var(--yun-spacing-title)] text-[var(--yun-ink)] mb-3">{product.name}</h1>
              <p className="text-sm text-[var(--yun-gray)] tracking-wider mb-8">{product.theme}</p>

              {/* 时间性信息 */}
              {temporalText && (
                <p className="text-xs text-[var(--yun-earth)]/70 tracking-wider mb-6">
                  {temporalText}
                </p>
              )}

              <div className="space-y-4 mb-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-light tracking-wider text-[var(--yun-ink)]">¥{product.salePrice.toLocaleString()}</span>
                </div>
                <p className="text-xs text-[var(--yun-gray)]">编号：{product.sku}</p>
              </div>

              {/* 购买按钮 */}
              <BuyButton productSlug={product.slug} productName={product.name} price={product.salePrice} />

              {/* 器物履历 */}
              {(product.materialOrigin || product.craftMethod || product.serialNumber) && (
                <div className="mt-8 pt-8 border-t border-[var(--yun-border)]">
                  <h3 className="text-sm font-light tracking-wider text-[var(--yun-ink)] mb-4">器物履历</h3>
                  <dl className="text-xs text-[var(--yun-gray)] space-y-2">
                    {product.materialOrigin && (
                      <div className="flex">
                        <dt className="w-20 text-[var(--yun-ink)]/50">材质来源</dt>
                        <dd>{product.materialOrigin}</dd>
                      </div>
                    )}
                    {product.craftMethod && (
                      <div className="flex">
                        <dt className="w-20 text-[var(--yun-ink)]/50">工艺方式</dt>
                        <dd>{product.craftMethod}</dd>
                      </div>
                    )}
                    {product.completionDate && (
                      <div className="flex">
                        <dt className="w-20 text-[var(--yun-ink)]/50">完成时间</dt>
                        <dd>{new Date(product.completionDate).toLocaleDateString('zh-CN')}</dd>
                      </div>
                    )}
                    {product.serialNumber && (
                      <div className="flex">
                        <dt className="w-20 text-[var(--yun-ink)]/50">编号序列</dt>
                        <dd>{product.serialNumber}</dd>
                      </div>
                    )}
                    {product.creationStory && (
                      <div className="mt-3 pt-3 border-t border-[var(--yun-border)]/50">
                        <dt className="text-[var(--yun-ink)]/50 mb-1">创作缘起</dt>
                        <dd className="text-[var(--yun-ink)]/70 leading-relaxed">{product.creationStory}</dd>
                      </div>
                    )}
                    {product.emotionalState && (
                      <div className="mt-3 pt-3 border-t border-[var(--yun-border)]/50">
                        <dt className="text-[var(--yun-ink)]/50 mb-1">适配心境</dt>
                        <dd className="text-[var(--yun-ink)]/70 leading-relaxed">{product.emotionalState}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* 材料 */}
              {product.materialsRelation.length > 0 && (
                <div className="mt-8 pt-8 border-t border-[var(--yun-border)]">
                  <h3 className="text-sm font-light tracking-wider text-[var(--yun-ink)] mb-3">材质构成</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.materialsRelation.map((pm) => (
                      <Link
                        key={pm.id}
                        href="/materials"
                        className="text-xs text-[var(--yun-jade)]/70 hover:text-[var(--yun-jade)] tracking-wider transition-colors"
                      >
                        {pm.material.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 库存提示（用时间性语言） */}
              {product.remainingQuantity !== null && product.remainingQuantity !== undefined && product.remainingQuantity <= 3 && product.remainingQuantity > 0 && (
                <p className="text-xs text-[var(--yun-earth)]/60 mt-4">此批尚余 {product.remainingQuantity} 件</p>
              )}
            </div>
          </div>

          {/* 作品故事 */}
          <section className="max-w-2xl mx-auto py-20">
            <h2 className="text-center text-sm font-light tracking-[var(--yun-spacing-title)] text-[var(--yun-gray)] mb-10">作品故事</h2>
            <div className="text-sm leading-loose text-[var(--yun-ink)]/70 space-y-4">
              {product.story.split('\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            <div className="mt-8 pt-8 border-t border-[var(--yun-border)]">
              <p className="text-xs text-[var(--yun-gray)]">
                材料清单：{product.materials}
              </p>
            </div>
          </section>

          {/* 允物承诺 */}
          <section className="max-w-2xl mx-auto pb-20">
            <div className="bg-[var(--yun-hover)] border border-[var(--yun-border)] rounded-[var(--yun-radius)] p-8">
              <h3 className="text-sm font-light tracking-wider text-[var(--yun-ink)] mb-4">允物承诺</h3>
              <ul className="text-xs text-[var(--yun-gray)] space-y-2">
                <li>· 不神化器物，不承诺转运、招财、改命</li>
                <li>· 如实物与描述不符，支持7天无理由退换</li>
                <li>· 每一件作品都配有详细材质说明</li>
              </ul>
            </div>
          </section>
        </SectionWrapper>
      </article>

      {/* 相关推荐 */}
      {related.length > 0 && (
        <SectionWrapper className="bg-[var(--yun-hover)]">
          <h2 className="text-center text-sm font-light tracking-[var(--yun-spacing-title)] text-[var(--yun-gray)] mb-12">
            同序推荐
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {related.map((p) => (
              <Link key={p.id} href={`/products/${p.slug}`} className="group">
                <div className="aspect-[3/4] bg-[var(--yun-paper)] rounded-[var(--yun-radius)] mb-4 flex items-center justify-center border border-[var(--yun-border)]/10 group-hover:border-[var(--yun-earth)]/30 transition-colors duration-[var(--yun-duration-read)]">
                  <span className="text-5xl font-display text-[var(--yun-ink)]/10 group-hover:text-[var(--yun-jade)]/20 transition-colors duration-[var(--yun-duration-read)]">{p.name.charAt(0)}</span>
                </div>
                <h3 className="text-base font-light tracking-wider text-[var(--yun-ink)] mb-1 group-hover:text-[var(--yun-earth)] transition-colors duration-[var(--yun-duration-read)]">
                  {p.name}
                </h3>
                <p className="text-sm text-[var(--yun-gray)]">¥{p.salePrice.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </SectionWrapper>
      )}
    </main>
  );
}

export const revalidate = 3600;
