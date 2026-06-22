import Link from 'next/link';
import prisma from '@/lib/prisma';
import SectionWrapper from '@/components/ui/SectionWrapper';

export const metadata = {
  title: '东方材料｜允物 Yunwu Origin',
  description: '探索允物使用的天然材质：白水晶、粉晶、南红、沉香、老山檀、绿松石、青金石。每一种材料都有它的来历和故事。',
};

export default async function MaterialsPage() {
  const materials = await prisma.material.findMany({
    include: {
      productMaterials: {
        include: { product: { include: { series: true } } },
      },
    },
  });

  return (
    <main className="min-h-screen bg-[var(--yun-paper)]">
      {/* Hero */}
      <SectionWrapper className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center max-w-4xl mx-auto fade-in">
          <p className="font-display text-6xl md:text-8xl text-[var(--yun-ink)]/5 tracking-widest leading-none mb-8">
            MATERIALS
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-[var(--yun-ink)] tracking-wide mb-6">
            东方材料
          </h1>
          <p className="text-sm text-[var(--yun-gray)] leading-loose max-w-xl mx-auto">
            每一种材料都有它的来历、性格和故事。
            <br />
            水晶是大地亿万年的结晶，沉香是树木受伤后的自我修复，檀木是数十年缓慢生长的年轮。
          </p>
        </div>
      </SectionWrapper>

      {/* 材料列表 */}
      <SectionWrapper>
        <div className="space-y-24">
          {materials.map((m, idx) => (
            <div
              key={m.id}
              className="grid md:grid-cols-2 gap-16 items-center fade-in"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              {/* 图 */}
              <div className="aspect-square bg-[var(--yun-hover)] rounded-[var(--yun-radius)] flex items-center justify-center border border-[var(--yun-border)]/20">
                <span className="text-[8rem] font-display text-[var(--yun-ink)]/5">
                  {m.name.charAt(0)}
                </span>
              </div>

              {/* 文 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="tag-yun">{m.type}</span>
                  <span className="text-xs text-[var(--yun-gray)] tracking-wider">{m.origin}</span>
                </div>
                <h2 className="text-2xl font-light tracking-[0.1em] mb-6 text-[var(--yun-ink)]">{m.name}</h2>
                <p className="text-sm text-[var(--yun-gray)] leading-loose">{m.description}</p>

                {/* 关联作品 */}
                {m.productMaterials.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-[var(--yun-border)]/30">
                    <h3 className="text-xs text-[var(--yun-gray)] tracking-wider mb-3">应用作品</h3>
                    <div className="flex flex-wrap gap-2">
                      {m.productMaterials.map((pm) => (
                        <Link
                          key={pm.id}
                          href={`/products/${pm.product.slug}`}
                          className="text-sm text-[var(--yun-jade)] hover:text-[var(--yun-ink)] tracking-wider transition-colors"
                        >
                          {pm.product.series.name} · {pm.product.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* 返回 */}
      <div className="text-center pb-24">
        <Link href="/" className="text-sm text-[var(--yun-jade)] tracking-wider hover:opacity-70 transition-opacity">
          ← 返回首页
        </Link>
      </div>
    </main>
  );
}

export const revalidate = 3600;
