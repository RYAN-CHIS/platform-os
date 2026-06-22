import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const series = await prisma.series.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { products: true } },
    },
  });
  return NextResponse.json(series);
}
