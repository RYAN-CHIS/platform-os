import Link from 'next/link';
import prisma from '@/lib/prisma';

// ── 五大器物体系（来自《允物品牌宪章》）──
const objectSystems = [
  {
    name: '见己',
    subtitle: '关于陪伴自己',
    items: ['手串', '佩饰', '瓷珠', '香牌'],
    desc: '相伴于身，照见本心。器物不是答案，而是提醒我们看见自己的镜子。',
  },
  {
    name: '留痕',
    subtitle: '关于表达自己',
    items: ['姓名章', '闲章', '品牌章', '篆刻'],
    desc: '以刀为笔，以石为纸。每一次落刀，都是与时间的对话。',
  },
  {
    name: '栖居',
    subtitle: '关于安顿生活',
    items: ['茶器', '香器', '花器', '文房'],
    desc: '烟火日常，亦有诗意。器物让空间成为家，让片刻成为仪式。',
  },
  {
    name: '随行',
    subtitle: '关于长期陪伴',
    items: ['皮具', '卡包', '护照夹', '手账'],
    desc: '陪我们走过日常的，才是真正重要的。使用是最好的养护。',
  },
  {
    name: '传藏',
    subtitle: '关于时间价值',
    items: ['大漆', '掐丝珐琅', '编号作品'],
    desc: '有些器物，生来就是为了被传递。它们承载时间，也承载故事。',
  },
];

