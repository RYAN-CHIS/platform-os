export const dynamic = 'force-dynamic'

import { brandDb } from '@/lib/brand-db-adapter'
import { redirect, notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const categories = [
  { value: 'OBJECT',     label: '器物' },
  { value: 'MATERIAL',   label: '材料' },
  { value: 'CRAFT',      label: '工艺' },
  { value: 'DONGHAI',    label: '东海' },
  { value: 'CREATION',   label: '创作' },
  { value: 'PHILOSOPHY', label: '哲思' },
]

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: '编辑文章｜允物后台',
}

export default async function EditJournalPostPage({ params }: Props) {
  const { id } = await params
  const post = await brandDb.journalPost.findUnique({ where: { id } })

  if (!post) notFound()
  const p = post!

  async function updatePost(formData: FormData) {
    'use server'

    const title = formData.get('title') as string
    const slug = formData.get('slug') as string
    const excerpt = formData.get('excerpt') as string
    const content = formData.get('content') as string
    const coverImage = formData.get('coverImage') as string
    const category = formData.get('category') as any
    const seoTitle = formData.get('seoTitle') as string
    const seoDescription = formData.get('seoDescription') as string
    const shouldPublish = formData.get('publish') === 'on'
    const shouldUnpublish = formData.get('unpublish') === 'on'

    const updateData: any = {
      title,
      slug,
      excerpt: excerpt || null,
      content,
      coverImage: coverImage || null,
      category,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
    }

    if (shouldPublish && p.status === 'DRAFT') {
      updateData.status = 'PUBLISHED'
      updateData.publishedAt = new Date()
    }
    if (shouldUnpublish && p.status === 'PUBLISHED') {
      updateData.status = 'DRAFT'
      updateData.publishedAt = null
    }

    await brandDb.journalPost.update({
      where: { id },
      data: updateData,
    })

    revalidatePath('/journal')
    revalidatePath(`/journal/${slug}`)
    redirect('/admin/journal')
  }

  async function deletePost() {
    'use server'
    await brandDb.journalPost.delete({ where: { id } })
    revalidatePath('/journal')
    redirect('/admin/journal')
  }

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
      <h1 className="font-display text-2xl md:text-3xl text-yun-text tracking-wide mb-12">
        编辑文章
      </h1>

      <form action={updatePost} className="space-y-8">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-xs text-yun-subtext tracking-wider mb-2">
            标题 <span className="text-yun-accent">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={post.title}
            className="w-full border border-yun-line bg-transparent px-4 py-3 text-yun-text text-sm focus:border-yun-accent outline-none transition-colors"
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className="block text-xs text-yun-subtext tracking-wider mb-2">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            defaultValue={post.slug}
            className="w-full border border-yun-line bg-transparent px-4 py-3 text-yun-text text-sm focus:border-yun-accent outline-none transition-colors"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-xs text-yun-subtext tracking-wider mb-2">
            分类 <span className="text-yun-accent">*</span>
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={post.category}
            className="w-full border border-yun-line bg-yun-bg px-4 py-3 text-yun-text text-sm focus:border-yun-accent outline-none transition-colors"
          >
            <option value="">请选择</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Excerpt */}
        <div>
          <label htmlFor="excerpt" className="block text-xs text-yun-subtext tracking-wider mb-2">
            摘要
          </label>
          <textarea
            id="excerpt"
            name="excerpt"
            rows={3}
            defaultValue={post.excerpt || ''}
            className="w-full border border-yun-line bg-transparent px-4 py-3 text-yun-text text-sm focus:border-yun-accent outline-none transition-colors resize-none"
          />
        </div>

        {/* Cover Image */}
        <div>
          <label htmlFor="coverImage" className="block text-xs text-yun-subtext tracking-wider mb-2">
            封面图 URL
          </label>
          <input
            id="coverImage"
            name="coverImage"
            type="text"
            defaultValue={post.coverImage || ''}
            className="w-full border border-yun-line bg-transparent px-4 py-3 text-yun-text text-sm focus:border-yun-accent outline-none transition-colors"
          />
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-xs text-yun-subtext tracking-wider mb-2">
            正文（Markdown） <span className="text-yun-accent">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            rows={20}
            required
            defaultValue={post.content}
            className="w-full border border-yun-line bg-transparent px-4 py-3 text-yun-text text-sm focus:border-yun-accent outline-none transition-colors resize-none font-mono"
          />
        </div>

        {/* SEO */}
        <div className="border-t border-yun-line pt-8">
          <h3 className="font-display text-lg text-yun-text mb-6">SEO 设置</h3>
          <div className="space-y-6">
            <div>
              <label htmlFor="seoTitle" className="block text-xs text-yun-subtext tracking-wider mb-2">
                SEO 标题
              </label>
              <input
                id="seoTitle"
                name="seoTitle"
                type="text"
                defaultValue={post.seoTitle || ''}
                className="w-full border border-yun-line bg-transparent px-4 py-3 text-yun-text text-sm focus:border-yun-accent outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="seoDescription" className="block text-xs text-yun-subtext tracking-wider mb-2">
                SEO 描述
              </label>
              <textarea
                id="seoDescription"
                name="seoDescription"
                rows={2}
                defaultValue={post.seoDescription || ''}
                className="w-full border border-yun-line bg-transparent px-4 py-3 text-yun-text text-sm focus:border-yun-accent outline-none transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="border-t border-yun-line pt-8 space-y-4">
          {post.status === 'DRAFT' ? (
            <div className="flex items-center gap-3">
              <input
                id="publish"
                name="publish"
                type="checkbox"
                className="w-4 h-4 border-yun-line rounded"
              />
              <label htmlFor="publish" className="text-sm text-yun-text">
                发布此文章
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input
                id="unpublish"
                name="unpublish"
                type="checkbox"
                className="w-4 h-4 border-yun-line rounded"
              />
              <label htmlFor="unpublish" className="text-sm text-yun-text">
                取消发布（转为草稿）
              </label>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-6 border-t border-yun-line">
          <button
            type="submit"
            className="px-8 py-3 bg-yun-accent text-yun-white text-sm tracking-wider hover:bg-yun-accent/90 transition-colors"
          >
            保存
          </button>
          <a
            href="/admin/journal"
            className="px-8 py-3 border border-yun-line text-yun-text text-sm tracking-wider hover:border-yun-accent/30 transition-colors inline-flex items-center"
          >
            取消
          </a>
          <form action={deletePost} className="ml-auto">
            <button
              type="submit"
              className="px-6 py-3 text-sm text-red-500 hover:text-red-600 transition-colors"
              onClick={(e) => {
                if (!confirm('确定删除此文章？')) e.preventDefault()
              }}
            >
              删除
            </button>
          </form>
        </div>
      </form>
    </div>
  )
}
