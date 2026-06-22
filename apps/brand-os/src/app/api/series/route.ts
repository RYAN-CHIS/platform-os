import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const items = await prisma.series.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json(items);
}
