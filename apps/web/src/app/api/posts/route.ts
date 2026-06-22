import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/posts — 获取品牌志文章列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);

  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
  };
  if (category && category !== 'all') {
    where.category = category;
  }

  const [posts, total] = await Promise.all([
    prisma.journalPost.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        category: true,
        publishedAt: true,
        createdAt: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.journalPost.count({ where }),
  ]);

  return NextResponse.json(
    {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      },
    }
  );
}