// ── 工艺体系（来自《允物品牌宪章》）──
const crafts = [
  { name: '篆刻', desc: '记录名字，记录身份，记录人与时间的关系', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { name: '瓷器', desc: '泥土经火，成为器物。时间与温度共同完成', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { name: '大漆', desc: '与时间合作的工艺，等待本身就是创造', icon: 'M12 2a7 7 0 017 7c0 2.4-1.2 4.5-3 5.7V17a2 2 0 01-2 2h-1a2 2 0 01-2-2v-2.3A6.98 6.98 0 015 9a7 7 0 017-7z' },
  { name: '掐丝珐琅', desc: '金属与釉彩相遇，代表慢工艺的价值', icon: 'M4 6h16M4 12h16M4 18h16M8 2v4M16 2v4M8 16v4M16 16v4' },
  { name: '皮具', desc: '记录使用痕迹，形成独属的时间纹路', icon: 'M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9zM13 2v7h7' },
];

// ── 精选作品分类映射 ──
const featuredCategories = [
  { key: 'BRACELET', name: '手串', slug: 'bracelet' },
  { key: 'SEAL', name: '篆刻', slug: 'seal' },
  { key: 'CERAMIC', name: '瓷器', slug: 'ceramic' },
  { key: 'INCENSE', name: '香器', slug: 'incense' },
  { key: 'ENAMEL', name: '珐琅', slug: 'enamel' },
] as const;

export default async function HomePage() {
  const series = await prisma.series.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  const journalPosts = await prisma.journalPost.findMany({
    where: { status: 'PUBLISHED' },
    take: 3,
    orderBy: { publishedAt: 'desc' },
  });

  // 按分类获取精选作品（每类 2 件）
  const featuredByCategory = await Promise.all(
    featuredCategories.map(async (cat) => {
      const products = await prisma.product.findMany({
        where: { status: 'published', objectCategory: cat.key },
        include: { series: true },
        take: 2,
        orderBy: { createdAt: 'desc' },
      });
      return { ...cat, products };
    })
  );

  // 只展示有作品的分类
  const visibleCategories = featuredByCategory.filter((c) => c.products.length > 0);

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          第一屏：Hero
          ═══════════════════════════════════════════════════════ */}
      <section className="min-h-screen flex items-center justify-center relative pt-16">
        <div className="text-center px-6 max-w-3xl fade-in">
          {/* 品牌主张 */}
          <h1 className="text-3xl md:text-5xl font-light tracking-[0.15em] text-yun-text mb-6 leading-normal">
            让物归物<br />让心归心
          </h1>

          <p className="text-base md:text-lg font-light tracking-[0.12em] text-yun-accent mb-4">
            东方生活器物品牌
          </p>

          <div className="divider mb-8" />

          <p className="text-sm text-yun-text/50 tracking-wider max-w-md mx-auto leading-loose mb-12">
            通过器物重新建立人与自己、<br />
            人与时间、人与生活的连接。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/objects" className="btn-primary">
              浏览作品
            </Link>
            <Link href="/series" className="btn-outline">
              进入七序
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          第二屏：七序世界观（从数据库读取）
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 bg-yun-white">
        <div className="container-brand">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-light tracking-[0.15em] mb-4">
              人生不同阶段的映照
            </h2>
            <p className="text-sm text-yun-text/50 max-w-xl mx-auto leading-loose">
              七序不是等级，不是价格体系，而是人生不同阶段的映照。
            </p>
          </div>

          {series.length > 0 ? (
            <>
              <div className="grid md:grid-cols-4 gap-3 mb-3">
                {series.slice(0, 4).map((s) => (
                  <Link
                    key={s.id}
                    href={`/series/${s.slug}`}
                    className="group bg-white/70 p-8 md:p-10 hover:bg-white transition-all duration-300 border border-yun-grey/10 hover:border-yun-grey/20 hover:shadow-sm"
                  >
                    <p className="text-xs text-yun-accent tracking-[0.15em] mb-4 font-medium">
                      第{['一','二','三','四','五','六','七'][s.sortOrder - 1]}序
                    </p>
                    <h3 className="text-2xl md:text-3xl font-light tracking-wider mb-3 group-hover:text-yun-accent transition-colors">
                      {s.name}
                    </h3>
                    <p className="text-xs text-yun-text/40 tracking-wider mb-3">{s.shortDesc}</p>
                    <p className="text-sm text-yun-text/60 font-light leading-relaxed line-clamp-3">
                      {s.longDesc}
                    </p>
                  </Link>
                ))}
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {series.slice(4).map((s) => (
                  <Link
                    key={s.id}
                    href={`/series/${s.slug}`}
                    className="group bg-white/70 p-8 md:p-10 hover:bg-white transition-all duration-300 border border-yun-grey/10 hover:border-yun-grey/20 hover:shadow-sm"
                  >
                    <p className="text-xs text-yun-accent tracking-[0.15em] mb-4 font-medium">
                      第{['一','二','三','四','五','六','七'][s.sortOrder - 1]}序
                    </p>
                    <h3 className="text-2xl md:text-3xl font-light tracking-wider mb-3 group-hover:text-yun-accent transition-colors">
                      {s.name}
                    </h3>
                    <p className="text-xs text-yun-text/40 tracking-wider mb-3">{s.shortDesc}</p>
                    <p className="text-sm text-yun-text/60 font-light leading-relaxed line-clamp-3">
                      {s.longDesc}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-yun-text/30 tracking-wider">七序内容将通过后台管理系统配置</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/series" className="btn-outline text-sm">了解七序体系 →</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          第三屏：精选作品
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="container-brand">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-light tracking-[0.15em] mb-4">精选作品</h2>
            <p className="text-sm text-yun-text/50 max-w-xl mx-auto leading-loose">
              每一件器物，都承载着材料、工艺与时间的温度。
            </p>
          </div>

          {visibleCategories.map((cat) => (
            <div key={cat.key} className="mb-16 last:mb-0">
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-lg font-light tracking-[0.12em] text-yun-text">{cat.name}</h3>
                <div className="flex-1 h-px bg-yun-grey/20" />
                <Link
                  href={`/objects?category=${cat.key}`}
                  className="text-xs text-yun-accent/60 hover:text-yun-accent tracking-wider transition-colors"
                >
                  查看全部 →
                </Link>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {cat.products.map((p) => (
                  <Link key={p.id} href={`/products/${p.slug}`} className="group flex gap-6">
                    {/* 作品封面 */}
                    <div className="w-24 h-32 md:w-32 md:h-40 bg-yun-grey/10 flex-shrink-0 flex items-center justify-center overflow-hidden border border-yun-grey/10 group-hover:border-yun-grey/30 transition-colors">
                      {p.coverImage ? (
                        <img src={p.coverImage} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-yun-text/15 text-4xl font-display">{p.name.charAt(0)}</span>
                      )}
                    </div>

                    <div className="flex flex-col justify-center">
                      <p className="text-xs text-yun-accent tracking-wider mb-1">{p.series.name}</p>
                      <h4 className="text-base font-light tracking-wider mb-1 group-hover:text-yun-accent transition-colors">
                        {p.name}
                      </h4>
                      {p.theme && (
                        <p className="text-xs text-yun-text/40 mb-2 line-clamp-2">{p.theme}</p>
                      )}
                      {p.story && (
                        <p className="text-xs text-yun-text/50 line-clamp-2 leading-relaxed mb-2">
                          {p.story.slice(0, 60)}...
                        </p>
                      )}
                      <p className="text-sm text-yun-text/60 font-light">
                        ¥{p.salePrice.toLocaleString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          第四屏：五大器物体系
          第四屏：五大器物体系
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 bg-yun-white">
        <div className="container-brand">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-light tracking-[0.15em] mb-3">
              我们不以品类定义品牌
            </h2>
            <p className="text-lg font-light tracking-[0.12em] text-yun-accent">
              而以人与器物的关系定义
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            {objectSystems.map((sys) => (
              <Link
                key={sys.name}
                href={`/objects?system=${sys.name}`}
                className="bg-white/70 p-6 md:p-8 border border-yun-grey/10 hover:border-yun-grey/20 hover:shadow-sm transition-all text-center block"
              >
                <h3 className="text-xl md:text-2xl font-light tracking-widest mb-3 text-yun-text">
                  {sys.name}
                </h3>
                <p className="text-xs text-yun-accent tracking-wider mb-4">{sys.subtitle}</p>
                <p className="text-xs text-yun-text/50 leading-relaxed mb-4">{sys.desc}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {sys.items.map((item) => (
                    <span key={item} className="tag-yun text-[10px]">{item}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          第五屏：品牌原则（三不原则精简版）
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="container-brand max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-light tracking-[0.15em] mb-4">允物三不原则</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/about#principles" className="text-center p-10 bg-yun-white border border-yun-grey/10 hover:border-yun-grey/20 hover:shadow-sm transition-all block">
              <h3 className="text-xl font-light tracking-wider mb-4 text-yun-text">不承诺</h3>
              <p className="text-sm text-yun-text/50 leading-loose">
                不承诺招财。<br />
                不承诺转运。<br />
                不承诺改命。
              </p>
            </Link>
            <Link href="/about#principles" className="text-center p-10 bg-yun-white border border-yun-grey/10 hover:border-yun-grey/20 hover:shadow-sm transition-all block">
              <h3 className="text-xl font-light tracking-wider mb-4 text-yun-text">不否定</h3>
              <p className="text-sm text-yun-text/50 leading-loose">
                不否定传统文化。<br />
                不否定民间信仰。<br />
                不否定人与器物之间的情感连接。
              </p>
            </Link>
            <Link href="/about#principles" className="text-center p-10 bg-yun-white border border-yun-grey/10 hover:border-yun-grey/20 hover:shadow-sm transition-all block">
              <h3 className="text-xl font-light tracking-wider mb-4 text-yun-text">不利用</h3>
              <p className="text-sm text-yun-text/50 leading-loose">
                不利用恐惧销售。<br />
                不利用焦虑销售。<br />
                不利用命运不安销售。
              </p>
            </Link>
          </div>

          <div className="text-center mt-10">
            <Link href="/about#ethics" className="btn-outline text-sm">
              阅读完整商业伦理 →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          第六屏：品牌故事（精简版）
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 bg-yun-dark">
        <Link href="/about" className="block container-brand max-w-3xl">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-light tracking-[0.15em] text-yun-white mb-8">
              允物不是一个关于产品的品牌
            </h2>
            <p className="text-sm text-yun-grey/70 leading-loose max-w-2xl mx-auto mb-6">
              允物是一个关于人与器物关系的品牌。<br />
              我们不试图让器物承担本不属于它的责任——不让珠子背负改变命运的神话，不让木头成为身份焦虑的证明，不让消费变成自我价值的确认。我们希望重新建立一种真实、克制且有温度的人与物的关系。<br />
              让物归物。让心归心。这便是允物存在的意义。
            </p>
            <span className="text-xs text-yun-accent/60 hover:text-yun-accent tracking-wider transition-colors">
              了解更多品牌故事 →
            </span>
          </div>
        </Link>
      </section>

      {/* ═══════════════════════════════════════════════════════
          第七屏：工艺体系
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="container-brand">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-light tracking-[0.15em] mb-4">工艺体系</h2>
            <p className="text-sm text-yun-text/50 max-w-xl mx-auto leading-loose">
              器物的价值，不仅来自材料本身，还来自时间、经验与双手。
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {crafts.map((craft) => (
              <Link
                key={craft.name}
                href={`/objects?craft=${craft.name}`}
                className="text-center group block"
              >
                <div className="aspect-square bg-yun-white border border-yun-grey/10 mb-5 flex items-center justify-center group-hover:border-yun-grey/30 transition-colors">
                  <svg className="w-12 h-12 text-yun-accent/20 group-hover:text-yun-accent/40 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d={craft.icon} />
                  </svg>
                </div>
                <h3 className="text-base font-light tracking-wider mb-2 text-yun-text">{craft.name}</h3>
                <p className="text-xs text-yun-text/50 leading-relaxed">{craft.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          第八屏：品牌日志
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 bg-yun-white">
        <div className="container-brand">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl md:text-3xl font-light tracking-[0.15em]">品牌志</h2>
            <Link href="/journal" className="text-xs text-yun-accent/60 hover:text-yun-accent tracking-wider transition-colors">
              阅读全部 →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {journalPosts.map((post) => (
              <Link key={post.id} href={`/journal/${post.slug}`} className="group">
                {/* 封面占位 */}
                <div className="aspect-[3/2] bg-yun-grey/10 mb-5 flex items-center justify-center overflow-hidden border border-yun-grey/10 group-hover:border-yun-grey/30 transition-colors">
                  {post.coverImage ? (
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-yun-text/10 text-5xl font-display">{post.title.charAt(0)}</span>
                  )}
                </div>

                <p className="text-xs text-yun-accent tracking-wider mb-2">
                  {post.category === 'OBJECT' ? '器物'
                    : post.category === 'MATERIAL' ? '材料'
                    : post.category === 'CRAFT' ? '工艺'
                    : post.category === 'DONGHAI' ? '东海'
                    : post.category === 'CREATION' ? '创作'
                    : '哲思'}
                </p>
                <h3 className="text-base font-light tracking-wider mb-2 group-hover:text-yun-accent transition-colors line-clamp-2">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-xs text-yun-text/50 leading-relaxed line-clamp-3">{post.excerpt}</p>
                )}
              </Link>
            ))}
          </div>

          {/* 预留 CMS 接口说明 */}
          <div className="mt-12 pt-8 border-t border-yun-grey/20 text-center">
            <p className="text-xs text-yun-text/30 tracking-wider">
              未来将接入 CMS 系统，支持动态内容管理
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          第九屏：社群入口
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="container-brand">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-light tracking-[0.15em] mb-4">同行者</h2>
            <p className="text-sm text-yun-text/50 max-w-xl mx-auto leading-loose">
              活动的目的不是成交，而是建立人与人的连接。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/contact" className="text-center p-10 bg-yun-white border border-yun-grey/10 hover:border-yun-grey/20 hover:shadow-sm transition-all block">
              <div className="text-4xl mb-4 text-yun-accent/20 font-light">栖</div>
              <h3 className="text-lg font-light tracking-wider mb-2">栖迟雅集</h3>
              <p className="text-xs text-yun-text/50 leading-relaxed">慢下来的聚会</p>
            </Link>
            <Link href="/contact" className="text-center p-10 bg-yun-white border border-yun-grey/10 hover:border-yun-grey/20 hover:shadow-sm transition-all block">
              <div className="text-4xl mb-4 text-yun-accent/20 font-light">扶</div>
              <h3 className="text-lg font-light tracking-wider mb-2">扶苏茶会</h3>
              <p className="text-xs text-yun-text/50 leading-relaxed">生长的交流</p>
            </Link>
            <Link href="/contact" className="text-center p-10 bg-yun-white border border-yun-grey/10 hover:border-yun-grey/20 hover:shadow-sm transition-all block">
              <div className="text-4xl mb-4 text-yun-accent/20 font-light">沧</div>
              <h3 className="text-lg font-light tracking-wider mb-2">沧溟夜话</h3>
              <p className="text-xs text-yun-text/50 leading-relaxed">格局的讨论</p>
            </Link>
          </div>

          <div className="text-center mt-10">
            <Link href="/contact" className="btn-outline">加入同行者社群</Link>
          </div>
        </div>
      </section>
    </>
  );
}
