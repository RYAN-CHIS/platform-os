import Link from 'next/link';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // V2.1: bypass ISR cache for production sync

export default async function HomePage() {
  // Task A5：首屏仅一件作品
  const featuredWork = await prisma.product.findFirst({
    where: { status: 'PUBLISHED' },
    include: { series: true },
    orderBy: { createdAt: 'desc' },
  });

  // Section 02 知其来：材质来源
  const materials = await prisma.material.findMany({
    where: { isActive: true },
    take: 6,
    orderBy: { sortOrder: 'asc' },
  });

  // Section 04 结其缘：更多作品
  const recentWorks = await prisma.product.findMany({
    where: { status: 'PUBLISHED' },
    include: { series: true },
    take: 6,
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          Section 01 · 见物
          规则：首屏仅展示一件作品
          禁止：carousel, 多列产品墙, 滑动推荐
          ═══════════════════════════════════════════════════════ */}
      <section className="min-h-screen flex flex-col items-center justify-center pt-20" style={{ padding: 'var(--yun-space-26) var(--yun-space-4)' }}>
        <div className="text-center fade-in" style={{ maxWidth: '640px' }}>
          {/* 一句核心语 */}
          <p className="text-xs tracking-[var(--yun-spacing-caption)] text-[var(--yun-earth)] mb-4">
            {featuredWork?.series?.name || '允物'}
          </p>

          {/* 一件作品 */}
          {featuredWork ? (
            <>
              <h1 className="text-[var(--yun-text-hero)] font-light tracking-[var(--yun-spacing-hero)] text-[var(--yun-ink)] mb-6 leading-normal">
                {featuredWork.name}
              </h1>

              {featuredWork.coverImage ? (
                <div className="mx-auto mb-8" style={{ maxWidth: '480px' }}>
                  <img
                    src={featuredWork.coverImage}
                    alt={featuredWork.name}
                    style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', filter: 'saturate(0.85)' }}
                  />
                </div>
              ) : (
                <div className="mx-auto mb-8 aspect-square flex items-center justify-center" style={{ maxWidth: '480px', backgroundColor: 'var(--yun-paper-aged)' }}>
                  <span className="font-display text-8xl text-[var(--yun-ink-faded)]">{featuredWork.name.charAt(0)}</span>
                </div>
              )}

              {featuredWork.theme && (
                <p className="text-sm text-[var(--yun-ink-muted)] tracking-wider mb-4" style={{ lineHeight: 'var(--yun-leading-body)' }}>
                  {featuredWork.theme}
                </p>
              )}

              {/* 一段时间信息 (Task 07) */}
              <div className="yun-temporal mb-10">
                {featuredWork.companionsCount > 0 && (
                  <span className="yun-temporal-item">已陪伴 {featuredWork.companionsCount} 位同行者</span>
                )}
                {featuredWork.remainingQuantity > 0 && featuredWork.remainingQuantity <= 10 && (
                  <span className="yun-temporal-item">此批尚余 {featuredWork.remainingQuantity} 件</span>
                )}
                {featuredWork.completionDate && (
                  <span className="yun-temporal-item">完成于 {new Date(featuredWork.completionDate).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>
                )}
              </div>

              {/* 一个 CTA (Task 05) */}
              <Link href={`/products/${featuredWork.slug}`} className="btn-primary">
                观其意
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-[var(--yun-text-hero)] font-light tracking-[var(--yun-spacing-hero)] text-[var(--yun-ink)] mb-6 leading-normal">
                让物归物<br />让心归心
              </h1>
              <div className="divider mb-8" />
              <p className="text-sm text-[var(--yun-ink-muted)] tracking-wider mb-12" style={{ lineHeight: 'var(--yun-leading-loose)' }}>
                东方生活器物品牌<br />通过器物重新建立人与自己、人与时间的连接。
              </p>
              <Link href="/objects" className="btn-outline">看诸物</Link>
            </>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          Section 02 · 知其来
          展示材质来源、地域来源、工艺来源
          目标：先让物成立
          ═══════════════════════════════════════════════════════ */}
      <section style={{ padding: 'var(--yun-space-26) var(--yun-space-4)' }}>
        <div className="container-brand">
          <div className="text-center mb-16 reveal-on-scroll">
            <h2 className="text-[var(--yun-text-heading)] font-light tracking-[var(--yun-spacing-title)] mb-4">
              知其来
            </h2>
            <p className="text-sm text-[var(--yun-ink-muted)] max-w-xl mx-auto" style={{ lineHeight: 'var(--yun-leading-loose)' }}>
              器物不是凭空出现。每一件作品的背后，都有材质、地域和工艺的故事。
            </p>
          </div>

          {featuredWork && (
            <div className="yun-provenance max-w-xl mx-auto reveal-on-scroll">
              {featuredWork.materialOrigin && (
                <div className="yun-provenance-row">
                  <span className="yun-provenance-key">材质来源</span>
                  <span className="yun-provenance-val">{featuredWork.materialOrigin}</span>
                </div>
              )}
              {featuredWork.craftMethod && (
                <div className="yun-provenance-row">
                  <span className="yun-provenance-key">工艺方式</span>
                  <span className="yun-provenance-val">{featuredWork.craftMethod}</span>
                </div>
              )}
              {featuredWork.emotionalState && (
                <div className="yun-provenance-row">
                  <span className="yun-provenance-key">适配心境</span>
                  <span className="yun-provenance-val">{featuredWork.emotionalState}</span>
                </div>
              )}
            </div>
          )}

          {materials.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6 mt-16 reveal-on-scroll">
              {materials.map((m) => (
                <Link
                  key={m.id}
                  href="/materials"
                  className="yun-vessel text-center block group"
                  style={{ padding: 'var(--yun-space-8) var(--yun-space-4)' }}
                >
                  <h3 className="yun-vessel-title text-lg tracking-wider mb-2">{m.name}</h3>
                  <p className="text-xs text-[var(--yun-ink-faded)] tracking-wider">{m.shortDesc}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          Section 03 · 知其意
          器物为何存在。不是卖点，是意义。
          ═══════════════════════════════════════════════════════ */}
      <section style={{ padding: 'var(--yun-space-26) var(--yun-space-4)', backgroundColor: 'var(--yun-paper-aged)' }}>
        <div className="container-brand max-w-2xl">
          <div className="text-center mb-16 reveal-on-scroll">
            <h2 className="text-[var(--yun-text-heading)] font-light tracking-[var(--yun-spacing-title)] mb-4">
              知其意
            </h2>
            <p className="text-sm text-[var(--yun-ink-muted)]" style={{ lineHeight: 'var(--yun-leading-loose)' }}>
              器物不是答案，而是提醒我们看见自己的镜子。
            </p>
          </div>

          {featuredWork?.creationStory && (
            <div className="reveal-on-scroll" style={{ lineHeight: 'var(--yun-leading-loose)' }}>
              <p className="text-sm text-[var(--yun-ink-muted)]" style={{ textIndent: '2em', textAlign: 'justify' }}>
                {featuredWork.creationStory}
              </p>
            </div>
          )}

          {!featuredWork?.creationStory && (
            <div className="text-center reveal-on-scroll" style={{ lineHeight: 'var(--yun-leading-loose)' }}>
              <p className="text-sm text-[var(--yun-ink-muted)]">
                允物不以品类定义品牌，而以人与器物的关系定义。<br />
                见己、留痕、栖居、随行、传藏——<br />
                五种关系，映照人生不同阶段的需要。
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          Section 04 · 结其缘
          最后才允许 CTA
          逻辑：先见 → 再知 → 再懂 → 再缘
          ═══════════════════════════════════════════════════════ */}
      <section style={{ padding: 'var(--yun-space-26) var(--yun-space-4)' }}>
        <div className="container-brand">
          <div className="text-center mb-16 reveal-on-scroll">
            <h2 className="text-[var(--yun-text-heading)] font-light tracking-[var(--yun-spacing-title)] mb-4">
              结其缘
            </h2>
            <p className="text-sm text-[var(--yun-ink-muted)]" style={{ lineHeight: 'var(--yun-leading-loose)' }}>
              当你准备好，器物就在这里。
            </p>
          </div>

          {/* 近期作品列表 */}
          <div className="grid md:grid-cols-2 gap-8 reveal-on-scroll">
            {recentWorks.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="yun-vessel group block"
              >
                {p.coverImage ? (
                  <img
                    src={p.coverImage}
                    alt={p.name}
                    className="w-full aspect-square object-cover"
                    style={{ filter: 'saturate(0.85)' }}
                  />
                ) : (
                  <div className="aspect-square flex items-center justify-center" style={{ backgroundColor: 'var(--yun-paper-aged)' }}>
                    <span className="font-display text-5xl text-[var(--yun-ink-faded)]">{p.name.charAt(0)}</span>
                  </div>
                )}
                <div style={{ padding: 'var(--yun-space-4) 0' }}>
                  <p className="text-xs text-[var(--yun-earth)] tracking-wider mb-1">{p.series?.name}</p>
                  <h4 className="yun-vessel-title text-base tracking-wider">
                    {p.name}
                  </h4>
                  <p className="text-sm text-[var(--yun-ink-muted)] font-light mt-1">
                    ¥{p.salePrice.toLocaleString()}
                  </p>
                  {/* 时间性 (Task 07) */}
                  {p.companionsCount > 0 && (
                    <div className="yun-temporal mt-2">
                      <span className="yun-temporal-item">已陪伴 {p.companionsCount} 位同行者</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-16 reveal-on-scroll">
            <Link href="/objects" className="btn-outline">看诸物</Link>
          </div>
        </div>
      </section>
    </>
  );
}
