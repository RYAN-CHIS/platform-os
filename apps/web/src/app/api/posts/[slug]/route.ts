import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/posts/:slug — 获取单篇文章详情
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const post = await prisma.journalPost.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      coverImage: true,
      category: true,
      status: true,
      seoTitle: true,
      seoDescription: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!post || post.status !== 'PUBLISHED') {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  // 上一篇 / 下一篇
  const [prevPost, nextPost] = await Promise.all([
    prisma.journalPost.findFirst({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lt: post.publishedAt || post.createdAt },
      },
      select: { title: true, slug: true },
      orderBy: { publishedAt: 'desc' },
    }),
    prisma.journalPost.findFirst({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gt: post.publishedAt || post.createdAt },
      },
      select: { title: true, slug: true },
      orderBy: { publishedAt: 'asc' },
    }),
  ]);

  return NextResponse.json(
    {
      ...post,
      prevPost: prevPost || null,
      nextPost: nextPost || null,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      },
    }
  );
}
