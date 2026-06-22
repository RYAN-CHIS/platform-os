import prisma from '@/lib/prisma'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '允物品牌志｜器物之道，不在拥有，而在观照',
  description: '器物、材料、工艺、东海、创作、哲思。允物品牌志记录东方器物美学的探索之路。',
}

const categoryLabels: Record<string, string> = {
  OBJECT:     '器物',
  MATERIAL:   '材料',
  CRAFT:      '工艺',
  DONGHAI:    '东海',
  CREATION:   '创作',
  PHILOSOPHY: '哲思',
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const category = params.category

  const where = {
    status: 'PUBLISHED' as const,
    ...(category && category !== 'all'
      ? { category: category as any }
      : {}),
  }

  const posts = await prisma.journalPost.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
  })

  const allPosts = await prisma.journalPost.findMany({
    where: { status: 'PUBLISHED' },
    select: { category: true },
  })

  const categories = ['all', ...new Set(allPosts.map((p: any) => p.category))]

  return (
    <main className="min-h-screen bg-yun-bg">
      {/* Hero */}
      <section className="py-24 md:py-32 px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-display text-6xl md:text-8xl text-yun-accent/10 tracking-widest leading-none mb-8">
            JOURNAL
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-yun-text tracking-wide mb-6">
            允物品牌志
          </h1>
          <div className="divider mt-0 mb-6" />
          <p className="text-lg md:text-xl text-yun-subtext leading-relaxed max-w-2xl mx-auto">
            器物之道，不在拥有，而在观照。
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="px-6 md:px-12 pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((cat) => (
              <a
                key={cat}
                href={cat === 'all' ? '/journal' : `/journal?category=${cat}`}
                className={`px-5 py-2 text-sm tracking-wider border transition-colors ${
                  (!category && cat === 'all') || category === cat
                    ? 'border-yun-accent text-yun-accent bg-yun-accent/5'
                    : 'border-yun-line text-yun-subtext hover:border-yun-accent/30'
                }`}
              >
                {cat === 'all' ? '全部' : categoryLabels[cat] || cat}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="px-6 md:px-12 pb-24">
        <div className="max-w-5xl mx-auto">
          {posts.length === 0 ? (
            <p className="text-center text-yun-subtext py-24">暂无文章</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              {posts.map((post: any) => (
                <a
                  key={post.id}
                  href={`/journal/${post.slug}`}
                  className="group block border border-yun-line hover:border-yun-accent/20 transition-colors overflow-hidden"
                >
                  {post.coverImage && (
                    <div className="aspect-[16/9] overflow-hidden bg-yun-bg-secondary">
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  )}
                  <div className="p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs tracking-wider text-yun-accent/60 border border-yun-accent/20 px-3 py-1">
                        {categoryLabels[post.category] || post.category}
                      </span>
                      {post.publishedAt && (
                        <span className="text-xs text-yun-subtext">
                          {new Date(post.publishedAt).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <h2 className="font-display text-xl md:text-2xl text-yun-text group-hover:text-yun-accent transition-colors mb-3">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-yun-subtext text-sm leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                    <p className="text-yun-accent text-sm tracking-wider mt-6 inline-flex items-center gap-2 group-hover:gap-4 transition-all">
                      阅读全文 →
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
