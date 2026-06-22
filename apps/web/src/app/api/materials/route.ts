import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const materials = await prisma.material.findMany({
    include: {
      productMaterials: {
        include: { product: { include: { series: true } } },
      },
    },
  });
  return NextResponse.json(materials);
}
