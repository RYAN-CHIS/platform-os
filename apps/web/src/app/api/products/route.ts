import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/products — 获取作品列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const seriesId = searchParams.get('seriesId');
  const status = searchParams.get('status') || 'PUBLISHED';

  const where: Record<string, unknown> = {};
  if (seriesId) where.seriesId = parseInt(seriesId);
  where.status = status;

  const products = await prisma.product.findMany({
    where,
    include: { series: true, materialsRelation: { include: { material: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(products);
}
